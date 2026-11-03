// ============================================================
// Zen Kumaş - Ürün Ekle / Düzenle (Aşama 3)
// Yalnızca admin/urun-duzenle.html üzerinde çalışır.
// Oluşturma: POST /api/admin/kumaslar  (yeni ürün daima yayinda:false → taslak)
// Düzenleme: GET /api/admin/kumaslar/:id, PUT /api/admin/kumaslar/:id (yalnız DEĞİŞEN alanlar)
// Yayın:     POST /api/admin/kumaslar/:id/yayinla | /taslak
// Silme:     DELETE /api/admin/kumaslar/:id (onaylı)
// Fotoğraf yönetimi (yükleme/ana/silme) Aşama 4 modülündedir: assets/js/admin-photos.js.
// Bu dosya ürünü yükler ve foto listesini modüle iletir (renderPhotos → zenAdminPhotos.render).
// Alan adları ve doğrulama backend sözleşmesinden alınmıştır.
// ============================================================

(function () {
    'use strict';

    const form = document.getElementById('product-form');
    if (!form) return;

    const zenApi = window.zenApi;
    const zen = window.zenAdmin;
    const toast = window.zenToast;

    const params = new URLSearchParams(location.search);
    const rawId = params.get('id');
    const editId = rawId && /^\d+$/.test(rawId) ? parseInt(rawId, 10) : null;
    const isEdit = editId !== null;

    // Alan elemanları
    const F = {
        adi: document.getElementById('f-adi'),
        kategori: document.getElementById('f-kategori'),
        renk: document.getElementById('f-renk'),
        fiyat: document.getElementById('f-fiyat'),
        stok: document.getElementById('f-stok'),
        aciklama: document.getElementById('f-aciklama'),
    };
    const saveBtn = document.getElementById('btn-save');
    const statusStrip = document.getElementById('status-strip');
    const statusBadge = document.getElementById('status-badge');
    const publishBtn = document.getElementById('btn-publish-toggle');
    const deleteBtn = document.getElementById('btn-delete');
    const loadError = document.getElementById('load-error');

    // Yüklendiği andaki değerler (diff için referans)
    let initial = null;
    let published = false;
    let currentName = '';
    let currentFotoAdedi = 0;

    const LIMITS = { adi: 255, kategori: 100, renk: 100, aciklama: 2000 };

    // ---------------- Alan hataları ----------------
    function clearErrors() {
        form.querySelectorAll('.admin-field-error').forEach((e) => { e.textContent = ''; e.classList.add('hidden'); });
        Object.values(F).forEach((el) => el && el.classList.remove('border-red-400'));
    }
    function fieldError(el, msg) {
        if (!el) return;
        el.classList.add('border-red-400');
        const box = form.querySelector(`.admin-field-error[data-error-for="${el.id.replace('f-', '')}"]`);
        if (box) { box.textContent = msg; box.classList.remove('hidden'); }
    }

    function validate() {
        clearErrors();
        let ok = true;
        const adi = F.adi.value.trim();
        if (adi.length < 2 || adi.length > LIMITS.adi) { fieldError(F.adi, 'Ürün adı 2-255 karakter olmalı.'); ok = false; }
        const fiyat = F.fiyat.value.trim();
        const fiyatNum = Number(fiyat);
        if (fiyat === '' || !Number.isFinite(fiyatNum) || fiyatNum < 0) { fieldError(F.fiyat, 'Geçerli, sıfır veya üzeri bir fiyat girin.'); ok = false; }
        if (F.kategori.value.trim().length > LIMITS.kategori) { fieldError(F.kategori, 'Kategori en fazla 100 karakter.'); ok = false; }
        if (F.renk.value.trim().length > LIMITS.renk) { fieldError(F.renk, 'Renk en fazla 100 karakter.'); ok = false; }
        if (F.aciklama.value.length > LIMITS.aciklama) { fieldError(F.aciklama, `Açıklama en fazla ${LIMITS.aciklama} karakter.`); ok = false; }
        const stok = F.stok.value.trim();
        if (stok !== '') {
            const n = Number(stok);
            if (!Number.isInteger(n) || n < 0) { fieldError(F.stok, 'Stok tam sayı ve 0 veya üzeri olmalı.'); ok = false; }
        }
        return ok;
    }

    // ---------------- Diff (düzenleme) ----------------
    function normNum(v) { return v === '' || v === null || v === undefined ? null : Number(v); }

    function changedPayload() {
        const p = {};
        // Metin alanları: trim'lenmiş farklıysa gönder ('' → backend NULL'a çeker)
        if (F.adi.value.trim() !== initial.adi) p.kumas_adi = F.adi.value.trim();
        if (F.kategori.value.trim() !== initial.kategori) p.kumas_kategori = F.kategori.value.trim();
        if (F.renk.value.trim() !== initial.renk) p.kumas_renk = F.renk.value.trim();
        if (F.aciklama.value.trim() !== initial.aciklama) p.kumas_aciklama = F.aciklama.value.trim();
        // Sayısal alanlar
        if (normNum(F.fiyat.value.trim()) !== normNum(initial.fiyat)) p.kumas_fiyat = Number(F.fiyat.value.trim());
        if (normNum(F.stok.value.trim()) !== normNum(initial.stok)) {
            p.kumas_stok = F.stok.value.trim() === '' ? null : Number(F.stok.value.trim());
        }
        return p;
    }

    // ---------------- Formu doldurma ----------------
    function snapshot(k) {
        return {
            adi: k.kumas_adi || '',
            kategori: k.kumas_kategori || '',
            renk: k.kumas_renk && k.kumas_renk !== 'Bilinmiyor' ? k.kumas_renk : '',
            fiyat: k.kumas_fiyat === null || k.kumas_fiyat === undefined ? '' : String(k.kumas_fiyat),
            stok: k.kumas_stok === null || k.kumas_stok === undefined ? '' : String(k.kumas_stok),
            aciklama: k.kumas_aciklama || '',
        };
    }

    function fillForm(k) {
        const s = snapshot(k);
        F.adi.value = s.adi; F.kategori.value = s.kategori; F.renk.value = s.renk;
        F.fiyat.value = s.fiyat; F.stok.value = s.stok; F.aciklama.value = s.aciklama;
        initial = s;
        published = !!k.yayinda;
        currentName = k.kumas_adi || '';
        currentFotoAdedi = Number(k.foto_adedi) || 0;
        renderStatus();
        renderPhotos(k.fotograflar || []);
    }

    function renderStatus() {
        if (!isEdit) return;
        statusStrip.classList.remove('hidden');
        statusBadge.className = 'admin-badge ' + (published ? 'admin-badge--live' : 'admin-badge--draft');
        statusBadge.textContent = published ? 'Yayında' : 'Taslak';
        publishBtn.innerHTML = published
            ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029M9.878 9.879l4.242 4.242M3 3l18 18"/></svg> Taslağa Al'
            : '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Yayınla';
        deleteBtn.classList.remove('hidden');
    }

    // Fotoğraf paneli Aşama 4 modülüne devredilir (assets/js/admin-photos.js).
    // Bu dosya yalnızca ürün yüklendiğinde foto listesini modüle iletir.
    function renderPhotos(fotolar) {
        if (!isEdit) return;
        if (window.zenAdminPhotos) window.zenAdminPhotos.render(fotolar || []);
    }

    // ---------------- Kaydet ----------------
    function setSaving(busy) {
        saveBtn.disabled = busy;
        saveBtn.innerHTML = busy
            ? '<span class="admin-spinner admin-spinner--dark"></span> Kaydediliyor…'
            : (isEdit ? 'Değişiklikleri Kaydet' : 'Ürünü Oluştur');
    }

    async function save() {
        if (!validate()) { toast('Lütfen formdaki hataları düzeltin.', 'error'); return; }

        if (!isEdit) { await createProduct(); }
        else { await updateProduct(); }
    }

    async function createProduct() {
        setSaving(true);
        // Backend sözleşmesi: gönderilmeyen alan varsayılana düşer.
        // Yeni ürün TASLAK başlar → yayinda:false açıkça gönderilir (model varsayılanı TRUE).
        const data = { kumas_adi: F.adi.value.trim(), kumas_fiyat: Number(F.fiyat.value.trim()), yayinda: false };
        if (F.kategori.value.trim()) data.kumas_kategori = F.kategori.value.trim();
        if (F.renk.value.trim()) data.kumas_renk = F.renk.value.trim();
        if (F.stok.value.trim() !== '') data.kumas_stok = Number(F.stok.value.trim());
        if (F.aciklama.value.trim()) data.kumas_aciklama = F.aciklama.value.trim();

        try {
            const res = await zenApi('/api/admin/kumaslar', { method: 'POST', body: data });
            const yeni = res.kumas || {};
            toast('Ürün oluşturuldu, taslak olarak kaydedildi.', 'success');
            if (yeni.id) {
                location.href = 'urun-duzenle.html?id=' + encodeURIComponent(yeni.id);
            } else {
                location.href = 'urunler.html';
            }
        } catch (err) {
            surfaceApiError(err);
            setSaving(false);
        }
    }

    async function updateProduct() {
        const payload = changedPayload();
        if (!Object.keys(payload).length) { toast('Kaydedilecek bir değişiklik yok.', 'info'); return; }
        setSaving(true);
        try {
            const res = await zenApi(`/api/admin/kumaslar/${editId}`, { method: 'PUT', body: payload });
            fillForm(res.kumas || {});
            toast('Ürün güncellendi.', 'success');
        } catch (err) {
            surfaceApiError(err);
        } finally {
            setSaving(false);
        }
    }

    // API doğrulama hatalarını alan bazlı göster
    function surfaceApiError(err) {
        clearErrors();
        const errors = err && err.data && Array.isArray(err.data.errors) ? err.data.errors : null;
        if (errors && errors.length) {
            const map = { kumas_adi: F.adi, kumas_kategori: F.kategori, kumas_renk: F.renk, kumas_fiyat: F.fiyat, kumas_stok: F.stok, kumas_aciklama: F.aciklama };
            const seen = {};
            errors.forEach((e) => { const el = map[e.path]; if (el && !seen[e.path]) { seen[e.path] = 1; fieldError(el, e.msg || 'Geçersiz değer.'); } });
            toast('Kayıt reddedildi: işaretli alanları kontrol edin.', 'error');
        } else {
            toast((err && err.message) || 'Kayıt başarısız oldu.', 'error');
        }
    }

    // ---------------- Yayınla / Taslağa al ----------------
    async function togglePublish() {
        const action = published ? 'taslak' : 'yayinla';
        const before = published ? 'Yayında' : 'Taslak';
        publishBtn.disabled = true;
        publishBtn.innerHTML = '<span class="admin-spinner admin-spinner--dark"></span>';
        try {
            const res = await zenApi(`/api/admin/kumaslar/${editId}/${action}`, { method: 'POST' });
            published = !!(res.kumas && res.kumas.yayinda);
            const after = published ? 'Yayında' : 'Taslak';
            renderStatus();
            toast(`Yayın durumu değişti: ${before} → ${after}.`, 'success');
        } catch (err) {
            toast((err && err.message) || 'İşlem başarısız oldu.', 'error');
            publishBtn.disabled = false;
            renderStatus();
        }
    }

    // ---------------- Sil ----------------
    async function doDelete() {
        try {
            const res = await zen.deleteKumasWithConfirm({ id: editId, kumas_adi: currentName, foto_adedi: currentFotoAdedi });
            if (res) location.href = 'urunler.html';
        } catch (err) {
            toast((err && err.message) || 'Ürün silinemedi.', 'error');
        }
    }

    // ---------------- Kategoriler (datalist) ----------------
    async function loadKategoriler() {
        const dl = document.getElementById('kategori-options');
        if (!dl) return;
        try {
            const data = await zenApi('/api/admin/kumaslar/kategoriler');
            ((data && data.kategoriler) || []).forEach((c) => {
                const opt = document.createElement('option');
                opt.value = c.kategori;
                dl.appendChild(opt);
            });
        } catch (err) { /* serbest metin alanı; başarısız olsa da elle girilebilir */ }
    }

    // ---------------- Başlat ----------------
    async function init() {
        document.getElementById('form-title').textContent = isEdit ? 'Ürünü Düzenle' : 'Yeni Ürün';
        document.getElementById('btn-save').textContent = isEdit ? 'Değişiklikleri Kaydet' : 'Ürünü Oluştur';

        if (!isEdit) {
            // Başlangıç durumu: taslak (yayında değil) — fotoğraf yok
            initial = { adi: '', kategori: '', renk: '', fiyat: '', stok: '', aciklama: '' };
            const draft = document.getElementById('create-hint');
            if (draft) draft.classList.remove('hidden');
            return;
        }

        try {
            const data = await zenApi(`/api/admin/kumaslar/${editId}`);
            if (!data || !data.kumas) throw new Error('Ürün bulunamadı.');
            fillForm(data.kumas);
            document.getElementById('form-subtitle').textContent = '#' + editId + ' · ' + (data.kumas.kumas_adi || '');
        } catch (err) {
            loadError.classList.remove('hidden');
            loadError.querySelector('[data-err-text]').textContent = (err && err.message) || 'Ürün yüklenemedi.';
            form.querySelectorAll('input,textarea,select').forEach((el) => { el.disabled = true; });
            saveBtn.disabled = true;
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (!zen.session.token()) return;

        form.addEventListener('submit', (e) => { e.preventDefault(); save(); });
        if (publishBtn) publishBtn.addEventListener('click', togglePublish);
        if (deleteBtn) deleteBtn.addEventListener('click', doDelete);

        // Fotoğraf sayısı değişince ürün silme onayındaki adet güncel kalsın (Aşama 4).
        document.addEventListener('zen:photo-count', (e) => {
            currentFotoAdedi = (e && e.detail && Number(e.detail.count)) || 0;
        });

        loadKategoriler();
        init();
    });
})();
