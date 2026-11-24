/**
 * Update 1.5 — Playable Khmer Seasonal Festivals
 * 1. Bon Om Touk (Water Festival — Longboat Racing in Green Park Pier)
 * 2. Chol Chnam Thmey (Khmer New Year — Water Splash Tag in Central Plaza)
 * 3. Pchum Ben (Floating Pink Lotus Lanterns in Green Park Twilight River)
 */

export type FestivalId = 'bon_om_touk' | 'chol_chnam_thmey' | 'pchum_ben';

export interface FestivalDef {
  id: FestivalId;
  name: string;
  khmerName: string;
  seasonId: 'spring' | 'summer' | 'autumn';
  icon: string;
  targetMap: 'central_plaza' | 'green_park';
  accentColor: string;
  pillBgClass: string;
  shortTag: string;
  description: string;
  rewardSummary: string;
}

export const KHMER_FESTIVALS: Record<FestivalId, FestivalDef> = {
  bon_om_touk: {
    id: 'bon_om_touk',
    name: 'Bon Om Touk (Water Festival)',
    khmerName: 'បុណ្យអុំទូក',
    seasonId: 'summer',
    icon: '🛶',
    targetMap: 'green_park',
    accentColor: '#0284c7',
    pillBgClass: 'bg-sky-700 hover:bg-sky-600 text-sky-50 border-sky-950',
    shortTag: 'Longboat Race',
    description:
      'Launch a traditional Khmer racing longboat from Green Park Riverside Pier and paddle rhythmically against 3 rival village crews down a lantern-lit Mekong course!',
    rewardSummary: '+350 Coins, +2 Gold, +85 Fishing XP & Water Festival Rowing Paddle weapon!',
  },
  chol_chnam_thmey: {
    id: 'chol_chnam_thmey',
    name: 'Chol Chnam Thmey (Khmer New Year)',
    khmerName: 'បុណ្យចូលឆ្នាំថ្មី',
    seasonId: 'spring',
    icon: '💦',
    targetMap: 'central_plaza',
    accentColor: '#ec4899',
    pillBgClass: 'bg-pink-600 hover:bg-pink-500 text-white border-pink-950',
    shortTag: 'Water Splash Tag',
    description:
      'Water-bucket stations appear across Central Plaza! Splash nearby villagers and NPCs ([E] or Splash button) with refreshing bursts of water for festive New Year Coins and the Jasmine Garland hat.',
    rewardSummary: '+45 New Year Coins per Splash & exclusive Jasmine Garland hat at 3 splashes!',
  },
  pchum_ben: {
    id: 'pchum_ben',
    name: 'Pchum Ben (Floating Lotus Lanterns)',
    khmerName: 'បុណ្យភ្ជុំបិណ្ឌ',
    seasonId: 'autumn',
    icon: '🪷',
    targetMap: 'green_park',
    accentColor: '#f59e0b',
    pillBgClass: 'bg-amber-600 hover:bg-amber-500 text-amber-50 border-amber-950',
    shortTag: 'Lotus Lanterns',
    description:
      'Green Park shimmers under glowing twilight lanterns. Release a floating Pink Lotus Lantern (50 Coins) onto the tranquil Mekong waters to receive a sacred ancestral blessing!',
    rewardSummary: '10-minute +20% All Skill XP & +15% Rare Drop Luck blessing!',
  },
};

export const KHMER_FESTIVAL_LIST: FestivalDef[] = [
  KHMER_FESTIVALS.bon_om_touk,
  KHMER_FESTIVALS.chol_chnam_thmey,
  KHMER_FESTIVALS.pchum_ben,
];

export function getAutoFestivalForSeason(
  seasonId: 'spring' | 'summer' | 'autumn' | 'winter'
): FestivalId | null {
  if (seasonId === 'spring') return 'chol_chnam_thmey';
  if (seasonId === 'summer') return 'bon_om_touk';
  if (seasonId === 'autumn') return 'pchum_ben';
  return null;
}

export interface KromBuffSummary {
  level: number;
  farmSpeedPct: number;   // +5% at Lv.1 -> +20% at Lv.10
  bossDamagePct: number;  // +5% at Lv.1 -> +20% at Lv.10
  coinDropPct: number;    // +5% at Lv.1 -> +20% at Lv.10
  nextLevelXp: number;
}

/**
 * Passive Krom Guild Buffs scaling cleanly from Lv.1 (+5%) to Lv.10 (+20%).
 */
export function computeKromBuffs(rawLevel?: number | null): KromBuffSummary {
  const level = Math.max(0, Math.min(10, Math.floor(rawLevel ?? 0)));
  if (level <= 0) {
    return { level: 0, farmSpeedPct: 0, bossDamagePct: 0, coinDropPct: 0, nextLevelXp: 500 };
  }
  const pct = Math.round((0.05 + ((level - 1) / 9) * 0.15) * 1000) / 1000;
  return {
    level,
    farmSpeedPct: pct,
    bossDamagePct: pct,
    coinDropPct: pct,
    nextLevelXp: level * 600,
  };
}
