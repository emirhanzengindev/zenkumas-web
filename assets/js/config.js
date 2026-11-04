// ============================================================
// Zen Kumaş - Merkezi API Yapılandırması
// API temel adresi TEK kaynak: bu dosya.
// - Üretim (canlı): https://zenkumas-api.onrender.com
// - Yerel geliştirme: tarayıcı konsolundan geçici override:
//     sessionStorage.setItem('zenApiOverride', 'http://localhost:3000')
// - Bu dosyaya ASLA JWT_SECRET, veritabanı veya Cloudinary
//   sır/anahtarı yazılmaz. Token ve parola yalnızca oturum
//   yönetiminde (assets/js/admin-auth.js) tutulur.
// ============================================================
window.ZEN_CONFIG = {
    // Backend kök adresi (sonda / olmadan)
    apiBase: 'https://zenkumas-api.onrender.com',

    // Oturum anahtarları — localStorage'daki sahte 'user' ile karışmaz
    tokenKey: 'zenAdminToken',
    sessionKey: 'zenAdminSession',

    // Yerel geliştirmede override varsa onu kullan, yoksa üretim adresini
    getApiBase: function () {
        const override = sessionStorage.getItem('zenApiOverride');
        const base = override || this.apiBase;
        return base.replace(/\/+$/, '');
    }
};
