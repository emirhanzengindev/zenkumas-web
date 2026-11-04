// ============================================================
// Zen Kumaş - Main JavaScript
// Merkezi script: header, kullanıcı alanı, slider, kumaş kartları,
// filtreleme ve chatbot tüm sayfalarda bu dosyadan yönetilir.
// ============================================================

// ============================================================
// DİNAMİK ÜRÜN KATMANI (Aşama 6 entegrasyonu)
// Ürünler artık PostgreSQL'den (public API) gelir; sabit veri KULLANILMAZ.
// Alan eşleşmesi GERÇEK API yanıtından türetilir:
//   GET /api/kumaslar → [{ id, kumas_adi, kumas_renk, kumas_url, kumas_fiyat,
//                           kumas_stok, [kumas_kategori], [kumas_aciklama],
//                           created_at, updated_at }]
// kumas_kategori / kumas_aciklama backend public projeksiyonunda yoksa null
// kalır → arayüz zarif biçimde düşer (kategori filtresi yalnızca "Tüm Kumaşlar",
// kartta açıklama satırı gizli). API bu alanları döndürmeye başladığında
// frontend DEĞİŞMEDEN otomatik devreye girer (ileri uyumlu).
// ============================================================

// Global değişkenler
let tumKumaslar = [];

// Kısa yardımcılar
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

// Görsel yoksa/bozuksa kullanılacak placeholder (mevcut var).
const FALLBACK_IMG = 'assets/images/placeholder.svg';

// XSS koruması: API'den (admin girdisi) gelen metni HTML'e yazmadan önce kaçır.
function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Yalnızca http/https görsel adresi kabul et; diğerini placeholder'a çevir.
// (javascript: / data: şemalı url enjeksiyonunu yapısal olarak keser.)
function safeImg(url) {
    const s = String(url || '').trim();
    return /^https?:\/\//i.test(s) ? s : FALLBACK_IMG;
}

// Backend ürününü kart bileşeninin beklediği yapıya çeviren TEK normalize noktası.
function normalizeFabric(f) {
    const kategori = f.kumas_kategori ? String(f.kumas_kategori).trim() : '';
    const img = safeImg(f.kumas_url || f.ana_foto_url);
    return {
        id: f.id,
        isim: f.kumas_adi || '',
        kategori: kategori,
        tur: kategori.toLocaleLowerCase('tr'),
        aciklama: f.kumas_aciklama ? String(f.kumas_aciklama).trim() : '',
        kartela_resmi: img,
        ikinci_resim: img,
        fiyat: f.kumas_fiyat,
        stok_durumu: (Number(f.kumas_stok) > 0) ? 'evet' : 'hayir',
    };
}

// Aynı sayfada gereksiz istek: /api/kumaslar BİR KEZ çekilir; slider + vitrin +
// liste aynı önbelleği paylaşır. Hata durumunda önbellek sıfırlanır (tekrar denenebilir).
let _fabricPromise = null;
function fetchFabrics() {
    if (_fabricPromise) return _fabricPromise;
    const base = (window.ZEN_CONFIG && window.ZEN_CONFIG.getApiBase) ? window.ZEN_CONFIG.getApiBase() : '';
    _fabricPromise = fetch(base + '/api/kumaslar', { headers: { 'Accept': 'application/json' } })
        .then((res) => {
            if (!res.ok) throw new Error('Sunucu yanıtı: ' + res.status);
            return res.json();
        })
        .then((data) => {
            const list = Array.isArray(data) ? data.map(normalizeFabric) : [];
            tumKumaslar = list;
            return list;
        })
        .catch((err) => { _fabricPromise = null; throw err; });
    return _fabricPromise;
}

// ============================================================
// UYGULAMA BAŞLATMA
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    updateUserInterface();
    initializeHeader();
    initializeChatbot();
    initializeReveal();

    initDynamicProducts();
});

// Ürün ekranları: ana sayfada slider + vitrin, kumaşlar sayfasında filtreli grid.
// TEK fetch; her ekran önce iskeletini çizer, veri gelince doldurur, hata çıkarsa
// anlaşılır mesaj gösterir. Bu fonksiyon patlasa bile header/chatbot/slider çalışmaya
// devam eder (sayfanın geri kalanı JS'i durdurmaz).
function initDynamicProducts() {
    const hasSlider = !!$('#swiper-wrapper');
    const hasVitrin = !!$('#vitrin-container');
    const hasKumaslar = !!$('#kumaslar-container');
    if (!hasSlider && !hasVitrin && !hasKumaslar) return;

    if (hasVitrin) setVitrinLoading();
    if (hasKumaslar) setKumaslarLoading();

    fetchFabrics()
        .then((fabrics) => {
            if (hasSlider) loadSlider(fabrics);
            if (hasVitrin) renderVitrin(fabrics);
            if (hasKumaslar) initKumaslarPage(fabrics);
        })
        .catch((err) => {
            console.error('Ürünler yüklenemedi:', err);
            if (hasSlider) hideSliderSection();
            if (hasVitrin) setVitrinError();
            if (hasKumaslar) setKumaslarError();
        });
}

// ============================================================
// KULLANICI ALANI (Giriş / Kayıt / Profil)
// ============================================================
function updateUserInterface() {
    const userArea = $('#kullanici-alani');
    if (!userArea) return;
    const user = JSON.parse(localStorage.getItem('user'));

    if (user) {
        const firstLetter = (user.isim || 'K').trim()[0]?.toUpperCase() || 'K';
        userArea.innerHTML = `
            <div class="relative group">
                <div class="w-10 h-10 rounded-full bg-bronze text-white flex items-center justify-center text-lg font-semibold cursor-pointer shadow-soft">
                    ${firstLetter}
                </div>
                <div class="absolute right-0 mt-3 w-44 bg-white border border-cream-dark rounded-xl shadow-lifted py-2 hidden group-hover:block z-50">
                    <div class="px-4 py-2 border-b border-cream-dark">
                        <p class="text-sm font-semibold text-ink">${user.isim || 'Kullanıcı'}</p>
                        <p class="text-xs text-ink-muted truncate">${user.email || ''}</p>
                    </div>
                    <button onclick="logout()" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-cream transition">Çıkış Yap</button>
                </div>
            </div>
        `;
    } else {
        userArea.innerHTML = `
            <a href="giris.html" class="text-sm font-medium text-ink-soft hover:text-bronze-dark transition">Giriş Yap</a>
            <a href="kayit.html" class="text-sm font-semibold bg-ink text-cream px-4 py-2 rounded-full hover:bg-bronze transition">Hesap Oluştur</a>
        `;
    }
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// ============================================================
// HEADER: aktif link, mobil menü, scroll davranışı
// ============================================================
function initializeHeader() {
    const header = $('#site-header');

    // Aktif menü linki
    if (header) {
        const page = (location.pathname.split('/').pop() || 'index.html').replace('.html', '');
        $$('.nav-link', header).forEach(a => {
            if (a.dataset.nav === page) a.classList.add('active');
        });

        // Scroll'da gizle/göster
        let previousScroll = window.scrollY;
        window.addEventListener('scroll', () => {
            const currentScroll = window.scrollY;
            const menuOpen = $('#mobile-menu') && !$('#mobile-menu').classList.contains('hidden');
            if (!menuOpen) {
                header.style.transform = (currentScroll > previousScroll && currentScroll > 140)
                    ? 'translateY(-100%)'
                    : 'translateY(0)';
            }
            previousScroll = currentScroll;
        }, { passive: true });
    }

    // Mobil menü
    const toggle = $('#menu-toggle');
    const menu = $('#mobile-menu');
    if (toggle && menu) {
        toggle.addEventListener('click', () => {
            menu.classList.toggle('hidden');
            toggle.classList.toggle('menu-open');
        });
    }
}

// ============================================================
// SCROLL REVEAL ANİMASYONU
// ============================================================
function initializeReveal() {
    const els = $$('.reveal');
    if (!els.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    els.forEach(el => observer.observe(el));
}

// ============================================================
// HERO SLIDER (Ana sayfa)
// ============================================================
async function loadSlider(fabrics) {
    try {
        const wrapper = $('#swiper-wrapper');
        if (!wrapper) return;

        wrapper.innerHTML = '';

        const sliderFabrics = (fabrics || []).slice(0, 5);
        if (!sliderFabrics.length) { hideSliderSection(); return; }

        sliderFabrics.forEach(fabric => {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide relative overflow-hidden';
            slide.innerHTML = `
                <img src="${esc(safeImg(fabric.kartela_resmi))}" alt="${esc(fabric.isim)}"
                     onerror="this.onerror=null;this.src='${FALLBACK_IMG}';"
                     class="absolute inset-0 w-full h-full object-cover" />
                <div class="hero-overlay absolute inset-0"></div>
                <div class="slide-content relative z-10 h-full flex flex-col justify-end p-8 md:p-14 max-w-2xl">
                    <p class="text-xs md:text-sm font-semibold uppercase tracking-[0.25em] text-bronze-light mb-3">Yeni Koleksiyon</p>
                    <h2 class="font-display text-3xl md:text-5xl font-bold text-cream text-shadow-hero mb-3">${esc(fabric.isim)}</h2>
                    <p class="text-sm md:text-base text-cream/90 leading-relaxed mb-6">${esc(fabric.aciklama || 'Zen Kumaş koleksiyonundan seçkin döşemelik kumaş.')}</p>
                    <div>
                        <a href="kumaslar.html" class="inline-flex items-center gap-2 bg-bronze hover:bg-bronze-dark text-white text-sm font-semibold px-6 py-3 rounded-full transition shadow-lifted">
                            Koleksiyonu Gör
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                        </a>
                    </div>
                </div>
            `;
            wrapper.appendChild(slide);
        });

        if (typeof Swiper === 'undefined') {
            console.error('Swiper library not loaded');
            return;
        }

        new Swiper('.mySwiper', {
            loop: true,
            autoplay: {
                delay: 4500,
                disableOnInteraction: false,
                pauseOnMouseEnter: true
            },
            centeredSlides: true,
            slidesPerView: 1,
            spaceBetween: 0,
            effect: 'fade',
            fadeEffect: { crossFade: true },
            speed: 900,
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            }
        });
    } catch (err) {
        console.error('Slider verisi alınamadı', err);
    }
}

// ============================================================
// KUMAŞ KARTLARI
// ============================================================
function createFabricCard(fabric) {
    const inStock = fabric.stok_durumu === 'evet';
    const name = esc(fabric.isim);
    const aciklama = fabric.aciklama
        ? esc(fabric.aciklama)
        : '<span class="text-ink-muted">Açıklama yakında eklenecek.</span>';
    return `
        <article class="fabric-card group bg-white rounded-2xl overflow-hidden shadow-soft">
            <div class="relative h-60 overflow-hidden">
                <img src="${esc(safeImg(fabric.kartela_resmi))}" alt="${name} kartela" loading="lazy"
                     onerror="this.onerror=null;this.src='${FALLBACK_IMG}';"
                     class="img-layer img-front absolute inset-0 w-full h-full object-cover" />
                <img src="${esc(safeImg(fabric.ikinci_resim))}" alt="${name} detay" loading="lazy"
                     onerror="this.onerror=null;this.src='${FALLBACK_IMG}';"
                     class="img-layer img-back absolute inset-0 w-full h-full object-cover" />
                <span class="absolute top-3 left-3 z-10 text-xs font-semibold px-3 py-1 rounded-full backdrop-blur ${inStock ? 'bg-white/90 text-ink' : 'bg-ink/80 text-cream'}">
                    ${inStock ? '● Stokta Var' : 'Stok Tükendi'}
                </span>
            </div>
            <div class="p-5">
                <h3 class="font-display text-xl font-bold text-ink">${name}</h3>
                <p class="text-sm leading-relaxed text-ink-soft mt-2">${aciklama}</p>
                <div class="mt-4 pt-4 border-t border-cream-dark flex items-center justify-between">
                    <span class="text-xs uppercase tracking-wider text-ink-muted">Top & Kesmece</span>
                    <a href="iletisim.html" class="inline-flex items-center gap-1 text-sm font-semibold text-bronze-dark hover:text-ink transition">
                        Teklif Al
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    </a>
                </div>
            </div>
        </article>
    `;
}

// Yükleniyor / boş / hata durum arayüzleri (grid içine col-span-full ile oturur).
function skeletonCards(n) {
    let s = '';
    for (let i = 0; i < n; i++) {
        s += '<div class="fabric-card bg-white rounded-2xl overflow-hidden shadow-soft">' +
             '<div class="h-60 animate-pulse bg-cream-dark"></div>' +
             '<div class="p-5 space-y-3">' +
             '<div class="h-5 w-2/3 rounded animate-pulse bg-cream-dark"></div>' +
             '<div class="h-3 w-full rounded animate-pulse bg-cream-dark"></div>' +
             '<div class="h-3 w-4/5 rounded animate-pulse bg-cream-dark"></div>' +
             '</div></div>';
    }
    return s;
}
function emptyBlock(title, msg) {
    return '<div class="col-span-full text-center py-16">' +
        '<p class="font-display text-lg font-bold text-ink mb-1">' + esc(title) + '</p>' +
        '<p class="text-sm text-ink-muted">' + esc(msg) + '</p></div>';
}
function errorBlock(msg) {
    return '<div class="col-span-full text-center py-16">' +
        '<p class="font-display text-lg font-bold text-red-700 mb-1">Ürünler yüklenemedi</p>' +
        '<p class="text-sm text-ink-muted">' + esc(msg) + '</p></div>';
}
function hideSliderSection() {
    const s = $('#slider-section');
    if (s) s.style.display = 'none';
}

// Ana sayfa vitrini — en fazla 6 ürün, backend sira sırası korunur (API sıralı döner).
function setVitrinLoading() {
    const c = $('#vitrin-container');
    if (c) c.innerHTML = skeletonCards(6);
}
function setVitrinError() {
    const c = $('#vitrin-container');
    if (c) c.innerHTML = errorBlock('Lütfen daha sonra tekrar deneyin.');
}
function renderVitrin(fabrics) {
    const container = $('#vitrin-container');
    if (!container) return;
    const list = fabrics || [];
    if (!list.length) {
        container.innerHTML = emptyBlock('Henüz ürün yok', 'Yakında koleksiyonumuz vitrinde olacak.');
        return;
    }
    container.innerHTML = list.slice(0, 6).map(createFabricCard).join('');
}

// Kumaşlar sayfası (filtre + grid) — kategori filtresi GERÇEK veriden üretilir.
function setKumaslarLoading() {
    const c = $('#kumaslar-container');
    if (c) c.innerHTML = skeletonCards(6);
}
function setKumaslarError() {
    const c = $('#kumaslar-container');
    if (c) c.innerHTML = errorBlock('Lütfen sayfayı yenileyip tekrar deneyin.');
}
function buildCategoryFilter(fabrics) {
    const ul = $('#kumas-turleri');
    if (!ul) return;
    const seen = new Set();
    const cats = [];
    (fabrics || []).forEach((f) => {
        if (f.tur && !seen.has(f.tur)) { seen.add(f.tur); cats.push({ tur: f.tur, label: f.kategori }); }
    });
    cats.sort((a, b) => a.label.localeCompare(b.label, 'tr'));
    let html = '<li data-tur="all" class="filter-item active px-3 py-2 rounded-lg font-medium">Tüm Kumaşlar</li>';
    cats.forEach((c) => {
        html += `<li data-tur="${esc(c.tur)}" class="filter-item px-3 py-2 rounded-lg font-medium">${esc(c.label)}</li>`;
    });
    ul.innerHTML = html;
}
function initKumaslarPage(fabrics) {
    const container = $('#kumaslar-container');
    if (!container) return;

    tumKumaslar = fabrics || [];
    buildCategoryFilter(tumKumaslar);
    displayFabrics('all');

    const typesList = $('#kumas-turleri');
    if (typesList && !typesList.dataset.bound) {
        typesList.dataset.bound = '1';
        typesList.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (!li) return;
            $$('#kumas-turleri li').forEach(item => item.classList.remove('active'));
            li.classList.add('active');
            displayFabrics(li.dataset.tur);
        });
    }
}

function displayFabrics(filter) {
    const container = $('#kumaslar-container');
    if (!container) return;

    const arr = (!filter || filter === 'all')
        ? tumKumaslar
        : tumKumaslar.filter(k => k.tur === filter);

    if (!arr.length) {
        container.innerHTML = emptyBlock('Kumaş bulunamadı', 'Bu türde yayınlanmış ürün henüz yok.');
        return;
    }

    container.innerHTML = arr.map(createFabricCard).join('');
}

// ============================================================
// CHATBOT
// ============================================================
function initializeChatbot() {
    const chatbotWidget = $('#chatbot-widget');
    const chatbotToggle = $('#chatbot-toggle');
    const chatbotClose = $('#chatbot-close');
    const chatbotSend = $('#chatbot-send');
    const chatbotInput = $('#chatbot-input');

    // Chatbot bu sayfada yoksa çık
    if (!chatbotWidget || !chatbotToggle || !chatbotClose || !chatbotSend || !chatbotInput) return;

    chatbotToggle.addEventListener('click', function () {
        chatbotWidget.classList.remove('hidden');
        chatbotWidget.classList.add('flex');
        chatbotToggle.classList.add('hidden');
        chatbotInput.focus();
    });

    chatbotClose.addEventListener('click', function () {
        chatbotWidget.classList.add('hidden');
        chatbotWidget.classList.remove('flex');
        chatbotToggle.classList.remove('hidden');
    });

    chatbotSend.addEventListener('click', sendMessage);

    chatbotInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') sendMessage();
    });

    addMessage("Merhaba 👋 Zen Kumaş'a hoş geldiniz. Size nasıl yardımcı olabilirim?", "bot");
    addQuickChips(['Kumaşlar', 'Fiyat', 'Teslimat', 'İletişim']);
}

function addMessage(text, sender = "bot") {
    const chatbotMessages = $('#chatbot-messages');
    if (!chatbotMessages) return;

    const messageElement = document.createElement("div");
    messageElement.className = sender === "user" ? "text-right" : "text-left";
    messageElement.innerHTML = `<span class="chat-msg ${sender === 'user' ? 'msg-user' : 'msg-bot'}">${text}</span>`;

    chatbotMessages.appendChild(messageElement);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function addTypingIndicator() {
    const chatbotMessages = $('#chatbot-messages');
    if (!chatbotMessages) return null;
    const el = document.createElement("div");
    el.className = "text-left";
    el.id = "typing-indicator";
    el.innerHTML = `
        <span class="chat-msg msg-bot">
            <span class="typing-dot"></span><span class="typing-dot mx-1"></span><span class="typing-dot"></span>
        </span>`;
    chatbotMessages.appendChild(el);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    return el;
}

function addQuickChips(chips) {
    const chatbotMessages = $('#chatbot-messages');
    if (!chatbotMessages) return;
    const row = document.createElement("div");
    row.className = "flex flex-wrap gap-1.5 pt-1";
    chips.forEach(label => {
        const chip = document.createElement("button");
        chip.className = "chat-chip";
        chip.textContent = label;
        chip.addEventListener('click', () => {
            row.remove();
            sendText(label);
        });
        row.appendChild(chip);
    });
    chatbotMessages.appendChild(row);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function sendMessage() {
    const chatbotInput = $('#chatbot-input');
    if (!chatbotInput) return;
    const text = chatbotInput.value.trim();
    if (!text) return;
    chatbotInput.value = "";
    sendText(text);
}

function sendText(text) {
    addMessage(text, "user");
    botReply(text);
}

function botReply(userMsg) {
    const msg = userMsg.toLowerCase();
    let response = "Bunu anlayamadım, dilerseniz iletişim sayfamızdan bize ulaşabilirsiniz. 🌸";

    const responses = [
        { keys: ["merhaba", "selam", "iyi günler"], text: "Merhaba 👋 Zen Kumaş'a hoş geldiniz. Kumaş, fiyat, teslimat gibi konularda yardımcı olabilirim." },
        { keys: ["kumaş", "çeşit", "vitrin", "koleksiyon"], text: "Soho, Babyface, Yönsüz Luna, Coco, Otto, Anka, Puffy, Zuma ve Santa koleksiyonlarımız mevcut. <a href='kumaslar.html' class='underline font-semibold'>Kumaşlar</a> sayfasından inceleyebilirsiniz." },
        { keys: ["fiyat", "price", "kaç lira", "ne kadar"], text: "Fiyatlarımız kumaş türüne ve metrajına göre değişiyor. Top alımlarda özel fiyat veriyoruz. Detay için: 0 (532) 708 16 25" },
        { keys: ["adres", "nerede", "konum"], text: "Adresimiz: Altınova Fuar Caddesi No:61 Ofis No 5236, Osmangazi/Bursa." },
        { keys: ["telefon", "numara", "ara"], text: "Bize 0 (532) 708 16 25 numarasından ulaşabilirsiniz." },
        { keys: ["mail", "e-posta", "eposta"], text: "E-posta adresimiz: emiir1230@gmail.com" },
        { keys: ["çalışma", "saat"], text: "Pazartesi-Cuma 09:00-18:00, Cumartesi 09:00-13:00 arası hizmet veriyoruz." },
        { keys: ["kampanya", "indirim"], text: "Şu an top ve kesmece kumaşlarda %10 indirim mevcut! 🎉" },
        { keys: ["teslimat", "kargo", "sipariş"], text: "Siparişleriniz 2-5 iş günü içerisinde adresinize teslim edilir." },
        { keys: ["iade", "değişim"], text: "Kumaşlarda 14 gün içerisinde koşulsuz iade hakkınız vardır." },
        { keys: ["top", "kesmece", "metraj"], text: "Tüm kumaşlarımız hem top hem de kesmece (metraj) olarak satılmaktadır. İhtiyacınız olan metrajı belirtmeniz yeterli." },
        { keys: ["yardım", "destek"], text: "Kumaş, fiyat, teslimat veya iletişim konularında size yardımcı olabilirim. Sorun yeter 😊" }
    ];

    for (const item of responses) {
        if (item.keys.some(k => msg.includes(k))) {
            response = item.text;
            break;
        }
    }

    const typing = addTypingIndicator();
    setTimeout(() => {
        if (typing) typing.remove();
        addMessage(response, "bot");
        if (/anlayamadım/.test(response)) addQuickChips(['Kumaşlar', 'Fiyat', 'İletişim']);
    }, 700);
}
