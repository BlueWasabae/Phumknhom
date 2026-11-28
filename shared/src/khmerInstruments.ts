import type { InstrumentSkinId, KhmerInstrumentId, PlayerState } from './types';

export interface KhmerInstrumentDef {
  id: KhmerInstrumentId;
  name: string;
  khmerName: string;
  family: 'melody' | 'percussion';
  icon: string;
  primaryColor: string;
  accentColor: string;
  buyCoins: number;
  unlockHint: string;
  description: string;
  noteLabels: [string, string, string, string, string, string, string, string];
  /** Base frequencies (Hz) for the 8 Khmer pentatonic / Pinpeat pads (A S D F G H J K) */
  frequencies: [number, number, number, number, number, number, number, number];
}

export const INSTRUMENT_KEYS = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K'] as const;

export const KHMER_INSTRUMENTS: Record<KhmerInstrumentId, KhmerInstrumentDef> = {
  roneat_aek: {
    id: 'roneat_aek',
    name: 'Roneat Aek',
    khmerName: 'រនាតឯក',
    family: 'melody',
    icon: '🎹',
    primaryColor: '#d97706',
    accentColor: '#fef08a',
    buyCoins: 0, // Starter Village Instrument so every player can jam immediately!
    unlockHint: 'Free Starter Pinpeat Instrument',
    description: 'High-pitched bamboo xylophone — crisp wooden mallet resonance tuned to the Khmer pentatonic scale.',
    noteLabels: ['Do', 'Re', 'Mi', 'Sol', 'La', 'Do↑', 'Re↑', 'Mi↑'],
    frequencies: [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51],
  },
  chapei_dang_veng: {
    id: 'chapei_dang_veng',
    name: 'Chapei Dang Veng',
    khmerName: 'ចាប៉ីដងវែង',
    family: 'melody',
    icon: '🎸',
    primaryColor: '#92400e',
    accentColor: '#fbbf24',
    buyCoins: 240,
    unlockHint: '240 Coins · Village Music Stall',
    description: 'UNESCO-recognized traditional long-necked plucked lute with warm acoustic string storytelling tones.',
    noteLabels: ['Do', 'Re', 'Mi', 'Sol', 'La', 'Do↑', 'Re↑', 'Mi↑'],
    frequencies: [196.0, 220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25],
  },
  khim: {
    id: 'khim',
    name: 'Khim',
    khmerName: 'ឃឹម',
    family: 'melody',
    icon: '🎻',
    primaryColor: '#0284c7',
    accentColor: '#7dd3fc',
    buyCoins: 360,
    unlockHint: '360 Coins · Village Music Stall',
    description: 'Hammered butterfly dulcimer producing shimmering metallic string chimes across bright pentatonic octaves.',
    noteLabels: ['Do', 'Re', 'Mi', 'Sol', 'La', 'Do↑', 'Re↑', 'Mi↑'],
    frequencies: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25],
  },
  skor_thom: {
    id: 'skor_thom',
    name: 'Skor Thom',
    khmerName: 'ស្គរធំ',
    family: 'percussion',
    icon: '🥁',
    primaryColor: '#991b1b',
    accentColor: '#f59e0b',
    buyCoins: 320,
    unlockHint: '320 Coins · Festival Percussion',
    description: 'Grand double-headed Pinpeat barrel drum delivering deep resonant bass booms and sharp wooden rim hits.',
    noteLabels: ['Boom', 'Low', 'Open', 'Slap', 'Rim', 'High', 'Roll', 'Gong'],
    frequencies: [68, 86, 118, 165, 290, 210, 140, 96],
  },
  chhing: {
    id: 'chhing',
    name: 'Chhing',
    khmerName: 'ឈឹង',
    family: 'percussion',
    icon: '🔔',
    primaryColor: '#ca8a04',
    accentColor: '#fef9c3',
    buyCoins: 180,
    unlockHint: '180 Coins · Pinpeat Timekeeper',
    description: 'Thick bronze finger cymbals alternating sparkling open "chhing" rings and damped "chhepp" timekeeper beats.',
    noteLabels: ['Chhing', 'Chhepp', 'Chhing↑', 'Chhepp', 'Ring', 'Tap', 'Bell', 'Fin'],
    frequencies: [2480, 1920, 2860, 2040, 3120, 1780, 3420, 2640],
  },
};

export const KHMER_INSTRUMENT_LIST: KhmerInstrumentDef[] = Object.values(KHMER_INSTRUMENTS);

export interface InstrumentSkinDef {
  id: InstrumentSkinId;
  name: string;
  khmerName: string;
  noteColorHex: string;
  noteColorNum: number;
  glowStrength: number;
  badge: string;
}

export const INSTRUMENT_SKINS: Record<InstrumentSkinId, InstrumentSkinDef> = {
  classic: {
    id: 'classic',
    name: 'Classic Teak & Bamboo',
    khmerName: 'ឈើបេងបុរាណ',
    noteColorHex: '#fde047',
    noteColorNum: 0xfde047,
    glowStrength: 1.1,
    badge: 'STANDARD',
  },
  golden_angkor: {
    id: 'golden_angkor',
    name: 'Ornate Golden Angkor',
    khmerName: 'មាសអង្គរប្រណីត',
    noteColorHex: '#f59e0b',
    noteColorNum: 0xf59e0b,
    glowStrength: 1.8,
    badge: 'GOLDEN SKIN',
  },
  celestial_apsara: {
    id: 'celestial_apsara',
    name: 'Celestial Apsara',
    khmerName: 'អប្សរាទេវតា',
    noteColorHex: '#38bdf8',
    noteColorNum: 0x38bdf8,
    glowStrength: 2.1,
    badge: 'CELESTIAL SKIN',
  },
};

export const DEFAULT_OWNED_INSTRUMENTS: KhmerInstrumentId[] = ['roneat_aek', 'chapei_dang_veng'];

export function getOwnedInstruments(state: PlayerState): KhmerInstrumentId[] {
  const raw = state.ownedInstruments;
  const set = new Set<KhmerInstrumentId>(DEFAULT_OWNED_INSTRUMENTS);
  if (Array.isArray(raw)) {
    for (const id of raw) {
      if (id in KHMER_INSTRUMENTS) set.add(id);
    }
  }
  return Array.from(set);
}

export function buyKhmerInstrument(
  state: PlayerState,
  instrumentId: KhmerInstrumentId
): { state: PlayerState; ok: boolean; message: string } {
  const def = KHMER_INSTRUMENTS[instrumentId];
  if (!def) return { state, ok: false, message: 'Unknown instrument.' };
  const owned = getOwnedInstruments(state);
  if (owned.includes(instrumentId)) {
    return {
      state: { ...state, equippedInstrument: instrumentId },
      ok: true,
      message: `🎵 Equipped ${def.icon} ${def.name} (${def.khmerName})!`,
    };
  }
  if (state.currencies.coins < def.buyCoins) {
    return {
      state,
      ok: false,
      message: `Need ${def.buyCoins.toLocaleString()} Coins to buy ${def.name}.`,
    };
  }
  const nextCoins = state.currencies.coins - def.buyCoins;
  return {
    state: {
      ...state,
      coins: nextCoins,
      currencies: { ...state.currencies, coins: nextCoins },
      ownedInstruments: [...owned, instrumentId],
      equippedInstrument: instrumentId,
    },
    ok: true,
    message: `🎵 Purchased & equipped ${def.icon} ${def.name} (${def.khmerName}) (-${def.buyCoins}c)!`,
  };
}
