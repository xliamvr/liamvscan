const DB_KEYS = {
  MASTER: 'liamvscan_master_v11',
  KAMUS: 'liamvscan_kamus_v11',
  LOCATIONS: 'liamvscan_locations_v11',
  ACTIVE_LOC: 'liamvscan_active_loc_v11',
  CONFIG: 'liamvscan_config_v11'
};

const LiamDB = {
  config: {
    storeCode: 'SSFE',
    operator: 'Liam',
    cooldownMs: 1400
  },

  articles: {},
  kamus: {},
  locations: {},
  activeLocationId: null,

  init() {
    const savedConfig = localStorage.getItem(DB_KEYS.CONFIG);
    const savedMaster = localStorage.getItem(DB_KEYS.MASTER);
    const savedKamus = localStorage.getItem(DB_KEYS.KAMUS);
    const savedLocs = localStorage.getItem(DB_KEYS.LOCATIONS);
    const savedActiveLoc = localStorage.getItem(DB_KEYS.ACTIVE_LOC);

    if (savedConfig) this.config = { ...this.config, ...JSON.parse(savedConfig) };
    if (savedMaster) this.articles = JSON.parse(savedMaster);
    if (savedKamus) this.kamus = JSON.parse(savedKamus);
    if (savedLocs) this.locations = JSON.parse(savedLocs);
    if (savedActiveLoc && this.locations[savedActiveLoc]) {
      this.activeLocationId = savedActiveLoc;
    }
  },

  saveAll() {
    localStorage.setItem(DB_KEYS.CONFIG, JSON.stringify(this.config));
    localStorage.setItem(DB_KEYS.MASTER, JSON.stringify(this.articles));
    localStorage.setItem(DB_KEYS.KAMUS, JSON.stringify(this.kamus));
    localStorage.setItem(DB_KEYS.LOCATIONS, JSON.stringify(this.locations));
    if (this.activeLocationId) {
      localStorage.setItem(DB_KEYS.ACTIVE_LOC, this.activeLocationId);
    } else {
      localStorage.removeItem(DB_KEYS.ACTIVE_LOC);
    }
  },

  createLocation({ noLokasi, pemeriksa, noDocument, tanggal }) {
    const id = 'LOC_' + Date.now();
    this.locations[id] = {
      id,
      noLokasi: String(noLokasi || 'RAK-01').trim().toUpperCase(),
      pemeriksa: String(pemeriksa || this.config.operator || 'Liam').trim(),
      noDocument: String(noDocument || '-').trim().toUpperCase(),
      tanggal: tanggal || new Date().toISOString().slice(0, 10),
      scans: {},
      updatedAt: new Date().toISOString()
    };
    this.activeLocationId = id;
    this.saveAll();
    return this.locations[id];
  },

  setActiveLocation(locId) {
    if (this.locations[locId]) {
      this.activeLocationId = locId;
      this.saveAll();
      return this.locations[locId];
    }
    return null;
  },

  getActiveLocation() {
    if (!this.activeLocationId) return null;
    return this.locations[this.activeLocationId] || null;
  },

  deleteLocation(locId) {
    delete this.locations[locId];
    if (this.activeLocationId === locId) {
      const remaining = Object.keys(this.locations);
      this.activeLocationId = remaining.length ? remaining[0] : null;
    }
    this.saveAll();
  },

  getScannedQty(kodeArtikel) {
    const loc = this.getActiveLocation();
    if (!loc) return 0;
    return loc.scans[kodeArtikel] || 0;
  },

  setScannedQty(kodeArtikel, newQty) {
    const loc = this.getActiveLocation();
    if (!loc) return 0;
    const cleanQty = Math.max(0, parseInt(newQty, 10) || 0);
    if (cleanQty === 0) {
      delete loc.scans[kodeArtikel];
    } else {
      loc.scans[kodeArtikel] = cleanQty;
    }
    loc.updatedAt = new Date().toISOString();
    this.saveAll();
    return cleanQty;
  },

  incrementScan(kodeArtikel, delta = 1) {
    const current = this.getScannedQty(kodeArtikel);
    return this.setScannedQty(kodeArtikel, current + delta);
  },

  getCombinedScansMap() {
    const combined = {};
    Object.values(this.locations).forEach((loc) => {
      Object.entries(loc.scans || {}).forEach(([artCode, qty]) => {
        combined[artCode] = (combined[artCode] || 0) + qty;
      });
    });
    return combined;
  },

  findArticleByBarcode(rawBarcode) {
    const bc = String(rawBarcode).trim();
    const mapping = this.kamus[bc];
    if (mapping && this.articles[mapping.kodeArtikel]) {
      return this.articles[mapping.kodeArtikel];
    }
    const upper = bc.toUpperCase();
    if (this.articles[upper]) {
      return this.articles[upper];
    }
    return null;
  },

  pairBarcode(barcode, kodeArtikel, namaArtikel = '', tipe = 'Barcode Tambahan') {
    const bc = String(barcode).trim();
    const code = String(kodeArtikel).trim().toUpperCase();
    if (!bc || !code) return null;

    if (!this.articles[code]) {
      this.articles[code] = {
        kodeArtikel: code,
        namaArtikel: namaArtikel.trim() || code,
        brand: code.slice(0, 3),
        subCategory: 'BARU',
        harga: 0,
        systemQty: 0
      };
    }

    this.kamus[bc] = {
      barcode: bc,
      kodeArtikel: code,
      tipe: tipe,
      updatedAt: new Date().toISOString()
    };

    this.saveAll();
    return this.articles[code];
  },

  getSiblingSizes(kodeArtikel) {
    const prefix = kodeArtikel.slice(0, 12);
    const combined = this.getCombinedScansMap();
    return Object.values(this.articles)
      .filter((a) => a.kodeArtikel.startsWith(prefix))
      .map((a) => ({
        ...a,
        activeScanQty: this.getScannedQty(a.kodeArtikel),
        totalAllLocQty: combined[a.kodeArtikel] || 0
      }))
      .sort((a, b) => a.kodeArtikel.localeCompare(b.kodeArtikel));
  },

  getBarcodesForArticle(kodeArtikel) {
    return Object.values(this.kamus)
      .filter((k) => k.kodeArtikel === kodeArtikel)
      .map((k) => k.barcode);
  },

  resetActiveLocationScans() {
    const loc = this.getActiveLocation();
    if (loc) {
      loc.scans = {};
      loc.updatedAt = new Date().toISOString();
      this.saveAll();
    }
  },

  resetAll() {
    this.articles = {};
    this.kamus = {};
    this.locations = {};
    this.activeLocationId = null;
    this.saveAll();
  }
};
