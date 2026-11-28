import { KHMER_INSTRUMENTS } from '@shared/khmerInstruments';
import type { KhmerInstrumentId } from '@shared/types';

export type BgmTrack = 'village' | 'cavern' | 'boss' | 'festival';

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
  | 'ore_shatter'
  | 'signature_skill'
  | 'splash'
  | 'wheel_tick'
  | 'level_up'
  | 'click'
  | 'victory'
  | 'heal';

export interface AudioSettings {
  muted: boolean;
  masterVolume: number; // 0..1
  bgmVolume: number; // 0..1
  sfxVolume: number; // 0..1
  currentTrack: BgmTrack | null;
}

export const BGM_TRACK_META: Record<
  BgmTrack,
  { name: string; khmerName: string; icon: string; mood: string }
> = {
  village: {
    name: 'Phum Roneat Breeze',
    khmerName: 'ភូមិខ្ញុំ រនាតឯក',
    icon: '🌾',
    mood: 'Warm Khmer Pentatonic Xylophone & Chimes',
  },
  cavern: {
    name: 'Angkor Cavern Echo',
    khmerName: 'ល្អាងប្រាសាទបុរាណ',
    icon: '⛏️',
    mood: 'Mysterious Temple Percussion & Low Drone',
  },
  boss: {
    name: 'Yaksha Battle Drums',
    khmerName: 'ស្គរចម្បាំងអង្គរ',
    icon: '⚔️',
    mood: 'High-Energy Rhythmic Drums & Urgent Lead',
  },
  festival: {
    name: 'Romvong Night Festival',
    khmerName: 'រាំវង់បុណ្យភូមិ',
    icon: '🏮',
    mood: 'Upbeat Festive Melody & Hand-Drum Beats',
  },
};

const STORAGE_KEY = 'phum_khnhom_audio_v2';
const LEGACY_STORAGE_KEY = 'phum_khnhom_audio_v1';

type SettingsListener = (settings: AudioSettings) => void;

interface ActiveTrackChannel {
  track: BgmTrack;
  gainNode: GainNode;
  timerId: number;
  step: number;
  droneOsc?: OscillatorNode;
  droneGain?: GainNode;
}

/**
 * Update 1.9 — Pure Web Audio API Khmer Dynamic Soundscape & Tactile SFX Engine
 * - Zero external MP3/OGG 404s; instant startup on desktop & mobile browsers
 * - 4 distinct looping scene soundtracks with smooth 700ms gain-ramp crossfades:
 *   1. village  — Warm Khmer pentatonic wooden xylophone (Roneat Ek) & gentle chimes
 *   2. cavern   — Echoing temple percussion, resonant gong & mysterious low drone
 *   3. boss     — High-energy rhythmic battle drums & urgent Khmer minor-pentatonic lead
 *   4. festival — Upbeat Romvong melody & lively Skor Dai hand-drum groove
 * - Crisp tactile SFX for UI clicks, coin clinks, ore shattering, crop harvesting,
 *   level-up fanfare, and Signature Skill [Q] unleashes.
 */
class SoundManagerEngine {
  private settings: AudioSettings = {
    muted: false,
    masterVolume: 0.85,
    bgmVolume: 0.42,
    sfxVolume: 0.65,
    currentTrack: null,
  };

  private ctx: AudioContext | null = null;
  private bgmMasterGain: GainNode | null = null;
  private sfxMasterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private unlocked = false;
  private listeners = new Set<SettingsListener>();

  private currentTrack: BgmTrack | null = null;
  private activeChannel: ActiveTrackChannel | null = null;
  private fadingChannels = new Set<ActiveTrackChannel>();
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
      const raw =
        window.localStorage.getItem(STORAGE_KEY) ||
        window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<AudioSettings>;
      if (typeof parsed.muted === 'boolean') this.settings.muted = parsed.muted;
      if (typeof parsed.masterVolume === 'number') {
        this.settings.masterVolume = Math.max(0, Math.min(1, parsed.masterVolume));
      }
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
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            muted: this.settings.muted,
            masterVolume: this.settings.masterVolume,
            bgmVolume: this.settings.bgmVolume,
            sfxVolume: this.settings.sfxVolume,
          })
        );
      } catch {
        // Ignore storage errors
      }
    }
    const snap = this.getSettings();
    this.listeners.forEach((fn) => fn(snap));
  }

  public getSettings(): AudioSettings {
    return { ...this.settings, currentTrack: this.currentTrack };
  }

  public getCurrentTrack(): BgmTrack | null {
    return this.currentTrack;
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

      this.bgmMasterGain = this.ctx.createGain();
      this.bgmMasterGain.gain.value = this.settings.muted
        ? 0
        : this.settings.masterVolume * this.settings.bgmVolume;
      this.bgmMasterGain.connect(this.ctx.destination);

      this.sfxMasterGain = this.ctx.createGain();
      this.sfxMasterGain.gain.value = this.settings.muted
        ? 0
        : this.settings.masterVolume * this.settings.sfxVolume;
      this.sfxMasterGain.connect(this.ctx.destination);

      // Shared 1-second white noise buffer for percussion, ore shatters, splashes & thunder
      const sr = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, sr, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.unlocked = true;
    this.ensureContext();
    if (this.currentTrack && !this.settings.muted && !this.activeChannel) {
      this.crossfadeToTrack(this.currentTrack);
    }
  }

  public setMuted(muted: boolean): void {
    this.settings.muted = muted;
    this.applyMasterGains();
    if (!muted && this.unlocked && this.currentTrack && !this.activeChannel) {
      this.crossfadeToTrack(this.currentTrack);
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

  public setMasterVolume(vol: number): void {
    this.settings.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.settings.masterVolume > 0 && this.settings.muted) {
      this.settings.muted = false;
    }
    this.applyMasterGains();
    if (
      this.settings.masterVolume > 0 &&
      this.settings.bgmVolume > 0 &&
      this.unlocked &&
      this.currentTrack &&
      !this.activeChannel
    ) {
      this.crossfadeToTrack(this.currentTrack);
    }
    this.persistSettings();
  }

  public setBgmEnabled(enabled: boolean): void {
    this.setBgmVolume(enabled ? Math.max(0.28, this.settings.bgmVolume || 0.42) : 0);
  }

  public setBgmVolume(vol: number): void {
    this.settings.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.settings.bgmVolume > 0 && this.settings.muted) {
      this.settings.muted = false;
    }
    this.applyMasterGains();
    if (
      this.settings.masterVolume > 0 &&
      this.settings.bgmVolume > 0 &&
      this.unlocked &&
      this.currentTrack &&
      !this.activeChannel
    ) {
      this.crossfadeToTrack(this.currentTrack);
    }
    this.persistSettings();
  }

  public setSfxVolume(vol: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.settings.sfxVolume > 0 && this.settings.muted) {
      this.settings.muted = false;
    }
    this.applyMasterGains();
    this.persistSettings();
  }

  private applyMasterGains(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const master = this.settings.muted ? 0 : this.settings.masterVolume;
    if (this.bgmMasterGain) {
      this.bgmMasterGain.gain.cancelScheduledValues(now);
      this.bgmMasterGain.gain.setTargetAtTime(master * this.settings.bgmVolume, now, 0.05);
    }
    if (this.sfxMasterGain) {
      this.sfxMasterGain.gain.cancelScheduledValues(now);
      this.sfxMasterGain.gain.setTargetAtTime(master * this.settings.sfxVolume, now, 0.03);
    }
  }

  // ==================== 4-TRACK DYNAMIC BGM WITH SMOOTH CROSSFADE ====================
  public playBgm(track: BgmTrack): void {
    const changed = this.currentTrack !== track;
    this.currentTrack = track;
    this.settings.currentTrack = track;
    if (changed) {
      this.persistSettings();
    }
    if (!this.unlocked) return;
    if (this.activeChannel?.track === track) {
      this.applyMasterGains();
      return;
    }
    this.crossfadeToTrack(track);
  }

  private crossfadeToTrack(track: BgmTrack): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.bgmMasterGain) return;
    const now = ctx.currentTime;
    const fadeSec = 0.72;

    // Fade out previous channel smoothly
    if (this.activeChannel) {
      const old = this.activeChannel;
      this.activeChannel = null;
      this.fadingChannels.add(old);
      try {
        old.gainNode.gain.cancelScheduledValues(now);
        old.gainNode.gain.setValueAtTime(Math.max(0.0001, old.gainNode.gain.value), now);
        old.gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeSec);
        if (old.droneGain) {
          old.droneGain.gain.cancelScheduledValues(now);
          old.droneGain.gain.linearRampToValueAtTime(0.0001, now + fadeSec);
        }
      } catch {
        // Ignore teardown timing issues
      }
      window.setTimeout(() => {
        this.teardownChannel(old);
        this.fadingChannels.delete(old);
      }, Math.round(fadeSec * 1000) + 80);
    }

    // Create incoming channel with smooth fade-in
    const channelGain = ctx.createGain();
    channelGain.gain.setValueAtTime(0.0001, now);
    channelGain.gain.linearRampToValueAtTime(1.0, now + fadeSec);
    channelGain.connect(this.bgmMasterGain);

    const stepMs =
      track === 'boss'
        ? 155
        : track === 'festival'
          ? 185
          : track === 'cavern'
            ? 390
            : 290;

    const channel: ActiveTrackChannel = {
      track,
      gainNode: channelGain,
      timerId: 0,
      step: 0,
    };

    // Subtle low temple drone for Cavern / Frontier atmosphere
    if (track === 'cavern') {
      const droneOsc = ctx.createOscillator();
      const droneFilter = ctx.createBiquadFilter();
      const droneGain = ctx.createGain();
      droneOsc.type = 'triangle';
      droneOsc.frequency.setValueAtTime(73.42, now); // D2
      droneFilter.type = 'lowpass';
      droneFilter.frequency.setValueAtTime(160, now);
      droneGain.gain.setValueAtTime(0.0001, now);
      droneGain.gain.linearRampToValueAtTime(0.14, now + fadeSec);
      droneOsc.connect(droneFilter);
      droneFilter.connect(droneGain);
      droneGain.connect(channelGain);
      droneOsc.start(now);
      channel.droneOsc = droneOsc;
      channel.droneGain = droneGain;
    }

    const tick = () => {
      if (this.settings.muted || this.settings.bgmVolume <= 0.005) return;
      if (!this.ctx || this.ctx.state !== 'running') return;
      this.scheduleTrackStep(this.ctx, channel);
      channel.step += 1;
    };

    channel.timerId = window.setInterval(tick, stepMs);
    this.activeChannel = channel;
    // Play first note cleanly on next micro-tick
    window.setTimeout(tick, 30);
  }

  private teardownChannel(ch: ActiveTrackChannel): void {
    window.clearInterval(ch.timerId);
    try {
      ch.droneOsc?.stop();
      ch.droneOsc?.disconnect();
      ch.droneGain?.disconnect();
      ch.gainNode.disconnect();
    } catch {
      // Already stopped
    }
  }

  private scheduleTrackStep(ctx: AudioContext, ch: ActiveTrackChannel): void {
    const t = ctx.currentTime + 0.015;
    const s = ch.step;
    const dest = ch.gainNode;

    if (ch.track === 'village') {
      // Warm Khmer Pentatonic (C4 D4 E4 G4 A4 C5 D5 E5) — Roneat Ek wooden mallet + chime
      const melody = [
        392.0, 440.0, 523.25, 0, 587.33, 523.25, 440.0, 392.0,
        329.63, 392.0, 440.0, 0, 523.25, 440.0, 392.0, 329.63,
        293.66, 329.63, 392.0, 440.0, 523.25, 0, 440.0, 392.0,
        329.63, 293.66, 261.63, 0, 329.63, 392.0, 329.63, 0,
      ];
      const bass = [130.81, 0, 0, 0, 196.0, 0, 0, 0, 146.83, 0, 0, 0, 196.0, 0, 130.81, 0];
      const mFreq = melody[s % melody.length];
      if (mFreq > 0) {
        // Wooden Roneat mallet strike (fundamental + crisp 2x overtone)
        this.playBusTone(ctx, dest, 'triangle', mFreq, mFreq, 0.24, 0.14, t);
        this.playBusTone(ctx, dest, 'sine', mFreq * 2, mFreq * 2, 0.09, 0.045, t);
      }
      const bFreq = bass[s % bass.length];
      if (bFreq > 0) {
        this.playBusTone(ctx, dest, 'sine', bFreq, bFreq, 0.55, 0.12, t);
      }
      // Gentle temple chhing finger-cymbal accent every 4 beats
      if (s % 4 === 0) {
        this.playChime(ctx, dest, s % 8 === 0 ? 1567.98 : 1318.51, 0.032, t);
      }
      return;
    }

    if (ch.track === 'cavern') {
      // Mysterious Khmer Temple Cavern — echoing D minor pentatonic gong & Skor Thom drum
      const motif = [
        293.66, 0, 0, 349.23, 0, 440.0, 0, 0,
        392.0, 0, 349.23, 0, 293.66, 0, 261.63, 0,
      ];
      const note = motif[s % motif.length];
      if (note > 0) {
        this.playBusTone(ctx, dest, 'sine', note, note * 0.996, 0.72, 0.13, t);
        // Soft cavern echo repeat
        this.playBusTone(ctx, dest, 'sine', note, note * 0.994, 0.52, 0.05, t + 0.22);
      }
      if (s % 4 === 0) {
        this.playDrumHit(ctx, dest, 108, 44, 0.28, 0.22, t);
      } else if (s % 8 === 6) {
        this.playDrumHit(ctx, dest, 145, 72, 0.16, 0.12, t);
      }
      return;
    }

    if (ch.track === 'boss') {
      // High-energy Boss / Pagoda Tower / Boss Rush — driving battle drums + urgent Khmer minor lead
      const lead = [
        293.66, 293.66, 349.23, 392.0, 440.0, 0, 392.0, 349.23,
        329.63, 293.66, 261.63, 293.66, 440.0, 523.25, 587.33, 440.0,
      ];
      const bass = [73.42, 73.42, 0, 73.42, 87.31, 0, 98.0, 87.31];
      const lFreq = lead[s % lead.length];
      if (lFreq > 0) {
        this.playFilteredTone(ctx, dest, 'sawtooth', lFreq, 0.13, 0.095, 1750, t);
        this.playBusTone(ctx, dest, 'triangle', lFreq * 2, lFreq * 2, 0.08, 0.04, t);
      }
      const bFreq = bass[s % bass.length];
      if (bFreq > 0) {
        this.playBusTone(ctx, dest, 'triangle', bFreq, bFreq * 0.98, 0.14, 0.19, t);
      }
      // Battle drums: heavy kick on 0/4/6, crisp snare/hand-drum on 2/6
      if (s % 4 === 0 || s % 8 === 6) {
        this.playDrumHit(ctx, dest, 140, 46, 0.13, 0.26, t);
      }
      if (s % 4 === 2) {
        this.playNoiseBurst(ctx, dest, 0.075, 1900, 0.11, t);
      }
      return;
    }

    // 'festival' — Upbeat Club / Night Market / Khmer Romvong Festival!
    const festLead = [
      523.25, 587.33, 659.25, 0, 783.99, 659.25, 587.33, 523.25,
      659.25, 783.99, 880.0, 0, 783.99, 659.25, 587.33, 0,
    ];
    const festBass = [130.81, 0, 196.0, 0, 164.81, 0, 196.0, 0];
    const fFreq = festLead[s % festLead.length];
    if (fFreq > 0) {
      this.playBusTone(ctx, dest, 'triangle', fFreq, fFreq, 0.16, 0.13, t);
      this.playBusTone(ctx, dest, 'sine', fFreq * 1.5, fFreq * 1.5, 0.07, 0.03, t);
    }
    const fbFreq = festBass[s % festBass.length];
    if (fbFreq > 0) {
      this.playBusTone(ctx, dest, 'sine', fbFreq, fbFreq, 0.22, 0.15, t);
    }
    // Lively Romvong Skor Dai hand-drum groove (dum - tak - dum-tak)
    const beat = s % 8;
    if (beat === 0 || beat === 4) {
      this.playDrumHit(ctx, dest, 165, 68, 0.14, 0.2, t);
    } else if (beat === 2 || beat === 5 || beat === 7) {
      this.playNoiseBurst(ctx, dest, 0.055, 2600, 0.08, t);
    }
    if (beat === 0 || beat === 2 || beat === 4 || beat === 6) {
      this.playChime(ctx, dest, beat % 4 === 0 ? 1975.5 : 1567.98, 0.032, t);
    }
  }

  private playBusTone(
    ctx: AudioContext,
    dest: AudioNode,
    type: OscillatorType,
    freqStart: number,
    freqEnd: number,
    duration: number,
    peakGain: number,
    t0: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t0);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + duration);
    }
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0008, peakGain), t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t0);
    osc.stop(t0 + duration + 0.025);
  }

  private playFilteredTone(
    ctx: AudioContext,
    dest: AudioNode,
    type: OscillatorType,
    freq: number,
    duration: number,
    peakGain: number,
    cutoffHz: number,
    t0: number
  ): void {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoffHz, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0008, peakGain), t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  private playDrumHit(
    ctx: AudioContext,
    dest: AudioNode,
    freqStart: number,
    freqEnd: number,
    duration: number,
    peakGain: number,
    t0: number
  ): void {
    this.playBusTone(ctx, dest, 'sine', freqStart, freqEnd, duration, peakGain, t0);
  }

  private playChime(ctx: AudioContext, dest: AudioNode, freq: number, peakGain: number, t0: number): void {
    this.playBusTone(ctx, dest, 'sine', freq, freq * 1.003, 0.11, peakGain, t0);
  }

  private playNoiseBurst(
    ctx: AudioContext,
    dest: AudioNode,
    duration: number,
    bandFreq: number,
    peakGain: number,
    t0: number
  ): void {
    if (!this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(bandFreq, t0);
    filter.Q.setValueAtTime(1.6, t0);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0008, peakGain), t0 + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(t0);
    src.stop(t0 + duration + 0.02);
  }

  // ==================== TACTILE SYNTH SFX & AMBIENT EFFECTS ====================
  public playThunder(): void {
    if (this.settings.muted || this.settings.sfxVolume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxMasterGain) return;
    const now = ctx.currentTime;
    const dur = 1.65 + Math.random() * 0.65;
    const sr = ctx.sampleRate;
    const buf = ctx.createBuffer(1, Math.floor(sr * dur), sr);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
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
    gain.gain.linearRampToValueAtTime(0.42, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxMasterGain);
    src.start(now);
  }

  public playSfx(name: SfxName, rateJitter = 0.05): void {
    if (this.settings.muted || this.settings.sfxVolume <= 0.005) return;

    const nowMs = performance.now();
    const minGap = name === 'wheel_tick' ? 40 : name === 'hit' ? 45 : 32;
    if (nowMs - (this.lastSfxAt.get(name) ?? 0) < minGap) return;
    this.lastSfxAt.set(name, nowMs);

    const ctx = this.ensureContext();
    if (!ctx || !this.sfxMasterGain || ctx.state !== 'running') return;

    const jitter = rateJitter > 0 ? 1 + (Math.random() * 2 - 1) * rateJitter : 1;
    const t0 = ctx.currentTime;
    const dest = this.sfxMasterGain;

    switch (name) {
      case 'swing':
        this.playBusTone(ctx, dest, 'sawtooth', 440 * jitter, 130 * jitter, 0.1, 0.24, t0);
        this.playNoiseBurst(ctx, dest, 0.075, 1600, 0.14, t0);
        break;
      case 'arrow':
        this.playBusTone(ctx, dest, 'triangle', 780 * jitter, 250 * jitter, 0.09, 0.24, t0);
        this.playNoiseBurst(ctx, dest, 0.05, 3200, 0.1, t0);
        break;
      case 'magic':
        this.playBusTone(ctx, dest, 'sine', 660 * jitter, 1120 * jitter, 0.14, 0.22, t0);
        this.playBusTone(ctx, dest, 'triangle', 990 * jitter, 1520 * jitter, 0.16, 0.17, t0 + 0.035);
        break;
      case 'krama':
        this.playBusTone(ctx, dest, 'square', 520 * jitter, 980 * jitter, 0.07, 0.18, t0);
        this.playBusTone(ctx, dest, 'sawtooth', 340 * jitter, 120 * jitter, 0.09, 0.18, t0 + 0.035);
        break;
      case 'hit':
        this.playBusTone(ctx, dest, 'square', 175 * jitter, 58, 0.085, 0.3, t0);
        this.playNoiseBurst(ctx, dest, 0.055, 950, 0.18, t0);
        break;
      case 'crit':
        this.playBusTone(ctx, dest, 'triangle', 587 * jitter, 880 * jitter, 0.09, 0.28, t0);
        this.playBusTone(ctx, dest, 'sine', 880 * jitter, 1380 * jitter, 0.14, 0.26, t0 + 0.045);
        this.playNoiseBurst(ctx, dest, 0.06, 2200, 0.16, t0);
        break;
      case 'bonk':
        this.playBusTone(ctx, dest, 'triangle', 520, 390, 0.22, 0.38, t0);
        this.playBusTone(ctx, dest, 'sine', 1040, 810, 0.26, 0.28, t0 + 0.005);
        this.playBusTone(ctx, dest, 'square', 240, 130, 0.09, 0.2, t0);
        break;
      case 'ore_shatter':
        // Metallic pickaxe clink + rock/crystal shatter crunch
        this.playBusTone(ctx, dest, 'triangle', 1420 * jitter, 880 * jitter, 0.09, 0.26, t0);
        this.playBusTone(ctx, dest, 'sine', 2140 * jitter, 1680 * jitter, 0.12, 0.2, t0 + 0.02);
        this.playNoiseBurst(ctx, dest, 0.14, 1500, 0.28, t0 + 0.015);
        break;
      case 'signature_skill':
        // Dramatic Khmer Signature Skill [Q] unleash: gong boom + rising harmonic chord
        this.playDrumHit(ctx, dest, 180, 48, 0.36, 0.42, t0);
        this.playNoiseBurst(ctx, dest, 0.22, 1800, 0.22, t0);
        this.playBusTone(ctx, dest, 'triangle', 392, 784, 0.22, 0.26, t0 + 0.02);
        this.playBusTone(ctx, dest, 'sine', 587.33, 1174.66, 0.28, 0.24, t0 + 0.07);
        this.playBusTone(ctx, dest, 'sine', 880, 1567.98, 0.32, 0.2, t0 + 0.13);
        break;
      case 'harvest':
        this.playBusTone(ctx, dest, 'sine', 440 * jitter, 660 * jitter, 0.085, 0.24, t0);
        this.playBusTone(ctx, dest, 'triangle', 660 * jitter, 988 * jitter, 0.11, 0.22, t0 + 0.055);
        break;
      case 'coin':
        // Crisp two-tone metallic coin/gold clink
        this.playBusTone(ctx, dest, 'sine', 1174.66 * jitter, 1174.66 * jitter, 0.07, 0.22, t0);
        this.playBusTone(ctx, dest, 'triangle', 1760 * jitter, 1760 * jitter, 0.15, 0.24, t0 + 0.055);
        break;
      case 'splash':
        this.playBusTone(ctx, dest, 'sine', 340 * jitter, 740 * jitter, 0.09, 0.2, t0);
        this.playNoiseBurst(ctx, dest, 0.18, 1300, 0.22, t0 + 0.02);
        break;
      case 'wheel_tick':
        this.playBusTone(ctx, dest, 'triangle', 860, 520, 0.032, 0.18, t0);
        break;
      case 'level_up':
        this.playBusTone(ctx, dest, 'triangle', 523.25, 523.25, 0.11, 0.26, t0);
        this.playBusTone(ctx, dest, 'triangle', 659.25, 659.25, 0.11, 0.26, t0 + 0.085);
        this.playBusTone(ctx, dest, 'triangle', 783.99, 783.99, 0.11, 0.26, t0 + 0.17);
        this.playBusTone(ctx, dest, 'triangle', 1046.5, 1046.5, 0.3, 0.3, t0 + 0.255);
        this.playBusTone(ctx, dest, 'sine', 1567.98, 1567.98, 0.28, 0.16, t0 + 0.265);
        break;
      case 'victory':
        this.playBusTone(ctx, dest, 'triangle', 523.25, 523.25, 0.12, 0.28, t0);
        this.playBusTone(ctx, dest, 'triangle', 659.25, 659.25, 0.12, 0.28, t0 + 0.095);
        this.playBusTone(ctx, dest, 'triangle', 783.99, 783.99, 0.12, 0.28, t0 + 0.19);
        this.playBusTone(ctx, dest, 'triangle', 1046.5, 1174.66, 0.38, 0.32, t0 + 0.285);
        break;
      case 'heal':
        this.playBusTone(ctx, dest, 'sine', 440, 660, 0.12, 0.22, t0);
        this.playBusTone(ctx, dest, 'sine', 660, 990, 0.16, 0.22, t0 + 0.075);
        break;
      case 'click':
      default:
        // Tactile warm wooden click
        this.playBusTone(ctx, dest, 'triangle', 680, 420, 0.038, 0.18, t0);
        break;
    }
  }

  /**
   * Update 2.9 — Authentic Web Audio Synthesizer for 5 Playable Khmer Instruments
   * (Roneat Aek, Chapei Dang Veng, Khim, Skor Thom, and Chhing) tuned to the Khmer pentatonic scale.
   */
  public playInstrumentNote(
    instrumentId: KhmerInstrumentId,
    noteIndex: number,
    volumeScale = 1
  ): void {
    if (this.settings.muted || this.settings.sfxVolume <= 0.005) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxMasterGain) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }

    const def = KHMER_INSTRUMENTS[instrumentId] ?? KHMER_INSTRUMENTS.roneat_aek;
    const idx = Math.max(0, Math.min(7, Math.floor(noteIndex)));
    const freq = def.frequencies[idx] ?? 523.25;
    const vol = Math.max(0.15, Math.min(1.0, volumeScale));
    const t0 = ctx.currentTime;
    const dest = this.sfxMasterGain;

    if (instrumentId === 'roneat_aek') {
      // Crisp bamboo mallet attack + marimba-like wooden harmonic overtone (2.76x)
      this.playBusTone(ctx, dest, 'triangle', freq, freq * 0.996, 0.28, 0.34 * vol, t0);
      this.playBusTone(ctx, dest, 'sine', freq * 2.76, freq * 2.74, 0.11, 0.15 * vol, t0);
      this.playNoiseBurst(ctx, dest, 0.018, 2800, 0.11 * vol, t0);
      return;
    }

    if (instrumentId === 'chapei_dang_veng') {
      // Warm plucked long-necked lute: filtered sawtooth + resonant acoustic triangle body
      const osc = ctx.createOscillator();
      const body = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t0);
      body.type = 'triangle';
      body.frequency.setValueAtTime(freq * 2, t0);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(3400, freq * 8), t0);
      filter.frequency.exponentialRampToValueAtTime(Math.max(320, freq * 2.1), t0 + 0.55);

      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.32 * vol, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.68);

      osc.connect(filter);
      body.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(t0);
      body.start(t0);
      osc.stop(t0 + 0.7);
      body.stop(t0 + 0.7);
      return;
    }

    if (instrumentId === 'khim') {
      // Hammered dulcimer: dual slightly detuned shimmering metallic strings
      const oscA = ctx.createOscillator();
      const oscB = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const gain = ctx.createGain();
      oscA.type = 'triangle';
      oscB.type = 'sine';
      overtone.type = 'sine';
      oscA.frequency.setValueAtTime(freq * 1.003, t0);
      oscB.frequency.setValueAtTime(freq * 0.997, t0);
      overtone.frequency.setValueAtTime(freq * 3.0, t0);

      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.26 * vol, t0 + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.78);

      oscA.connect(gain);
      oscB.connect(gain);
      overtone.connect(gain);
      gain.connect(dest);
      oscA.start(t0);
      oscB.start(t0);
      overtone.start(t0);
      oscA.stop(t0 + 0.8);
      oscB.stop(t0 + 0.8);
      overtone.stop(t0 + 0.42);
      return;
    }

    if (instrumentId === 'skor_thom') {
      // Large Pinpeat barrel drum: deep bass booms (pads 0,1,2,7) & woody rim/slap hits (pads 3,4,5,6)
      if (idx === 4 || idx === 5) {
        // Sharp wooden rim / high slap
        this.playDrumHit(ctx, dest, freq * 1.4, freq * 0.65, 0.14, 0.34 * vol, t0);
        this.playNoiseBurst(ctx, dest, 0.06, 2100, 0.22 * vol, t0);
      } else if (idx === 6) {
        // Double Pinpeat roll
        this.playDrumHit(ctx, dest, 155, 62, 0.16, 0.32 * vol, t0);
        this.playDrumHit(ctx, dest, 175, 68, 0.18, 0.34 * vol, t0 + 0.075);
      } else {
        // Deep resonant barrel bass boom
        this.playDrumHit(ctx, dest, freq * 1.75, Math.max(42, freq * 0.52), 0.34, 0.46 * vol, t0);
        this.playNoiseBurst(ctx, dest, 0.04, 620, 0.14 * vol, t0);
      }
      return;
    }

    // Chhing (Bronze finger cymbals): even pads = open shimmering "Chhing", odd pads = damped "Chhepp"
    const isOpen = idx % 2 === 0;
    const dur = isOpen ? 0.56 : 0.095;
    const partials = [1, 1.48, 2.09];
    for (let i = 0; i < partials.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq * partials[i], t0);
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime((isOpen ? 0.16 : 0.22) * vol / (i + 1), t0 + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0008, t0 + dur / (i * 0.35 + 1));
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    }
    this.playNoiseBurst(ctx, dest, isOpen ? 0.045 : 0.055, 4800, 0.15 * vol, t0);
  }

  /**
   * Update 3.3 — Authentic Khleng Ek (Cambodian Bamboo Wind-Reed Singing Kite) harmonic hum!
   * Higher altitude raises the resonant pitch & harmonic overtone shimmer.
   */
  public playKhlengEkHum(altitude01 = 0.7): void {
    if (this.settings.muted || this.settings.sfxVolume <= 0.005) return;
    const ctx = this.ensureContext();
    const dest = this.sfxMasterGain;
    if (!ctx || !dest) return;
    const t0 = ctx.currentTime + 0.01;
    const baseFreq = 165 + Math.max(0, Math.min(1, altitude01)) * 135;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filt = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(baseFreq, t0);
    osc1.frequency.linearRampToValueAtTime(baseFreq * 1.04, t0 + 0.55);
    osc1.frequency.linearRampToValueAtTime(baseFreq * 0.99, t0 + 1.05);
    osc2.frequency.setValueAtTime(baseFreq * 1.5, t0);
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(baseFreq * 2.2, t0);
    filt.Q.setValueAtTime(3.2, t0);
    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.linearRampToValueAtTime(0.11, t0 + 0.22);
    gain.gain.exponentialRampToValueAtTime(0.0008, t0 + 1.15);
    osc1.connect(filt);
    osc2.connect(filt);
    filt.connect(gain);
    gain.connect(dest);
    osc1.start(t0);
    osc2.start(t0);
    osc1.stop(t0 + 1.2);
    osc2.stop(t0 + 1.2);
  }

  /** Update 3.3 — Festive Village Firework pop & crackle */
  public playFireworkBurst(): void {
    if (this.settings.muted || this.settings.sfxVolume <= 0.005) return;
    const ctx = this.ensureContext();
    const dest = this.sfxMasterGain;
    if (!ctx || !dest) return;
    const t0 = ctx.currentTime + 0.01;
    this.playDrumHit(ctx, dest, 220, 58, 0.24, 0.32, t0);
    this.playNoiseBurst(ctx, dest, 0.26, 2600, 0.18, t0 + 0.04);
  }
}

export const soundManager = new SoundManagerEngine();
