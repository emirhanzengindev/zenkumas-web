// ============================================================
// Zen Kumaş - Yönetim Paneli Çekirdeği (Aşama 2)
// Oturum yönetimi, korumalı fetch, layout ve bildirimler.
//
// GÜVENLİK KURALLARI:
//  - Token yalnızca Authorization: Bearer başlığında taşınır; URL'e yazılmaz.
//  - Token/parola ASLA console'a basılmaz.
//  - Oturum sessionStorage'da tutulur (yeni sekme/penere sızmaz, sekme
//    kapanınca temizlenir). localStorage'daki müşteri 'user' anahtarıyla
//    karışmaz (zenAdminToken / zenAdminSession).
//  - Bu dosyadaki kontroller ARKA UÇ JWT doğrulamasının yerine geçmez;
//    yalnızca arayüz yönlendirmesidir. Asıl yetkilendirme backend'dedir.
// ============================================================

(function () {
    'use strict';

    const CFG = window.ZEN_CONFIG;

    // ---------- Yardımcılar ----------
    function escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str == null ? '' : String(str);
        return d.innerHTML;
    }
    window.zenEscapeHtml = escapeHtml;

    // ---------- Oturum ----------
    const session = {
        token() {
            return sessionStorage.getItem(CFG.tokenKey) || '';
        },
        email() {
            try {
                return (JSON.parse(sessionStorage.getItem(CFG.sessionKey)) || {}).email || '';
            } catch (e) {
                return '';
            }
        },
        save(token, email) {
            sessionStorage.setItem(CFG.tokenKey, token);
            sessionStorage.setItem(CFG.sessionKey, JSON.stringify({ email: email || '' }));
        },
        clear() {
            sessionStorage.removeItem(CFG.tokenKey);
            sessionStorage.removeItem(CFG.sessionKey);
        },
    };

    // ---------- API istekleri ----------
    // Basit HTTP hatalarını kullanıcı için anlamlı, gizli bilgisi olmayan
    // metinlere çevirir. Sunucu mesajı teknik içerik taşırsa genelleme yapılır.
    function friendlyError(status, body) {
        const msg = (body && (body.message || body.error)) || '';
        if (status === 401) return 'Oturum süresi doldu veya giriş geçersiz. Lütfen tekrar giriş yapın.';
        if (status === 403) return 'Bu işlem için erişim yetkiniz yok.';
        if (status === 404) return msg && !/select|insert|update|delete|postgres|neon|table|column/i.test(msg) ? msg : 'İstenen kayıt bulunamadı.';
        if (status === 429) return 'Çok fazla deneme yaptınız. Lütfen birkaç dakika sonra tekrar deneyin.';
        if (status >= 500) return 'Sunucuda bir sorun oluştu. Lütfen biraz sonra tekrar deneyin.';
        return msg && !/at\s+[\w.\\/]+:\d+|errno|sql|stack/i.test(msg) ? msg : 'Beklenmeyen bir hata oluştu.';
    }

    // Admin API çağrısı: JWT başlığını ekler, JSON gövdeyı yönetir,
    // 401/403'te oturumu kapatıp girişe yönlendirir.
    async function api(path, options = {}) {
        const headers = { ...(options.headers || {}) };
        const token = session.token();
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const init = { method: options.method || 'GET', headers };
        if (options.body !== undefined) {
            if (options.body instanceof FormData) {
                init.body = options.body; // multipart: Content-Type BAŞLIKTA YOK (boundary tarayıcıdan)
            } else {
                headers['Content-Type'] = 'application/json';
                init.body = JSON.stringify(options.body);
            }
        }

        let res;
        try {
            res = await fetch(CFG.getApiBase() + path, init);
        } catch (e) {
            throw Object.assign(new Error('Sunucuya ulaşılamıyor. İnternet bağlantınızı ve API adresini kontrol edin.'), { status: 0 });
        }

        let data = null;
        const text = await res.text();
        if (text) {
            try { data = JSON.parse(text); } catch (e) { data = { message: text }; }
        }

        if (!res.ok) {
            if ((res.status === 401 || res.status === 403) && !location.pathname.includes('/admin/giris')) {
                session.clear();
                location.href = adminLoginUrl();
            }
            throw Object.assign(new Error(friendlyError(res.status, data)), { status: res.status, data });
        }
        return data;
    }
    window.zenApi = api;

    // Basit doğrulanmış GET (sayfa koruması ve genel bakış sayaçları için).
    async function apiGetIfAuthed(path) {
        if (!session.token()) return null;
        return api(path);
    }

    // Login sayfada kalır (yönlendirme yapmaz); diğer sayfalarda girişe kaçırır.
    function requireAuth() {
        if (!session.token()) {
            location.href = adminLoginUrl();
            return false;
        }
        return true;
    }

    // Korumalı admin sayfaları admin/ altında olduğundan girişe dönüş
    // daima AYNI klaseden ('giris.html') — kök müşteri girişi değil.
    function adminLoginUrl() {
        return 'giris.html';
    }

    // admin/ altındaki sayfalarda kök referansı ('../'), başka yerde ''
    function adminPrefix() {
        return /\/admin\/[^/]*$/.test(location.pathname) ? '../' : '';
    }
    window.zenAdminPrefix = adminPrefix;

    function logout() {
        session.clear();
        location.href = adminLoginUrl();
    }

    // ---------- Giriş eylemi ----------
    async function login(email, password) {
        const data = await api('/api/admin/login', {
            method: 'POST',
            body: { email, password },
        });
        if (!data || !data.token) throw new Error('Giriş yanıtında token alınamadı.');
        session.save(data.token, data.admin && data.admin.email);
        return data;
    }

    // ---------- Bildirim (toast) ----------
    function toast(message, type = 'success') {
        const old = document.querySelector('.zen-toast');
        if (old) old.remove();
        const el = document.createElement('div');
        el.className = 'zen-toast zen-toast--' + type;
        el.setAttribute('role', 'status');
        el.textContent = message;
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('visible'));
        setTimeout(() => {
            el.classList.remove('visible');
            setTimeout(() => el.remove(), 300);
        }, 3500);
    }
    window.zenToast = toast;

    // ---------- Biçimleyiciler ----------
    function formatPrice(v) {
        const n = Number(v);
        if (!Number.isFinite(n)) return '—';
        return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
    }

    function formatDate(v) {
        if (!v) return '—';
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) return '—';
        return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    window.zenFormatPrice = formatPrice;
    window.zenFormatDate = formatDate;

    // ---------- Onay modalı (tip-onaylı; geri dönüşü zor işlemler için) ----------
    // opts: { title, message, detail, requireText, confirmLabel, cancelLabel, danger }
    // requireText verildiyse kullanıcı tam olarak o metni girmeden onay açılmaz.
    function confirmDialog(opts) {
        return new Promise((resolve) => {
            const o = opts || {};
            const backdrop = document.createElement('div');
            backdrop.className = 'admin-modal-backdrop';

            const needType = typeof o.requireText === 'string' && o.requireText.length > 0;
            const box = document.createElement('div');
            box.className = 'admin-modal';
            box.setAttribute('role', 'dialog');
            box.setAttribute('aria-modal', 'true');

            const title = document.createElement('h3');
            title.className = 'admin-modal__title' + (o.danger ? ' admin-modal__danger-accent' : '');
            title.textContent = o.title || 'Onay';
            box.appendChild(title);

            const msg = document.createElement('p');
            msg.className = 'text-sm text-ink-soft leading-relaxed';
            msg.textContent = o.message || '';
            box.appendChild(msg);

            let input = null;
            if (needType) {
                const hint = document.createElement('p');
                hint.className = 'text-xs text-ink-muted mt-3 mb-1';
                hint.textContent = 'Onaylamak için ürün adını birebir yazın:';
                box.appendChild(hint);

                const detail = document.createElement('p');
                detail.className = 'text-sm font-semibold text-ink bg-cream rounded-lg px-3 py-2 mb-2 break-words';
                detail.textContent = o.requireText;
                box.appendChild(detail);

                input = document.createElement('input');
                input.type = 'text';
                input.className = 'admin-input mt-1';
                input.setAttribute('aria-label', 'Ürün adı ile onay');
                input.autocomplete = 'off';
                box.appendChild(input);
            } else if (o.detail) {
                const detail = document.createElement('p');
                detail.className = 'text-sm text-ink-soft mt-2 break-words';
                detail.textContent = o.detail;
                box.appendChild(detail);
            }

            const actions = document.createElement('div');
            actions.className = 'flex justify-end gap-2 mt-5';

            const cancel = document.createElement('button');
            cancel.type = 'button';
            cancel.className = 'admin-btn admin-btn--secondary';
            cancel.textContent = o.cancelLabel || 'Vazgeç';

            const confirm = document.createElement('button');
            confirm.type = 'button';
            confirm.className = 'admin-btn ' + (o.danger ? 'admin-iconbtn--danger !border-red-200 !text-red-700' : 'admin-btn--primary');
            confirm.textContent = o.confirmLabel || 'Onayla';
            if (needType) confirm.disabled = true;

            actions.append(cancel, confirm);
            box.appendChild(actions);
            backdrop.appendChild(box);
            document.body.appendChild(backdrop);
            requestAnimationFrame(() => backdrop.classList.add('open'));

            let done = false;
            function close(result) {
                if (done) return;
                done = true;
                document.removeEventListener('keydown', onKey);
                backdrop.classList.remove('open');
                setTimeout(() => backdrop.remove(), 200);
                resolve(result);
            }
            function onKey(e) { if (e.key === 'Escape') close(false); }
            document.addEventListener('keydown', onKey);
            backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(false); });
            cancel.addEventListener('click', () => close(false));
            confirm.addEventListener('click', () => close(true));
            if (needType) {
                input.addEventListener('input', () => {
                    confirm.disabled = input.value.trim() !== o.requireText.trim();
                });
                setTimeout(() => input.focus(), 60);
            }
        });
    }

    // ---------- Ürün silme (tip-onay + backend bulut temizliği) ----------
    async function deleteKumasWithConfirm(kumas) {
        const name = kumas.kumas_adi || '(isimsiz)';
        const foto = Number(kumas.foto_adedi) || 0;
        const ok = await confirmDialog({
            title: 'Ürünü sil',
            danger: true,
            requireText: name,
            confirmLabel: 'Kalıcı olarak sil',
            message: 'Bu işlem geri alınamaz. Ürün ve ona ait ' + foto +
                ' fotoğraf kaydı silinecek; buluttaki dosyaları backend temizleyecek.',
        });
        if (!ok) return null;
        const res = await api('/api/admin/kumaslar/' + kumas.id, { method: 'DELETE' });
        toast(res && res.message ? res.message : 'Ürün silindi.', 'success');
        return res;
    }

    // ---------- Panel layout'u (sol menü + mobil çekmece) ----------
    const NAV_ITEMS = [
        { key: 'dashboard', label: 'Genel Bakış', href: 'index.html', icon: 'M3 12l9-9 9 9M5 10v10h6v-6h2v6h6V10' },
        { key: 'products', label: 'Ürünler', href: 'urunler.html', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
        { key: 'new', label: 'Yeni Ürün Ekle', href: 'urun-duzenle.html', icon: 'M12 4v16m8-8H4' },
    ];

    function renderLayout(activeKey) {
        const mount = document.getElementById('admin-layout');
        if (!mount) return;

        const links = NAV_ITEMS.map((item) => `
            <a href="${item.href}" class="admin-nav-link${item.key === activeKey ? ' active' : ''}">
                <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="${item.icon}"/>
                </svg>
                <span>${escapeHtml(item.label)}</span>
            </a>`).join('');

        mount.innerHTML = `
            <aside id="admin-sidebar" class="admin-sidebar">
                <div class="flex items-center gap-3 px-5 h-16 border-b border-white/10">
                    <span class="w-9 h-9 rounded-full bg-cream text-ink flex items-center justify-center font-display text-lg font-bold">Z</span>
                    <span class="font-display text-lg font-bold text-cream">ZEN <span class="text-bronze-light">KUMAŞ</span></span>
                </div>
                <nav class="flex-1 py-4 space-y-1 overflow-y-auto">${links}</nav>
                <div class="px-5 py-4 border-t border-white/10">
                    <p class="text-xs text-cream/50 truncate mb-3" id="admin-user-email" title="${escapeHtml(session.email())}">${escapeHtml(session.email())}</p>
                    <button type="button" data-admin-logout class="admin-logout">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                        </svg>
                        <span>Çıkış Yap</span>
                    </button>
                </div>
            </aside>
            <div id="admin-sidebar-backdrop" class="admin-backdrop hidden"></div>`;

        mount.querySelectorAll('[data-admin-logout]').forEach((b) => b.addEventListener('click', logout));

        const toggle = document.getElementById('admin-menu-toggle');
        const backdrop = document.getElementById('admin-sidebar-backdrop');
        const sidebar = document.getElementById('admin-sidebar');
        if (toggle && sidebar) {
            toggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
                backdrop.classList.toggle('hidden');
            });
            backdrop.addEventListener('click', () => {
                sidebar.classList.remove('open');
                backdrop.classList.add('hidden');
            });
        }
    }

    // ---------- Sayfa başlatma ----------
    document.addEventListener('DOMContentLoaded', () => {
        const body = document.body;

        // Giriş sayfası: oturumu olan kullanıcıyı panele al
        if (body.dataset.adminPage === 'login') {
            if (session.token()) location.href = 'index.html';
            return;
        }

        // Korumalı admin sayfaları: token yoksa girişe kaçır.
        // ESKİ VE TEHLİKELİ DESİNGEN: buraya asla localStorage('user')
        // rol kontrolü eklenmez — backend token'ı tek gerçektir.
        if (!requireAuth()) return;

        renderLayout(body.dataset.adminNav || '');
    });

    // Dışa açık (sayfa scriptleri ortak çekirdeği buradan kullanır)
    window.zenAdmin = {
        login, logout, session, requireAuth, apiGetIfAuthed,
        confirmDialog, deleteKumasWithConfirm, formatPrice, formatDate,
    };
})();
