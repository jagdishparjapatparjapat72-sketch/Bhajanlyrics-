// ================= Firebase कॉन्फ़िगरेशन =================
// अपने Firebase प्रोजेक्ट की जानकारी यहाँ भरें।
// Firebase Console → Project Settings → Your apps → Config से कॉपी करें।
//
// जब तक आप यह नहीं भरते, वेबसाइट "डेमो मोड" (LocalStorage) में चलेगी —
// यानी Admin Panel आपके ही ब्राउज़र में भजन सेव करेगा।
// Firebase भरते ही सब कुछ ऑनलाइन डेटाबेस (Firestore) से चलने लगेगा।

window.FIREBASE_CONFIG = {
  apiKey: "YAHAN_APNI_API_KEY_DALEIN",
  authDomain: "YAHAN_PROJECT.firebaseapp.com",
  projectId: "YAHAN_PROJECT_ID",
  storageBucket: "YAHAN_PROJECT.appspot.com",
  messagingSenderId: "000000000000",
  appId: "YAHAN_APP_ID"
};

// Firebase सही से भरा गया है या नहीं — इसकी जाँच
window.FIREBASE_ENABLED = !String(window.FIREBASE_CONFIG.apiKey).includes("YAHAN");
