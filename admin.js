/* ================= BhajanLyrics — एडमिन पैनल ================= */
(function () {
  "use strict";

  // डेमो मोड का पासवर्ड (Firebase न होने पर)।
  // इसे बदलने के लिए नीचे की लाइन में नया पासवर्ड लिखें:
  const LOCAL_ADMIN_PASSWORD = "bhajan123";

  let editingThumb = ""; // मौजूदा thumbnail (edit के समय)

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    // श्रेणी विकल्प
    $("#fCategory").innerHTML = CATEGORIES
      .map(c => `<option value="${c.slug}">${c.icon} ${c.name}</option>`).join("");

    setupAuth();
    setupTabs();
    setupForm();
  }

  /* ---------- ऑथ ---------- */
  async function setupAuth() {
    if (window.FIREBASE_ENABLED) {
      $("#loginHint").textContent = "Firebase खाते से लॉगिन करें (ईमेल + पासवर्ड)";
      $("#emailField").style.display = "block";
      const f = await DB.firebaseInit();
      f.auth().onAuthStateChanged(u => (u ? showAdmin() : showLogin()));
      $("#loginBtn").addEventListener("click", async () => {
        try {
          await f.auth().signInWithEmailAndPassword($("#adminEmail").value.trim(), $("#adminPass").value);
        } catch (e) { toast("❌ लॉगिन असफल: ईमेल/पासवर्ड जाँचें"); }
      });
      $("#logoutBtn").addEventListener("click", () => f.auth().signOut());
    } else {
      $("#loginHint").textContent = "डेमो मोड — पासवर्ड: bhajan123 (admin.js में बदल सकते हैं)";
      if (sessionStorage.getItem("bl_admin") === "1") showAdmin(); else showLogin();
      $("#loginBtn").addEventListener("click", () => {
        if ($("#adminPass").value === LOCAL_ADMIN_PASSWORD) {
          sessionStorage.setItem("bl_admin", "1"); showAdmin();
        } else toast("❌ गलत पासवर्ड");
      });
      $("#logoutBtn").addEventListener("click", () => {
        sessionStorage.removeItem("bl_admin"); showLogin();
      });
    }
    $("#adminPass").addEventListener("keydown", e => { if (e.key === "Enter") $("#loginBtn").click(); });
  }

  function showLogin() { $("#loginView").style.display = "block"; $("#adminView").style.display = "none"; }
  function showAdmin() {
    $("#loginView").style.display = "none"; $("#adminView").style.display = "block";
    $("#modeBanner").innerHTML = window.FIREBASE_ENABLED
      ? "✅ <b>Firebase मोड चालू</b> — भजन ऑनलाइन डेटाबेस में सेव होंगे और सभी को दिखेंगे।"
      : "🟡 <b>डेमो मोड</b> — भजन केवल इसी ब्राउज़र में सेव होंगे। सबको दिखाने के लिए <code>js/firebase-config.js</code> में Firebase जानकारी भरें (गाइड: README फ़ाइल)।";
    renderList();
  }

  /* ---------- टैब ---------- */
  function setupTabs() {
    $("#tabAdd").addEventListener("click", () => switchTab("add"));
    $("#tabList").addEventListener("click", () => { switchTab("list"); renderList(); });
  }
  function switchTab(t) {
    $("#tabAdd").classList.toggle("active", t === "add");
    $("#tabList").classList.toggle("active", t === "list");
    $("#addView").style.display = t === "add" ? "block" : "none";
    $("#listView").style.display = t === "list" ? "block" : "none";
  }

  /* ---------- फॉर्म ---------- */
  function setupForm() {
    // Rich text toolbar
    $$(".rte-toolbar button").forEach(b =>
      b.addEventListener("click", () => {
        document.execCommand(b.dataset.cmd, false, null);
        $("#rte").focus();
      }));

    // थंबनेल प्रीव्यू
    $("#fThumb").addEventListener("change", async e => {
      const file = e.target.files[0];
      if (!file) return;
      const url = await compressImage(file, 640, 0.8);
      const img = $("#thumbPreview");
      img.src = url; img.style.display = "block";
      img.dataset.pending = "1";
    });

    $("#resetBtn").addEventListener("click", clearForm);
    $("#publishBtn").addEventListener("click", publish);
    $("#listSearch").addEventListener("input", renderList);
  }

  function clearForm() {
    $("#editId").value = "";
    $("#fTitle").value = ""; $("#fSinger").value = ""; $("#fYoutube").value = "";
    $("#fCategory").selectedIndex = 0;
    $("#rte").innerHTML = "";
    $("#fFeatured").checked = false;
    $("#fThumb").value = "";
    const img = $("#thumbPreview");
    img.src = ""; img.style.display = "none"; delete img.dataset.pending;
    editingThumb = "";
    $("#formHeading").textContent = "नया भजन जोड़ें";
    $("#publishBtn").textContent = "🚀 प्रकाशित करें";
  }

  async function publish() {
    const title = $("#fTitle").value.trim();
    const lyrics = $("#rte").innerHTML.trim();
    const lyricsText = $("#rte").textContent.trim();
    if (!title) return toast("⚠️ शीर्षक लिखें");
    if (!lyricsText) return toast("⚠️ भजन के बोल लिखें");

    $("#publishBtn").disabled = true;
    $("#publishBtn").textContent = "⏳ सेव हो रहा है...";

    try {
      let thumbnail = editingThumb;
      const file = $("#fThumb").files[0];
      if (file) thumbnail = await DB.uploadThumb(file);

      const editId = $("#editId").value;
      const existing = editId ? await findById(editId) : null;

      const b = {
        ...(existing || {}),
        id: editId || undefined,
        title,
        slug: existing ? existing.slug : slugify(title),
        category: $("#fCategory").value,
        singer: $("#fSinger").value.trim(),
        youtube: $("#fYoutube").value.trim(),
        lyrics,
        thumbnail,
        featured: $("#fFeatured").checked,
        createdAt: existing ? existing.createdAt : Date.now(),
        views: existing ? (existing.views || 0) : 0
      };

      await DB.save(b);
      toast(editId ? "✅ भजन अपडेट हो गया!" : "✅ भजन प्रकाशित हो गया!");
      clearForm();
      switchTab("list");
      renderList();
    } catch (e) {
      console.error(e);
      toast("❌ त्रुटि: " + (e.message || "सेव नहीं हो सका"));
    } finally {
      $("#publishBtn").disabled = false;
      $("#publishBtn").textContent = "🚀 प्रकाशित करें";
    }
  }

  async function findById(id) {
    const all = await DB.getAll();
    return all.find(b => b.id === id) || null;
  }

  /* ---------- सूची ---------- */
  async function renderList() {
    const box = $("#adminList");
    box.innerHTML = `<div class="skeleton" style="min-height:70px"></div>`;
    const all = await DB.getAll();
    const q = ($("#listSearch").value || "").trim().toLowerCase();
    const list = q ? all.filter(b => (b.title + " " + catName(b.category)).toLowerCase().includes(q)) : all;

    if (!list.length) {
      box.innerHTML = `<div class="empty-state"><div class="es-icon">🪔</div>कोई भजन नहीं मिला।</div>`;
      return;
    }
    box.innerHTML = list.map(b => `
      <div class="admin-row">
        <span style="font-size:1.3rem">${catIcon(b.category)}</span>
        <span class="ar-title">${esc(b.title)} ${b.featured ? "⭐" : ""}</span>
        <span class="ar-cat">${esc(catName(b.category))}</span>
        <span style="font-size:.8rem;color:var(--text-soft)">👁️ ${b.views || 0}</span>
        <div class="ar-btns">
          <a href="../bhajan.html?b=${encodeURIComponent(b.slug)}" target="_blank">👁️ देखें</a>
          <button class="edit" data-id="${b.id}">✏️ एडिट</button>
          <button class="del" data-id="${b.id}">🗑️ डिलीट</button>
        </div>
      </div>`).join("");

    $$(".ar-btns .edit", box).forEach(btn =>
      btn.addEventListener("click", () => startEdit(btn.dataset.id)));
    $$(".ar-btns .del", box).forEach(btn =>
      btn.addEventListener("click", async () => {
        if (!confirm("क्या आप वाकई इस भजन को हटाना चाहते हैं?")) return;
        await DB.remove(btn.dataset.id);
        toast("🗑️ भजन हटा दिया गया");
        renderList();
      }));
  }

  async function startEdit(id) {
    const b = await findById(id);
    if (!b) return toast("भजन नहीं मिला");
    $("#editId").value = b.id;
    $("#fTitle").value = b.title || "";
    $("#fCategory").value = b.category || CATEGORIES[0].slug;
    $("#fSinger").value = b.singer || "";
    $("#fYoutube").value = b.youtube || "";
    $("#fFeatured").checked = !!b.featured;
    const isHtml = /<\w+[^>]*>/.test(String(b.lyrics));
    $("#rte").innerHTML = isHtml ? b.lyrics : esc(b.lyrics);
    editingThumb = b.thumbnail || "";
    const img = $("#thumbPreview");
    if (editingThumb) { img.src = editingThumb; img.style.display = "block"; }
    else { img.src = ""; img.style.display = "none"; }
    $("#formHeading").textContent = "भजन संपादित करें";
    $("#publishBtn").textContent = "💾 अपडेट करें";
    switchTab("add");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
})();
