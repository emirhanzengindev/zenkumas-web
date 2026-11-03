// ============================================================
// Zen Kumaş - Çoklu Fotoğraf Yönetimi (Aşama 4)
// Yalnızca admin/urun-duzenle.html (düzenleme modu) üzerinde çalışır.
//
// Backend sözleşmesi (değiştirilmez, olduğu gibi kullanılır):
//   GET    /api/admin/kumaslar/:id/fotograflar        → {success, fotograflar[]}
//   POST   /api/admin/kumaslar/:id/fotograflar/upload  → multipart, alan 'fotograflar', 201 {success, eklenen[], kumas}
//   PUT    /api/admin/kumaslar/:id/fotograflar/:fotoId/ana → {success, kumas, ana_foto}
//   DELETE /api/admin/kumaslar/:id/fotograflar/:fotoId → {success, ...}
//
// GÜVENLİK / DOĞRULUK:
//   - public_id VEYA sira ASLA istemciden belirlenmez; yalnızca /upload kullanılır
//     (JSON kayıt ucu dosya yükleme için KULLANILMAZ).
//   - FormData'ya Content-Type BAŞLIĞISet edilmez (boundary'yi tarayıcı kurar).
//   - Bearer token XHR'a elle yazılır; 401/403'te oturum kapatılır (api() ile aynı davranış).
//   - Dosya adı / API metni kontrolsüz HTML olarak basılmaz (textContent + nitelik property).
//   - Silme başarısız olursa kart arayüzden KALDIRILMAZ (sunucu verisiyle senkron kalır).
//   - Fotoğraf sıralama YOKTUR (backend'de sıralama ucu bulunmuyor).
// ============================================================

(function () {
    'use strict';

    const api = window.zenApi;
    const zen = window.zenAdmin;
    const toast = window.zenToast;

    const MAX_FILES = 10;                 // ürün başına toplam (backend FOTO_LIMITI ile aynı)
    const MAX_BYTES = 5 * 1024 * 1024;    // dosya başına 5 MB (backend limiti ile aynı)
    const EXT_AILESI = {
        '.jpg': 'jpeg', '.jpeg': 'jpeg', '.png': 'png', '.webp': 'webp', '.gif': 'gif',
    };
    const MIME_AILESI = {
        'image/jpeg': 'jpeg', 'image/jpg': 'jpeg', 'image/pjpeg': 'jpeg',
        'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    };

    const params = new URLSearchParams(location.search);
    const rawId = params.get('id');
    const editId = rawId && /^\d+$/.test(rawId) ? parseInt(rawId, 10) : null;

    // ---------- Eleman referansları ----------
    const el = (id) => document.getElementById(id);
    let panel, note, countBadge, strip, dropzone, fileInput, previewWrap,
        progressWrap, progressBar, progressText, uploadBtn, clearBtn;
    let refsReady = false;

    // ---------- Durum ----------
    let photos = [];        // sunucudan gelen kayıtlı fotoğraflar
    let selected = [];      // bekleyen seçimler: {file, url}
    let busy = false;       // yükleme/işlem sürüyor mu

    function collectRefs() {
        panel = el('photo-panel');
        if (!panel) return false;
        note = el('photo-note');
        countBadge = el('photo-count-badge');
        strip = el('photo-strip');
        dropzone = el('photo-dropzone');
        fileInput = el('photo-input');
        previewWrap = el('photo-preview-strip');
        progressWrap = el('photo-progress');
        progressBar = el('photo-progress-bar');
        progressText = el('photo-progress-text');
        uploadBtn = el('photo-upload-btn');
        clearBtn = el('photo-clear-btn');
        return true;
    }

    // ---------- Yardımcılar ----------
    function extAile(name) {
        const s = String(name || '').toLowerCase();
        const i = s.lastIndexOf('.');
        return i === -1 ? undefined : EXT_AILESI[s.slice(i)];
    }
    function mimeAile(file) {
        return MIME_AILESI[String((file && file.type) || '').toLowerCase()];
    }
    function fmtSize(bytes) {
        if (!Number.isFinite(bytes)) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    function setBusy(state) {
        busy = state;
        if (dropzone) dropzone.classList.toggle('admin-dropzone--disabled', state);
        if (uploadBtn) uploadBtn.disabled = state || selected.length === 0;
        if (clearBtn) clearBtn.disabled = state;
    }
    function syncCount() {
        if (countBadge) countBadge.textContent = photos.length + ' / ' + MAX_FILES;
        document.dispatchEvent(new CustomEvent('zen:photo-count', { detail: { count: photos.length } }));
    }

    // ---------- Kayıtlı fotoğrafları çiz ----------
    function render(list) {
        photos = Array.isArray(list) ? list.slice(0, MAX_FILES) : [];
        if (panel) panel.classList.remove('hidden');
        if (strip) strip.innerHTML = '';
        if (!strip) return;

        const n = photos.length;
        if (note) {
            note.textContent = n === 0
                ? 'Bu üründe henüz fotoğraf yok. Aşağıdan yükleyebilirsiniz.'
                : n + ' fotoğraf yüklü. Ana fotoğraf vitrin kapağı olarak kullanılır.';
        }

        photos.forEach((f) => {
            const cell = document.createElement('div');
            cell.className = 'admin-photo-cell' + (f.ana ? ' admin-photo-cell--primary' : '');
            cell.dataset.fotoId = String(f.id);

            const img = document.createElement('img');
            img.src = f.url;
            img.alt = 'Ürün fotoğrafı';
            img.loading = 'lazy';
            cell.appendChild(img);

            if (f.ana) {
                const tag = document.createElement('span');
                tag.className = 'admin-photo-cell__primary';
                tag.textContent = 'Ana';
                cell.appendChild(tag);
            }

            const actions = document.createElement('div');
            actions.className = 'admin-photo-cell__actions';

            if (!f.ana) {
                const makePrimary = document.createElement('button');
                makePrimary.type = 'button';
                makePrimary.className = 'admin-photobtn';
                makePrimary.title = 'Ana fotoğraf yap';
                makePrimary.setAttribute('aria-label', 'Ana fotoğraf yap');
                makePrimary.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.5c.2-.5 1.04-.5 1.24 0l1.9 4.2c.14.32.48.52.84.5l4.6-.3c.54-.04.82.62.42.98l-3.5 3a.7.7 0 00-.2.8l1.3 4.4c.16.52-.42.94-.88.66l-4-2.4a.7.7 0 00-.8 0l-4 2.4c-.46.28-1.04-.14-.88-.66l1.3-4.4a.7.7 0 00-.2-.8l-3.5-3c-.4-.36-.12-1.02.42-.98l4.6.3c.36.02.7-.18.84-.5z"/></svg>';
                makePrimary.addEventListener('click', () => setPrimary(f.id));
                actions.appendChild(makePrimary);
            }

            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'admin-photobtn admin-photobtn--danger';
            del.title = 'Fotoğrafı sil';
            del.setAttribute('aria-label', 'Fotoğrafı sil');
            del.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>';
            del.addEventListener('click', () => removePhoto(f.id, !!f.ana));
            actions.appendChild(del);

            cell.appendChild(actions);
            strip.appendChild(cell);
        });

        syncCount();
    }

    // ---------- Önizleme (bekleyen seçimler) ----------
    function renderPreviews() {
        if (!previewWrap) return;
        previewWrap.innerHTML = '';
        if (!selected.length) { previewWrap.classList.add('hidden'); toggleClear(false); updateUploadBtn(); return; }
        previewWrap.classList.remove('hidden');

        selected.forEach((s, idx) => {
            const cell = document.createElement('div');
            cell.className = 'admin-photo-preview__cell';

            const img = document.createElement('img');
            img.src = s.url;
            img.alt = 'Yüklenecek önizleme';
            cell.appendChild(img);

            const rm = document.createElement('button');
            rm.type = 'button';
            rm.className = 'admin-photo-preview__remove';
            rm.title = 'Seçimden çıkar';
            rm.setAttribute('aria-label', 'Seçimden çıkar');
            rm.textContent = '×';
            rm.addEventListener('click', () => dropSelection(idx));
            cell.appendChild(rm);

            const cap = document.createElement('span');
            cap.className = 'admin-photo-preview__meta';
            cap.textContent = fmtSize(s.file.size);
            cap.title = s.file.name; // statik nitelik; HTML'e enjekte edilmez
            cell.appendChild(cap);

            previewWrap.appendChild(cell);
        });
        toggleClear(true);
        updateUploadBtn();
    }
    function toggleClear(show) { if (clearBtn) clearBtn.classList.toggle('hidden', !show); }
    function updateUploadBtn() { if (uploadBtn) uploadBtn.disabled = busy || selected.length === 0; }

    // ---------- Dosya seçimi + doğrulama ----------
    function addFiles(fileList) {
        if (!fileList || !fileList.length) return;
        const incoming = Array.from(fileList);
        const kalanSlot = Math.max(0, MAX_FILES - photos.length - selected.length);
        const rejected = [];
        let acceptedNow = 0;

        incoming.forEach((file) => {
            const name = String(file.name || '');
            const fam = extAile(name);
            const mfam = mimeAile(file);
            if (!fam) { rejected.push({ name, reason: 'Dosya türü desteklenmiyor (JPG, PNG, WEBP, GIF).' }); return; }
            if (mfam && mfam !== fam) { rejected.push({ name, reason: 'Uzantı ile dosya türü uyuşmuyor.' }); return; }
            if (file.size > MAX_BYTES) { rejected.push({ name, reason: 'Boyut 5 MB sınırını aşıyor (' + fmtSize(file.size) + ').' }); return; }

            if (acceptedNow >= kalanSlot) {
                rejected.push({ name, reason: 'Ürün başına en fazla ' + MAX_FILES + ' fotoğraf.' });
                return;
            }
            selected.push({ file, url: URL.createObjectURL(file) });
            acceptedNow++;
        });

        renderPreviews();

        if (rejected.length) {
            const first = rejected[0];
            toast(
                rejected.length + ' dosya alınmadı. Örnek: ' + first.name + ' — ' + first.reason,
                'error'
            );
        }
    }
    function dropSelection(idx) {
        const s = selected[idx];
        if (s) { try { URL.revokeObjectURL(s.url); } catch (e) { /* yoksay */ } }
        selected.splice(idx, 1);
        renderPreviews();
    }
    function clearSelections() {
        selected.forEach((s) => { try { URL.revokeObjectURL(s.url); } catch (e) { /* yoksay */ } });
        selected = [];
        renderPreviews();
        if (fileInput) fileInput.value = '';
    }

    // ---------- İlerleme ----------
    function showProgress(on) {
        if (!progressWrap) return;
        progressWrap.classList.toggle('hidden', !on);
        if (!on) { setProgress(0); }
    }
    function setProgress(pct) {
        const p = Math.max(0, Math.min(100, Math.round(pct || 0)));
        if (progressBar) progressBar.style.width = p + '%';
        if (progressText) progressText.textContent = p + '%';
    }

    // ---------- Yükleme (XHR → gerçek yüzde) ----------
    function uploadBase() {
        return (window.ZEN_CONFIG && window.ZEN_CONFIG.getApiBase) ? window.ZEN_CONFIG.getApiBase() : '';
    }
    function xhrFail(status, data) {
        let msg;
        if (data && data.message) msg = data.message;
        else if (status === 0) msg = 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.';
        else if (status === 413) msg = 'Dosya boyutu çok büyük. En fazla 5 MB yükleyebilirsiniz.';
        else if (status === 503) msg = 'Fotoğraf servisi şu an kullanılamıyor (yapılandırma/ortam hatası).';
        else if (status >= 500) msg = 'Sunucuda bir sorun oluştu. Lütfen biraz sonra tekrar deneyin.';
        else msg = 'Yükleme başarısız oldu.';
        return msg;
    }
    function doUpload() {
        if (busy || !selected.length || editId === null) return;

        const fd = new FormData();
        selected.forEach((s) => fd.append('fotograflar', s.file, s.file.name));

        setBusy(true);
        showProgress(true);
        setProgress(0);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadBase() + '/api/admin/kumaslar/' + editId + '/fotograflar/upload', true);
        const token = zen.session.token();
        if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        // Content-Type BAŞLIĞI SET EDİLMEZ → tarayıcı multipart boundary'yi kurar.
        xhr.timeout = 120000;

        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress((e.loaded / e.total) * 100); };

        const finish = () => { setBusy(false); showProgress(false); };

        xhr.onload = () => {
            let data = null;
            try { data = JSON.parse(xhr.responseText); } catch (e) { data = null; }
            const st = xhr.status;

            if (st === 401 || st === 403) { zen.session.clear(); location.href = 'giris.html'; return; }

            if (st >= 200 && st < 300 && data && data.success) {
                setProgress(100);
                toast(data.message || (selected.length + ' fotoğraf yüklendi.'), 'success');
                clearSelections();
                const list = data.kumas && Array.isArray(data.kumas.fotograflar) ? data.kumas.fotograflar : null;
                if (list) render(list); else refresh().then(finish, finish);
                if (list) finish();
                return;
            }

            // Başarısız: seçimleri KORU, net mesaj göster.
            finish();
            const msg = xhrFail(st, data);
            toast(msg, 'error');
        };
        xhr.onerror = () => { finish(); toast('Yükleme sırasında ağ hatası oluştu.', 'error'); };
        xhr.ontimeout = () => { finish(); toast('Yükleme zaman aşımına uğradı.', 'error'); };
        xhr.onabort = () => { finish(); };

        xhr.send(fd);
    }

    // ---------- Yenileme (yetkili liste) ----------
    function refresh() {
        if (editId === null) return Promise.resolve();
        return api('/api/admin/kumaslar/' + editId + '/fotograflar')
            .then((d) => { render((d && d.fotograflar) || []); })
            .catch((err) => { toast((err && err.message) || 'Fotoğraflar yenilenemedi.', 'error'); });
    }

    // ---------- Ana fotoğraf yap ----------
    function setPrimary(fotoId) {
        if (busy || editId === null) return;
        setBusy(true);
        const cell = strip && strip.querySelector('[data-foto-id="' + fotoId + '"]');
        if (cell) cell.classList.add('admin-photo-cell--busy');
        api('/api/admin/kumaslar/' + editId + '/fotograflar/' + fotoId + '/ana', { method: 'PUT' })
            .then(() => { toast('Ana fotoğraf güncellendi.', 'success'); return refresh(); })
            .catch((err) => { toast((err && err.message) || 'Ana fotoğraf değiştirilemedi.', 'error'); if (cell) cell.classList.remove('admin-photo-cell--busy'); })
            .then(() => { setBusy(false); });
    }

    // ---------- Fotoğraf sil (onaylı) ----------
    function removePhoto(fotoId, isAna) {
        if (busy || editId === null) return;
        const ok = zen.confirmDialog({
            title: 'Fotoğrafı sil',
            danger: true,
            confirmLabel: 'Sil',
            message: isAna
                ? 'Bu ANA fotoğraf. Silinince sıradaki fotoğraf ana olur ve vitrin kapağı değişir.'
                : 'Bu fotoğraf kalıcı olarak silinecek. Bu işlem geri alınamaz.',
        });
        Promise.resolve(ok).then((onay) => {
            if (!onay) return;
            setBusy(true);
            const cell = strip && strip.querySelector('[data-foto-id="' + fotoId + '"]');
            if (cell) cell.classList.add('admin-photo-cell--busy');
            // Silme başarısız olursa kart KALKMAZ (render çağrılmaz, yalnızca refresh başarılıysa çizilir).
            api('/api/admin/kumaslar/' + editId + '/fotograflar/' + fotoId, { method: 'DELETE' })
                .then((res) => { toast((res && res.message) || 'Fotoğraf silindi.', 'success'); return refresh(); })
                .catch((err) => {
                    toast((err && err.message) || 'Fotoğraf silinemedi.', 'error');
                    if (cell) cell.classList.remove('admin-photo-cell--busy'); // kart yerinde kalır
                })
                .then(() => { setBusy(false); });
        });
    }

    // ---------- Olay bağlantıları ----------
    function bind() {
        if (dropzone) {
            dropzone.addEventListener('click', () => { if (!busy && editId !== null) fileInput && fileInput.click(); });
            dropzone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput && fileInput.click(); } });
            ['dragenter', 'dragover'].forEach((t) => dropzone.addEventListener(t, (e) => {
                e.preventDefault(); if (busy || editId === null) return; dropzone.classList.add('admin-dropzone--drag');
            }));
            ['dragleave', 'dragend', 'drop'].forEach((t) => dropzone.addEventListener(t, (e) => {
                e.preventDefault(); dropzone.classList.remove('admin-dropzone--drag');
            }));
            dropzone.addEventListener('drop', (e) => {
                if (busy || editId === null) return;
                const dt = e.dataTransfer;
                if (dt && dt.files && dt.files.length) addFiles(dt.files);
            });
        }
        if (fileInput) fileInput.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = ''; });
        if (uploadBtn) uploadBtn.addEventListener('click', doUpload);
        if (clearBtn) clearBtn.addEventListener('click', clearSelections);
    }

    // ---------- Başlat ----------
    document.addEventListener('DOMContentLoaded', () => {
        if (!collectRefs()) return;
        refsReady = true;
        if (editId === null || !zen.session.token()) { panel.classList.add('hidden'); return; }
        bind();
    });

    // Dışa açık: admin-product-form.js ürünü yükleyince fotoListesi'ni buraya verir.
    window.zenAdminPhotos = {
        render,
        refresh,
        isReady: () => refsReady,
    };
})();
