export type BgmTrack = 'village' | 'boss';

export type SfxName =
  | 'swing'
  | 'arrow'
  | 'magic'
  | 'krama'
  | 'hit'
  | 'crit'
  | 'bonk'
  | 'harvest'
  | 'coin'
  | 'splash'
  | 'wheel_tick'
  | 'level_up'
  | 'click'
  | 'victory'
  | 'heal';

export interface AudioSettings {
  muted: boolean;
  bgmVolume: number; // 0..1
  sfxVolume: number; // 0..1
}

const STORAGE_KEY = 'phum_khnhom_audio_v1';
const NA_AUDIO = '/assets/packs/ninja-adventure/Ninja Adventure - Asset Pack/Audio';

const BGM_URLS: Record<BgmTrack, string> = {
  village: `${NA_AUDIO}/Musics/33 - Calm Village.ogg`,
  boss: `${NA_AUDIO}/Musics/17 - Fight.ogg`,
};

const SFX_URLS: Partial<Record<SfxName, string>> = {
  swing: `${NA_AUDIO}/Sounds/Whoosh & Slash/Slash.wav`,
  arrow: `${NA_AUDIO}/Sounds/Whoosh & Slash/Launch.wav`,
  magic: `${NA_AUDIO}/Sounds/Magic & Skill/Magic1.wav`,
  krama: `${NA_AUDIO}/Sounds/Whoosh & Slash/Whoosh.wav`,
  hit: `${NA_AUDIO}/Sounds/Hit & Impact/Hit1.wav`,
  crit: `${NA_AUDIO}/Sounds/Bonus/PowerUp1.wav`,
  harvest: `${NA_AUDIO}/Sounds/Bonus/Bonus.wav`,
  coin: `${NA_AUDIO}/Sounds/Bonus/Coin.wav`,
  splash: `${NA_AUDIO}/Sounds/Elemental/Water1.wav`,
  wheel_tick: `${NA_AUDIO}/Sounds/Menu/Move1.wav`,
  level_up: `${NA_AUDIO}/Jingles/LevelUp1.wav`,
  click: `${NA_AUDIO}/Sounds/Menu/Accept.wav`,
  victory: `${NA_AUDIO}/Jingles/Success1.wav`,
  heal: `${NA_AUDIO}/Sounds/Magic & Skill/Heal.wav`,
};

type SettingsListener = (settings: AudioSettings) => void;

/**
 * Hybrid Audio Engine for ភូមិខ្ញុំ (Phum Khnhom):
 * - Plays verified OGG/WAV tracks from Ninja Adventure Asset Pack
 * - Crossfades Village BGM <-> Boss Battle BGM smoothly
 * - Automatically falls back to a crisp Web Audio API retro synthesizer
 *   for missing files, unsupported codecs (e.g. OGG on Safari), or custom SFX ("BONK!")
 */
class SoundManagerEngine {
  private settings: AudioSettings = {
    muted: false,
    bgmVolume: 0.36,
    sfxVolume: 0.55,
  };

  private ctx: AudioContext | null = null;
  private unlocked = false;
  private listeners = new Set<SettingsListener>();

  // HTML5 Audio BGM crossfade slots
  private currentTrack: BgmTrack | null = null;
  private activeBgmEl: HTMLAudioElement | null = null;
  private fadeTimer: number | null = null;

  // Web Audio synth BGM fallback loop (if browser blocks/cannot decode OGG)
  private synthBgmTimer: number | null = null;
  private synthStep = 0;

  // Cached decoded AudioBuffers for crisp zero-latency overlapping SFX
  private sfxBuffers = new Map<SfxName, AudioBuffer>();
  private sfxLoading = new Set<SfxName>();
  private sfxFailed = new Set<SfxName>();
  private lastSfxAt = new Map<SfxName, number>();

  constructor() {
    this.loadSettings();
    if (typeof window !== 'undefined') {
      const unlockHandler = () => {
        this.unlock();
      };
      window.addEventListener('pointerdown', unlockHandler, { passive: true });
      window.addEventListener('keydown', unlockHandler, { passive: true });
    }
  }

  private loadSettings(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<AudioSettings>;
      if (typeof parsed.muted === 'boolean') this.settings.muted = parsed.muted;
      if (typeof parsed.bgmVolume === 'number') {
        this.settings.bgmVolume = Math.max(0, Math.min(1, parsed.bgmVolume));
      }
      if (typeof parsed.sfxVolume === 'number') {
        this.settings.sfxVolume = Math.max(0, Math.min(1, parsed.sfxVolume));
      }
    } catch {
      // Ignore storage errors
    }
  }

  private persistSettings(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Ignore storage errors
    }
    const snap = this.getSettings();
    this.listeners.forEach((fn) => fn(snap));
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public subscribe(fn: SettingsListener): () => void {
    this.listeners.add(fn);
    fn(this.getSettings());
    return () => {
      this.listeners.delete(fn);
    };
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.unlocked = true;
    this.ensureContext();
    if (this.currentTrack && !this.settings.muted) {
      if (this.activeBgmEl && this.activeBgmEl.paused) {
        this.activeBgmEl.volume = this.settings.bgmVolume;
        void this.activeBgmEl.play().catch(() => {
          this.startSynthBgmFallback(this.currentTrack!);
        });
      } else if (!this.activeBgmEl && !this.synthBgmTimer) {
        this.startBgmTrack(this.currentTrack);
      }
    }
  }

  public setMuted(muted: boolean): void {
    this.settings.muted = muted;
    this.applyBgmVolume();
    if (muted) {
      this.stopSynthBgmFallback();
    } else if (this.currentTrack && !this.activeBgmEl) {
      this.startBgmTrack(this.currentTrack);
    }
    this.persistSettings();
  }

  public toggleMute(): boolean {
    this.setMuted(!this.settings.muted);
    if (!this.settings.muted) {
      this.playSfx('click');
    }
    return this.settings.muted;
  }

  public setBgmEnabled(enabled: boolean): void {
    this.setBgmVolume(enabled ? Math.max(0.28, this.settings.bgmVolume || 0.35) : 0);
  }

  public playThunder(): void {
    if (this.settings.muted || this.settings.sfxVolume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dur = 1.65 + Math.random() * 0.7;
    const sampleRate = ctx.sampleRate;
    const buf = ctx.createBuffer(1, Math.floor(sampleRate * dur), sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      // Brownian low-frequency rolling rumble
      last = (last + 0.03 * white) / 1.03;
      const env = Math.pow(1 - i / data.length, 1.4);
      data[i] = last * 4.5 * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140 + Math.random() * 75, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(Math.min(0.42, this.settings.sfxVolume * 0.45), now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
  }

  public setBgmVolume(vol: number): void {
    this.settings.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.settings.bgmVolume > 0 && this.settings.muted) {
      this.settings.muted = false;
    }
    this.applyBgmVolume();
    this.persistSettings();
  }

  public setSfxVolume(vol: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.settings.sfxVolume > 0 && this.settings.muted) {
      this.settings.muted = false;
    }
    this.persistSettings();
  }

  private applyBgmVolume(): void {
    if (this.activeBgmEl) {
      this.activeBgmEl.volume = this.settings.muted ? 0 : this.settings.bgmVolume;
    }
  }

  // ==================== BGM WITH SMOOTH CROSSFADE ====================
  public playBgm(track: BgmTrack): void {
    if (this.currentTrack === track && (this.activeBgmEl || this.synthBgmTimer)) {
      this.applyBgmVolume();
      return;
    }
    this.currentTrack = track;
    if (!this.unlocked) {
      // Wait for first user gesture to avoid browser autoplay warnings
      return;
    }
    this.startBgmTrack(track);
  }

  private startBgmTrack(track: BgmTrack): void {
    this.stopSynthBgmFallback();
    if (this.fadeTimer) {
      window.clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }

    const oldEl = this.activeBgmEl;
    const url = BGM_URLS[track];
    const nextEl = new Audio(encodeURI(url));
    nextEl.loop = true;
    nextEl.volume = 0;

    const targetVol = this.settings.muted ? 0 : this.settings.bgmVolume;
    let failed = false;

    const handleFallback = () => {
      if (failed) return;
      failed = true;
      nextEl.pause();
      if (this.activeBgmEl === nextEl) {
        this.activeBgmEl = null;
      }
      if (oldEl) {
        oldEl.pause();
      }
      if (!this.settings.muted && this.currentTrack === track) {
        this.startSynthBgmFallback(track);
      }
    };

    nextEl.addEventListener('error', handleFallback, { once: true });
    this.activeBgmEl = nextEl;

    void nextEl
      .play()
      .then(() => {
        if (failed || this.activeBgmEl !== nextEl) return;
        const steps = 14;
        let i = 0;
        const startOldVol = oldEl ? oldEl.volume : 0;
        this.fadeTimer = window.setInterval(() => {
          i += 1;
          const t = Math.min(1, i / steps);
          const liveTarget = this.settings.muted ? 0 : this.settings.bgmVolume;
          nextEl.volume = liveTarget * t;
          if (oldEl) {
            oldEl.volume = Math.max(0, startOldVol * (1 - t));
          }
          if (t >= 1) {
            if (oldEl) {
              oldEl.pause();
              oldEl.src = '';
            }
            if (this.fadeTimer) {
              window.clearInterval(this.fadeTimer);
              this.fadeTimer = null;
            }
          }
        }, 40);
      })
      .catch(handleFallback);
  }

  private stopSynthBgmFallback(): void {
    if (this.synthBgmTimer) {
      window.clearInterval(this.synthBgmTimer);
      this.synthBgmTimer = null;
    }
  }

  /**
   * Lightweight retro pentatonic BGM synth loop fallback (Khmer pentatonic feel for Village,
   * energetic chiptune bass+lead for Boss Battle) if OGG decoding isn't available.
   */
  private startSynthBgmFallback(track: BgmTrack): void {
    this.stopSynthBgmFallback();
    this.synthStep = 0;
    const villageNotes = [261.63, 293.66, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66];
    const bossNotes = [146.83, 146.83, 174.61, 164.81, 130.81, 146.83, 220.0, 196.0];
    const intervalMs = track === 'boss' ? 190 : 340;

    this.synthBgmTimer = window.setInterval(() => {
      if (this.settings.muted || this.settings.bgmVolume <= 0.01 || this.currentTrack !== track) {
        return;
      }
      const ctx = this.ensureContext();
      if (!ctx || ctx.state !== 'running') return;
      const notes = track === 'boss' ? bossNotes : villageNotes;
      const freq = notes[this.synthStep % notes.length];
      this.synthStep += 1;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = track === 'boss' ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      const vol = this.settings.bgmVolume * (track === 'boss' ? 0.14 : 0.12);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + intervalMs / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + intervalMs / 1000 + 0.02);
    }, intervalMs);
  }

  // ==================== SFX PLAYBACK + SYNTH FALLBACK ====================
  public playSfx(name: SfxName, rateJitter = 0.06): void {
    if (this.settings.muted || this.settings.sfxVolume <= 0.01) return;

    // Anti-spam micro throttle per SFX key
    const now = performance.now();
    const minGap = name === 'wheel_tick' ? 42 : name === 'hit' ? 50 : 35;
    if (now - (this.lastSfxAt.get(name) ?? 0) < minGap) return;
    this.lastSfxAt.set(name, now);

    const ctx = this.ensureContext();
    if (!ctx) return;

    // Golden Frying Pan "BONK!" uses a signature metallic resonant synth!
    if (name === 'bonk') {
      this.playSynthSfx('bonk', ctx);
      return;
    }

    const cached = this.sfxBuffers.get(name);
    if (cached && ctx.state === 'running') {
      this.playAudioBuffer(ctx, cached, rateJitter);
      return;
    }

    // Play crisp synth immediately on first trigger while decoding the WAV in background
    this.playSynthSfx(name, ctx);

    const url = SFX_URLS[name];
    if (url && !this.sfxLoading.has(name) && !this.sfxFailed.has(name)) {
      this.sfxLoading.add(name);
      void fetch(encodeURI(url))
        .then((res) => {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.arrayBuffer();
        })
        .then((buf) => ctx.decodeAudioData(buf))
        .then((decoded) => {
          this.sfxBuffers.set(name, decoded);
        })
        .catch(() => {
          this.sfxFailed.add(name);
        })
        .finally(() => {
          this.sfxLoading.delete(name);
        });
    }
  }

  private playAudioBuffer(ctx: AudioContext, buffer: AudioBuffer, rateJitter: number): void {
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buffer;
    if (rateJitter > 0) {
      src.playbackRate.value = 1 + (Math.random() * 2 - 1) * rateJitter;
    }
    gain.gain.value = this.settings.sfxVolume * 0.65;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }

  private playTone(
    ctx: AudioContext,
    type: OscillatorType,
    freqStart: number,
    freqEnd: number,
    duration: number,
    gainScale = 0.25,
    delaySec = 0
  ): void {
    const t0 = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t0);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + duration);
    }
    const peak = Math.max(0.001, this.settings.sfxVolume * gainScale);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  private playSynthSfx(name: SfxName, ctx: AudioContext): void {
    if (ctx.state !== 'running') return;
    switch (name) {
      case 'swing':
        this.playTone(ctx, 'sawtooth', 420, 120, 0.11, 0.22);
        break;
      case 'arrow':
        this.playTone(ctx, 'triangle', 760, 260, 0.09, 0.22);
        break;
      case 'magic':
        this.playTone(ctx, 'sine', 660, 1080, 0.14, 0.2);
        this.playTone(ctx, 'triangle', 990, 1480, 0.16, 0.16, 0.04);
        break;
      case 'krama':
        this.playTone(ctx, 'square', 520, 980, 0.07, 0.18);
        this.playTone(ctx, 'sawtooth', 320, 110, 0.09, 0.18, 0.04);
        break;
      case 'hit':
        this.playTone(ctx, 'square', 170, 58, 0.09, 0.28);
        break;
      case 'crit':
        this.playTone(ctx, 'triangle', 587, 880, 0.09, 0.26);
        this.playTone(ctx, 'sine', 880, 1320, 0.14, 0.24, 0.05);
        break;
      case 'bonk':
        // Comedic metallic Golden Frying Pan "BONK!"
        this.playTone(ctx, 'triangle', 520, 390, 0.22, 0.36);
        this.playTone(ctx, 'sine', 1040, 810, 0.26, 0.28, 0.005);
        this.playTone(ctx, 'square', 240, 130, 0.09, 0.2);
        break;
      case 'harvest':
        this.playTone(ctx, 'sine', 440, 660, 0.08, 0.22);
        this.playTone(ctx, 'triangle', 660, 880, 0.1, 0.2, 0.06);
        break;
      case 'coin':
        this.playTone(ctx, 'square', 988, 988, 0.06, 0.16);
        this.playTone(ctx, 'square', 1319, 1319, 0.14, 0.16, 0.06);
        break;
      case 'splash':
        this.playTone(ctx, 'sine', 340, 740, 0.09, 0.22);
        this.playTone(ctx, 'triangle', 580, 210, 0.16, 0.2, 0.06);
        break;
      case 'wheel_tick':
        this.playTone(ctx, 'triangle', 840, 520, 0.035, 0.16);
        break;
      case 'level_up':
        this.playTone(ctx, 'triangle', 523.25, 523.25, 0.11, 0.24, 0);
        this.playTone(ctx, 'triangle', 659.25, 659.25, 0.11, 0.24, 0.09);
        this.playTone(ctx, 'triangle', 783.99, 783.99, 0.11, 0.24, 0.18);
        this.playTone(ctx, 'triangle', 1046.5, 1046.5, 0.28, 0.28, 0.27);
        break;
      case 'victory':
        this.playTone(ctx, 'triangle', 523.25, 523.25, 0.12, 0.26, 0);
        this.playTone(ctx, 'triangle', 659.25, 659.25, 0.12, 0.26, 0.1);
        this.playTone(ctx, 'triangle', 783.99, 783.99, 0.12, 0.26, 0.2);
        this.playTone(ctx, 'triangle', 1046.5, 1174.66, 0.38, 0.3, 0.3);
        break;
      case 'heal':
        this.playTone(ctx, 'sine', 440, 660, 0.12, 0.2);
        this.playTone(ctx, 'sine', 660, 990, 0.16, 0.2, 0.08);
        break;
      case 'click':
      default:
        this.playTone(ctx, 'triangle', 620, 440, 0.04, 0.14);
        break;
    }
  }
}

export const soundManager = new SoundManagerEngine();
