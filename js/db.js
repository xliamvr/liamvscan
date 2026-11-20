// ============================================================================
// LIAMVSCAN DATABASE ENGINE (com.xliamvr.scan)
// Author: Ilham Maulana Nur Al Rasyid (@xliamvr)
// ============================================================================

const DB_KEYS = {
  MASTER: 'liamvscan_master_articles_v1',
  KAMUS: 'liamvscan_kamus_barcode_v1',
  CONFIG: 'liamvscan_config_v1'
};

const LiamDB = {
  config: {
    storeCode: 'SSFE',
    operator: 'Liam',
    cooldownMs: 1500
  },

  articles: {},
  kamus: {},

  init() {
    const savedConfig = localStorage.getItem(DB_KEYS.CONFIG);
    const savedMaster = localStorage.getItem(DB_KEYS.MASTER);
    const savedKamus = localStorage.getItem(DB_KEYS.KAMUS);

    if (savedConfig) this.config = { ...this.config, ...JSON.parse(savedConfig) };
    if (savedMaster) this.articles = JSON.parse(savedMaster);
    if (savedKamus) this.kamus = JSON.parse(savedKamus);
  },

  saveAll() {
    localStorage.setItem(DB_KEYS.CONFIG, JSON.stringify(this.config));
    localStorage.setItem(DB_KEYS.MASTER, JSON.stringify(this.articles));
    localStorage.setItem(DB_KEYS.KAMUS, JSON.stringify(this.kamus));
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
        systemQty: 0,
        scannedQty: 0
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
    return Object.values(this.articles)
      .filter((a) => a.kodeArtikel.startsWith(prefix))
      .sort((a, b) => a.kodeArtikel.localeCompare(b.kodeArtikel));
  },

  getBarcodesForArticle(kodeArtikel) {
    return Object.values(this.kamus)
      .filter((k) => k.kodeArtikel === kodeArtikel)
      .map((k) => k.barcode);
  },

  resetScansOnly() {
    Object.values(this.articles).forEach((a) => {
      a.scannedQty = 0;
    });
    this.saveAll();
  },

  resetAll() {
    this.articles = {};
    this.kamus = {};
    this.saveAll();
  }
};
