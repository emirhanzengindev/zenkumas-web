// ============================================================
// Zen Kumaş - Main JavaScript
// Merkezi script: header, kullanıcı alanı, slider, kumaş kartları,
// filtreleme ve chatbot tüm sayfalarda bu dosyadan yönetilir.
// ============================================================

// Statik kumaş verisi - 9 kumaş türü, her biri 2 fotoğraf
const staticFabricData = [
    {
        id: 1,
        isim: "Soho",
        tur: "soho",
        aciklama: "Şık ve zarif desenleriyle dikkat çeken Soho kumaşımız, modern yaşam alanlarını şıklıkla tamamlar.",
        kartela_resmi: "assets/images/soho1.jpg",
        ikinci_resim: "assets/images/soho2.jpg",
        stok_durumu: "evet"
    },
    {
        id: 2,
        isim: "Babyface",
        tur: "babyface",
        aciklama: "Yumuşak dokusuyla bebek odaları ve yatak odaları için ideal olan Babyface kumaşımız.",
        kartela_resmi: "assets/images/babyface1.jpg",
        ikinci_resim: "assets/images/babyface2.jpg",
        stok_durumu: "evet"
    },
    {
        id: 3,
        isim: "Yönsüz Luna",
        tur: "yonsuz_luna",
        aciklama: "Yön içermeyen özelliğiyle kolay kullanım ve tasarruf sunan Yönsüz Luna kumaşımız.",
        kartela_resmi: "assets/images/luna1.jpg",
        ikinci_resim: "assets/images/luna2.jpg",
        stok_durumu: "evet"
    },
    {
        id: 4,
        isim: "Coco",
        tur: "coco",
        aciklama: "Doğal ve zarif desenleriyle Coco kumaşımız, rahatlık ve şıklığı bir araya getirir.",
        kartela_resmi: "assets/images/coco1.jpg",
        ikinci_resim: "assets/images/coco2.jpg",
        stok_durumu: "evet"
    },
    {
        id: 5,
        isim: "Otto",
        tur: "otto",
        aciklama: "Klasik ve modernin birleşimi olan Otto kumaşımız, her mekâna yakışır.",
        kartela_resmi: "assets/images/otto1.jpg",
        ikinci_resim: "assets/images/otto2.jpg",
        stok_durumu: "evet"
    },
    {
        id: 6,
        isim: "Anka",
        tur: "anka",
        aciklama: "Renk çeşitliliğiyle öne çıkan Anka kumaşımız, canlı ve enerjik mekânlar için idealdir.",
        kartela_resmi: "assets/images/anka1.jpg",
        ikinci_resim: "assets/images/anka2.jpg",
        stok_durumu: "evet"
    },
    {
        id: 7,
        isim: "Puffy",
        tur: "puffy",
        aciklama: "Kabarık dokusuyla fark yaratan Puffy kumaşımız, görsel olarak dikkat çeker.",
        kartela_resmi: "assets/images/puffy1.jpg",
        ikinci_resim: "assets/images/puffy2.jpg",
        stok_durumu: "evet"
    },
    {
        id: 8,
        isim: "Zuma",
        tur: "zuma",
        aciklama: "Geometrik desenleriyle modern tasarımları tamamlayan Zuma kumaşımız.",
        kartela_resmi: "assets/images/zuma1.jpg",
        ikinci_resim: "assets/images/zuma2.jpg",
        stok_durumu: "evet"
    },
    {
        id: 9,
        isim: "Santa",
        tur: "santa",
        aciklama: "Kutlama temalı desenleriyle Santa kumaşımız, özel mekânlar için idealdir.",
        kartela_resmi: "assets/images/santa1.jpg",
        ikinci_resim: "assets/images/santa2.jpg",
        stok_durumu: "evet"
    }
];

// Global değişkenler
let tumKumaslar = [];

// Kısa yardımcılar
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

// ============================================================
// UYGULAMA BAŞLATMA
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    updateUserInterface();
    initializeHeader();
    initializeChatbot();
    initializeReveal();

    // Sayfaya göre özel başlatmalar
    if ($('#swiper-wrapper')) loadSlider();
    if ($('#vitrin-container')) renderVitrin();
    if ($('#kumaslar-container')) initKumaslarPage();
});

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
async function loadSlider() {
    try {
        const wrapper = $('#swiper-wrapper');
        if (!wrapper) return;

        wrapper.innerHTML = '';

        const sliderFabrics = staticFabricData.slice(0, 5);

        sliderFabrics.forEach(fabric => {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide relative overflow-hidden';
            slide.innerHTML = `
                <img src="${fabric.kartela_resmi}" alt="${fabric.isim}"
                     class="absolute inset-0 w-full h-full object-cover" />
                <div class="hero-overlay absolute inset-0"></div>
                <div class="slide-content relative z-10 h-full flex flex-col justify-end p-8 md:p-14 max-w-2xl">
                    <p class="text-xs md:text-sm font-semibold uppercase tracking-[0.25em] text-bronze-light mb-3">Yeni Koleksiyon</p>
                    <h2 class="font-display text-3xl md:text-5xl font-bold text-cream text-shadow-hero mb-3">${fabric.isim}</h2>
                    <p class="text-sm md:text-base text-cream/90 leading-relaxed mb-6">${fabric.aciklama}</p>
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
    return `
        <article class="fabric-card group bg-white rounded-2xl overflow-hidden shadow-soft">
            <div class="relative h-60 overflow-hidden">
                <img src="${fabric.kartela_resmi}" alt="${fabric.isim} kartela" loading="lazy"
                     class="img-layer img-front absolute inset-0 w-full h-full object-cover" />
                <img src="${fabric.ikinci_resim}" alt="${fabric.isim} detay" loading="lazy"
                     class="img-layer img-back absolute inset-0 w-full h-full object-cover" />
                <span class="absolute top-3 left-3 z-10 text-xs font-semibold px-3 py-1 rounded-full backdrop-blur ${inStock ? 'bg-white/90 text-ink' : 'bg-ink/80 text-cream'}">
                    ${inStock ? '● Stokta Var' : 'Stok Tükendi'}
                </span>
            </div>
            <div class="p-5">
                <h3 class="font-display text-xl font-bold text-ink">${fabric.isim}</h3>
                <p class="text-sm leading-relaxed text-ink-soft mt-2">${fabric.aciklama || 'Açıklama bulunamadı.'}</p>
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

// Ana sayfa vitrini
function renderVitrin() {
    const container = $('#vitrin-container');
    if (!container) return;
    container.innerHTML = staticFabricData.map(createFabricCard).join('');
}

// Kumaşlar sayfası (filtre + grid)
function initKumaslarPage() {
    const container = $('#kumaslar-container');
    const typesList = $('#kumas-turleri');
    if (!container) return;

    tumKumaslar = staticFabricData;
    displayFabrics('all');

    if (typesList) {
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

    container.innerHTML = '';

    const arr = filter === 'all' ? tumKumaslar : tumKumaslar.filter(k => k.tur === filter);

    if (!arr.length) {
        container.innerHTML = '<p class="col-span-full text-center text-ink-muted py-16">Bu türde kumaş bulunamadı.</p>';
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
