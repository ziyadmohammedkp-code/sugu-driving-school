class SoundEngine {
  private ctx: AudioContext | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  private screechGain: GainNode | null = null;
  private screechFilter: BiquadFilterNode | null = null;
  private screechNoise: AudioBufferSourceNode | null = null;

  private nitroGain: GainNode | null = null;
  private nitroNoise: AudioBufferSourceNode | null = null;

  private masterGain: GainNode | null = null;
  private isMuted = false;
  private initialized = false;

  public init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.initEngineSound();
      this.initScreechSound();
      this.initNitroSound();

      this.initialized = true;
    } catch {
      // AudioContext might fail or be blocked until user gesture
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.4, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private initEngineSound() {
    if (!this.ctx || !this.masterGain) return;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(400, this.ctx.currentTime);

    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(55, this.ctx.currentTime);

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(110, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  private createNoiseBuffer(duration = 2.0): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private initScreechSound() {
    if (!this.ctx || !this.masterGain) return;

    const noiseBuffer = this.createNoiseBuffer(2.0);
    if (!noiseBuffer) return;

    this.screechGain = this.ctx.createGain();
    this.screechGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.screechFilter = this.ctx.createBiquadFilter();
    this.screechFilter.type = 'bandpass';
    this.screechFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    this.screechFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    this.screechNoise = this.ctx.createBufferSource();
    this.screechNoise.buffer = noiseBuffer;
    this.screechNoise.loop = true;

    this.screechNoise.connect(this.screechFilter);
    this.screechFilter.connect(this.screechGain);
    this.screechGain.connect(this.masterGain);

    this.screechNoise.start();
  }

  private initNitroSound() {
    if (!this.ctx || !this.masterGain) return;

    const noiseBuffer = this.createNoiseBuffer(2.0);
    if (!noiseBuffer) return;

    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.setValueAtTime(0, this.ctx.currentTime);

    const nitroFilter = this.ctx.createBiquadFilter();
    nitroFilter.type = 'highpass';
    nitroFilter.frequency.setValueAtTime(800, this.ctx.currentTime);

    this.nitroNoise = this.ctx.createBufferSource();
    this.nitroNoise.buffer = noiseBuffer;
    this.nitroNoise.loop = true;

    this.nitroNoise.connect(nitroFilter);
    nitroFilter.connect(this.nitroGain);
    this.nitroGain.connect(this.masterGain);

    this.nitroNoise.start();
  }

  public updateCarAudio(speedRatio: number, isDrifting: boolean, isNitro: boolean) {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const absSpeed = Math.abs(speedRatio);

    // Engine sound modulation
    if (this.engineOsc1 && this.engineOsc2 && this.engineGain && this.engineFilter) {
      const baseFreq = 50 + absSpeed * 180;
      this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
      this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.05);
      this.engineFilter.frequency.setTargetAtTime(350 + absSpeed * 1200, now, 0.05);
      this.engineGain.gain.setTargetAtTime(0.08 + absSpeed * 0.18, now, 0.05);
    }

    // Tire screech
    if (this.screechGain) {
      const targetGain = isDrifting && absSpeed > 0.25 ? Math.min(0.28, absSpeed * 0.3) : 0;
      this.screechGain.gain.setTargetAtTime(targetGain, now, 0.08);
    }

    // Nitro sound
    if (this.nitroGain) {
      const targetGain = isNitro ? 0.35 : 0;
      this.nitroGain.gain.setTargetAtTime(targetGain, now, 0.06);
    }
  }

  public stopCarAudio() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.engineGain) this.engineGain.gain.setTargetAtTime(0, now, 0.1);
    if (this.screechGain) this.screechGain.gain.setTargetAtTime(0, now, 0.05);
    if (this.nitroGain) this.nitroGain.gain.setTargetAtTime(0, now, 0.05);
  }

  public playCountdownBeep(isGo: boolean) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const freq = isGo ? 880 : 440;
      const duration = isGo ? 0.45 : 0.25;

      osc.type = isGo ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // ignore
    }
  }

  public playCollisionSound(intensity = 0.5) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(Math.min(0.4, intensity * 0.4), this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch {
      // ignore
    }
  }

  public playCheckpointChime() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      [659.25, 880].forEach((freq, i) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.22);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.25);
      });
    } catch {
      // ignore
    }
  }

  public playFinishFanfare() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const now = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0.25, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.4);
      });
    } catch {
      // ignore
    }
  }

  public playCowMoo() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(160, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(105, now + 0.55);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.65);
    } catch {
      // ignore
    }
  }

  public playGoatBaa() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const tremolo = this.ctx.createOscillator();
      const tremoloGain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.linearRampToValueAtTime(285, now + 0.06);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.38);

      // Tremolo LFO for classic "baa-aa-aah" flutter
      tremolo.frequency.setValueAtTime(16, now);
      tremoloGain.gain.setValueAtTime(0.08, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

      tremolo.connect(tremoloGain);
      tremoloGain.connect(gain.gain);

      osc.connect(gain);
      gain.connect(this.masterGain);

      tremolo.start(now);
      osc.start(now);
      tremolo.stop(now + 0.45);
      osc.stop(now + 0.45);
    } catch {
      // ignore
    }
  }
}

export const sounds = new SoundEngine();
