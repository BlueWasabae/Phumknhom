import type { BossId } from './types';
import type { KhmerBossDef } from './khmerBosses';

export type ArtisanStationId =
  | 'kampong_pottery_stump'
  | 'khmer_weaving_loom'
  | 'village_dairy_churn';

export interface ArtisanIngredientReq {
  itemId: string;
  label: string;
  qty: number;
}

export interface ArtisanStationRecipe {
  id: string;
  stationId: ArtisanStationId;
  outputItemId: string;
  outputName: string;
  khmerName: string;
  icon: string;
  ingredients: ArtisanIngredientReq[];
  durationMs: number;
  craftingXp: number;
  sellCoins: number;
  decorItemId?: string;
  combatBuff?: {
    label: string;
    durationMs: number;
    attackPct?: number;
    moveSpeedPct?: number;
    maxHpPct?: number;
    defensePct?: number;
  };
  description: string;
}

export interface ArtisanStationDef {
  id: ArtisanStationId;
  name: string;
  khmerName: string;
  icon: string;
  costCoins: number;
  primaryColor: string;
  accentColor: string;
  heritageNote: string;
  description: string;
  farmSlotOffset: { x: number; y: number };
}

export const KHMER_ARTISAN_STATIONS: Record<ArtisanStationId, ArtisanStationDef> = {
  kampong_pottery_stump: {
    id: 'kampong_pottery_stump',
    name: 'Kampong Chhnang Pottery Stump',
    khmerName: 'ត្បាល់ធ្វើក្អមដីកំពង់ឆ្នាំង',
    icon: '🏺',
    costCoins: 1200,
    primaryColor: '#b45309',
    accentColor: '#f59e0b',
    heritageNote: 'Authentic Andong Russei hand-paddling & wood-firing (zero potter’s wheel!)',
    description:
      'Shapes Krang Dei Meas Clay (mined in Tonle Sap Marsh & Mining Quarry) into wood-fired terracotta luxury vessels & Stilt House decor.',
    farmSlotOffset: { x: 560, y: 315 },
  },
  khmer_weaving_loom: {
    id: 'khmer_weaving_loom',
    name: 'Khmer Weaving Loom',
    khmerName: 'កីតម្បាញក្រមា និងសូត្រខ្មែរ',
    icon: '🧵',
    costCoins: 1500,
    primaryColor: '#be123c',
    accentColor: '#fb7185',
    heritageNote: 'Traditional wooden Khmer treadle loom for Krama & Royal Hol silk',
    description:
      'Spins Soft Wool (Sheep) & Lotus Silk into Handwoven Krama Cloth, Royal Silk Bolts, and Tapestry Wall Hangings.',
    farmSlotOffset: { x: 645, y: 315 },
  },
  village_dairy_churn: {
    id: 'village_dairy_churn',
    name: 'Village Dairy & Dessert Churn',
    khmerName: 'ឆ្នាំងបង្អែម និងទឹកដោះស្រែ',
    icon: '🍮',
    costCoins: 1000,
    primaryColor: '#0369a1',
    accentColor: '#38bdf8',
    heritageNote: 'Slow-simmered Khmer village custard & condensed-milk café craft',
    description:
      'Turns Fresh Milk (Cows), Fresh Eggs (Chickens) & Palm Sugar into Sankya Lapov, Artisan Butter, and Royal Iced Coffee.',
    farmSlotOffset: { x: 730, y: 315 },
  },
};

export const KHMER_ARTISAN_STATION_LIST: ArtisanStationDef[] = Object.values(KHMER_ARTISAN_STATIONS);

export const KHMER_ARTISAN_RECIPES: ArtisanStationRecipe[] = [
  // ---- 1. Kampong Chhnang Pottery Stump ----
  {
    id: 'craft_terracotta_jar',
    stationId: 'kampong_pottery_stump',
    outputItemId: 'artisan_terracotta_jar',
    outputName: 'Terracotta Water Jar',
    khmerName: 'ក្អមដីដាក់ទឹកត្រជាក់',
    icon: '🏺',
    ingredients: [{ itemId: 'mat_krang_clay', label: 'Krang Dei Meas Clay', qty: 1 }],
    durationMs: 2600,
    craftingXp: 45,
    sellCoins: 480,
    decorItemId: 'furn_terracotta_jar',
    description: 'Hand-paddled terracotta jar that naturally cools drinking water. Sellable or placeable as Home Decor!',
  },
  {
    id: 'craft_incense_burner',
    stationId: 'kampong_pottery_stump',
    outputItemId: 'artisan_angkor_incense_burner',
    outputName: 'Angkor Incense Burner',
    khmerName: 'ជើងធូបដីដុតអង្គរ',
    icon: '🪔',
    ingredients: [{ itemId: 'mat_krang_clay', label: 'Krang Dei Meas Clay', qty: 2 }],
    durationMs: 3200,
    craftingXp: 75,
    sellCoins: 980,
    decorItemId: 'furn_incense_burner',
    description: 'Carved laterite-red temple censer fired in wood ash. High-value trade good & Home Decor!',
  },
  {
    id: 'craft_lotus_vase',
    stationId: 'kampong_pottery_stump',
    outputItemId: 'artisan_carved_lotus_vase',
    outputName: 'Carved Lotus Vase',
    khmerName: 'ថូផ្កាឈូកឆ្លាក់ដៃ',
    icon: '🪷',
    ingredients: [
      { itemId: 'mat_krang_clay', label: 'Krang Dei Meas Clay', qty: 2 },
      { itemId: 'crop_pink_lotus', label: 'Pink Lotus', qty: 1 },
    ],
    durationMs: 3800,
    craftingXp: 115,
    sellCoins: 1550,
    decorItemId: 'furn_lotus_vase',
    description: 'Masterwork Kampong Chhnang vase etched with sacred lotus petals. Luxury export & Home Decor!',
  },

  // ---- 2. Khmer Weaving Loom ----
  {
    id: 'craft_handwoven_krama',
    stationId: 'khmer_weaving_loom',
    outputItemId: 'artisan_handwoven_krama',
    outputName: 'Handwoven Krama Cloth',
    khmerName: 'ក្រមាត្បាញដៃខ្មែរ',
    icon: '🧣',
    ingredients: [{ itemId: 'drop_soft_wool', label: 'Soft Wool', qty: 1 }],
    durationMs: 2600,
    craftingXp: 55,
    sellCoins: 620,
    description: 'Crisp checkered village Krama woven on a wooden Khmer treadle loom.',
  },
  {
    id: 'craft_royal_silk_bolt',
    stationId: 'khmer_weaving_loom',
    outputItemId: 'artisan_royal_silk_bolt',
    outputName: 'Royal Silk Bolt',
    khmerName: 'សូត្រហូលរាជវាំង',
    icon: '🎀',
    ingredients: [
      { itemId: 'drop_soft_wool', label: 'Soft Wool', qty: 1 },
      { itemId: 'crop_pink_lotus', label: 'Lotus Silk (Pink Lotus)', qty: 1 },
    ],
    durationMs: 3400,
    craftingXp: 95,
    sellCoins: 1380,
    description: 'Luminous Hol silk spun with sacred lotus fiber — prized by Mekong river merchants!',
  },
  {
    id: 'craft_tapestry_hanging',
    stationId: 'khmer_weaving_loom',
    outputItemId: 'artisan_tapestry_hanging',
    outputName: 'Tapestry Wall Hanging',
    khmerName: 'ផ្ទាំងគំនូរត្បាញព្យួរជញ្ជាំង',
    icon: '🖼️',
    ingredients: [
      { itemId: 'drop_soft_wool', label: 'Soft Wool', qty: 2 },
      { itemId: 'crop_pink_lotus', label: 'Lotus Silk (Pink Lotus)', qty: 1 },
    ],
    durationMs: 4000,
    craftingXp: 130,
    sellCoins: 1850,
    decorItemId: 'furn_krama_tapestry',
    description: 'Intricate Angkor temple-motif wall tapestry. Sell for 1,850 C or hang inside your Stilt House!',
  },

  // ---- 3. Village Dairy & Dessert Churn ----
  {
    id: 'craft_sankya_lapov',
    stationId: 'village_dairy_churn',
    outputItemId: 'artisan_sankya_lapov',
    outputName: 'Sankya Lapov (Pumpkin Custard)',
    khmerName: 'សង្ខ្យាល្ពៅខ្មែរ',
    icon: '🎃',
    ingredients: [
      { itemId: 'drop_fresh_milk', label: 'Fresh Milk', qty: 1 },
      { itemId: 'drop_fresh_egg', label: 'Fresh Egg', qty: 1 },
      { itemId: 'artisan_palm_sugar', label: 'Palm Sugar', qty: 1 },
    ],
    durationMs: 2800,
    craftingXp: 65,
    sellCoins: 820,
    combatBuff: {
      label: '🎃 Sankya Lapov (+12% ATK & Full HP, 10m)',
      durationMs: 10 * 60_000,
      attackPct: 0.12,
      maxHpPct: 0.2,
    },
    description: 'Steamed Khmer pumpkin custard sweetened with palm sugar. Restores 100% HP + strong combat buff!',
  },
  {
    id: 'craft_artisan_butter',
    stationId: 'village_dairy_churn',
    outputItemId: 'artisan_butter',
    outputName: 'Artisan Butter',
    khmerName: 'ប៊័រស្រែធម្មជាតិ',
    icon: '🧈',
    ingredients: [{ itemId: 'drop_fresh_milk', label: 'Fresh Milk', qty: 2 }],
    durationMs: 2400,
    craftingXp: 45,
    sellCoins: 540,
    combatBuff: {
      label: '🧈 Artisan Butter (+10% DEF & Stamina, 8m)',
      durationMs: 8 * 60_000,
      defensePct: 0.1,
    },
    description: 'Rich golden farm-churned butter for gourmet cooking & steady defense stamina.',
  },
  {
    id: 'craft_royal_iced_coffee',
    stationId: 'village_dairy_churn',
    outputItemId: 'artisan_royal_iced_coffee',
    outputName: 'Royal Iced Coffee',
    khmerName: 'កាហ្វេទឹកដោះគោទឹកកករាជវាំង',
    icon: '🧋',
    ingredients: [
      { itemId: 'drop_fresh_milk', label: 'Fresh Milk', qty: 1 },
      { itemId: 'artisan_palm_sugar', label: 'Palm Sugar', qty: 1 },
    ],
    durationMs: 2500,
    craftingXp: 60,
    sellCoins: 680,
    combatBuff: {
      label: '🧋 Royal Iced Coffee (+18% Speed & +8% ATK, 10m)',
      durationMs: 10 * 60_000,
      moveSpeedPct: 0.18,
      attackPct: 0.08,
    },
    description: 'Velvety roasted Khmer iced coffee with sweet condensed milk & palm caramel (+18% Move Speed)!',
  },
];

// ==================== WILDERNESS CAMPFIRE OUTPOSTS ====================

export interface WildernessCampfireDef {
  id: string;
  mapId: 'wild_frontier' | 'tonle_sap_marsh' | 'cardamom_jungle' | 'phnom_kulen' | 'preah_vihear_cliffs';
  label: string;
  khmerLabel: string;
  x: number;
  y: number;
}

export const WILDERNESS_CAMPFIRES: WildernessCampfireDef[] = [
  {
    id: 'camp_wild_frontier',
    mapId: 'wild_frontier',
    label: 'Frontier Scout Campfire',
    khmerLabel: 'ភ្លើងបោះជំរំព្រៃភ្នំ',
    x: 680,
    y: 520,
  },
  {
    id: 'camp_tonle_sap_marsh',
    mapId: 'tonle_sap_marsh',
    label: 'Tonle Sap Boardwalk Campfire',
    khmerLabel: 'ភ្លើងបោះជំរំទន្លេសាប',
    x: 795,
    y: 595,
  },
  {
    id: 'camp_cardamom_jungle',
    mapId: 'cardamom_jungle',
    label: 'Cardamom Ranger Campfire',
    khmerLabel: 'ភ្លើងបោះជំរំភ្នំក្រវាញ',
    x: 795,
    y: 595,
  },
  {
    id: 'camp_phnom_kulen',
    mapId: 'phnom_kulen',
    label: 'Kulen Mountain Campfire',
    khmerLabel: 'ភ្លើងបោះជំរំភ្នំគូលែន',
    x: 700,
    y: 625,
  },
  {
    id: 'camp_preah_vihear_cliffs',
    mapId: 'preah_vihear_cliffs',
    label: 'Preah Vihear Cliff Campfire',
    khmerLabel: 'ភ្លើងបោះជំរំព្រះវិហារ',
    x: 795,
    y: 625,
  },
];

export interface CampfireRecipeDef {
  id: string;
  name: string;
  khmerName: string;
  icon: string;
  ingredientMatch: 'fish' | 'egg' | 'herb';
  ingredientLabel: string;
  buffLabel: string;
  moveSpeedPct: number;
  rareDropLuckPct: number;
  durationMs: number;
  cookingXp: number;
  description: string;
}

export const CAMPFIRE_COOKING_RECIPES: CampfireRecipeDef[] = [
  {
    id: 'camp_grilled_fish',
    name: 'Campfire Grilled Mekong Fish',
    khmerName: 'ត្រីអាំងភ្លើងព្រៃ',
    icon: '🐟',
    ingredientMatch: 'fish',
    ingredientLabel: 'Any Fresh Fish (or 1× Fresh Egg fallback)',
    buffLabel: '🔥 Field Fish (+15% Move Speed, 10m)',
    moveSpeedPct: 0.15,
    rareDropLuckPct: 0.04,
    durationMs: 10 * 60_000,
    cookingXp: 28,
    description: 'Char-grilled over crackling embers — restores 100% HP and grants +15% Move Speed for 10m!',
  },
  {
    id: 'camp_herb_broth',
    name: 'Wild Cardamom Herb Broth',
    khmerName: 'ស៊ុបឱសថព្រៃក្រវាញ',
    icon: '🍵',
    ingredientMatch: 'herb',
    ingredientLabel: 'Any Herb / Crop (Lemongrass, Trakuon, Lotus, Orchid)',
    buffLabel: '🍀 Wild Herb Broth (+10% Rare Drop Luck, 10m)',
    moveSpeedPct: 0.05,
    rareDropLuckPct: 0.1,
    durationMs: 10 * 60_000,
    cookingXp: 32,
    description: 'Fragrant wild herb tonic — restores 100% HP and grants +10% Rare Drop Luck for 10m!',
  },
  {
    id: 'camp_egg_skillet',
    name: 'Ember-Roasted Farm Eggs',
    khmerName: 'ពងមាន់ដុតភ្លើងជំរំ',
    icon: '🍳',
    ingredientMatch: 'egg',
    ingredientLabel: '1× Fresh Egg',
    buffLabel: '⚡ Explorer Skillet (+15% Speed & +10% Luck, 10m)',
    moveSpeedPct: 0.15,
    rareDropLuckPct: 0.1,
    durationMs: 10 * 60_000,
    cookingXp: 35,
    description: 'Hearty field breakfast — restores 100% HP with +15% Move Speed & +10% Rare Drop Luck!',
  },
];

// ==================== 24-BOSS EXPLORER'S JOURNAL & HUNT MISSIONS ====================

export interface BossHuntMissionDef {
  id: string;
  bossId: BossId;
  title: string;
  mapId: string;
  mapLabel: string;
  stepLabel: string;
  targetCount: number;
  rewardHint: string;
}

export const BOSS_HUNT_MISSIONS: BossHuntMissionDef[] = [
  {
    id: 'hunt_yeak_prey',
    bossId: 'yeak_prey',
    title: 'Tracks of the Cardamom Ogre',
    mapId: 'cardamom_jungle',
    mapLabel: 'Cardamom Deep Jungle',
    stepLabel: 'Track Ogre Footprints in Cardamom Jungle',
    targetCount: 5,
    rewardHint: 'Reveals Yeak Prey (#19) & awards +300 Coins!',
  },
  {
    id: 'hunt_preay_teuk',
    bossId: 'preay_teuk',
    title: 'Lanterns of the Flooded Marsh',
    mapId: 'tonle_sap_marsh',
    mapLabel: 'Tonle Sap Marsh',
    stepLabel: 'Inspect Spirit Lanterns along Tonle Sap Boardwalks',
    targetCount: 3,
    rewardHint: 'Reveals Preay Teuk (#18) & awards +280 Coins!',
  },
  {
    id: 'hunt_baksey_meas',
    bossId: 'baksey_meas',
    title: 'Feathers of the Cliff Phoenix',
    mapId: 'preah_vihear_cliffs',
    mapLabel: 'Preah Vihear Cliffs',
    stepLabel: 'Examine Sun Obelisks along Preah Vihear Cliffs',
    targetCount: 4,
    rewardHint: 'Reveals Baksey Meas (#23) & awards +450 Coins!',
  },
  {
    id: 'hunt_garuda',
    bossId: 'garuda',
    title: 'Echoes of Phnom Kulen',
    mapId: 'phnom_kulen',
    mapLabel: 'Phnom Kulen Sanctuary',
    stepLabel: 'Attune Sacred Linga Stones on Phnom Kulen',
    targetCount: 3,
    rewardHint: 'Reveals Garuda (#12) & awards +400 Coins!',
  },
  {
    id: 'hunt_rahu',
    bossId: 'rahu',
    title: 'Eclipse of the Ancient Sanctum',
    mapId: 'temple_district',
    mapLabel: 'Temple District',
    stepLabel: 'Decipher Eclipse Seals around Temple District',
    targetCount: 4,
    rewardHint: 'Reveals Calamity Superboss Rahu (#16) & awards +600 Coins!',
  },
];

export const GRAND_CHRONICLER_TITLE = 'Grand Chronicler of Angkor';
export const GRAND_CHRONICLER_DIAMONDS = 500;
export const GRAND_CHRONICLER_AURA = 'Astral Compass Aura';

export function getBossJournalCondition(boss: KhmerBossDef): {
  conditionBadge: 'Night' | 'Monsoon' | 'Rare Shrine' | 'Mission';
  biomeHint: string;
} {
  const mission = BOSS_HUNT_MISSIONS.find((m) => m.bossId === boss.id);
  if (mission) {
    return {
      conditionBadge: 'Mission',
      biomeHint: `Deep within ${mission.mapLabel}`,
    };
  }
  const mapLabels: Record<string, string> = {
    wild_frontier: 'Wild Frontier Highlands',
    bamboo_forest: 'Misty Bamboo Forest',
    mining_quarry: 'Red Laterite Quarry',
    sunken_ruins: 'Sunken Angkor Ruins',
    temple_district: 'Temple District Sanctum',
    green_park: 'Green Park Mekong Shore',
    phnom_kulen: 'Phnom Kulen Sacred Falls',
    tonle_sap_marsh: 'Tonle Sap Flooded Marsh',
    cardamom_jungle: 'Cardamom Deep Jungle',
    koh_rong_island: 'Koh Rong Coral Coast',
    preah_vihear_cliffs: 'Preah Vihear Cliff Temples',
  };
  const biomeLabel = mapLabels[boss.homeMapId ?? ''] ?? boss.biomeName;
  if (boss.id === 'arp_prey_chrov' || boss.id === 'khmouch_chheam_prey' || boss.id === 'khmouch_daeum_chek') {
    return { conditionBadge: 'Night', biomeHint: `Deep within ${biomeLabel}` };
  }
  if (boss.id === 'kropeu_neang_kheng' || boss.id === 'neak_reach' || boss.id === 'maccha_tep') {
    return { conditionBadge: 'Monsoon', biomeHint: `Deep within ${biomeLabel}` };
  }
  return { conditionBadge: 'Rare Shrine', biomeHint: `Deep within ${biomeLabel}` };
}
