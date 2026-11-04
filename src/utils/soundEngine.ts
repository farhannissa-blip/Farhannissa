// 100% Procedural Web Audio API Sound Engine (Zero external MP3 404s)

class GalacticSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private sfxVolume: number = 0.75;
  private musicVolume: number = 0.4;
  private musicInterval: number | null = null;
  private currentMusicMode: 'none' | 'menu' | 'battle' | 'boss' | 'victory' | 'gameover' = 'none';
  private stepIndex: number = 0;

  private ensureContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

  public playLaser(laserLevel: number = 1) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = laserLevel >= 4 ? 'sawtooth' : 'square';
    const startFreq = 900 + laserLevel * 180;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.18 + laserLevel * 0.03);

    gain.gain.setValueAtTime(0.28 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2 + laserLevel * 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22 + laserLevel * 0.03);
  }

  public playExplosion(isBoss: boolean = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const duration = isBoss ? 1.1 : 0.45;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * (isBoss ? 0.35 : 0.14)));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isBoss ? 650 : 900, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(65, ctx.currentTime + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime((isBoss ? 0.6 : 0.38) * this.sfxVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
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
      gameover: [293.66, 277.18, 261.63, 246.94, 220.0, 196.0, 174.61, 146.83],
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
      osc.stop(now + (tempoMs / 1000));
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
