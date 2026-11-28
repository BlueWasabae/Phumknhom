import type { PlayerState } from './types';

/**
 * Update 1.4 — Angkor Relic Museum Catalog & Account-Wide Scholar Perks
 * 12 donatable collectibles across 3 Museum Wings:
 * - Wing 1: Ancient Relics (Caverns / Mining)
 * - Wing 2: Mekong Fauna (Fishing Pier)
 * - Wing 3: Botanical & Boss Curios (Farming & Bosses)
 */

export type MuseumWingId = 'ancient_relics' | 'mekong_fauna' | 'botanical_boss' | 'ocean_wing';

export interface MuseumExhibitDef {
  id: string;
  itemId: string;
  wing: MuseumWingId;
  name: string;
  khmerName: string;
  icon: string;
  sourceHint: string;
  lore: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  displayColor: string;
}

export interface MuseumWingDef {
  id: MuseumWingId;
  title: string;
  khmerTitle: string;
  icon: string;
  subtitle: string;
}

export interface ScholarPerkTier {
  threshold: number;
  title: string;
  summary: string;
  icon: string;
}

export interface MuseumScholarPerks {
  donatedCount: number;
  totalExhibits: number;
  moveSpeedBonusPct: number;     // 3+ donations -> +0.05 (+5% Move Speed)
  rareDropLuckBonusPct: number;  // 6+ donations -> +0.10 (+10% Rare Drop Luck)
  skillXpBonusPct: number;       // 10+ donations -> +0.15 (+15% All Skill XP)
  unlockedScholarHat: boolean;   // 10+ donations -> Angkor Scholar Hat vanity
}

export const MUSEUM_WINGS: MuseumWingDef[] = [
  {
    id: 'ancient_relics',
    title: 'Ancient Relics',
    khmerTitle: 'សាលបុរាណវត្ថុអង្គរ',
    icon: '🏺',
    subtitle: 'Unearthed from Underground Cavern ore veins & hidden Relic Chests',
  },
  {
    id: 'mekong_fauna',
    title: 'Mekong Fauna',
    khmerTitle: 'សាលមច្ឆាទន្លេមេគង្គ',
    icon: '🐟',
    subtitle: 'Caught along the tranquil Green Park Riverside Fishing Pier',
  },
  {
    id: 'botanical_boss',
    title: 'Botanical & Boss Curios',
    khmerTitle: 'សាលរុក្ខជាតិ និងវត្ថុស័ក្តិសិទ្ធិ',
    icon: '🪷',
    subtitle: 'Rare village harvests and crystalline cores dropped by Khmer Bosses',
  },
  {
    id: 'ocean_wing',
    title: 'Ocean Wing',
    khmerTitle: 'សាលមហាសមុទ្រកោះរ៉ុង',
    icon: '🐚',
    subtitle: 'Mythic deep-sea catches & glowing coral pearls from Koh Rong Island',
  },
];

export const MUSEUM_EXHIBITS: MuseumExhibitDef[] = [
  // Wing 1: Ancient Relics (Caverns / Mining)
  {
    id: 'exhibit_sandstone_apsara',
    itemId: 'relic_sandstone_apsara',
    wing: 'ancient_relics',
    name: 'Sandstone Apsara',
    khmerName: 'ចម្លាក់អប្សរាថ្មភក់',
    icon: '🗿',
    sourceHint: 'Cavern Ore Veins & Relic Chests',
    lore: 'A gracefully carved 12th-century pink-sandstone celestial dancer preserved beneath Angkor caverns.',
    rarity: 'rare',
    displayColor: '#f59e0b',
  },
  {
    id: 'exhibit_jade_naga_seal',
    itemId: 'relic_jade_naga_seal',
    wing: 'ancient_relics',
    name: 'Jade Naga Seal',
    khmerName: 'ត្រានាគថ្មគជ់',
    icon: '🐉',
    sourceHint: 'Jade Crystal Veins & Cavern Chests',
    lore: 'An imperial emerald seal bearing seven coiled Naga heads, once stamping royal temple decrees.',
    rarity: 'epic',
    displayColor: '#10b981',
  },
  {
    id: 'exhibit_bronze_angkor_bell',
    itemId: 'relic_bronze_angkor_bell',
    wing: 'ancient_relics',
    name: 'Bronze Angkor Bell',
    khmerName: 'ជួងសំរិទ្ធអង្គរ',
    icon: '🔔',
    sourceHint: 'Angkor Gold Veins & Relic Chests',
    lore: 'A resonant ceremonial temple bell whose clear chime still echoes across the Temple District.',
    rarity: 'epic',
    displayColor: '#eab308',
  },
  {
    id: 'exhibit_laterite_core',
    itemId: 'relic_laterite_core',
    wing: 'ancient_relics',
    name: 'Laterite Core',
    khmerName: 'ស្នូលថ្មបាយក្រៀម',
    icon: '🪨',
    sourceHint: 'Laterite Ore Veins (Caverns & Frontier)',
    lore: 'A dense volcanic-iron laterite foundation stone that anchored ancient Khmer causeways.',
    rarity: 'uncommon',
    displayColor: '#ea580c',
  },

  // Wing 2: Mekong Fauna (Fishing Pier)
  {
    id: 'exhibit_mekong_catfish',
    itemId: 'fish_mekong_catfish',
    wing: 'mekong_fauna',
    name: 'Mekong Catfish',
    khmerName: 'ត្រីប្រាទន្លេមេគង្គ',
    icon: '🐟',
    sourceHint: 'Green Park Fishing Pier',
    lore: 'A prized freshwater giant revered by Cambodian river communities for generations.',
    rarity: 'common',
    displayColor: '#38bdf8',
  },
  {
    id: 'exhibit_silver_carp',
    itemId: 'fish_silver_carp',
    wing: 'mekong_fauna',
    name: 'Silver Carp',
    khmerName: 'ត្រីរៀលប្រាក់',
    icon: '🐠',
    sourceHint: 'Green Park Fishing Pier',
    lore: 'Shimmering silver river fish whose seasonal migrations herald the annual Tonlé Sap abundance.',
    rarity: 'uncommon',
    displayColor: '#94a3b8',
  },
  {
    id: 'exhibit_golden_lotus_koi',
    itemId: 'fish_golden_lotus_koi',
    wing: 'mekong_fauna',
    name: 'Golden Lotus Koi',
    khmerName: 'ត្រីគល់រាំងមាស',
    icon: '🎏',
    sourceHint: 'Green Park Fishing Pier (Rare Catch)',
    lore: 'A luminous golden koi said to dwell exclusively beneath blooming temple lotus ponds.',
    rarity: 'rare',
    displayColor: '#facc15',
  },
  {
    id: 'exhibit_sunken_coin_pouch',
    itemId: 'fish_sunken_coin_pouch',
    wing: 'mekong_fauna',
    name: 'Sunken Coin Pouch',
    khmerName: 'ថង់ប្រាក់លិចទឹក',
    icon: '👛',
    sourceHint: 'Green Park Fishing Pier',
    lore: 'A silk merchant satchel recovered from river silt, holding antique silver tical coins.',
    rarity: 'uncommon',
    displayColor: '#d97706',
  },

  // Wing 3: Botanical & Boss Curios
  {
    id: 'exhibit_golden_durian',
    itemId: 'fruit_golden_durian',
    wing: 'botanical_boss',
    name: 'Golden Durian',
    khmerName: 'ធុរេនមាស',
    icon: '🍈',
    sourceHint: 'Homestead Golden Durian Tree / Night Market',
    lore: 'The celebrated Kampot King of Fruits, preserved in crystal-clear amber resin.',
    rarity: 'legendary',
    displayColor: '#f59e0b',
  },
  {
    id: 'exhibit_pink_lotus',
    itemId: 'crop_pink_lotus',
    wing: 'botanical_boss',
    name: 'Pink Lotus',
    khmerName: 'ផ្កាឈូកស័ក្តិសិទ្ធិ',
    icon: '🪷',
    sourceHint: 'Homestead Farm (Pink Lotus Seeds)',
    lore: 'An unblemished temple blossom symbolizing purity, serenity, and scholarly enlightenment.',
    rarity: 'rare',
    displayColor: '#ec4899',
  },
  {
    id: 'exhibit_slime_core',
    itemId: 'drop_slime_core',
    wing: 'botanical_boss',
    name: 'Slime Core',
    khmerName: 'ស្នូលកង្កែបភក់',
    icon: '🟢',
    sourceHint: 'Boss Drop: Sdech Kongkaeb (King Frog)',
    lore: 'An iridescent emerald orb pulsing with buoyant rice-paddy vitality.',
    rarity: 'rare',
    displayColor: '#22c55e',
  },
  {
    id: 'exhibit_stone_core',
    itemId: 'drop_stone_core',
    wing: 'botanical_boss',
    name: 'Stone Core',
    khmerName: 'ស្នូលថ្មយក្ស',
    icon: '🔮',
    sourceHint: 'Boss Drop: Yeak Thmor Prasat',
    lore: 'The runic granite heart that once animated the Stone Guardian of Angkor.',
    rarity: 'epic',
    displayColor: '#a855f7',
  },

  // Wing 4: Ocean Wing (Koh Rong Mythic Island & Deep-Sea Pearl Diving)
  {
    id: 'exhibit_sapphire_turtle_shell',
    itemId: 'fish_sapphire_turtle_shell',
    wing: 'ocean_wing',
    name: 'Sapphire Sea Turtle Shell',
    khmerName: 'ស្នូកអណ្តើកសមុទ្រត្បូងកណ្តៀង',
    icon: '🐢',
    sourceHint: 'Koh Rong Deep-Sea Fishing Pier (1.5% Legendary)',
    lore: 'A gleaming sapphire-veined carapace naturally shed by Koh Rong’s ancient guardian reef turtles.',
    rarity: 'legendary',
    displayColor: '#0ea5e9',
  },
  {
    id: 'exhibit_starlight_manta',
    itemId: 'fish_starlight_manta',
    wing: 'ocean_wing',
    name: 'Starlight Manta Ray',
    khmerName: 'ត្រីបបែលពន្លឺផ្កាយ',
    icon: '🦈',
    sourceHint: 'Koh Rong Deep-Sea Fishing Pier (0.4% Mythic)',
    lore: 'A translucent ocean glider speckled with bioluminescent constellations from Koh Rong’s moonlit waters.',
    rarity: 'legendary',
    displayColor: '#38bdf8',
  },
  {
    id: 'exhibit_ancient_golden_barb',
    itemId: 'fish_ancient_golden_barb',
    wing: 'ocean_wing',
    name: 'Ancient Golden Giant Barb',
    khmerName: 'ត្រីគល់រាំងមាសបុរាណមហាសមុទ្រ',
    icon: '👑',
    sourceHint: 'Koh Rong Deep-Sea Fishing Pier (0.15% Ancient)',
    lore: 'The mythic golden leviathan of Cambodia’s seas — grants the Ocean Sovereign title to its catcher.',
    rarity: 'legendary',
    displayColor: '#facc15',
  },
  {
    id: 'exhibit_bioluminescent_pearl',
    itemId: 'pearl_ancient_bioluminescent',
    wing: 'ocean_wing',
    name: 'Ancient Bioluminescent Pearl',
    khmerName: 'គជ់ពន្លឺសមុទ្របុរាណ',
    icon: '🫧',
    sourceHint: 'Koh Rong Deep-Sea Pearl Diving (0.2% Ancient)',
    lore: 'A radiant cyan-gold nacre sphere born in the deepest giant clams beneath Koh Rong’s glowing coral reef.',
    rarity: 'legendary',
    displayColor: '#22d3ee',
  },
];

export const MUSEUM_EXHIBITS_BY_ITEM: Record<string, MuseumExhibitDef> = Object.fromEntries(
  MUSEUM_EXHIBITS.map((ex) => [ex.itemId, ex])
);

export const SCHOLAR_PERK_TIERS: ScholarPerkTier[] = [
  {
    threshold: 3,
    title: 'Novice Archivist',
    summary: '+5% Move Speed everywhere',
    icon: '👟',
  },
  {
    threshold: 6,
    title: 'Temple Curator',
    summary: '+10% Rare Drop Luck',
    icon: '🍀',
  },
  {
    threshold: 10,
    title: 'Grand Angkor Scholar',
    summary: '+15% All Skill XP + Exclusive Angkor Scholar Hat!',
    icon: '🎓',
  },
];

export function getMuseumScholarPerks(donations?: string[] | null): MuseumScholarPerks {
  const uniqueCount = new Set(Array.isArray(donations) ? donations : []).size;
  return {
    donatedCount: uniqueCount,
    totalExhibits: MUSEUM_EXHIBITS.length,
    moveSpeedBonusPct: uniqueCount >= 3 ? 0.05 : 0,
    rareDropLuckBonusPct: uniqueCount >= 6 ? 0.1 : 0,
    skillXpBonusPct: uniqueCount >= 10 ? 0.15 : 0,
    unlockedScholarHat: uniqueCount >= 10,
  };
}

export function donateItemToMuseum(
  state: PlayerState,
  itemId: string
): { state: PlayerState; ok: boolean; message: string; unlockedScholarHat?: boolean } {
  const exhibit = MUSEUM_EXHIBITS_BY_ITEM[itemId];
  if (!exhibit) {
    return { state, ok: false, message: 'This item is not part of the Angkor Relic Museum catalog.' };
  }
  const existingDonations = Array.isArray(state.museumDonations) ? state.museumDonations : [];
  if (existingDonations.includes(itemId)) {
    return { state, ok: false, message: `${exhibit.name} is already on display in the Museum!` };
  }

  const invIndex = state.inventory.findIndex((entry) => entry.itemId === itemId && entry.quantity > 0);
  if (invIndex < 0) {
    return {
      state,
      ok: false,
      message: `You need 1× ${exhibit.name} in your Container to donate it.`,
    };
  }

  const nextInv = state.inventory
    .map((entry, idx) =>
      idx === invIndex ? { ...entry, quantity: entry.quantity - 1 } : { ...entry }
    )
    .filter((entry) => entry.quantity > 0);

  const nextDonations = [...existingDonations, itemId];
  const prevCount = existingDonations.length;
  const nextCount = nextDonations.length;

  let unlockedScholarHat = false;
  let perkNote = '';
  if (prevCount < 3 && nextCount >= 3) {
    perkNote = ' 🎉 Unlocked Scholar Perk: +5% Move Speed!';
  } else if (prevCount < 6 && nextCount >= 6) {
    perkNote = ' 🎉 Unlocked Scholar Perk: +10% Rare Drop Luck!';
  } else if (prevCount < 10 && nextCount >= 10) {
    unlockedScholarHat = true;
    if (!nextInv.some((i) => i.itemId === 'hat_angkor_scholar')) {
      nextInv.push({ itemId: 'hat_angkor_scholar', quantity: 1, itemLevel: 1, quality: 'normal' });
    }
    perkNote = ' 🎓 GRAND SCHOLAR UNLOCKED: +15% All Skill XP & Angkor Scholar Hat added to Container!';
  }

  const rewardCoins = 120;
  const nextCoins = state.currencies.coins + rewardCoins;

  return {
    state: {
      ...state,
      coins: nextCoins,
      currencies: { ...state.currencies, coins: nextCoins },
      inventory: nextInv,
      museumDonations: nextDonations,
    },
    ok: true,
    unlockedScholarHat,
    message: `🏛️ Donated ${exhibit.name} to the Angkor Relic Museum (+${rewardCoins}c)! (${nextCount}/${MUSEUM_EXHIBITS.length})${perkNote}`,
  };
}
