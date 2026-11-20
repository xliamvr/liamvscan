// ============================================================================
// LIAMVSCAN OPTICAL SCANNER & AUDIO ENGINE (com.xliamvr.scan)
// ============================================================================

const LiamScanner = {
  instance: null,
  isRunning: false,
  isContinuous: true,
  torchOn: false,
  lastCode: '',
  lastTime: 0,
  audioCtx: null,

  beep(success = true) {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = success ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(success ? 1350 : 300, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.22, this.audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + (success ? 0.11 : 0.25));

      if (navigator.vibrate) {
        navigator.vibrate(success ? 70 : [90, 50, 90]);
      }
    } catch (e) {}
  },

  triggerGreenFlash() {
    const el = document.getElementById('scanFlashOverlay');
    if (!el) return;
    el.classList.add('active');
    setTimeout(() => el.classList.remove('active'), 160);
  },

  async start(onDetected) {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    this.instance = new Html5Qrcode('reader');

    await this.instance.start(
      { facingMode: 'environment' },
      {
        fps: 18,
        qrbox: (viewW, viewH) => ({
          width: Math.min(Math.floor(viewW * 0.85), 320),
          height: Math.min(Math.floor(viewH * 0.45), 115)
        })
      },
      (decodedText) => {
        const code = String(decodedText).trim();
        const now = Date.now();
        if (code === this.lastCode && now - this.lastTime < LiamDB.config.cooldownMs) {
          return;
        }
        this.lastCode = code;
        this.lastTime = now;
        onDetected(code);

        if (!this.isContinuous) {
          this.stop();
        }
      },
      () => {}
    );
    this.isRunning = true;
  },

  async stop() {
    if (this.instance && this.isRunning) {
      await this.instance.stop();
      this.isRunning = false;
      this.torchOn = false;
    }
  },

  async toggleTorch() {
    if (!this.instance || !this.isRunning) return false;
    try {
      this.torchOn = !this.torchOn;
      await this.instance.applyVideoConstraints({
        advanced: [{ torch: this.torchOn }]
      });
      return this.torchOn;
    } catch (e) {
      this.torchOn = false;
      alert('Senter tidak didukung di browser/kamera perangkat ini.');
      return false;
    }
  }
};
