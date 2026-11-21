:root {
  --bg: #030a08;
  --surface: #07130f;
  --card: rgba(11, 29, 23, 0.76);
  --card-solid: #0b1d17;
  --border: rgba(52, 211, 153, 0.24);
  --border-strong: rgba(52, 211, 153, 0.5);
  --text: #f0fdf4;
  --muted: #86efac;
  --muted-dim: #6ee7b7aa;
  --emerald: #10b981;
  --emerald-bright: #34d399;
  --champagne: #ebd9b4;
  --champagne-dark: #131c18;
  --warning: #fbbf24;
  --danger: #f87171;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-tap-highlight-color: transparent;
}

html {
  scroll-behavior: smooth;
}

body {
  background-color: var(--bg);
  background-image:
    radial-gradient(circle at 85% 8%, rgba(16, 185, 129, 0.22) 0%, transparent 42%),
    radial-gradient(circle at 12% 38%, rgba(235, 217, 180, 0.08) 0%, transparent 45%),
    radial-gradient(circle at 80% 78%, rgba(5, 150, 105, 0.16) 0%, transparent 50%);
  background-attachment: fixed;
  color: var(--text);
  padding-bottom: 84px;
  overflow-x: hidden;
}

/* Header PDT Glass */
.pdt-header {
  background: rgba(5, 16, 13, 0.85);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--border);
  padding: 10px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 40;
}

.brand-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-title h1 {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.6px;
  background: linear-gradient(90deg, #ffffff, var(--champagne));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.store-pill {
  background: rgba(16, 185, 129, 0.14);
  border: 1px solid var(--border-strong);
  color: var(--emerald-bright);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
}

.scan-counter-badge {
  background: linear-gradient(135deg, var(--champagne), #d4be92);
  color: var(--champagne-dark);
  font-size: 12px;
  font-weight: 800;
  padding: 4px 11px;
  border-radius: 20px;
  box-shadow: 0 0 14px rgba(235, 217, 180, 0.28);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.scan-counter-badge.pop {
  transform: scale(1.16);
}

/* Views & Smooth Fade Transition */
.view-section {
  display: none;
  padding: 12px;
  max-width: 600px;
  margin: 0 auto;
  animation: viewFadeIn 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

.view-section.active {
  display: block;
}

@keyframes viewFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Banner Lokasi Aktif (Top Card) */
.location-banner {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(7, 22, 17, 0.9));
  border: 1px solid var(--border-strong);
  border-radius: 14px;
  padding: 10px 12px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
  cursor: pointer;
}

.loc-info-title {
  font-size: 13px;
  font-weight: 800;
  color: var(--champagne);
  display: flex;
  align-items: center;
  gap: 6px;
}

.loc-info-sub {
  font-size: 11px;
  color: var(--muted-dim);
  margin-top: 2px;
}

/* Split-Screen Camera Box + Laser Motion */
.camera-wrapper {
  position: relative;
  width: 100%;
  background: #010403;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--border-strong);
  box-shadow: 0 0 24px rgba(16, 185, 129, 0.14);
  min-height: 165px;
}

#reader {
  width: 100%;
}

#reader video {
  object-fit: cover !important;
  max-height: 175px;
}

.laser-line {
  position: absolute;
  left: 10%;
  right: 10%;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--emerald-bright), var(--champagne), var(--emerald-bright), transparent);
  box-shadow: 0 0 10px var(--emerald-bright);
  top: 25%;
  opacity: 0;
  pointer-events: none;
  z-index: 8;
}

.camera-wrapper.scanning .laser-line {
  opacity: 1;
  animation: laserSweep 1.8s ease-in-out infinite;
}

@keyframes laserSweep {
  0%, 100% { top: 24%; }
  50% { top: 74%; }
}

.flash-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(52, 211, 153, 0.45), rgba(16, 185, 129, 0.15));
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.16s ease-out;
  z-index: 10;
}

.flash-overlay.active {
  opacity: 1;
}

.cam-controls {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 7px;
  margin-top: 8px;
}

/* Motion Graphic Buttons + Click Ripple */
.btn {
  position: relative;
  overflow: hidden;
  border: none;
  border-radius: 22px;
  padding: 10px 14px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, border-color 0.2s ease;
}

.btn:active {
  transform: scale(0.95);
}

.btn-champagne {
  background: linear-gradient(135deg, var(--champagne), #d6c096);
  color: var(--champagne-dark);
  box-shadow: 0 4px 14px rgba(235, 217, 180, 0.22);
}

.btn-emerald {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #022c22;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.28);
}

.btn-glass {
  background: var(--card);
  backdrop-filter: blur(10px);
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-warning {
  background: linear-gradient(135deg, #fbbf24, #d97706);
  color: #1c1917;
}

.btn-danger {
  background: linear-gradient(135deg, #ef4444, #b91c1c);
  color: #fff;
}

.btn-full {
  width: 100%;
  margin-top: 8px;
}

/* Click Ripple Circle */
.ripple-wave {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.35);
  transform: scale(0);
  animation: rippleBurst 0.5s linear;
  pointer-events: none;
}

@keyframes rippleBurst {
  to {
    transform: scale(3.5);
    opacity: 0;
  }
}

/* Glass Card: Last Scanned */
.last-scan-card {
  background: var(--card);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid var(--border);
  border-left: 4px solid var(--muted-dim);
  border-radius: 16px;
  padding: 12px 14px;
  margin-top: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.25s ease;
}

.last-scan-card.matched {
  border-color: var(--border-strong);
  border-left: 4px solid var(--emerald-bright);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(8, 22, 17, 0.85));
}

.last-scan-card.unknown {
  border-color: rgba(251, 191, 36, 0.45);
  border-left: 4px solid var(--warning);
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(8, 22, 17, 0.85));
}

.ls-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 4px;
}

.ls-code {
  font-size: 15.5px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 0.3px;
}

.ls-name {
  font-size: 12px;
  color: #d1fae5;
  margin-top: 2px;
}

.ls-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(52, 211, 153, 0.15);
}

.qty-stepper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--border-strong);
  background: rgba(16, 185, 129, 0.12);
  color: var(--champagne);
  font-size: 18px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.step-btn:active {
  transform: scale(0.88);
}

.qty-tap-pill {
  background: rgba(235, 217, 180, 0.15);
  border: 1px dashed var(--champagne);
  color: var(--champagne);
  padding: 3px 12px;
  border-radius: 12px;
  font-size: 17px;
  font-weight: 800;
  min-width: 40px;
  text-align: center;
  cursor: pointer;
}

/* Inputs & Filter Pills */
.manual-bar {
  display: flex;
  gap: 7px;
  margin-top: 10px;
}

input[type="text"], input[type="number"], input[type="date"], select {
  width: 100%;
  background: rgba(6, 18, 14, 0.85);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input:focus {
  border-color: var(--emerald-bright);
  box-shadow: 0 0 12px rgba(52, 211, 153, 0.2);
}

.filter-row {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  margin: 10px 0;
  padding-bottom: 4px;
}

.pill {
  background: var(--card);
  border: 1px solid var(--border);
  color: var(--muted-dim);
  padding: 6px 13px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pill.active {
  background: linear-gradient(135deg, var(--champagne), #d4be92);
  border-color: var(--champagne);
  color: var(--champagne-dark);
  box-shadow: 0 3px 12px rgba(235, 217, 180, 0.25);
}

/* Scroll Reveal Motion for Article & Location Cards */
.item-card {
  background: var(--card);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 11px 13px;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease, border-color 0.2s ease;
}

.item-card.scroll-hidden {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

.item-card.scroll-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.item-card:active {
  transform: scale(0.98);
  border-color: var(--emerald-bright);
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-code {
  font-size: 13px;
  font-weight: 800;
  color: var(--emerald-bright);
}

.item-desc {
  font-size: 12px;
  color: #ecfdf5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.item-sub {
  font-size: 11px;
  color: var(--muted-dim);
  margin-top: 3px;
}

.item-right {
  text-align: right;
  flex-shrink: 0;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 800;
}

.badge-ada { background: rgba(16, 185, 129, 0.22); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.35); }
.badge-kosong { background: rgba(248, 113, 113, 0.16); color: #fca5a5; }
.badge-selisih { background: rgba(251, 191, 36, 0.2); color: #fde047; }

/* Panels & Stats */
.panel {
  background: var(--card);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 14px;
  margin-bottom: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.panel h3 {
  font-size: 14px;
  margin-bottom: 6px;
  color: var(--champagne);
}

.panel p {
  font-size: 12px;
  color: var(--muted-dim);
  line-height: 1.45;
  margin-bottom: 10px;
}

.stats-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.stat-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 10px 8px;
  text-align: center;
}

.stat-card .num {
  font-size: 18px;
  font-weight: 800;
}

.stat-card .lbl {
  font-size: 10.5px;
  color: var(--muted-dim);
  margin-top: 2px;
}

/* Location Session Cards */
.loc-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px;
  margin-bottom: 9px;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.loc-card.active-loc {
  border: 1.5px solid var(--champagne);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(11, 29, 23, 0.9));
}

.form-group {
  margin-bottom: 9px;
}

.form-group label {
  display: block;
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 4px;
  font-weight: 600;
}

/* Glowing Bottom Navigation (Ala Velora UI) */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(4, 13, 10, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid var(--border);
  display: flex;
  padding: 6px 8px;
  gap: 4px;
  z-index: 40;
}

.nav-btn {
  flex: 1;
  background: none;
  border: 1px solid transparent;
  border-radius: 14px;
  color: var(--muted-dim);
  padding: 8px 4px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.nav-btn.active {
  background: rgba(16, 185, 129, 0.16);
  border-color: var(--border-strong);
  color: var(--emerald-bright);
  box-shadow: 0 0 16px rgba(16, 185, 129, 0.22);
  transform: translateY(-2px);
}

/* Modal */
.modal-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(1, 6, 4, 0.86);
  backdrop-filter: blur(6px);
  z-index: 90;
  align-items: center;
  justify-content: center;
  padding: 14px;
}

.modal-backdrop.open {
  display: flex;
  animation: viewFadeIn 0.2s ease;
}

.modal-card {
  background: var(--card-solid);
  border: 1px solid var(--border-strong);
  border-radius: 18px;
  padding: 16px;
  width: 100%;
  max-width: 440px;
  max-height: 86vh;
  overflow-y: auto;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.65);
}

.pair-option {
  padding: 9px 11px;
  border: 1px solid var(--border);
  border-radius: 10px;
  margin-top: 6px;
  background: rgba(6, 18, 14, 0.9);
  cursor: pointer;
}

.pair-option:active {
  border-color: var(--champagne);
}
