// ============================================================================
// LIAMVSCAN UI CONTROLLER (com.xliamvr.scan)
// ============================================================================

const LiamApp = {
  activeArticleCode: null,
  pendingUnknownBarcode: '',
  currentFilter: 'ALL',

  init() {
    LiamDB.init();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
    document.getElementById('cfgStore').value = LiamDB.config.storeCode;
    document.getElementById('cfgOperator').value = LiamDB.config.operator;
    this.refreshHeaderAndStats();
    this.renderArticleList();
  },

  switchView(viewName, btn) {
    document.querySelectorAll('.view-section').forEach((v) => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
    document.getElementById('view-' + viewName).classList.add('active');
    btn.classList.add('active');
    this.refreshHeaderAndStats();
    if (viewName === 'scan') this.renderArticleList();
  },

  async toggleCamera() {
    const btn = document.getElementById('btnToggleCam');
    if (LiamScanner.isRunning) {
      await LiamScanner.stop();
      btn.textContent = '▶ Mulai Scan';
      btn.className = 'btn btn-primary';
    } else {
      try {
        await LiamScanner.start((code) => this.processBarcode(code));
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

  // Proses inti saat barcode terbaca
  processBarcode(rawCode) {
    const code = String(rawCode).trim();
    if (!code) return;

    const article = LiamDB.findArticleByBarcode(code);
    const card = document.getElementById('lastScanCard');

    if (article) {
      article.scannedQty = (article.scannedQty || 0) + 1;
      LiamDB.saveAll();
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

      this.updateLastScanNumbers(article);
      this.refreshHeaderAndStats();
      this.renderArticleList();
    } else {
      LiamScanner.beep(false);
      this.activeArticleCode = null;
      this.pendingUnknownBarcode = code;

      card.className = 'last-scan-card unknown';
      document.getElementById('lsStatus').textContent = '⚠️ BARCODE BELUM TERDAFTAR';
      document.getElementById('lsBarcode').textContent = `BC: ${code}`;
      document.getElementById('lsArticleCode').textContent = code;
      document.getElementById('lsArticleName').textContent = 'Tekan tombol di bawah untuk menyamakan ke artikel Excel';
      document.getElementById('lsActionRow').style.display = 'none';
      document.getElementById('btnPairUnknown').style.display = 'block';
    }
  },

  updateLastScanNumbers(article) {
    const diff = article.scannedQty - article.systemQty;
    document.getElementById('lsSysQty').textContent = article.systemQty;
    document.getElementById('lsScanQty').textContent = article.scannedQty;
    document.getElementById('lsDiffQty').textContent = diff > 0 ? `+${diff}` : diff;
  },

  adjustActiveQty(delta) {
    if (!this.activeArticleCode || !LiamDB.articles[this.activeArticleCode]) return;
    const art = LiamDB.articles[this.activeArticleCode];
    art.scannedQty = Math.max(0, (art.scannedQty || 0) + delta);
    LiamDB.saveAll();
    this.updateLastScanNumbers(art);
    this.refreshHeaderAndStats();
    this.renderArticleList();
  },

  submitManual() {
    const input = document.getElementById('manualInput');
    if (input.value.trim()) {
      LiamScanner.lastCode = '';
      this.processBarcode(input.value.trim());
      input.value = '';
    }
  },

  // Modal Samakan Barcode (Pairing)
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
      box.innerHTML = `<p style="font-size:11px; color:var(--muted); margin-top:6px;">Tidak ada artikel cocok di Excel.</p>`;
      return;
    }

    box.innerHTML = matches
      .map(
        (a) => `
        <div class="pair-option" onclick="LiamApp.confirmPairToExisting('${a.kodeArtikel}')">
          <div style="font-size:12px; font-weight:800; color:#38bdf8;">${a.kodeArtikel}</div>
          <div style="font-size:11px; color:#cbd5e1;">${a.namaArtikel} (Stok: ${a.systemQty})</div>
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

  // Detail & Cross-Size Matrix
  openArticleDetail(kodeArtikel) {
    const art = LiamDB.articles[kodeArtikel];
    if (!art) return;
    this.activeArticleCode = kodeArtikel;

    document.getElementById('detailCode').textContent = art.kodeArtikel;
    document.getElementById('detailName').textContent = `${art.namaArtikel} • Harga: Rp ${art.harga.toLocaleString('id-ID')}`;

    const bcs = LiamDB.getBarcodesForArticle(kodeArtikel);
    document.getElementById('detailBarcodes').textContent = `Barcode Terhubung: ${bcs.length ? bcs.join(', ') : 'Belum ada'}`;

    const siblings = LiamDB.getSiblingSizes(kodeArtikel);
    document.getElementById('detailMatrix').innerHTML = siblings
      .map(
        (s) => `
        <div style="display:flex; justify-content:space-between; padding:6px 8px; background:var(--surface); border-radius:6px; margin-bottom:4px; font-size:12px;">
          <span><strong>${s.kodeArtikel.slice(-3)}</strong> — ${s.kodeArtikel}</span>
          <span>Sis: <strong>${s.systemQty}</strong> | Scan: <strong style="color:var(--accent);">${s.scannedQty}</strong></span>
        </div>`
      )
      .join('');

    document.getElementById('detailModal').classList.add('open');
  },

  pairFromDetail() {
    const manualBc = prompt(`Masukkan / scan nomor barcode untuk ${this.activeArticleCode}:`);
    if (manualBc && manualBc.trim()) {
      LiamDB.pairBarcode(manualBc.trim(), this.activeArticleCode, '', 'Tautan Manual');
      this.openArticleDetail(this.activeArticleCode);
      this.refreshHeaderAndStats();
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

    const filtered = all.filter((a) => {
      const match = a.kodeArtikel.toLowerCase().includes(q) || a.namaArtikel.toLowerCase().includes(q);
      if (!match) return false;
      if (this.currentFilter === 'ADA') return a.scannedQty > 0;
      if (this.currentFilter === 'KOSONG') return a.scannedQty === 0;
      if (this.currentFilter === 'SELISIH') return a.scannedQty !== a.systemQty;
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<p style="text-align:center; color:var(--muted); font-size:12px; margin-top:20px;">Tidak ada data artikel.</p>`;
      return;
    }

    container.innerHTML = filtered
      .slice(0, 120)
      .map((a) => {
        let badge = `<span class="badge badge-kosong">TIDAK ADA</span>`;
        if (a.scannedQty > 0 && a.scannedQty === a.systemQty) badge = `<span class="badge badge-ada">KLOP</span>`;
        else if (a.scannedQty > 0) badge = `<span class="badge badge-selisih">ADA</span>`;

        return `
          <div class="item-card" onclick="LiamApp.openArticleDetail('${a.kodeArtikel}')">
            <div class="item-main">
              <div class="item-code">${a.kodeArtikel}</div>
              <div class="item-desc">${a.namaArtikel}</div>
              <div class="item-sub">Sistem: ${a.systemQty} • Harga: Rp ${a.harga.toLocaleString('id-ID')}</div>
            </div>
            <div class="item-right">
              ${badge}
              <div style="font-size:14px; font-weight:800; margin-top:4px;">${a.scannedQty}</div>
            </div>
          </div>`;
      })
      .join('');
  },

  handleImportMaster(e) {
    const file = e.target.files[0];
    if (!file) return;
    LiamExcel.importMasterFile(file, (err, res) => {
      if (err) return alert('Gagal baca file: ' + err.message);
      alert(`Berhasil import ${res.importedArticles} Artikel Penentu & ${res.importedBarcodes} Barcode!`);
      this.refreshHeaderAndStats();
      this.renderArticleList();
    });
  },

  handleImportKamus(e) {
    const file = e.target.files[0];
    if (!file) return;
    LiamExcel.importKamusFile(file, (err, count) => {
      if (err) return alert('Gagal baca kamus: ' + err.message);
      alert(`Berhasil menambahkan ${count} pasangan barcode ke Kamus!`);
      this.refreshHeaderAndStats();
    });
  },

  saveConfig() {
    LiamDB.config.storeCode = document.getElementById('cfgStore').value.trim().toUpperCase() || 'SSFE';
    LiamDB.config.operator = document.getElementById('cfgOperator').value.trim() || 'Liam';
    LiamDB.saveAll();
    this.refreshHeaderAndStats();
  },

  refreshHeaderAndStats() {
    const arts = Object.values(LiamDB.articles);
    const totalScan = arts.reduce((sum, a) => sum + (a.scannedQty || 0), 0);
    document.getElementById('headerStoreBadge').textContent = `${LiamDB.config.storeCode} • ${LiamDB.config.operator}`;
    document.getElementById('headerTotalScan').textContent = `${totalScan} Pcs`;
    document.getElementById('statArticles').textContent = arts.length;
    document.getElementById('statKamus').textContent = Object.keys(LiamDB.kamus).length;
    document.getElementById('statScanned').textContent = totalScan;
  },

  resetScans() {
    if (confirm('Reset semua hitungan scan kembali ke 0? (Master stok & kamus barcode tetap aman)')) {
      LiamDB.resetScansOnly();
      this.refreshHeaderAndStats();
      this.renderArticleList();
    }
  },

  resetAll() {
    if (confirm('Hapus seluruh data master artikel, kamus barcode, dan hasil scan?')) {
      LiamDB.resetAll();
      this.refreshHeaderAndStats();
      this.renderArticleList();
    }
  }
};

window.addEventListener('DOMContentLoaded', () => LiamApp.init());
