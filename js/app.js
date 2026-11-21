// ============================================================================
// LIAMVSCAN v2.0 ENGINE (com.xliamvr.scan)
// 3D Tilt Physics, Kinetic Number Counter, SVG Donut Analytics & Multi-Lokasi
// ============================================================================

const LiamApp = {
  activeArticleCode: null,
  pendingUnknownBarcode: '',
  currentFilter: 'ALL',
  scrollObserver: null,
  lastDisplayedPcs: 0,

  init() {
    LiamDB.init();
    this.initMotionPhysics();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    const cfgStore = document.getElementById('cfgStore');
    const cfgOperator = document.getElementById('cfgOperator');
    if (cfgStore) cfgStore.value = LiamDB.config.storeCode;
    if (cfgOperator) cfgOperator.value = LiamDB.config.operator;

    this.refreshAllUI();

    // Otomatis tampilkan form Lokasi jika belum ada sesi aktif
    if (!LiamDB.getActiveLocation()) {
      setTimeout(() => this.openNewLocationModal(true), 280);
    }
  },

  // ==========================================================================
  // MOTION GRAPHIC ENGINE (60FPS GPU-ACCELERATED)
  // ==========================================================================
  initMotionPhysics() {
    // 1. Shockwave Ripple pada setiap sentuhan tombol/tile/nav
    document.addEventListener('pointerdown', (e) => {
      const target = e.target.closest('.btn, .pill, .nav-btn, .step-btn, .squircle-tile');
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const wave = document.createElement('span');
      wave.className = 'ripple-wave';
      wave.style.width = wave.style.height = `${size}px`;
      wave.style.left = `${e.clientX - rect.left - size / 2}px`;
      wave.style.top = `${e.clientY - rect.top - size / 2}px`;

      target.appendChild(wave);
      setTimeout(() => wave.remove(), 560);
    });

    // 2. Interactive 3D Tilt pada Kartu PDT Lokasi
    const card3d = document.getElementById('pdt3dCard');
    if (card3d) {
      card3d.addEventListener('pointermove', (e) => {
        const rect = card3d.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card3d.style.transform = `rotateY(${x * 24 - 8}deg) rotateX(${-y * 22 + 4}deg) scale(1.03)`;
      });
      const resetTilt = () => {
        card3d.style.transform = 'rotateY(-12deg) rotateX(6deg) rotateZ(-3deg)';
      };
      card3d.addEventListener('pointerleave', resetTilt);
      card3d.addEventListener('pointerup', resetTilt);
    }

    // 3. 3D Perspective Scroll Reveal untuk daftar kartu
    if ('IntersectionObserver' in window) {
      this.scrollObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry, idx) => {
            if (entry.isIntersecting) {
              entry.target.style.transitionDelay = `${Math.min(idx * 25, 150)}ms`;
              entry.target.classList.remove('scroll-hidden');
              entry.target.classList.add('scroll-visible');
              this.scrollObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.04 }
      );
    }
  },

  // Animasi angka bergulir halus (Kinetic Counter)
  animateNumber(el, fromVal, toVal, suffix = '') {
    if (!el) return;
    if (fromVal === toVal) {
      el.textContent = `${toVal.toLocaleString('id-ID')}${suffix}`;
      return;
    }
    const duration = 380;
    const startTime = performance.now();
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(fromVal + (toVal - fromVal) * easeOut);
      el.textContent = `${current.toLocaleString('id-ID')}${suffix}`;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },

  switchView(viewName, btn) {
    document.querySelectorAll('.view-section').forEach((v) => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));

    const targetView = document.getElementById('view-' + viewName);
    if (targetView) targetView.classList.add('active');

    if (btn) {
      btn.classList.add('active');
    } else {
      const autoBtn = document.getElementById('nav-' + viewName);
      if (autoBtn) autoBtn.classList.add('active');
    }

    this.refreshAllUI();
  },

  jumpToSection(viewName, elementId) {
    this.switchView(viewName, null);
    setTimeout(() => {
      const el = document.getElementById(elementId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  },

  refreshAllUI() {
    this.updateHeroAnd3DCard();
    this.updateAnalyticsDonut();
    this.renderArticleList();
    this.renderLocationsList();
    this.renderKamusList();
  },

  // ==========================================================================
  // HERO GREETING, 3D LOCATION CARD & METRICS
  // ==========================================================================
  updateHeroAnd3DCard() {
    const hour = new Date().getHours();
    let greet = 'Selamat Malam,';
    if (hour >= 4 && hour < 11) greet = 'Selamat Pagi,';
    else if (hour >= 11 && hour < 15) greet = 'Selamat Siang,';
    else if (hour >= 15 && hour < 18) greet = 'Selamat Sore,';

    const greetEl = document.getElementById('heroGreetingTime');
    const opEl = document.getElementById('heroOperatorName');
    if (greetEl) greetEl.textContent = greet;
    if (opEl) opEl.innerHTML = `${LiamDB.config.operator || 'Liam'} <span class="hero-star">✦</span>`;

    const loc = LiamDB.getActiveLocation();
    const cardLocEl = document.getElementById('cardLocCode');
    const cardDocEl = document.getElementById('cardDocNo');
    const cardDateEl = document.getElementById('cardDate');
    const cardInspEl = document.getElementById('cardInspector');
    const topStoreTag = document.getElementById('heroStoreTag');

    if (topStoreTag) {
      topStoreTag.textContent = `${LiamDB.config.storeCode} • TERMINAL PDT`;
    }

    if (loc) {
      if (cardLocEl) cardLocEl.textContent = loc.noLokasi;
      if (cardDocEl) cardDocEl.textContent = `DOC: ${loc.noDocument}`;
      if (cardDateEl) cardDateEl.textContent = loc.tanggal;
      if (cardInspEl) cardInspEl.textContent = loc.pemeriksa.toUpperCase();
    } else {
      if (cardLocEl) cardLocEl.textContent = 'TAP ISI LOKASI';
      if (cardDocEl) cardDocEl.textContent = 'DOC: BELUM SET';
      if (cardDateEl) cardDateEl.textContent = new Date().toISOString().slice(0, 10);
      if (cardInspEl) cardInspEl.textContent = (LiamDB.config.operator || 'LIAM').toUpperCase();
    }

    // Hitung total Pcs lokasi aktif & keseluruhan
    const arts = Object.values(LiamDB.articles);
    const combined = LiamDB.getCombinedScansMap();
    const totalAllScan = Object.values(combined).reduce((sum, q) => sum + q, 0);
    const totalSystemQty = arts.reduce((sum, a) => sum + (a.systemQty || 0), 0);

    const locPcs = loc ? Object.values(loc.scans || {}).reduce((a, b) => a + b, 0) : 0;
    const heroNumEl = document.getElementById('heroTotalPcs');
    this.animateNumber(heroNumEl, this.lastDisplayedPcs, locPcs, ' Pcs');
    this.lastDisplayedPcs = locPcs;

    const pct = totalSystemQty > 0 ? Math.min(100, ((totalAllScan / totalSystemQty) * 100)).toFixed(1) : '0.0';
    const matchEl = document.getElementById('heroMatchRate');
    const subEl = document.getElementById('heroSubStats');
    if (matchEl) matchEl.textContent = `↑ ${pct}%`;
    if (subEl) subEl.textContent = `Total semua lokasi: ${totalAllScan} / ${totalSystemQty} Sistem`;

    // Update Stat Cards di Tab Data
    const stArt = document.getElementById('statArticles');
    const stKam = document.getElementById('statKamus');
    const stScn = document.getElementById('statScanned');
    if (stArt) stArt.textContent = arts.length;
    if (stKam) stKam.textContent = Object.keys(LiamDB.kamus).length;
    if (stScn) stScn.textContent = totalAllScan;
  },

  // ==========================================================================
  // GRAFIK DONAT SVG DINAMIS (TAB ANALYTICS)
  // ==========================================================================
  updateAnalyticsDonut() {
    const arts = Object.values(LiamDB.articles);
    const combined = LiamDB.getCombinedScansMap();

    let klopCount = 0;
    let selisihCount = 0;
    let kosongCount = 0;

    arts.forEach((a) => {
      const scn = combined[a.kodeArtikel] || 0;
      if (scn === 0 && a.systemQty > 0) kosongCount++;
      else if (scn === a.systemQty) klopCount++;
      else selisihCount++;
    });

    const total = Math.max(1, arts.length);
    const circumference = 251.2; // 2 * PI * 40

    const pctKlop = Math.round((klopCount / total) * 100);
    const pctSelisih = Math.round((selisihCount / total) * 100);
    const pctKosong = Math.max(0, 100 - pctKlop - pctSelisih);

    const lenKlop = (klopCount / total) * circumference;
    const lenSelisih = (selisihCount / total) * circumference;
    const lenKosong = (kosongCount / total) * circumference;

    const segKlop = document.getElementById('donutSegKlop');
    const segSelisih = document.getElementById('donutSegSelisih');
    const segKosong = document.getElementById('donutSegKosong');

    if (segKlop && segSelisih && segKosong) {
      segKlop.style.strokeDasharray = `${lenKlop} ${circumference}`;
      segKlop.style.strokeDashoffset = '0';

      segSelisih.style.strokeDasharray = `${lenSelisih} ${circumference}`;
      segSelisih.style.strokeDashoffset = `${-lenKlop}`;

      segKosong.style.strokeDasharray = `${lenKosong} ${circumference}`;
      segKosong.style.strokeDashoffset = `${-(lenKlop + lenSelisih)}`;
    }

    const centerPct = document.getElementById('donutCenterPct');
    if (centerPct) centerPct.textContent = `${arts.length ? pctKlop : 0}%`;

    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setTxt('legendKlopPct', `${arts.length ? pctKlop : 0}%`);
    setTxt('legendKlopVal', `${klopCount} SKU`);
    setTxt('legendSelisihPct', `${arts.length ? pctSelisih : 0}%`);
    setTxt('legendSelisihVal', `${selisihCount} SKU`);
    setTxt('legendKosongPct', `${arts.length ? pctKosong : 0}%`);
    setTxt('legendKosongVal', `${kosongCount} SKU`);

    // Ringkasan Per-Lokasi di Analytics
    const summaryBox = document.getElementById('analyticsLocSummary');
    if (summaryBox) {
      const locs = Object.values(LiamDB.locations);
      if (locs.length === 0) {
        summaryBox.innerHTML = `<p style="font-size:11.5px; color:var(--text-muted);">Belum ada sesi lokasi tersimpan.</p>`;
      } else {
        summaryBox.innerHTML = locs
          .map((l) => {
            const pcs = Object.values(l.scans || {}).reduce((a, b) => a + b, 0);
            const sku = Object.keys(l.scans || {}).length;
            return `
              <div class="legend-row" style="border-bottom:1px solid rgba(52,211,153,0.1); padding:7px 0;">
                <div class="legend-left">
                  <span class="legend-dot" style="background:var(--emerald-bright);"></span>
                  <div>
                    <div style="font-weight:700; color:#fff;">${l.noLokasi}</div>
                    <div style="font-size:10px; color:var(--text-muted);">Doc: ${l.noDocument} • ${l.pemeriksa} (${l.tanggal})</div>
                  </div>
                </div>
                <div class="legend-right" style="color:var(--champagne);">${pcs} Pcs (${sku} SKU)</div>
              </div>`;
          })
          .join('');
      }
    }
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
    if (cancelBtn) {
      cancelBtn.style.display = isInitial && !LiamDB.getActiveLocation() ? 'none' : 'inline-flex';
    }
    document.getElementById('locationModal').classList.add('open');
  },

  saveNewLocation() {
    const noLokasi = document.getElementById('locInputNomor').value.trim();
    const pemeriksa = document.getElementById('locInputPemeriksa').value.trim();
    const noDocument = document.getElementById('locInputDoc').value.trim();
    const tanggal = document.getElementById('locInputTanggal').value;

    if (!noLokasi) {
      alert('Nomor Lokasi wajib diisi (contoh: RAK-SKE-01 / GUDANG-1).');
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
    this.switchView('scan', document.getElementById('nav-scan'));
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

  renderLocationsList() {
    const container = document.getElementById('locationsList');
    if (!container) return;

    const locs = Object.values(LiamDB.locations).reverse();
    if (locs.length === 0) {
      container.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:12px; margin-top:16px;">Belum ada lokasi tersimpan. Tekan "+ Buat Sesi Lokasi Baru".</p>`;
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
                <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
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
      if (wrapper) wrapper.classList.remove('scanning');
      btn.textContent = '▶ Mulai Scan';
      btn.className = 'btn btn-champagne';
    } else {
      try {
        await LiamScanner.start((code) => this.processBarcode(code));
        if (wrapper) wrapper.classList.add('scanning');
        btn.textContent = '⏹ Stop';
        btn.className = 'btn btn-danger';
      } catch (e) {
        alert('Kamera gagal dibuka. Pastikan izin kamera diizinkan & dibuka via HTTPS.');
      }
    }
  },

  async toggleFlash() {
    const isOn = await LiamScanner.toggleTorch();
    const btn = document.getElementById('btnTorch');
    btn.style.borderColor = isOn ? 'var(--warning)' : 'var(--glass-border)';
    btn.style.color = isOn ? 'var(--warning)' : 'var(--text-main)';
  },

  toggleMode() {
    LiamScanner.isContinuous = !LiamScanner.isContinuous;
    const btn = document.getElementById('btnScanMode');
    btn.textContent = LiamScanner.isContinuous ? '⚡ Auto' : '1️⃣ Single';
  },

  resetLastScanCard() {
    const card = document.getElementById('lastScanCard');
    if (!card) return;
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
      box.innerHTML = `<p style="font-size:11px; color:var(--text-muted); margin-top:6px;">Tidak ada artikel cocok di Master.</p>`;
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
        <div style="display:flex; justify-content:space-between; padding:6px 9px; background:rgba(4,15,11,0.85); border:1px solid var(--glass-border); border-radius:8px; margin-bottom:4px; font-size:11.5px;">
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
    const searchEl = document.getElementById('searchBox');
    const container = document.getElementById('articleList');
    if (!container) return;

    const q = searchEl ? searchEl.value.toLowerCase() : '';
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
      container.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:12px; margin-top:16px;">Belum ada data artikel. Import file stok di tab Data.</p>`;
      return;
    }

    container.innerHTML = filtered
      .slice(0, 100)
      .map((a) => {
        const locQty = LiamDB.getScannedQty(a.kodeArtikel);
        const totalAll = combined[a.kodeArtikel] || 0;
        const sizeTag = a.kodeArtikel.slice(-3);

        let badge = `<span class="badge badge-kosong">0 SCAN</span>`;
        if (totalAll > 0 && totalAll === a.systemQty) badge = `<span class="badge badge-ada">KLOP</span>`;
        else if (totalAll > 0) badge = `<span class="badge badge-selisih">ADA (${totalAll})</span>`;

        return `
          <div class="item-card scroll-hidden" onclick="LiamApp.openArticleDetail('${a.kodeArtikel}')">
            <div class="item-avatar">${sizeTag}</div>
            <div class="item-main">
              <div class="item-code">${a.kodeArtikel}</div>
              <div class="item-desc">${a.namaArtikel}</div>
              <div class="item-sub">Sistem: ${a.systemQty} • Rp ${a.harga.toLocaleString('id-ID')}</div>
            </div>
            <div class="item-right">
              ${badge}
              <div style="font-size:14px; font-weight:800; color:var(--champagne); margin-top:4px;">+${locQty}</div>
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
      container.innerHTML = `<p style="font-size:11px; color:var(--text-muted);">Tidak ada data barcode.</p>`;
      return;
    }

    container.innerHTML = entries
      .map(
        (k) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:7px 9px; background:rgba(4,15,11,0.85); border:1px solid var(--glass-border); border-radius:9px; margin-bottom:5px; font-size:11.5px;">
          <div>
            <strong style="color:var(--champagne);">${k.barcode}</strong> → <span style="color:var(--emerald-bright);">${k.kodeArtikel}</span>
            <div style="font-size:10px; color:var(--text-muted);">${k.tipe}</div>
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
