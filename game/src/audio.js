// audio.js - WebAudio synth only: engine, chime, thud, crash, stall beep.
export class GameAudio {
  constructor() { this.ctx = null; this.muted = false; this.engineOsc = null; this.engineGain = null; }
  ensure() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();
      this.engineOsc.type = "sawtooth";
      this.engineOsc.frequency.value = 55;
      this.engineGain.gain.value = 0;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass"; filter.frequency.value = 420;
      this.engineOsc.connect(filter); filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
    } catch { this.ctx = null; }
  }
  setEngine(throttle, flying) {
    if (!this.ctx || !this.engineOsc) return;
    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(50 + throttle * 85, t, 0.1);
    this.engineGain.gain.setTargetAtTime(this.muted || !flying ? 0 : 0.015 + throttle * 0.035, t, 0.1);
  }
  tone(freq, dur, type = "sine", vol = 0.08, when = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + dur);
  }
  ring() { this.tone(880, 0.18); this.tone(1318, 0.28, "sine", 0.07, 0.09); }
  stall() { this.tone(220, 0.12, "square", 0.05); }
  thud() { this.tone(72, 0.3, "sine", 0.16); }
  crash() { this.tone(140, 0.5, "sawtooth", 0.14); this.tone(55, 0.7, "square", 0.12, 0.05); }
  toggleMute() { this.muted = !this.muted; return this.muted; }
}
