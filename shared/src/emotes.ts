export type KhmerEmoteId =
  | 'sampeah'
  | 'romvong'
  | 'apsara_pose'
  | 'sip_kafe'
  | 'sit_relax'
  | 'victory_cheer'
  | 'naga_spirit_roar'
  | 'golden_rain_dance';

export interface KhmerEmoteDef {
  id: KhmerEmoteId;
  name: string;
  khmerName: string;
  icon: string;
  accentColor: string;
  looping: boolean;
  durationMs: number;
  prestige: boolean;
  unlockHint: string;
  diamondCost?: number;
  seasonPassTier?: number;
  description: string;
}

export const KHMER_EMOTES: Record<KhmerEmoteId, KhmerEmoteDef> = {
  sampeah: {
    id: 'sampeah',
    name: 'Sampeah',
    khmerName: 'សំពះ',
    icon: '🙏',
    accentColor: '#facc15',
    looping: false,
    durationMs: 3600,
    prestige: false,
    unlockHint: 'Free Starter Emote',
    description: 'Respectful traditional Khmer greeting bow with a warm golden lotus sparkle.',
  },
  romvong: {
    id: 'romvong',
    name: 'Romvong Dance',
    khmerName: 'រាំវង់',
    icon: '💃',
    accentColor: '#f472b6',
    looping: true,
    durationMs: 60000,
    prestige: false,
    unlockHint: 'Free Starter Emote',
    description: 'Looping rhythmic traditional Khmer circle dance with drifting floral musical notes.',
  },
  apsara_pose: {
    id: 'apsara_pose',
    name: 'Apsara Pose',
    khmerName: 'ក្បាច់អប្សរា',
    icon: '🪷',
    accentColor: '#fb7185',
    looping: false,
    durationMs: 5200,
    prestige: false,
    unlockHint: 'Free Starter Emote',
    description: 'Graceful glowing celestial lotus hand-pose surrounded by blooming petals.',
  },
  sip_kafe: {
    id: 'sip_kafe',
    name: 'Sip Kafé Tek Dos Ko',
    khmerName: 'ផឹកកាហ្វេទឹកដោះគោ',
    icon: '🧋',
    accentColor: '#d97706',
    looping: true,
    durationMs: 60000,
    prestige: false,
    unlockHint: 'Free Starter Emote',
    description: 'Pulls out a chilled Khmer iced condensed-milk coffee cup and sips casually.',
  },
  sit_relax: {
    id: 'sit_relax',
    name: 'Sit / Relax',
    khmerName: 'អង្គុយសម្រាក',
    icon: '🧘',
    accentColor: '#34d399',
    looping: true,
    durationMs: 60000,
    prestige: false,
    unlockHint: 'Free Starter Emote',
    description: 'Sits down peacefully on village grass, Koh Rong sand, or plaza benches.',
  },
  victory_cheer: {
    id: 'victory_cheer',
    name: 'Victory Cheer',
    khmerName: 'អបអរជ័យជម្នះ',
    icon: '🎉',
    accentColor: '#38bdf8',
    looping: false,
    durationMs: 3800,
    prestige: false,
    unlockHint: 'Free Starter Emote',
    description: 'Joyful fist-pump leap bursting with celebratory festival confetti!',
  },
  naga_spirit_roar: {
    id: 'naga_spirit_roar',
    name: 'Naga Spirit Roar',
    khmerName: 'សម្រែកនាគទេព',
    icon: '🐉',
    accentColor: '#10b981',
    looping: false,
    durationMs: 4600,
    prestige: true,
    diamondCost: 120,
    seasonPassTier: 6,
    unlockHint: 'Diamond Store (120 💎) or Royal Season Pass Tier 6',
    description: 'Unleashes a swirling emerald-and-gold Angkor Naga spirit aura with resonant shockwaves.',
  },
  golden_rain_dance: {
    id: 'golden_rain_dance',
    name: 'Golden Rain Dance',
    khmerName: 'របាំភ្លៀងមាស',
    icon: '✨',
    accentColor: '#fde047',
    looping: true,
    durationMs: 60000,
    prestige: true,
    diamondCost: 150,
    seasonPassTier: 14,
    unlockHint: 'Diamond Store (150 💎) or Royal Season Pass Tier 14',
    description: 'Looping royal Angkor celestial dance summoning shimmering golden lotus rain.',
  },
};

export const KHMER_EMOTE_LIST: KhmerEmoteDef[] = [
  KHMER_EMOTES.sampeah,
  KHMER_EMOTES.romvong,
  KHMER_EMOTES.apsara_pose,
  KHMER_EMOTES.sip_kafe,
  KHMER_EMOTES.sit_relax,
  KHMER_EMOTES.victory_cheer,
  KHMER_EMOTES.naga_spirit_roar,
  KHMER_EMOTES.golden_rain_dance,
];

export const FREE_KHMER_EMOTES: KhmerEmoteId[] = [
  'sampeah',
  'romvong',
  'apsara_pose',
  'sip_kafe',
  'sit_relax',
  'victory_cheer',
];

export function isKhmerEmoteId(raw: unknown): raw is KhmerEmoteId {
  return typeof raw === 'string' && raw in KHMER_EMOTES;
}

export function isEmoteUnlocked(ownedEmotes: KhmerEmoteId[] | undefined, emoteId: KhmerEmoteId): boolean {
  const def = KHMER_EMOTES[emoteId];
  if (!def) return false;
  if (!def.prestige) return true;
  return Boolean(ownedEmotes?.includes(emoteId));
}
