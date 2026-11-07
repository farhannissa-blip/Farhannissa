// 100% Procedural Web Audio API Sound Engine (Zero external MP3 404s)
// Enhanced with Multi-Layered Realistic Space Combat Audio Synthesis

class GalacticSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private sfxVolume: number = 0.75;
  private musicVolume: number = 0.4;
  private musicInterval: number | null = null;
  private currentMusicMode: 'none' | 'menu' | 'battle' | 'boss' | 'victory' | 'gameover' = 'none';
  private stepIndex: number = 0;
  private lastAutoLaserTime: number = 0;

  private ensureContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopMusic();
    } else if (this.currentMusicMode !== 'none') {
      const mode = this.currentMusicMode;
      this.currentMusicMode = 'none';
      this.startMusic(mode);
    }
  }

  public setVolumes(musicVol: number, sfxVol: number) {
    this.musicVolume = Math.max(0, Math.min(1, musicVol));
    this.sfxVolume = Math.max(0, Math.min(1, sfxVol));
  }

  /**
   * Rapid Auto-Fire Pulse Blaster (Small suppressive fire)
   * Crisp mechanical transient + filtered plasma pulse so continuous fire feels like a real space dogfight
   */
  public playAutoLaser() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    if (now - this.lastAutoLaserTime < 0.14) return;
    this.lastAutoLaserTime = now;

    // Layer 1: Crisp high-tech pulse core
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sawtooth';
    const pitchVariation = (Math.random() - 0.5) * 90;
    osc.frequency.setValueAtTime(1150 + pitchVariation, now);
    osc.frequency.exponentialRampToValueAtTime(210, now + 0.085);

    oscGain.gain.setValueAtTime(0.075 * this.sfxVolume, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    // Layer 2: Short pneumatic/plasma noise transient punch
    const noiseDur = 0.045;
    const bufSize = Math.max(1, Math.floor(ctx.sampleRate * noiseDur));
    const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.012));
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.Q.setValueAtTime(2.2, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.09 * this.sfxVolume, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDur);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.095);

    noiseSrc.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSrc.start(now);
  }

  /**
   * Subtle hull ricochet / shield spark when auto-fire hits enemy UFO
   */
  public playImpactSpark() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2400 + Math.random() * 600, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.05);

    gain.gain.setValueAtTime(0.045 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * Heavy Mega-Laser / Railgun Cannon Blast (Triggered on Correct Math Answer)
   * Multi-layered: Sub-bass recoil thump + dual detuned plasma oscillators + ionized crackle burst
   */
  public playLaser(laserLevel: number = 1) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.34 + laserLevel * 0.04;

    // Layer 1: Sub-bass cannon recoil thump
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(175 + laserLevel * 15, now);
    subOsc.frequency.exponentialRampToValueAtTime(34, now + 0.24);

    subGain.gain.setValueAtTime(0.42 * this.sfxVolume, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.27);

    // Layer 2: Dual detuned heavy plasma beam sweep
    [-12, 12].forEach((detuneCents, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = idx === 0 ? 'sawtooth' : 'square';
      const startFreq = 1180 + laserLevel * 190;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(88, now + duration);
      osc.detune.setValueAtTime(detuneCents, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3800, now);
      filter.frequency.exponentialRampToValueAtTime(420, now + duration);
      filter.Q.setValueAtTime(4.0, now);

      gain.gain.setValueAtTime(0.24 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    });

    // Layer 3: High-voltage ionized discharge crackle
    const noiseDur = 0.22;
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * noiseDur));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.065));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const hpFilter = ctx.createBiquadFilter();
    hpFilter.type = 'bandpass';
    hpFilter.frequency.setValueAtTime(1450, now);
    hpFilter.frequency.exponentialRampToValueAtTime(320, now + noiseDur);
    hpFilter.Q.setValueAtTime(1.8, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.32 * this.sfxVolume, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDur);

    noise.connect(hpFilter);
    hpFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
  }

  /**
   * High-Impact 3D Space Explosion (Sub-bass shockwave + roaring plasma fire + debris crackle)
   */
  public playExplosion(isBoss: boolean = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = isBoss ? 1.25 : 0.65;

    // Layer 1: Deep shockwave boom
    const boomOsc = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(isBoss ? 115 : 95, now);
    boomOsc.frequency.exponentialRampToValueAtTime(22, now + (isBoss ? 0.85 : 0.45));

    boomGain.gain.setValueAtTime((isBoss ? 0.65 : 0.48) * this.sfxVolume, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + (isBoss ? 0.9 : 0.48));

    boomOsc.connect(boomGain);
    boomGain.connect(ctx.destination);
    boomOsc.start(now);
    boomOsc.stop(now + (isBoss ? 0.92 : 0.5));

    // Layer 2: Roaring explosion fire & metallic debris
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.exp(-i / (ctx.sampleRate * (isBoss ? 0.38 : 0.18)));
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isBoss ? 880 : 1150, now);
    filter.frequency.exponentialRampToValueAtTime(55, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime((isBoss ? 0.62 : 0.44) * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  public playCorrect(combo: number = 1) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const baseNotes = [523.25, 659.25, 783.99, 1046.5];
    const pitchBoost = Math.min(combo - 1, 8) * 25;

    baseNotes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq + pitchBoost, now + idx * 0.055);

      gain.gain.setValueAtTime(0.22 * this.sfxVolume, now + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.19);
    });
  }

  public playWrong() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [220, 165].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);

      gain.gain.setValueAtTime(0.25 * this.sfxVolume, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.24);
    });
  }

  public playAlienLaugh() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [380, 440, 350, 420].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.07);
      gain.gain.setValueAtTime(0.16 * this.sfxVolume, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.065);
    });
  }

  public playCoin() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now);
    osc.frequency.setValueAtTime(1318.51, now + 0.06);
    gain.gain.setValueAtTime(0.2 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playHyperspace() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.9);
    gain.gain.setValueAtTime(0.28 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.0);
  }

  public startMusic(mode: 'menu' | 'battle' | 'boss' | 'victory' | 'gameover') {
    if (this.currentMusicMode === mode && this.musicInterval !== null) return;
    this.stopMusic();
    this.currentMusicMode = mode;
    if (this.isMuted) return;

    const sequences: Record<string, number[]> = {
      menu: [220, 261.63, 329.63, 392.0, 329.63, 261.63, 246.94, 196.0],
      battle: [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 293.66, 349.23],
      boss: [146.83, 155.56, 146.83, 130.81, 146.83, 174.61, 164.81, 130.81],
      victory: [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1174.66, 1318.51],
      gameover: [293.66, 277.18, 261.63, 220.0, 196.0, 174.61, 146.83],
    };

    const tempoMs = mode === 'boss' ? 210 : mode === 'battle' ? 260 : 340;
    const notes = sequences[mode] || sequences.menu;
    this.stepIndex = 0;

    this.musicInterval = window.setInterval(() => {
      if (this.isMuted || this.musicVolume <= 0.01) return;
      const ctx = this.ensureContext();
      if (!ctx) return;
      const freq = notes[this.stepIndex % notes.length];
      this.stepIndex++;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = mode === 'boss' ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.08 * this.musicVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (tempoMs / 1000) * 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + tempoMs / 1000);
    }, tempoMs);
  }

  public stopMusic() {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const soundEngine = new GalacticSoundEngine();
