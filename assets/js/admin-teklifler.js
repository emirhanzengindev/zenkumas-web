// ============================================================
// Zen Kumaş - Teklif Talepleri (admin/teklifler.html)
// Uçlar: GET /api/admin/teklifler?durum=&limit=&offset=
//        PATCH /api/admin/teklifler/:id { durum }
// Müşteri girdisi (ad, mesaj vb.) HER ZAMAN zenEscapeHtml ile basılır.
// ============================================================

(function () {
    'use strict';

    const app = document.getElementById('leads-app');
    if (!app) return;

    const zenApi = window.zenApi;
    const esc = window.zenEscapeHtml;

    const PAGE_SIZE = 25;
    const state = { durum: '', offset: 0 };
    const DURUM_ETIKET = { yeni: 'Yeni', okundu: 'Okundu', tamamlandi: 'Tamamlandı' };
    const KAYNAK_ETIKET = { iletisim: 'İletişim sayfası', anasayfa: 'Ana sayfa' };

    const listEl = document.getElementById('leads-list');
    const emptyEl = document.getElementById('leads-empty');
    const errEl = document.getElementById('leads-error');
    const pagEl = document.getElementById('leads-pagination');
    const newCountEl = document.getElementById('leads-new-count');
    const mailNoteEl = document.getElementById('leads-mail-note');

    // HTML NİTELİĞİ (href="...") için kaçış: zenEscapeHtml çift tırnağı kaçırmaz,
    // nitelik içine giden müşteri verisi bu fonksiyondan geçer.
    const attr = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const tarihSaat = (v) => {
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? '—'
            : d.toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // Telefonu tel: bağlantısına çevirirken yalnızca rakam ve + kalsın.
    const telHref = (t) => 'tel:' + String(t).replace(/[^0-9+]/g, '');
    // WhatsApp için TR numarasını 90'lı biçime çevir (0532... → 90532...).
    const waHref = (t) => {
        let n = String(t).replace(/\D/g, '');
        if (n.startsWith('0')) n = '9' + n;
        else if (n.length === 10) n = '90' + n;
        return 'https://wa.me/' + n;
    };

    function kart(t) {
        const tarih = tarihSaat(t.created_at);
        const iletisim = [
            t.telefon ? `<a class="underline hover:text-bronze" href="${attr(telHref(t.telefon))}">${esc(t.telefon)}</a>
                         · <a class="underline hover:text-bronze" href="${attr(waHref(t.telefon))}" target="_blank" rel="noopener">WhatsApp</a>` : '',
            t.email ? `<a class="underline hover:text-bronze" href="mailto:${attr(t.email)}">${esc(t.email)}</a>` : '',
        ].filter(Boolean).join(' · ');

        const butonlar = Object.keys(DURUM_ETIKET)
            .filter((d) => d !== t.durum)
            .map((d) => `<button type="button" class="admin-iconbtn" data-id="${attr(t.id)}" data-durum="${d}">${DURUM_ETIKET[d]} yap</button>`)
            .join('');

        return `
            <article class="admin-card p-4 sm:p-5 ${t.durum === 'yeni' ? 'ring-2 ring-bronze/40' : ''}">
                <div class="flex flex-wrap items-start justify-between gap-3 mb-2">
                    <div class="min-w-0">
                        <p class="font-semibold text-ink">${esc(t.ad_soyad)}
                            <span class="ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${t.durum === 'yeni' ? 'bg-bronze text-white' : 'bg-cream-dark text-ink-soft'}">${esc(DURUM_ETIKET[t.durum] || t.durum)}</span>
                        </p>
                        <p class="text-sm text-ink-soft mt-1">${iletisim}</p>
                    </div>
                    <p class="text-xs text-ink-muted text-right">${esc(tarih)}<br>${esc(KAYNAK_ETIKET[t.kaynak] || t.kaynak)}${t.konu ? ' · ' + esc(t.konu) : ''}</p>
                </div>
                <p class="text-sm text-ink whitespace-pre-line break-words">${esc(t.mesaj)}</p>
                <div class="flex flex-wrap gap-2 mt-4">${butonlar}</div>
            </article>`;
    }

    function goster(mod, mesaj) {
        emptyEl.classList.toggle('hidden', mod !== 'empty');
        errEl.classList.toggle('hidden', mod !== 'error');
        if (mod === 'error') errEl.querySelector('[data-err-text]').textContent = mesaj || '';
        if (mod !== 'list') listEl.innerHTML = '';
    }

    async function yukle() {
        app.classList.add('opacity-60');
        try {
            const q = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(state.offset) });
            if (state.durum) q.set('durum', state.durum);
            const data = await zenApi('/api/admin/teklifler?' + q.toString());

            mailNoteEl.classList.toggle('hidden', data.eposta_bildirimi !== false);
            newCountEl.textContent = !state.durum && data.yeniSayisi ? `${data.yeniSayisi} yeni talep` : '';

            if (!data.kayitlar.length) {
                goster('empty');
            } else {
                listEl.innerHTML = data.kayitlar.map(kart).join('');
                goster('list');
            }

            const bas = data.toplam ? state.offset + 1 : 0;
            const son = Math.min(state.offset + PAGE_SIZE, data.toplam);
            pagEl.querySelector('[data-pg-info]').textContent = `${bas}-${son} / ${data.toplam}`;
            pagEl.querySelector('[data-pg-prev]').disabled = state.offset === 0;
            pagEl.querySelector('[data-pg-next]').disabled = son >= data.toplam;
        } catch (err) {
            goster('error', err.message);
        } finally {
            app.classList.remove('opacity-60');
        }
    }

    listEl.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-durum]');
        if (!btn) return;
        btn.disabled = true;
        try {
            await zenApi('/api/admin/teklifler/' + encodeURIComponent(btn.dataset.id), {
                method: 'PATCH',
                body: { durum: btn.dataset.durum },
            });
            await yukle();
        } catch (err) {
            btn.disabled = false;
            alert(err.message);
        }
    });

    document.getElementById('filter-durum').addEventListener('change', (e) => {
        state.durum = e.target.value;
        state.offset = 0;
        yukle();
    });
    document.getElementById('btn-refresh').addEventListener('click', yukle);
    document.getElementById('btn-retry').addEventListener('click', yukle);
    pagEl.querySelector('[data-pg-prev]').addEventListener('click', () => {
        state.offset = Math.max(0, state.offset - PAGE_SIZE);
        yukle();
    });
    pagEl.querySelector('[data-pg-next]').addEventListener('click', () => {
        state.offset += PAGE_SIZE;
        yukle();
    });

    document.addEventListener('DOMContentLoaded', () => {
        if (window.zenAdmin.session.token()) yukle();
    });
})();
