// ============================================================================
// LIAMVSCAN UI CONTROLLER v1.1 (com.xliamvr.scan)
// Manajemen Per-Lokasi, Input Qty Cepat, Kamus Barcode, & Motion 60fps
// ============================================================================

const LiamApp = {
  activeArticleCode: null,
  pendingUnknownBarcode: '',
  currentFilter: 'ALL',
  scrollObserver: null,

  init() {
    LiamDB.init();
    this.initMotionEffects();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    document.getElementById('cfgStore').value = LiamDB.config.storeCode;
    document.getElementById('cfgOperator').value = LiamDB.config.operator;

    this.refreshAllUI();

    // Jika belum ada lokasi aktif saat pertama dibuka, langsung tampilkan form Lokasi
    if (!LiamDB.getActiveLocation()) {
      this.openNewLocationModal(true);
    }
  },

  // Efek Motion Graphic: Gelombang sentuhan (Ripple) & Animasi Scroll
  initMotionEffects() {
    document.addEventListener('pointerdown', (e) => {
      const target = e.target.closest('.btn, .pill, .nav-btn, .step-btn');
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const wave = document.createElement('span');
      wave.className = 'ripple-wave';
      wave.style.width = wave.style.height = `${size}px`;
      wave.style.left = `${e.clientX - rect.left - size / 2}px`;
      wave.style.top = `${e.clientY - rect.top - size / 2}px`;

      target.appendChild(wave);
      setTimeout(() => wave.remove(), 520);
    });

    if ('IntersectionObserver' in window) {
      this.scrollObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.remove('scroll-hidden');
              entry.target.classList.add('scroll-visible');
              this.scrollObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.05 }
      );
    }
  },

  switchView(viewName, btn) {
    document.querySelectorAll('.view-section').forEach((v) => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
    document.getElementById('view-' + viewName).classList.add('active');
    if (btn) btn.classList.add('active');

    this.refreshAllUI();
  },

  refreshAllUI() {
    this.updateLocationBanner();
    this.refreshHeaderAndStats();
    this.renderArticleList();
    this.renderLocationsList();
    this.renderKamusList();
  },

  // ==========================================================================
  // MANAJEMEN SESI PER-LOKASI (Nomor Lokasi, Pemeriksa, No Document, Tanggal)
  // ==========================================================================
  openNewLocationModal(isInitial = false) {
    document.getElementById('locInputNomor').value = '';
    document.getElementById('locInputPemeriksa').value = LiamDB.config.operator || 'Liam';
    document.getElementById('locInputDoc').value = '';
    document.getElementById('locInputTanggal').value = new Date().toISOString().slice(0, 10);

    const cancelBtn = document.getElementById('btnCancelLocModal');
    cancelBtn.style.display = isInitial && !LiamDB.getActiveLocation() ? 'none' : 'inline-flex';
    document.getElementById('locationModal').classList.add('open');
  },

  saveNewLocation() {
    const noLokasi = document.getElementById('locInputNomor').value.trim();
    const pemeriksa = document.getElementById('locInputPemeriksa').value.trim();
    const noDocument = document.getElementById('locInputDoc').value.trim();
    const tanggal = document.getElementById('locInputTanggal').value;

    if (!noLokasi) {
      alert('Nomor Lokasi wajib diisi (contoh: RAK-A1 / GUDANG-1).');
      return;
    }

    LiamDB.createLocation({ noLokasi, pemeriksa, noDocument, tanggal });
    this.closeModal('locationModal');
    this.activeArticleCode = null;
    this.resetLastScanCard();
    this.refreshAllUI();
  },

  selectLocation(locId) {
    LiamDB.setActiveLocation(locId);
    this.activeArticleCode = null;
    this.resetLastScanCard();
    this.refreshAllUI();
    const scanNav = document.querySelector('.nav-btn');
    this.switchView('scan', scanNav);
  },

  deleteLocationSession(locId, e) {
    e.stopPropagation();
    const loc = LiamDB.locations[locId];
    if (!loc) return;
    if (confirm(`Hapus permanen data lokasi "${loc.noLokasi}" (Doc: ${loc.noDocument})?`)) {
      LiamDB.deleteLocation(locId);
      this.refreshAllUI();
      if (!LiamDB.getActiveLocation()) {
        this.openNewLocationModal(true);
      }
    }
  },

  updateLocationBanner() {
    const loc = LiamDB.getActiveLocation();
    const titleEl = document.getElementById('bannerLocTitle');
    const subEl = document.getElementById('bannerLocSub');

    if (!loc) {
      titleEl.textContent = '📍 Belum Ada Lokasi Aktif (Ketuk untuk Buat)';
      subEl.textContent = 'Isi Nomor Lokasi, Pemeriksa, No Document & Tanggal';
      return;
    }

    const locPcs = Object.values(loc.scans || {}).reduce((a, b) => a + b, 0);
    titleEl.textContent = `📍 ${loc.noLokasi}  •  Doc: ${loc.noDocument}`;
    subEl.textContent = `Pemeriksa: ${loc.pemeriksa} | Tgl: ${loc.tanggal} | Terhitung: ${locPcs} Pcs`;
  },

  renderLocationsList() {
    const container = document.getElementById('locationsList');
    if (!container) return;

    const locs = Object.values(LiamDB.locations).reverse();
    if (locs.length === 0) {
      container.innerHTML = `<p style="text-align:center; color:var(--muted-dim); font-size:12px; margin-top:16px;">Belum ada lokasi tersimpan. Tekan tombol "+ Buat Sesi Lokasi Baru" di atas.</p>`;
      return;
    }

    container.innerHTML = locs
      .map((loc) => {
        const isActive = loc.id === LiamDB.activeLocationId;
        const skuCount = Object.keys(loc.scans || {}).length;
        const totalPcs = Object.values(loc.scans || {}).reduce((a, b) => a + b, 0);

        return `
          <div class="loc-card ${isActive ? 'active-loc' : ''}" onclick="LiamApp.selectLocation('${loc.id}')">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
              <div>
                <div style="font-size:14px; font-weight:800; color:var(--champagne);">
                  📍 ${loc.noLokasi} ${isActive ? '<span class="badge badge-ada" style="margin-left:6px;">AKTIF</span>' : ''}
                </div>
                <div style="font-size:11.5px; color:#d1fae5; margin-top:3px;">
                  No Doc: <strong>${loc.noDocument}</strong> • Tgl: ${loc.tanggal}
                </div>
                <div style="font-size:11px; color:var(--muted-dim); margin-top:2px;">
                  Pemeriksa: ${loc.pemeriksa} • ${skuCount} Artikel (${totalPcs} Pcs)
                </div>
              </div>
              <button class="btn btn-danger" style="padding:5px 9px; font-size:11px;" onclick="LiamApp.deleteLocationSession('${loc.id}', event)">🗑️</button>
            </div>
          </div>`;
      })
      .join('');
  },

  // ==========================================================================
  // KAMERA & SCANNER
  // ==========================================================================
  async toggleCamera() {
    if (!LiamDB.getActiveLocation()) {
      this.openNewLocationModal(true);
      return;
    }

    const btn = document.getElementById('btnToggleCam');
    const wrapper = document.getElementById('cameraWrapper');

    if (LiamScanner.isRunning) {
      await LiamScanner.stop();
      wrapper.classList.remove('scanning');
      btn.textContent = '▶ Mulai Scan';
      btn.className = 'btn btn-champagne';
    } else {
      try {
        await LiamScanner.start((code) => this.processBarcode(code));
        wrapper.classList.add('scanning');
        btn.textContent = '⏹ Stop';
        btn.className = 'btn btn-danger';
      } catch (e) {
        alert('Kamera gagal dibuka. Pastikan izin kamera aktif & dibuka via HTTPS.');
      }
    }
  },

  async toggleFlash() {
    const isOn = await LiamScanner.toggleTorch();
    const btn = document.getElementById('btnTorch');
    btn.style.borderColor = isOn ? 'var(--warning)' : 'var(--border)';
    btn.style.color = isOn ? 'var(--warning)' : 'var(--text)';
  },

  toggleMode() {
    LiamScanner.isContinuous = !LiamScanner.isContinuous;
    const btn = document.getElementById('btnScanMode');
    btn.textContent = LiamScanner.isContinuous ? '⚡ Auto' : '1️⃣ Single';
  },

  resetLastScanCard() {
    const card = document.getElementById('lastScanCard');
    card.className = 'last-scan-card';
    document.getElementById('lsStatus').textContent = 'SIAP MEMINDAI BARCODE';
    document.getElementById('lsBarcode').textContent = 'BC: -';
    document.getElementById('lsArticleCode').textContent = 'Arahkan kamera ke barcode dus / hangtag';
    document.getElementById('lsArticleName').textContent = 'Hasil scan tersimpan otomatis ke lokasi aktif';
    document.getElementById('lsActionRow').style.display = 'none';
    document.getElementById('btnPairUnknown').style.display = 'none';
  },

  processBarcode(rawCode) {
    if (!LiamDB.getActiveLocation()) {
      this.openNewLocationModal(true);
      return;
    }

    const code = String(rawCode).trim();
    if (!code) return;

    const article = LiamDB.findArticleByBarcode(code);
    const card = document.getElementById('lastScanCard');

    if (article) {
      const newQty = LiamDB.incrementScan(article.kodeArtikel, 1);
      LiamScanner.beep(true);
      LiamScanner.triggerGreenFlash();

      this.activeArticleCode = article.kodeArtikel;
      this.pendingUnknownBarcode = '';

      card.className = 'last-scan-card matched';
      document.getElementById('lsStatus').textContent = '✅ COCOK • TERHITUNG +1';
      document.getElementById('lsBarcode').textContent = `BC: ${code}`;
      document.getElementById('lsArticleCode').textContent = article.kodeArtikel;
      document.getElementById('lsArticleName').textContent = article.namaArtikel;
      document.getElementById('lsActionRow').style.display = 'flex';
      document.getElementById('btnPairUnknown').style.display = 'none';

      this.updateLastScanNumbers(article, newQty);
      this.popHeaderBadge();
      this.refreshAllUI();
    } else {
      LiamScanner.beep(false);
      this.activeArticleCode = null;
      this.pendingUnknownBarcode = code;

      card.className = 'last-scan-card unknown';
      document.getElementById('lsStatus').textContent = '⚠️ BARCODE BELUM TERDAFTAR';
      document.getElementById('lsBarcode').textContent = `BC: ${code}`;
      document.getElementById('lsArticleCode').textContent = code;
      document.getElementById('lsArticleName').textContent = 'Ketuk tombol di bawah untuk menyamakan ke artikel Excel';
      document.getElementById('lsActionRow').style.display = 'none';
      document.getElementById('btnPairUnknown').style.display = 'block';
    }
  },

  popHeaderBadge() {
    const badge = document.getElementById('headerTotalScan');
    badge.classList.remove('pop');
    void badge.offsetWidth;
    badge.classList.add('pop');
    setTimeout(() => badge.classList.remove('pop'), 220);
  },

  updateLastScanNumbers(article, locQty) {
    const combined = LiamDB.getCombinedScansMap();
    const totalAll = combined[article.kodeArtikel] || 0;
    const diff = totalAll - article.systemQty;

    document.getElementById('lsSysQty').textContent = article.systemQty;
    document.getElementById('lsScanQty').textContent = locQty;
    document.getElementById('lsDiffQty').textContent = diff > 0 ? `+${diff}` : diff;
  },

  adjustActiveQty(delta) {
    if (!this.activeArticleCode || !LiamDB.articles[this.activeArticleCode]) return;
    const art = LiamDB.articles[this.activeArticleCode];
    const updated = LiamDB.incrementScan(art.kodeArtikel, delta);
    this.updateLastScanNumbers(art, updated);
    this.refreshAllUI();
  },

  // Ketuk angka Qty untuk input jumlah langsung (misal 12 dus sekaligus)
  promptCustomQty() {
    if (!this.activeArticleCode || !LiamDB.articles[this.activeArticleCode]) return;
    const art = LiamDB.articles[this.activeArticleCode];
    const current = LiamDB.getScannedQty(art.kodeArtikel);
    const val = prompt(`Masukkan jumlah scan untuk ${art.kodeArtikel} di lokasi ini:`, current);
    if (val !== null && val.trim() !== '') {
      const parsed = Math.max(0, parseInt(val.trim(), 10) || 0);
      LiamDB.setScannedQty(art.kodeArtikel, parsed);
      this.updateLastScanNumbers(art, parsed);
      this.refreshAllUI();
    }
  },

  submitManual() {
    const input = document.getElementById('manualInput');
    if (input.value.trim()) {
      LiamScanner.lastCode = '';
      this.processBarcode(input.value.trim());
      input.value = '';
    }
  },

  // ==========================================================================
  // SAMAKAN BARCODE & DETAIL CROSS-SIZE MATRIX
  // ==========================================================================
  openPairModal(prefillBarcode = null) {
    const bc = prefillBarcode || this.pendingUnknownBarcode;
    document.getElementById('pairBarcodeVal').value = bc;
    document.getElementById('pairSearchInput').value = '';
    document.getElementById('pairNewCode').value = '';
    document.getElementById('pairNewName').value = '';
    this.searchPairCandidates();
    document.getElementById('pairModal').classList.add('open');
  },

  searchPairCandidates() {
    const q = document.getElementById('pairSearchInput').value.toLowerCase();
    const box = document.getElementById('pairCandidates');
    const matches = Object.values(LiamDB.articles)
      .filter((a) => a.kodeArtikel.toLowerCase().includes(q) || a.namaArtikel.toLowerCase().includes(q))
      .slice(0, 15);

    if (matches.length === 0) {
      box.innerHTML = `<p style="font-size:11px; color:var(--muted-dim); margin-top:6px;">Tidak ada artikel cocok di Master.</p>`;
      return;
    }

    box.innerHTML = matches
      .map(
        (a) => `
        <div class="pair-option" onclick="LiamApp.confirmPairToExisting('${a.kodeArtikel}')">
          <div style="font-size:12px; font-weight:800; color:var(--emerald-bright);">${a.kodeArtikel}</div>
          <div style="font-size:11px; color:#d1fae5;">${a.namaArtikel} (Stok Sistem: ${a.systemQty})</div>
        </div>`
      )
      .join('');
  },

  confirmPairToExisting(kodeArtikel) {
    const bc = document.getElementById('pairBarcodeVal').value;
    LiamDB.pairBarcode(bc, kodeArtikel, '', 'Tautan Lapangan');
    this.closeModal('pairModal');
    LiamScanner.lastCode = '';
    this.processBarcode(bc);
  },

  saveNewPairedArticle() {
    const bc = document.getElementById('pairBarcodeVal').value;
    const newCode = document.getElementById('pairNewCode').value.trim();
    const newName = document.getElementById('pairNewName').value.trim();
    if (!newCode) return alert('Kode Artikel Penentu wajib diisi!');

    LiamDB.pairBarcode(bc, newCode, newName, 'Artikel Baru');
    this.closeModal('pairModal');
    LiamScanner.lastCode = '';
    this.processBarcode(bc);
  },

  openArticleDetail(kodeArtikel) {
    const art = LiamDB.articles[kodeArtikel];
    if (!art) return;
    this.activeArticleCode = kodeArtikel;

    const locQty = LiamDB.getScannedQty(kodeArtikel);
    document.getElementById('detailCode').textContent = art.kodeArtikel;
    document.getElementById('detailName').textContent = `${art.namaArtikel} • Harga: Rp ${art.harga.toLocaleString('id-ID')}`;
    document.getElementById('detailLocQtyInput').value = locQty;

    const bcs = LiamDB.getBarcodesForArticle(kodeArtikel);
    document.getElementById('detailBarcodes').textContent = `Barcode Terhubung: ${bcs.length ? bcs.join(', ') : 'Belum ada'}`;

    const siblings = LiamDB.getSiblingSizes(kodeArtikel);
    document.getElementById('detailMatrix').innerHTML = siblings
      .map(
        (s) => `
        <div style="display:flex; justify-content:space-between; padding:6px 9px; background:rgba(6,18,14,0.85); border:1px solid var(--border); border-radius:8px; margin-bottom:4px; font-size:11.5px;">
          <span><strong style="color:var(--champagne);">${s.kodeArtikel.slice(-3)}</strong> — ${s.kodeArtikel}</span>
          <span>Sis: <strong>${s.systemQty}</strong> | Lok: <strong style="color:var(--emerald-bright);">${s.activeScanQty}</strong></span>
        </div>`
      )
      .join('');

    document.getElementById('detailModal').classList.add('open');
  },

  saveDetailQty() {
    if (!this.activeArticleCode) return;
    const val = document.getElementById('detailLocQtyInput').value;
    LiamDB.setScannedQty(this.activeArticleCode, val);
    this.closeModal('detailModal');
    this.refreshAllUI();
  },

  pairFromDetail() {
    const manualBc = prompt(`Masukkan / scan nomor barcode baru untuk ${this.activeArticleCode}:`);
    if (manualBc && manualBc.trim()) {
      LiamDB.pairBarcode(manualBc.trim(), this.activeArticleCode, '', 'Tautan Manual');
      this.openArticleDetail(this.activeArticleCode);
      this.refreshAllUI();
    }
  },

  closeModal(id) {
    document.getElementById(id).classList.remove('open');
  },

  setFilter(f, btn) {
    this.currentFilter = f;
    document.querySelectorAll('.pill').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    this.renderArticleList();
  },

  renderArticleList() {
    const q = document.getElementById('searchBox').value.toLowerCase();
    const container = document.getElementById('articleList');
    const all = Object.values(LiamDB.articles);
    const combined = LiamDB.getCombinedScansMap();

    const filtered = all.filter((a) => {
      const match = a.kodeArtikel.toLowerCase().includes(q) || a.namaArtikel.toLowerCase().includes(q);
      if (!match) return false;
      const locQty = LiamDB.getScannedQty(a.kodeArtikel);
      const totalAll = combined[a.kodeArtikel] || 0;
      if (this.currentFilter === 'ADA') return locQty > 0;
      if (this.currentFilter === 'KOSONG') return totalAll === 0;
      if (this.currentFilter === 'SELISIH') return totalAll !== a.systemQty;
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<p style="text-align:center; color:var(--muted-dim); font-size:12px; margin-top:20px;">Tidak ada data artikel.</p>`;
      return;
    }

    container.innerHTML = filtered
      .slice(0, 100)
      .map((a) => {
        const locQty = LiamDB.getScannedQty(a.kodeArtikel);
        const totalAll = combined[a.kodeArtikel] || 0;

        let badge = `<span class="badge badge-kosong">0 SCAN</span>`;
        if (totalAll > 0 && totalAll === a.systemQty) badge = `<span class="badge badge-ada">KLOP</span>`;
        else if (totalAll > 0) badge = `<span class="badge badge-selisih">ADA (${totalAll})</span>`;

        return `
          <div class="item-card scroll-hidden" onclick="LiamApp.openArticleDetail('${a.kodeArtikel}')">
            <div class="item-main">
              <div class="item-code">${a.kodeArtikel}</div>
              <div class="item-desc">${a.namaArtikel}</div>
              <div class="item-sub">Sistem: ${a.systemQty} • Harga: Rp ${a.harga.toLocaleString('id-ID')}</div>
            </div>
            <div class="item-right">
              ${badge}
              <div style="font-size:14px; font-weight:800; color:var(--champagne); margin-top:4px;">${locQty}</div>
            </div>
          </div>`;
      })
      .join('');

    if (this.scrollObserver) {
      container.querySelectorAll('.item-card').forEach((el) => this.scrollObserver.observe(el));
    } else {
      container.querySelectorAll('.item-card').forEach((el) => el.classList.remove('scroll-hidden'));
    }
  },

  // ==========================================================================
  // KELOLA KAMUS BARCODE & IMPORT/EXPORT
  // ==========================================================================
  renderKamusList() {
    const container = document.getElementById('kamusListContainer');
    const searchEl = document.getElementById('kamusSearchInput');
    if (!container || !searchEl) return;

    const q = searchEl.value.toLowerCase();
    const entries = Object.values(LiamDB.kamus)
      .filter((k) => k.barcode.toLowerCase().includes(q) || k.kodeArtikel.toLowerCase().includes(q))
      .slice(0, 25);

    if (entries.length === 0) {
      container.innerHTML = `<p style="font-size:11px; color:var(--muted-dim);">Tidak ada data barcode.</p>`;
      return;
    }

    container.innerHTML = entries
      .map(
        (k) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:7px 9px; background:rgba(6,18,14,0.85); border:1px solid var(--border); border-radius:9px; margin-bottom:5px; font-size:11.5px;">
          <div>
            <strong style="color:var(--champagne);">${k.barcode}</strong> → <span style="color:var(--emerald-bright);">${k.kodeArtikel}</span>
            <div style="font-size:10px; color:var(--muted-dim);">${k.tipe}</div>
          </div>
          <button class="btn btn-danger" style="padding:4px 8px; font-size:10px;" onclick="LiamApp.deleteKamusEntry('${k.barcode}')">✕</button>
        </div>`
      )
      .join('');
  },

  deleteKamusEntry(barcode) {
    if (confirm(`Hapus pasangan barcode ${barcode} dari kamus?`)) {
      delete LiamDB.kamus[barcode];
      LiamDB.saveAll();
      this.refreshAllUI();
    }
  },

  handleImportMaster(e) {
    const file = e.target.files[0];
    if (!file) return;
    LiamExcel.importMasterFile(file, (err, res) => {
      if (err) return alert('Gagal baca file: ' + err.message);
      alert(`Berhasil import ${res.importedArticles} Artikel & ${res.importedBarcodes} Barcode!`);
      this.refreshAllUI();
    });
  },

  handleImportKamus(e) {
    const file = e.target.files[0];
    if (!file) return;
    LiamExcel.importKamusFile(file, (err, count) => {
      if (err) return alert('Gagal baca kamus: ' + err.message);
      alert(`Berhasil menambahkan ${count} pasangan barcode ke Kamus!`);
      this.refreshAllUI();
    });
  },

  saveConfig() {
    LiamDB.config.storeCode = document.getElementById('cfgStore').value.trim().toUpperCase() || 'SSFE';
    LiamDB.config.operator = document.getElementById('cfgOperator').value.trim() || 'Liam';
    LiamDB.saveAll();
    this.refreshAllUI();
  },

  refreshHeaderAndStats() {
    const arts = Object.values(LiamDB.articles);
    const combined = LiamDB.getCombinedScansMap();
    const totalAllScan = Object.values(combined).reduce((sum, q) => sum + q, 0);

    document.getElementById('headerStoreBadge').textContent = `${LiamDB.config.storeCode} • ${LiamDB.config.operator}`;
    document.getElementById('headerTotalScan').textContent = `${totalAllScan} Pcs`;
    document.getElementById('statArticles').textContent = arts.length;
    document.getElementById('statKamus').textContent = Object.keys(LiamDB.kamus).length;
    document.getElementById('statScanned').textContent = totalAllScan;
  },

  resetScans() {
    const loc = LiamDB.getActiveLocation();
    if (!loc) return alert('Belum ada lokasi aktif.');
    if (confirm(`Reset hitungan scan di lokasi "${loc.noLokasi}" kembali ke 0?`)) {
      LiamDB.resetActiveLocationScans();
      this.resetLastScanCard();
      this.refreshAllUI();
    }
  },

  resetAll() {
    if (confirm('Hapus seluruh master artikel, kamus barcode, dan semua lokasi tersimpan?')) {
      LiamDB.resetAll();
      this.resetLastScanCard();
      this.refreshAllUI();
      this.openNewLocationModal(true);
    }
  }
};

window.addEventListener('DOMContentLoaded', () => LiamApp.init());
