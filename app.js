/* ================= BhajanLyrics — मुख्य JavaScript ================= */
/* डेटा लेयर + कॉमन UI (हैडर, फुटर, थीम, PWA) */

(function () {
  "use strict";
  const BASE = window.BL_BASE || "";

  /* ---------- छोटे हेल्पर ---------- */
  window.$ = (s, el) => (el || document).querySelector(s);
  window.$$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  window.esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  window.catName = (slug) => { const c = CATEGORIES.find(c => c.slug === slug); return c ? c.name : slug; };
  window.catIcon = (slug) => { const c = CATEGORIES.find(c => c.slug === slug); return c ? c.icon : "🎵"; };
  window.slugify = (s) => String(s).trim().toLowerCase()
    .replace(/[^\u0900-\u097Fa-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80)
    || ("bhajan-" + Date.now());
  window.toast = (msg) => {
    let t = $("#blToast");
    if (!t) { t = document.createElement("div"); t.id = "blToast"; t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._tm); t._tm = setTimeout(() => t.classList.remove("show"), 2400);
  };
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }

  /* ================= DB लेयर =================
     Firebase भरा हो → Firestore, वरना LocalStorage (डेमो मोड) */
  const LS_KEY = "bl_store_v1";

  function lsRead() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || { items: {}, deleted: [] }; }
    catch (e) { return { items: {}, deleted: [] }; }
  }
  function lsWrite(st) { localStorage.setItem(LS_KEY, JSON.stringify(st)); }

  let fb = null, fbReady = null;
  function firebaseInit() {
    if (!window.FIREBASE_ENABLED) return Promise.resolve(null);
    if (fbReady) return fbReady;
    const V = "10.12.2";
    fbReady = loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-app-compat.js`)
      .then(() => Promise.all([
        loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore-compat.js`),
        loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-auth-compat.js`),
        loadScript(`https://www.gstatic.com/firebasejs/${V}/firebase-storage-compat.js`)
      ]))
      .then(() => {
        firebase.initializeApp(window.FIREBASE_CONFIG);
        fb = firebase;
        return fb;
      })
      .catch(() => { fb = null; return null; });
    return fbReady;
  }

  window.DB = {
    mode: () => (window.FIREBASE_ENABLED ? "firebase" : "local"),

    async getAll() {
      if (window.FIREBASE_ENABLED) {
        const f = await firebaseInit();
        if (f) {
          const snap = await f.firestore().collection("bhajans").orderBy("createdAt", "desc").get();
          return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      }
      const st = lsRead();
      const map = {};
      SAMPLE_BHAJANS.forEach(b => { map[b.id] = { ...b }; });
      Object.values(st.items).forEach(b => { map[b.id] = b; });
      st.deleted.forEach(id => delete map[id]);
      return Object.values(map).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    },

    async getBySlug(slug) {
      const all = await this.getAll();
      return all.find(b => b.slug === slug || b.id === slug) || null;
    },

    async save(b) { // add या update दोनों
      b.slug = b.slug || slugify(b.title);
      b.createdAt = b.createdAt || Date.now();
      b.views = b.views || 0;
      if (window.FIREBASE_ENABLED) {
        const f = await firebaseInit();
        const col = f.firestore().collection("bhajans");
        if (b.id && !String(b.id).startsWith("sample-") && !String(b.id).startsWith("local-")) {
          const id = b.id; const data = { ...b }; delete data.id;
          await col.doc(id).set(data, { merge: true }); return id;
        }
        const data = { ...b }; delete data.id;
        const ref = await col.add(data); return ref.id;
      }
      const st = lsRead();
      b.id = b.id || ("local-" + Date.now());
      st.items[b.id] = b;
      st.deleted = st.deleted.filter(x => x !== b.id);
      lsWrite(st);
      return b.id;
    },

    async remove(id) {
      if (window.FIREBASE_ENABLED) {
        const f = await firebaseInit();
        if (!String(id).startsWith("sample-"))
          await f.firestore().collection("bhajans").doc(id).delete();
        return;
      }
      const st = lsRead();
      delete st.items[id];
      if (!st.deleted.includes(id)) st.deleted.push(id);
      lsWrite(st);
    },

    async addView(b) {
      try {
        if (window.FIREBASE_ENABLED) {
          const f = await firebaseInit();
          await f.firestore().collection("bhajans").doc(b.id)
            .update({ views: firebase.firestore.FieldValue.increment(1) });
        } else {
          const st = lsRead();
          const cur = st.items[b.id] || { ...b };
          cur.views = (cur.views || 0) + 1;
          st.items[b.id] = cur; lsWrite(st);
        }
      } catch (e) { /* ignore */ }
    },

    async uploadThumb(file) {
      // इमेज को छोटा (optimize) करके सेव करें
      const dataUrl = await compressImage(file, 640, 0.8);
      if (window.FIREBASE_ENABLED) {
        try {
          const f = await firebaseInit();
          const ref = f.storage().ref("thumbnails/" + Date.now() + ".jpg");
          await ref.putString(dataUrl, "data_url");
          return await ref.getDownloadURL();
        } catch (e) { return dataUrl; }
      }
      return dataUrl;
    },

    firebaseInit
  };

  function compressImage(file, maxW, q) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const sc = Math.min(1, maxW / img.width);
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", q));
      };
      img.onerror = rej;
      img.src = URL.createObjectURL(file);
    });
  }
  window.compressImage = compressImage;

  /* ================= भजन कार्ड HTML ================= */
  window.bhajanCard = function (b) {
    const url = BASE + "bhajan.html?b=" + encodeURIComponent(b.slug);
    const thumb = b.thumbnail
      ? `<img src="${esc(b.thumbnail)}" alt="${esc(b.title)}" loading="lazy">`
      : `<span>${catIcon(b.category)}</span>`;
    const feat = b.featured ? `<span class="badge-featured">⭐ विशेष</span>` : "";
    const plain = String(b.lyrics || "").replace(/<[^>]+>/g, " ").slice(0, 120);
    return `<a class="bhajan-card fade-in" href="${url}">
      <div class="bc-wrap">${feat}<div class="bc-thumb">${thumb}</div></div>
      <div class="bc-body">
        <span class="bc-cat">${esc(catName(b.category))}</span>
        <div class="bc-title">${esc(b.title)}</div>
        ${b.singer ? `<div class="bc-singer">🎤 ${esc(b.singer)}</div>` : ""}
        <div class="bc-excerpt">${esc(plain)}…</div>
      </div>
    </a>`;
  };

  /* ================= हैडर / फुटर ================= */
  function renderHeader() {
    const el = $("#siteHeader"); if (!el) return;
    el.innerHTML = `
    <div class="container header-inner">
      <a class="logo" href="${BASE}index.html">
        <img src="${BASE}icons/icon-192.png" alt="BhajanLyrics लोगो" width="36" height="36">
        <span><span class="lg-bhajan">Bhajan</span><span class="lg-lyrics">Lyrics</span></span>
      </a>
      <nav class="main-nav">
        <a href="${BASE}index.html">🏠 होम</a>
        <a href="${BASE}khoj.html">🔍 खोजें</a>
        <a href="${BASE}khoj.html#shreniyan">📚 श्रेणियाँ</a>
        <a href="${BASE}admin/index.html">⚙️ एडमिन</a>
      </nav>
      <form class="header-search" action="${BASE}khoj.html" method="get">
        <input type="search" name="q" placeholder="भजन खोजें..." aria-label="भजन खोजें">
        <span class="hs-icon">🔍</span>
      </form>
      <div class="header-actions">
        <button class="icon-btn" id="installBtn" title="ऐप इंस्टॉल करें">📲</button>
        <button class="icon-btn" id="themeBtn" title="थीम बदलें">🌙</button>
        <button class="icon-btn mob-only" id="menuBtn" title="मेनू">☰</button>
      </div>
    </div>
    <div class="mobile-menu" id="mobileMenu">
      <a href="${BASE}index.html">🏠 होम</a>
      <a href="${BASE}khoj.html">🔍 भजन खोजें</a>
      <a href="${BASE}khoj.html#shreniyan">📚 सभी श्रेणियाँ</a>
      <a href="${BASE}pages/hamare-bare-mein.html">ℹ️ हमारे बारे में</a>
      <a href="${BASE}admin/index.html">⚙️ एडमिन पैनल</a>
    </div>`;

    // मोबाइल मेनू
    $("#menuBtn").addEventListener("click", () => $("#mobileMenu").classList.toggle("open"));
    if (window.matchMedia("(min-width:900px)").matches) $("#menuBtn").style.display = "none";

    // थीम टॉगल
    const btn = $("#themeBtn");
    const setTheme = (t) => {
      document.documentElement.setAttribute("data-theme", t);
      localStorage.setItem("bl_theme", t);
      btn.textContent = t === "dark" ? "☀️" : "🌙";
    };
    setTheme(localStorage.getItem("bl_theme") || "light");
    btn.addEventListener("click", () =>
      setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"));

    // PWA इंस्टॉल बटन
    let deferred = null;
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault(); deferred = e;
      $("#installBtn").style.display = "grid";
    });
    $("#installBtn").addEventListener("click", async () => {
      if (!deferred) return;
      deferred.prompt(); await deferred.userChoice; deferred = null;
      $("#installBtn").style.display = "none";
    });
  }

  function renderFooter() {
    const el = $("#siteFooter"); if (!el) return;
    const catLinks = CATEGORIES.slice(0, 8)
      .map(c => `<li><a href="${BASE}shreni.html?c=${c.slug}">${c.icon} ${c.name}</a></li>`).join("");
    el.innerHTML = `
    <div class="container footer-inner">
      <div class="footer-about">
        <a class="logo" href="${BASE}index.html">
          <span><span class="lg-bhajan">Bhajan</span><span class="lg-lyrics">Lyrics</span></span>
        </a>
        <p>भक्ति भजनों, आरतियों, चालीसाओं और मंत्रों का हिंदी संग्रह। पढ़ें, गाएँ और भक्ति में डूब जाएँ। 🙏</p>
        <p style="margin-top:10px">👤 <b>विकास कुमार</b><br>📱 <a href="tel:+919770154123">9770154123</a><br>📍 रघुनाथपुरा, सुवासरा, जिला मंदसौर (म.प्र.)</p>
      </div>
      <div>
        <h4>श्रेणियाँ</h4>
        <ul>${catLinks}</ul>
      </div>
      <div>
        <h4>महत्वपूर्ण लिंक</h4>
        <ul>
          <li><a href="${BASE}index.html">होम</a></li>
          <li><a href="${BASE}khoj.html">भजन खोजें</a></li>
          <li><a href="${BASE}pages/hamare-bare-mein.html">हमारे बारे में</a></li>
          <li><a href="${BASE}pages/sampark.html">संपर्क करें</a></li>
          <li><a href="${BASE}admin/index.html">एडमिन पैनल</a></li>
        </ul>
      </div>
      <div>
        <h4>कानूनी</h4>
        <ul>
          <li><a href="${BASE}pages/privacy-policy.html">Privacy Policy</a></li>
          <li><a href="${BASE}pages/terms.html">Terms &amp; Conditions</a></li>
          <li><a href="${BASE}pages/dmca.html">DMCA</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">© ${new Date().getFullYear()} BhajanLyrics — सर्वाधिकार सुरक्षित | जय श्री राम 🚩</div>`;
  }

  /* ---------- सर्विस वर्कर (PWA) ---------- */
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () =>
      navigator.serviceWorker.register(BASE + "sw.js").catch(() => {}));
  }

  document.addEventListener("DOMContentLoaded", () => { renderHeader(); renderFooter(); });
})();
