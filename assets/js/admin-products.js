// ============================================================
// Zen Kumaş - Ürün Listeleme (Aşama 3)
// Yalnızca admin/urunler.html üzerinde çalışır.
// Gerçek uçlar: GET /api/admin/kumaslar, GET /api/admin/kumaslar/kategoriler,
// POST /api/admin/kumaslar/:id/taslak, POST /api/admin/kumaslar/:id/yayinla,
// DELETE /api/admin/kumaslar/:id. Sabit örnek veri KULLANILMAZ.
// ============================================================

(function () {
    'use strict';

    const app = document.getElementById('products-app');
    if (!app) return;

    const zenApi = window.zenApi;
    const zen = window.zenAdmin;
    const esc = window.zenEscapeHtml;

    const PAGE_SIZE = 50;
    const state = { q: '', kategori: '', yayinda: '', limit: PAGE_SIZE, offset: 0 };

    let tbody, emptyBox, errBox, paginationEl, countEl, categoriesEl;
    let searchTimer = null;
    let loading = false;

    function buildQuery() {
        const p = new URLSearchParams();
        if (state.q) p.set('q', state.q);
        if (state.kategori) p.set('kategori', state.kategori);
        if (state.yayinda) p.set('yayinda', state.yayinda);
        p.set('limit', String(state.limit));
        p.set('offset', String(state.offset));
        return p.toString();
    }

    function setBusy(busy) {
        loading = busy;
        document.getElementById('list-refresh') &&
            document.getElementById('list-refresh').classList.toggle('opacity-50', busy);
    }

    // ---------------- Liste ----------------
    async function loadList() {
        if (loading) return;
        setBusy(true);
        showState('loading');
        try {
            const data = await zenApi('/api/admin/kumaslar?' + buildQuery());
            const kayitlar = (data && data.kayitlar) || [];
            const toplam = data && typeof data.toplam === 'number' ? data.toplam : null;
            if (!kayitlar.length) {
                showState('empty');
            } else {
                renderRows(kayitlar);
                showState('list');
            }
            updatePagination(toplam);
        } catch (err) {
            showState('error', err.message);
        } finally {
            setBusy(false);
        }
    }

    function showState(mode, message) {
        errBox.classList.toggle('hidden', mode !== 'error');
        if (mode === 'error') errBox.querySelector('[data-err-text]').textContent = message || 'Liste yüklenemedi.';
        emptyBox.classList.toggle('hidden', mode !== 'empty');
        // 'list' modunda tbody'YE DOKUNMA: satırlar renderRows() tarafından
        // zaten dolduruldu; burada temizlersek çizilmiş ürünler anında silinir
        // ve tablo bomboş kalır (kök neden buydu).
        if (mode === 'loading') tbody.innerHTML = skeletonRows(5);
        else if (mode !== 'list') tbody.innerHTML = '';
        app.dataset.state = mode;
    }

    function skeletonRows(n) {
        let html = '';
        for (let i = 0; i < n; i++) {
            html += `<tr>${Array.from({ length: 7 }).map(() =>
                '<td><span class="admin-skeleton" style="width:70%"></span></td>').join('')}</tr>`;
        }
        return html;
    }

    function renderRows(kayitlar) {
        // Önce temizle: yükleme iskeleti ve önceki sayfa/arama satırları kalmasin
        // (showState('list') artik tbody'ye dokunmuyor).
        tbody.innerHTML = '';
        const frag = document.createDocumentFragment();
        kayitlar.forEach((k) => frag.appendChild(buildRow(k)));
        tbody.appendChild(frag);
    }

    function buildRow(k) {
        const tr = document.createElement('tr');

        // Ürün (görsel + ad + renk)
        const tdUrun = document.createElement('td');
        const wrap = document.createElement('div');
        wrap.className = 'flex items-center gap-3 min-w-0';
        if (k.ana_foto_url) {
            const img = document.createElement('img');
            img.className = 'admin-thumb';
            img.src = k.ana_foto_url;
            img.alt = '';
            img.loading = 'lazy';
            wrap.appendChild(img);
        } else {
            const ph = document.createElement('div');
            ph.className = 'admin-thumb admin-thumb--empty';
            ph.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.5-4.5 3 3L16 10l4 4M4 6h16v12H4z"/></svg>';
            wrap.appendChild(ph);
        }
        const meta = document.createElement('div');
        meta.className = 'min-w-0';
        const nameEl = document.createElement('p');
        nameEl.className = 'font-medium text-ink truncate';
        nameEl.textContent = k.kumas_adi || '(isimsiz)';
        const renkEl = document.createElement('p');
        renkEl.className = 'text-xs text-ink-muted truncate';
        renkEl.textContent = k.kumas_renk && k.kumas_renk !== 'Bilinmiyor' ? k.kumas_renk : '';
        meta.append(nameEl, renkEl);
        wrap.appendChild(meta);
        tdUrun.appendChild(wrap);

        // Kategori
        const tdKat = document.createElement('td');
        tdKat.textContent = k.kumas_kategori || '—';

        // Fiyat
        const tdFiyat = document.createElement('td');
        tdFiyat.className = 'whitespace-nowrap font-medium text-ink';
        tdFiyat.textContent = zen.formatPrice(k.kumas_fiyat);

        // Stok
        const tdStok = document.createElement('td');
        tdStok.textContent = (k.kumas_stok === null || k.kumas_stok === undefined) ? '—' : String(k.kumas_stok);

        // Yayın durumu
        const tdDurum = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = 'admin-badge ' + (k.yayinda ? 'admin-badge--live' : 'admin-badge--draft');
        badge.textContent = k.yayinda ? 'Yayında' : 'Taslak';
        tdDurum.appendChild(badge);

        // Fotoğraf sayısı
        const tdFoto = document.createElement('td');
        tdFoto.innerHTML = `<span class="inline-flex items-center gap-1 text-ink-soft">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.9l.6-1.5A2 2 0 019.3 4h5.4a2 2 0 011.8 1.5L17.1 7H19a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><circle cx="12" cy="13" r="3"/></svg>
            ${esc(Number(k.foto_adedi) || 0)}</span>`;

        // İşlemler
        const tdAct = document.createElement('td');
        const actions = document.createElement('div');
        actions.className = 'admin-actions';

        const edit = document.createElement('a');
        edit.className = 'admin-iconbtn';
        edit.href = 'urun-duzenle.html?id=' + encodeURIComponent(k.id);
        edit.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.4-9.4a2 2 0 112.8 2.8L11 15H8v-3l6.6-6.4z"/></svg> Düzenle';

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'admin-iconbtn';
        toggle.dataset.action = k.yayinda ? 'draft' : 'publish';
        toggle.dataset.id = String(k.id);
        toggle.innerHTML = k.yayinda
            ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.879l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg> Taslağa Al'
            : '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Yayınla';

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'admin-iconbtn admin-iconbtn--danger';
        del.dataset.action = 'delete';
        del.dataset.id = String(k.id);
        del.dataset.name = k.kumas_adi || '';
        del.dataset.foto = String(Number(k.foto_adedi) || 0);
        del.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg> Sil';

        actions.append(edit, toggle, del);
        tdAct.appendChild(actions);

        tr.append(tdUrun, tdKat, tdFiyat, tdStok, tdDurum, tdFoto, tdAct);
        return tr;
    }

    // ---------------- Sayfalama ----------------
    function updatePagination(toplam) {
        const start = state.offset + 1;
        const shown = Math.min(state.offset + state.limit, toplam == null ? start : toplam);
        const info = paginationEl.querySelector('[data-pg-info]');
        info.textContent = toplam == null
            ? `${start}–${shown} gösteriliyor`
            : `${start}–${shown} / ${toplam} ürün`;

        const prev = paginationEl.querySelector('[data-pg-prev]');
        const next = paginationEl.querySelector('[data-pg-next]');
        prev.disabled = state.offset <= 0;
        next.disabled = toplam == null ? false : (state.offset + state.limit) >= toplam;
    }

    // ---------------- Kategoriler ----------------
    async function loadKategoriler() {
        try {
            const data = await zenApi('/api/admin/kumaslar/kategoriler');
            const list = (data && data.kategoriler) || [];
            const sel = state.kategori;
            categoriesEl.innerHTML = '<option value="">Tüm kategoriler</option>';
            list.forEach((c) => {
                const opt = document.createElement('option');
                opt.value = c.kategori;
                opt.textContent = `${c.kategori} (${c.adet})`;
                categoriesEl.appendChild(opt);
            });
            categoriesEl.value = sel;
            countEl.textContent = `${list.length} kategori`;
        } catch (err) {
            // Kategori filtresi kritik değil; sessiz geç, liste yine çalışır.
        }
    }

    // ---------------- İşlemler ----------------
    async function onRowAction(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn || btn.disabled) return;
        const action = btn.dataset.action;

        if (action === 'delete') {
            const kumas = { id: btn.dataset.id, kumas_adi: btn.dataset.name, foto_adedi: btn.dataset.foto };
            btn.disabled = true;
            try {
                const res = await zen.deleteKumasWithConfirm(kumas);
                if (res) {
                    // Silinen son kayıtsa bir önceki sayfaya çek
                    const toplam = state.offset + 1;
                    if (btn.closest('tbody').querySelectorAll('tr').length === 1 && state.offset > 0) {
                        state.offset = Math.max(0, state.offset - state.limit);
                    }
                    await loadList();
                    await loadKategoriler();
                } else {
                    btn.disabled = false; // vazgeçildi
                }
            } catch (err) {
                window.zenToast(err.message || 'Ürün silinemedi.', 'error');
                btn.disabled = false;
            }
            return;
        }

        if (action === 'publish' || action === 'draft') {
            const id = btn.dataset.id;
            const label = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span class="admin-spinner admin-spinner--dark"></span>';
            try {
                const res = await zenApi(`/api/admin/kumaslar/${id}/${action === 'publish' ? 'yayinla' : 'taslak'}`, { method: 'POST' });
                window.zenToast(res && res.message ? res.message : (action === 'publish' ? 'Ürün yayınlandı.' : 'Ürün taslağa alındı.'), 'success');
                await loadList();
            } catch (err) {
                window.zenToast(err.message || 'İşlem başarısız oldu.', 'error');
                btn.disabled = false;
                btn.innerHTML = label;
            }
        }
    }

    // ---------------- Başlatma ----------------
    document.addEventListener('DOMContentLoaded', () => {
        if (!zen.session.token()) return; // guard admin.js'de; çift istek atma

        tbody = document.getElementById('products-tbody');
        emptyBox = document.getElementById('products-empty');
        errBox = document.getElementById('products-error');
        paginationEl = document.getElementById('products-pagination');
        countEl = document.getElementById('kategori-count');
        categoriesEl = document.getElementById('filter-kategori');
        const searchEl = document.getElementById('filter-q');
        const statusEl = document.getElementById('filter-yayinda');

        searchEl.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                state.q = searchEl.value.trim();
                state.offset = 0;
                loadList();
            }, 350);
        });
        categoriesEl.addEventListener('change', () => { state.kategori = categoriesEl.value; state.offset = 0; loadList(); });
        statusEl.addEventListener('change', () => { state.yayinda = statusEl.value; state.offset = 0; loadList(); });

        document.getElementById('filter-reset').addEventListener('click', () => {
            state.q = ''; state.kategori = ''; state.yayinda = ''; state.offset = 0;
            searchEl.value = ''; categoriesEl.value = ''; statusEl.value = '';
            loadList();
        });

        paginationEl.querySelector('[data-pg-prev]').addEventListener('click', () => {
            state.offset = Math.max(0, state.offset - state.limit);
            loadList();
        });
        paginationEl.querySelector('[data-pg-next]').addEventListener('click', () => {
            state.offset += state.limit;
            loadList();
        });

        tbody.addEventListener('click', onRowAction);

        document.getElementById('btn-retry').addEventListener('click', loadList);

        loadKategoriler();
        loadList();
    });
})();
