// ============================================================================
// LIAMVSCAN EXCEL & CSV ENGINE v2.0 (com.xliamvr.scan)
// Perbaikan Akurasi Desimal (.00), Gabung Multi-File, & Export Per-Lokasi
// ============================================================================

const LiamExcel = {
  parseCleanNumber(rawVal) {
    if (rawVal === null || rawVal === undefined || rawVal === '') return 0;
    const str = String(rawVal).trim();
    if (/^-?\d{1,3}(\.\d{3})+$/.test(str)) {
      return parseInt(str.replace(/\./g, ''), 10) || 0;
    }
    const num = parseFloat(str.replace(/,/g, ''));
    return isNaN(num) ? 0 : Math.round(num);
  },

  importMasterFile(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });

        let importedArticles = 0;
        let importedBarcodes = 0;
        const fileArticles = {};

        const isRawMap = rows.some(
          (r) => String(r[0]).includes('MITRA ADIPERKASA') || String(r[4]).includes(' / ')
        );

        if (isRawMap) {
          rows.forEach((r) => {
            const descCol = String(r[4] || '').trim();
            const bcCol = String(r[5] || '').trim();
            if (!descCol.includes(' / ') || !bcCol) return;

            const parts = descCol.split(' / ');
            const kodeArtikel = parts[0].trim().toUpperCase();
            const namaArtikel = parts.slice(1).join(' / ').trim();
            const brand = String(r[0] || '').trim();
            const subCategory = String(r[3] || '').trim();
            const price = this.parseCleanNumber(r[6]);
            const qty = this.parseCleanNumber(r[7]);

            if (!fileArticles[kodeArtikel]) {
              fileArticles[kodeArtikel] = {
                kodeArtikel,
                namaArtikel,
                brand,
                subCategory,
                harga: price,
                systemQty: qty
              };
              importedArticles++;
            } else {
              if (price > fileArticles[kodeArtikel].harga) {
                fileArticles[kodeArtikel].harga = price;
              }
              fileArticles[kodeArtikel].systemQty += qty;
            }

            const tipe = bcCol.startsWith('100') ? 'Internal MAP (100...)' : 'UPC Pabrik / Box';
            LiamDB.kamus[bcCol] = {
              barcode: bcCol,
              kodeArtikel,
              tipe,
              updatedAt: new Date().toISOString()
            };
            importedBarcodes++;
          });
        } else {
          const headerIdx = rows.findIndex((r) =>
            r.some((cell) => /kode_artikel|artikel/i.test(String(cell)))
          );
          if (headerIdx === -1) throw new Error('Kolom Kode_Artikel tidak ditemukan di file.');

          const headers = rows[headerIdx].map((h) => String(h).trim().toLowerCase());
          const idxCode = headers.findIndex((h) => h.includes('kode_artikel') || h === 'artikel');
          const idxName = headers.findIndex((h) => h.includes('nama'));
          const idxBrand = headers.findIndex((h) => h.includes('brand'));
          const idxSub = headers.findIndex((h) => h.includes('subcat'));
          const idxPrice = headers.findIndex((h) => h.includes('harga'));
          const idxQty = headers.findIndex((h) => h.includes('stok'));

          for (let i = headerIdx + 1; i < rows.length; i++) {
            const r = rows[i];
            const kodeArtikel = String(r[idxCode] || '').trim().toUpperCase();
            if (!kodeArtikel || kodeArtikel.includes('TOTAL')) continue;

            fileArticles[kodeArtikel] = {
              kodeArtikel,
              namaArtikel: idxName !== -1 ? String(r[idxName] || '').trim() : kodeArtikel,
              brand: idxBrand !== -1 ? String(r[idxBrand] || '').trim() : '',
              subCategory: idxSub !== -1 ? String(r[idxSub] || '').trim() : '',
              harga: idxPrice !== -1 ? this.parseCleanNumber(r[idxPrice]) : 0,
              systemQty: idxQty !== -1 ? this.parseCleanNumber(r[idxQty]) : 0
            };
            importedArticles++;
          }
        }

        Object.assign(LiamDB.articles, fileArticles);
        LiamDB.saveAll();
        callback(null, { importedArticles, importedBarcodes });
      } catch (err) {
        callback(err);
      }
    };
    reader.readAsArrayBuffer(file);
  },

  importKamusFile(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });

        const headerIdx = rows.findIndex((r) =>
          r.some((cell) => /barcode/i.test(String(cell)))
        );
        if (headerIdx === -1) throw new Error('Kolom Barcode tidak ditemukan.');

        const headers = rows[headerIdx].map((h) => String(h).trim().toLowerCase());
        const idxBc = headers.findIndex((h) => h.includes('barcode'));
        const idxArt = headers.findIndex((h) => h.includes('kode_artikel') || h.includes('artikel'));
        const idxTipe = headers.findIndex((h) => h.includes('tipe'));

        let count = 0;
        for (let i = headerIdx + 1; i < rows.length; i++) {
          const r = rows[i];
          const bc = String(r[idxBc] || '').trim();
          const art = String(r[idxArt] || '').trim().toUpperCase();
          if (!bc || !art) continue;

          LiamDB.kamus[bc] = {
            barcode: bc,
            kodeArtikel: art,
            tipe: idxTipe !== -1 && r[idxTipe] ? String(r[idxTipe]).trim() : 'Import Kamus',
            updatedAt: new Date().toISOString()
          };
          count++;
        }

        LiamDB.saveAll();
        callback(null, count);
      } catch (err) {
        callback(err);
      }
    };
    reader.readAsArrayBuffer(file);
  },

  exportCsvIcc(mode = 'ALL') {
    const store = (LiamDB.config.storeCode || 'SSFE').trim().toUpperCase();
    let scanMap = {};
    let suffixName = 'ALL_LOKASI';

    if (mode === 'ACTIVE') {
      const loc = LiamDB.getActiveLocation();
      if (!loc) return alert('Pilih atau buat sesi lokasi terlebih dahulu.');
      scanMap = loc.scans || {};
      suffixName = loc.noLokasi.replace(/[^A-Z0-9_-]/gi, '_');
    } else {
      scanMap = LiamDB.getCombinedScansMap();
    }

    const entries = Object.entries(scanMap).filter(([, qty]) => qty > 0);
    if (entries.length === 0) {
      alert('Belum ada barang yang terscan (Qty > 0) pada pilihan ini.');
      return;
    }

    const csvLines = entries.map(([kodeArtikel, qty]) => `${store},${kodeArtikel},${qty}`);
    const blob = new Blob([csvLines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const stamp = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
    link.href = URL.createObjectURL(blob);
    link.download = `ICC_${store}_${suffixName}_${stamp}.csv`;
    link.click();
  },

  exportAuditExcel() {
    const all = Object.values(LiamDB.articles);
    if (all.length === 0) return alert('Data master artikel masih kosong.');

    const combined = LiamDB.getCombinedScansMap();

    const mapRow = (a) => {
      const totalScan = combined[a.kodeArtikel] || 0;
      const selisih = totalScan - a.systemQty;
      let status = 'KLOP';
      if (totalScan === 0 && a.systemQty > 0) status = 'TIDAK ADA (0 SCAN)';
      else if (selisih !== 0) status = selisih > 0 ? 'LEBIH (+)' : 'KURANG (-)';

      return {
        Kode_Toko: LiamDB.config.storeCode,
        Kode_Artikel: a.kodeArtikel,
        Nama_Artikel: a.namaArtikel,
        SubCategory: a.subCategory,
        Stok_Sistem: a.systemQty,
        Total_Scan_Semua_Lokasi: totalScan,
        Selisih: selisih,
        Status: status
      };
    };

    const locRows = [];
    Object.values(LiamDB.locations).forEach((loc) => {
      Object.entries(loc.scans || {}).forEach(([artCode, qty]) => {
        if (qty <= 0) return;
        const art = LiamDB.articles[artCode];
        locRows.push({
          No_Lokasi: loc.noLokasi,
          No_Document: loc.noDocument,
          Tanggal: loc.tanggal,
          Pemeriksa: loc.pemeriksa,
          Kode_Artikel: artCode,
          Nama_Artikel: art ? art.namaArtikel : artCode,
          Qty_Scan: qty
        });
      });
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(all.map(mapRow)), 'Rekap_Semua_Artikel');
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(locRows.length ? locRows : [{ Info: 'Belum ada data scan lokasi' }]),
      'Rincian_Per_Lokasi'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(all.filter((a) => (combined[a.kodeArtikel] || 0) === 0).map(mapRow)),
      'Tidak_Ada'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(all.filter((a) => (combined[a.kodeArtikel] || 0) !== a.systemQty).map(mapRow)),
      'Selisih_SO'
    );

    const tgl = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Liamvscan_Audit_${LiamDB.config.storeCode}_${tgl}.xlsx`);
  },

  exportKamusExcel() {
    const entries = Object.values(LiamDB.kamus);
    if (entries.length === 0) return alert('Kamus barcode masih kosong.');

    const rows = entries.map((k, idx) => ({
      No: idx + 1,
      Barcode: k.barcode,
      Kode_Artikel: k.kodeArtikel,
      Nama_Artikel_Size: LiamDB.articles[k.kodeArtikel]?.namaArtikel || '',
      Tipe_Barcode: k.tipe,
      Status: 'AKTIF'
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Kamus_Barcode');
    const tgl = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Liamvscan_Kamus_Barcode_${tgl}.xlsx`);
  }
};
