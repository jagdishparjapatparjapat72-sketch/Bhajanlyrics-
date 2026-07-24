# 🪔 BhajanLyrics — हिंदी भजन वेबसाइट

पूरी तरह Responsive, Fast और बिना कोडिंग के Manage होने वाली भजन वेबसाइट।

---

## 📁 फाइलें कहाँ हैं?

```
bhajanlyrics/
├── index.html          → होमपेज
├── khoj.html           → खोज पेज (Instant Search + फ़िल्टर)
├── shreni.html         → श्रेणी पेज
├── bhajan.html         → भजन पेज (Lyrics)
├── admin/              → ⚙️ एडमिन पैनल (यहीं से भजन जोड़ें)
├── pages/              → About, Contact, Privacy, Terms, DMCA
├── css/style.css       → डिज़ाइन
├── js/
│   ├── firebase-config.js  → ⭐ Firebase जानकारी यहाँ भरें
│   ├── data.js             → श्रेणियाँ + सैंपल भजन
│   └── app.js              → मुख्य कोड
├── manifest.webmanifest, sw.js → PWA (ऐप इंस्टॉल)
├── sitemap.xml, robots.txt     → SEO
```

---

## 🚀 Step 1 — वेबसाइट को मुफ्त में Live करें (2 मिनट)

### तरीका A: Netlify (सबसे आसान — Drag & Drop)
1. https://app.netlify.com पर मुफ्त खाता बनाएँ
2. **"Add new site" → "Deploy manually"** चुनें
3. पूरा `bhajanlyrics` फ़ोल्डर वहाँ **खींचकर छोड़ दें (drag & drop)**
4. बस! आपकी वेबसाइट live है 🎉

### तरीका B: GitHub Pages
1. https://github.com पर नया repository बनाएँ (जैसे `bhajanlyrics`)
2. सारी फाइलें upload करें (Add file → Upload files)
3. Settings → Pages → Branch: `main` चुनें → Save
4. कुछ मिनट में `https://username.github.io/bhajanlyrics/` पर live

### तरीका C: Cloudflare Pages
1. https://pages.cloudflare.com → "Upload assets" → फ़ोल्डर upload करें

> 📌 Live होने के बाद `sitemap.xml` और `robots.txt` में
> `APNI-WEBSITE-URL-YAHAN.netlify.app` की जगह अपनी असली URL लिख दें।

---

## 🔥 Step 2 — Firebase जोड़ें (ताकि भजन सबको दिखें)

> **बिना Firebase के भी वेबसाइट चलती है** (डेमो मोड) — लेकिन तब Admin Panel से
> जोड़े गए भजन सिर्फ आपके ही ब्राउज़र में दिखेंगे। सबको दिखाने के लिए Firebase ज़रूरी है।

### 2.1 प्रोजेक्ट बनाएँ
1. https://console.firebase.google.com → **"Add project"** → नाम दें (जैसे `bhajanlyrics`) → Create
2. प्रोजेक्ट खुलने पर **`</>` (Web)** आइकन दबाएँ → App nickname दें → Register
3. जो `firebaseConfig` कोड दिखे, उसकी values कॉपी करें

### 2.2 Config भरें
`js/firebase-config.js` खोलें और अपनी values भरें:
```js
window.FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "aapka-project.firebaseapp.com",
  projectId: "aapka-project",
  storageBucket: "aapka-project.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234:web:abcd"
};
```

### 2.3 Firestore Database चालू करें
1. Firebase Console → **Build → Firestore Database → Create database**
2. Location चुनें (जैसे `asia-south1` — Mumbai) → **Start in production mode**
3. **Rules** टैब में यह पेस्ट करके Publish करें:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /bhajans/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```
(मतलब: पढ़ सब सकते हैं, लिख सिर्फ लॉगिन किया हुआ एडमिन सकता है)

### 2.4 Authentication चालू करें (एडमिन लॉगिन)
1. **Build → Authentication → Get started**
2. **Email/Password** चालू करें
3. **Users** टैब → **Add user** → अपना ईमेल + पासवर्ड डालें
4. अब Admin Panel में इसी ईमेल-पासवर्ड से लॉगिन होगा ✅

### 2.5 Storage (थंबनेल के लिए — वैकल्पिक)
1. **Build → Storage → Get started**
2. Rules में:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```
> Storage न भी चालू करें तो चलेगा — थंबनेल तब भी काम करेंगे (डेटाबेस में सेव होंगे)।

### 2.6 अपडेटेड फाइल फिर से upload करें
`firebase-config.js` बदलने के बाद फ़ोल्डर दोबारा Netlify पर drag-drop कर दें।

---

## ⚙️ भजन कैसे जोड़ें? (बिना कोडिंग)

1. अपनी वेबसाइट पर `/admin/` खोलें (जैसे `aapkisite.netlify.app/admin/`)
2. लॉगिन करें
   - **Firebase मोड:** अपना Firebase ईमेल + पासवर्ड
   - **डेमो मोड:** पासवर्ड `bhajan123` (बदलने के लिए `admin/admin.js` में सबसे ऊपर)
3. फॉर्म भरें → **🚀 प्रकाशित करें** — बस हो गया!
4. "📋 सभी भजन" टैब से ✏️ एडिट या 🗑️ डिलीट करें

---

## 🎨 अन्य सेटिंग्स

| क्या बदलना है | कहाँ |
|---|---|
| श्रेणियाँ जोड़ना/हटाना | `js/data.js` में `CATEGORIES` |
| रंग बदलना | `css/style.css` में सबसे ऊपर `:root` |
| डेमो पासवर्ड | `admin/admin.js` में `LOCAL_ADMIN_PASSWORD` |
| संपर्क ईमेल | `pages/sampark.html` |

## ✨ फीचर्स
✅ 21 श्रेणियाँ • Instant Search • अक्षर फ़िल्टर • Light/Dark थीम
✅ कॉपी / शेयर / प्रिंट / फॉन्ट साइज़ • Related भजन • YouTube एम्बेड
✅ PWA (📲 ऐप इंस्टॉल) • SEO (Meta, Schema, Sitemap, Robots)
✅ Lazy loading • इमेज ऑटो-कंप्रेस • Mobile-first डिज़ाइन

🙏 जय श्री राम!
