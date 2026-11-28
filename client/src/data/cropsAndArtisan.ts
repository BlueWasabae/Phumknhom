import type { ItemRarity } from '@shared/types';

export interface CropDefinition {
  id: string;
  tier: 'T1' | 'T2' | 'T3';
  name: string;
  khmerName: string;
  seedItemId: string;
  harvestItemId: string;
  seedCost: number;
  growSeconds: number;
  sellPrice: number;
  farmXp: number;
  primaryUse: string;
  stageColors: [string, string, string, string];
}

export interface FruitTreeDefinition {
  id: string;
  name: string;
  khmerName: string;
  costCoins: number;
  initialGrowSeconds: number;
  cooldownSeconds: number;
  outputItemId: string;
  outputQuantity: number;
  farmXp: number;
  canopyColor: string;
  fruitColor: string;
  description: string;
}

export interface LivestockDefinition {
  id: string;
  name: string;
  khmerName: string;
  costCoins: number;
  cooldownSeconds: number;
  outputItemId: string;
  bonusItemId?: string;
  farmXp: number;
  bodyColor: string;
  accentColor: string;
  description: string;
}

export interface ArtisanRecipe {
  id: string;
  machineId: string;
  inputItemId: string;
  outputItemId: string;
  durationSeconds: number;
  farmXp: number;
  label: string;
}

export interface ArtisanMachineDefinition {
  id: string;
  name: string;
  khmerName: string;
  costCoins: number;
  primaryColor: string;
  accentColor: string;
  description: string;
}

export interface FarmItemMeta {
  id: string;
  name: string;
  khmerName: string;
  kind: 'seed' | 'fertilizer' | 'crop' | 'tree_fruit' | 'livestock_drop' | 'artisan';
  rarity: ItemRarity;
  buyCoins?: number;
  sellCoins?: number;
  primaryColor: string;
  description: string;
  cropId?: string;
}

export const PLOT_UNLOCK_COST = 250;
export const FERTILIZER_COST = 200;

/**
 * Exact 6 Row Crops from docs/GDD_CONTENT_AND_ECONOMY.md §1
 */
export const ROW_CROPS: Record<string, CropDefinition> = {
  trakuon: {
    id: 'trakuon',
    tier: 'T1',
    name: 'Trakuon',
    khmerName: 'ត្រកួន (Water Morning Glory)',
    seedItemId: 'seed_trakuon',
    harvestItemId: 'crop_trakuon',
    seedCost: 14,
    growSeconds: 210, // Hardcore Economy (~1.75x)
    sellPrice: 18,    // -30% base vendor sell price
    farmXp: 12,
    primaryUse: 'Basic HP Snacks, Starter Quests, Pickles',
    stageColors: ['#86efac', '#4ade80', '#22c55e', '#15803d'],
  },
  slek_krey: {
    id: 'slek_krey',
    tier: 'T1',
    name: 'Slek Krey',
    khmerName: 'ស្លឹកគ្រៃ (Lemongrass)',
    seedItemId: 'seed_slek_krey',
    harvestItemId: 'crop_slek_krey',
    seedCost: 35,
    growSeconds: 510,
    sellPrice: 42,
    farmXp: 24,
    primaryUse: 'Anti-Poison Elixirs, Soup Base',
    stageColors: ['#bef264', '#84cc16', '#65a30d', '#3f6212'],
  },
  phka_rumduol: {
    id: 'phka_rumduol',
    tier: 'T2',
    name: 'Phka Rumduol',
    khmerName: 'ស្រូវផ្ការំដួល (Jasmine Rice)',
    seedItemId: 'seed_phka_rumduol',
    harvestItemId: 'crop_phka_rumduol',
    seedCost: 85,
    growSeconds: 1500,
    sellPrice: 105,
    farmXp: 45,
    primaryUse: 'Rice Mill Flour/Noodles, Num Pang, Pet Food',
    stageColors: ['#bef264', '#a3e635', '#facc15', '#eab308'],
  },
  mtes: {
    id: 'mtes',
    tier: 'T2',
    name: 'Mtes',
    khmerName: 'ម្ទេសក្រហម (Red Chili)',
    seedItemId: 'seed_mtes',
    harvestItemId: 'crop_mtes',
    seedCost: 165,
    growSeconds: 2400,
    sellPrice: 210,
    farmXp: 70,
    primaryUse: 'Attack Buff Skewers, Fire Potions, Spicy Prahok',
    stageColors: ['#86efac', '#4ade80', '#fb923c', '#dc2626'],
  },
  pink_lotus: {
    id: 'pink_lotus',
    tier: 'T3',
    name: 'Pink Lotus',
    khmerName: 'ផ្កាឈូក (Sacred Lotus)',
    seedItemId: 'seed_pink_lotus',
    harvestItemId: 'crop_pink_lotus',
    seedCost: 420,
    growSeconds: 4500,
    sellPrice: 525,
    farmXp: 120,
    primaryUse: 'Spirit Keg Elixirs, Mana Teas, Magic Staffs',
    stageColors: ['#86efac', '#34d399', '#f9a8d4', '#ec4899'],
  },
  kampot_pepper: {
    id: 'kampot_pepper',
    tier: 'T3',
    name: 'Kampot Pepper',
    khmerName: 'ម្រេចកំពត (Kampot Pepper)',
    seedItemId: 'seed_kampot_pepper',
    harvestItemId: 'crop_kampot_pepper',
    seedCost: 840,
    growSeconds: 9000,
    sellPrice: 1120,
    farmXp: 220,
    primaryUse: 'Elite Boss Buff Meals, High Coin Export',
    stageColors: ['#86efac', '#16a34a', '#b91c1c', '#7f1d1d'],
  },
};

export const ROW_CROP_LIST = Object.values(ROW_CROPS);

/**
 * Perennial Fruit Trees (Plant Once, Harvest Forever) — docs/GDD_CONTENT_AND_ECONOMY.md §1
 */
export const FRUIT_TREES: Record<string, FruitTreeDefinition> = {
  coconut_palm: {
    id: 'coconut_palm',
    name: 'Coconut Palm',
    khmerName: 'ដើមដូង',
    costCoins: 2000,
    initialGrowSeconds: 7200,
    cooldownSeconds: 3600,
    outputItemId: 'fruit_coconut',
    outputQuantity: 2,
    farmXp: 55,
    canopyColor: '#16a34a',
    fruitColor: '#84cc16',
    description: 'Yields 2x Fresh Coconut every 60 min (Poison Cure + Instant Heal).',
  },
  sugar_palm: {
    id: 'sugar_palm',
    name: 'Sugar Palm (Tnot)',
    khmerName: 'ដើមត្នោត',
    costCoins: 5000,
    initialGrowSeconds: 14400,
    cooldownSeconds: 5400,
    outputItemId: 'fruit_palm_sap',
    outputQuantity: 2,
    farmXp: 90,
    canopyColor: '#15803d',
    fruitColor: '#ca8a04',
    description: 'Yields 2x Palm Sap every 90 min for Palm Sugar Boiler & Kafé speed buffs.',
  },
  mango_tree: {
    id: 'mango_tree',
    name: 'Mango Tree',
    khmerName: 'ដើមស្វាយ',
    costCoins: 10000,
    initialGrowSeconds: 21600,
    cooldownSeconds: 7200,
    outputItemId: 'fruit_mango',
    outputQuantity: 2,
    farmXp: 140,
    canopyColor: '#22c55e',
    fruitColor: '#facc15',
    description: 'Yields 2x Sweet Mango every 2 hours for Crit Desserts & Fruit Wine.',
  },
  golden_durian_tree: {
    id: 'golden_durian_tree',
    name: 'Golden Durian Tree',
    khmerName: 'ដើមធូរេនមាស',
    costCoins: 25000,
    initialGrowSeconds: 28800,
    cooldownSeconds: 10800,
    outputItemId: 'fruit_golden_durian',
    outputQuantity: 1,
    farmXp: 260,
    canopyColor: '#4d7c0f',
    fruitColor: '#eab308',
    description: 'Yields 1x Golden Durian every 3 hours (Endgame Raid Food + Secret Boss Trigger).',
  },
};

export const FRUIT_TREE_LIST = Object.values(FRUIT_TREES);

/**
 * Farm Livestock — docs/GDD_CONTENT_AND_ECONOMY.md §1
 */
export const LIVESTOCK: Record<string, LivestockDefinition> = {
  village_chicken: {
    id: 'village_chicken',
    name: 'Village Chicken',
    khmerName: 'មាន់ស្រែ',
    costCoins: 1500,
    cooldownSeconds: 1200,
    outputItemId: 'drop_fresh_egg',
    farmXp: 30,
    bodyColor: '#fef9c3',
    accentColor: '#ef4444',
    description: 'Drops Fresh Eggs every 20 min for bakery & Num Pang snacks.',
  },
  water_buffalo: {
    id: 'water_buffalo',
    name: 'Water Buffalo',
    khmerName: 'ក្របីស្រែ',
    costCoins: 8000,
    cooldownSeconds: 2700,
    outputItemId: 'drop_fresh_milk',
    bonusItemId: 'fertilizer',
    farmXp: 75,
    bodyColor: '#475569',
    accentColor: '#e2e8f0',
    description: 'Produces Fresh Milk & Rich Fertilizer every 45 min.',
  },
  golden_silk_moth: {
    id: 'golden_silk_moth',
    name: 'Golden Silk Moth',
    khmerName: 'ដង្កូវនាងមាស',
    costCoins: 18000,
    cooldownSeconds: 7200,
    outputItemId: 'drop_silk_thread',
    farmXp: 160,
    bodyColor: '#fde047',
    accentColor: '#f59e0b',
    description: 'Produces Golden Silk Threads every 2 hours for luxury Plaza outfits.',
  },
};

export const LIVESTOCK_LIST = Object.values(LIVESTOCK);

/**
 * 4 Starter Artisan Processing Machines — docs/GDD_OPEN_WORLD_EXPANSION.md §3.2
 */
export const ARTISAN_MACHINES: Record<string, ArtisanMachineDefinition> = {
  rice_mill: {
    id: 'rice_mill',
    name: 'Rice Mill',
    khmerName: 'ម៉ាស៊ីនកិនស្រូវ',
    costCoins: 600,
    primaryColor: '#a16207',
    accentColor: '#fef3c7',
    description: 'Grinds Phka Rumduol Jasmine Rice into Fine Rice Flour / Noodles (2.5x value).',
  },
  palm_boiler: {
    id: 'palm_boiler',
    name: 'Palm Sugar Boiler',
    khmerName: 'ឆ្នាំងរម្ងាស់ស្ករត្នោត',
    costCoins: 900,
    primaryColor: '#78350f',
    accentColor: '#f59e0b',
    description: 'Boils Sugar Palm Sap into Caramelized Palm Sugar.',
  },
  ferment_jar: {
    id: 'ferment_jar',
    name: 'Fermentation Clay Jar',
    khmerName: 'ពាងប្រហុក និងជ្រក់',
    costCoins: 750,
    primaryColor: '#9a3412',
    accentColor: '#fb923c',
    description: 'Ferments Trakuon, Slek Krey, or Mtes into Artisan Pickles & Royal Prahok.',
  },
  spirit_keg: {
    id: 'spirit_keg',
    name: 'Lotus & Spirit Keg',
    khmerName: 'ធុងបន្ទុំទឹកផ្កាឈូក',
    costCoins: 1400,
    primaryColor: '#6b21a8',
    accentColor: '#f472b6',
    description: 'Brews Pink Lotus, Sweet Mango, or Golden Durian into Spirit Elixirs & Fruit Wine.',
  },
};

export const ARTISAN_MACHINE_LIST = Object.values(ARTISAN_MACHINES);

export const ARTISAN_RECIPES: ArtisanRecipe[] = [
  {
    id: 'rec_rice_flour',
    machineId: 'rice_mill',
    inputItemId: 'crop_phka_rumduol',
    outputItemId: 'artisan_rice_noodles',
    durationSeconds: 90,
    farmXp: 35,
    label: 'Jasmine Rice → Fine Rice Flour / Noodles',
  },
  {
    id: 'rec_palm_sugar',
    machineId: 'palm_boiler',
    inputItemId: 'fruit_palm_sap',
    outputItemId: 'artisan_palm_sugar',
    durationSeconds: 120,
    farmXp: 45,
    label: 'Palm Sap → Caramelized Palm Sugar',
  },
  {
    id: 'rec_pickles_trakuon',
    machineId: 'ferment_jar',
    inputItemId: 'crop_trakuon',
    outputItemId: 'artisan_pickles',
    durationSeconds: 60,
    farmXp: 20,
    label: 'Trakuon → Artisan Pickles',
  },
  {
    id: 'rec_prahok_chili',
    machineId: 'ferment_jar',
    inputItemId: 'crop_mtes',
    outputItemId: 'artisan_royal_prahok',
    durationSeconds: 150,
    farmXp: 65,
    label: 'Red Chili → Royal Prahok',
  },
  {
    id: 'rec_lotus_elixir',
    machineId: 'spirit_keg',
    inputItemId: 'crop_pink_lotus',
    outputItemId: 'artisan_spirit_elixir',
    durationSeconds: 180,
    farmXp: 95,
    label: 'Pink Lotus → Spirit Elixir',
  },
  {
    id: 'rec_mango_wine',
    machineId: 'spirit_keg',
    inputItemId: 'fruit_mango',
    outputItemId: 'artisan_fruit_wine',
    durationSeconds: 180,
    farmXp: 110,
    label: 'Sweet Mango → Aged Fruit Wine',
  },
  // Update 1.6 — Raid-Tier Spirit Elixirs brewed from Spirit-Infused Crops!
  {
    id: 'rec_elixir_naga',
    machineId: 'spirit_keg',
    inputItemId: 'crop_spirit_jasmine_rice',
    outputItemId: 'elixir_naga',
    durationSeconds: 150,
    farmXp: 165,
    label: '✨ Spirit Jasmine Rice → Elixir of the Naga (+30% HP, +10% Lifesteal)',
  },
  {
    id: 'rec_elixir_angkor_fury',
    machineId: 'spirit_keg',
    inputItemId: 'crop_inferno_kampot_pepper',
    outputItemId: 'elixir_angkor_fury',
    durationSeconds: 180,
    farmXp: 210,
    label: '🔥 Inferno Kampot Pepper → Angkor Fury Brew (+35% DMG, +20% Crit)',
  },
  {
    id: 'rec_elixir_celestial_lotus',
    machineId: 'spirit_keg',
    inputItemId: 'crop_celestial_pink_lotus',
    outputItemId: 'elixir_celestial_lotus',
    durationSeconds: 180,
    farmXp: 195,
    label: '🪷 Celestial Pink Lotus → Celestial Lotus Draught (+25% Spd, +50% Energy, Poison Immune)',
  },
];

/**
 * Unified lookup of all Farm Seeds, Fertilizer, Produce, Tree Fruits, Livestock Drops & Artisan Goods
 */
export const FARM_ITEMS: Record<string, FarmItemMeta> = {
  // Fertilizer
  fertilizer: {
    id: 'fertilizer',
    name: 'Rich Fertilizer',
    khmerName: 'ជីធម្មជាតិ',
    kind: 'fertilizer',
    rarity: 'uncommon',
    buyCoins: FERTILIZER_COST,
    sellCoins: 75,
    primaryColor: '#854d0e',
    description: 'Gives a 20% chance to harvest a Gold-Star crop (1.5x Coins & +60s buff duration).',
  },
  // Seeds
  seed_trakuon: {
    id: 'seed_trakuon',
    name: 'Trakuon Seeds',
    khmerName: 'គ្រាប់ត្រកួន',
    kind: 'seed',
    rarity: 'common',
    buyCoins: 10,
    sellCoins: 5,
    primaryColor: '#4ade80',
    description: 'Grows in 2 min. Sells for 25 Coins.',
    cropId: 'trakuon',
  },
  seed_slek_krey: {
    id: 'seed_slek_krey',
    name: 'Slek Krey Seeds',
    khmerName: 'គ្រាប់ស្លឹកគ្រៃ',
    kind: 'seed',
    rarity: 'common',
    buyCoins: 25,
    sellCoins: 10,
    primaryColor: '#84cc16',
    description: 'Lemongrass. Grows in 5 min. Sells for 60 Coins.',
    cropId: 'slek_krey',
  },
  seed_phka_rumduol: {
    id: 'seed_phka_rumduol',
    name: 'Phka Rumduol Seeds',
    khmerName: 'គ្រាប់ស្រូវផ្ការំដួល',
    kind: 'seed',
    rarity: 'uncommon',
    buyCoins: 60,
    sellCoins: 25,
    primaryColor: '#facc15',
    description: 'Jasmine Rice. Grows in 15 min. Sells for 150 Coins.',
    cropId: 'phka_rumduol',
  },
  seed_mtes: {
    id: 'seed_mtes',
    name: 'Mtes Chili Seeds',
    khmerName: 'គ្រាប់ម្ទេស',
    kind: 'seed',
    rarity: 'uncommon',
    buyCoins: 120,
    sellCoins: 50,
    primaryColor: '#ef4444',
    description: 'Red Chili. Grows in 25 min. Sells for 300 Coins.',
    cropId: 'mtes',
  },
  seed_pink_lotus: {
    id: 'seed_pink_lotus',
    name: 'Pink Lotus Seeds',
    khmerName: 'គ្រាប់ផ្កាឈូក',
    kind: 'seed',
    rarity: 'rare',
    buyCoins: 300,
    sellCoins: 120,
    primaryColor: '#ec4899',
    description: 'Sacred Pink Lotus. Grows in 45 min. Sells for 750 Coins.',
    cropId: 'pink_lotus',
  },
  seed_kampot_pepper: {
    id: 'seed_kampot_pepper',
    name: 'Kampot Pepper Seeds',
    khmerName: 'គ្រាប់ម្រេចកំពត',
    kind: 'seed',
    rarity: 'epic',
    buyCoins: 600,
    sellCoins: 250,
    primaryColor: '#991b1b',
    description: 'Prized Kampot Pepper. Grows in 90 min. Sells for 1,600 Coins.',
    cropId: 'kampot_pepper',
  },
  // Harvested Row Crops
  crop_trakuon: {
    id: 'crop_trakuon',
    name: 'Fresh Trakuon',
    khmerName: 'ត្រកួនស្រស់',
    kind: 'crop',
    rarity: 'common',
    sellCoins: 25,
    primaryColor: '#22c55e',
    description: 'Crisp water morning glory. Sell or ferment into Artisan Pickles.',
  },
  item_pet_xp_treat: {
    id: 'item_pet_xp_treat',
    name: 'Champion Pet XP Treat',
    khmerName: 'នំសត្វចិញ្ចឹមពិសេស',
    kind: 'artisan',
    rarity: 'rare',
    sellCoins: 90,
    primaryColor: '#f59e0b',
    description: 'Village Pet Track reward treat — feed to any pet in Pet Evolution for +450 Pet XP!',
  },
  crop_slek_krey: {
    id: 'crop_slek_krey',
    name: 'Slek Krey Stalk',
    khmerName: 'គល់ស្លឹកគ្រៃ',
    kind: 'crop',
    rarity: 'common',
    sellCoins: 60,
    primaryColor: '#65a30d',
    description: 'Aromatic Cambodian lemongrass.',
  },
  crop_phka_rumduol: {
    id: 'crop_phka_rumduol',
    name: 'Phka Rumduol Rice',
    khmerName: 'ស្រូវផ្ការំដួល',
    kind: 'crop',
    rarity: 'uncommon',
    sellCoins: 150,
    primaryColor: '#eab308',
    description: 'Fragrant jasmine rice. Process in Rice Mill for 380 Coins!',
  },
  crop_mtes: {
    id: 'crop_mtes',
    name: 'Mtes Red Chili',
    khmerName: 'ម្ទេសក្រហម',
    kind: 'crop',
    rarity: 'uncommon',
    sellCoins: 300,
    primaryColor: '#dc2626',
    description: 'Fiery red chili. Ferment into Royal Prahok!',
  },
  crop_pink_lotus: {
    id: 'crop_pink_lotus',
    name: 'Pink Lotus Blossom',
    khmerName: 'ផ្កាឈូកស្រស់',
    kind: 'crop',
    rarity: 'rare',
    sellCoins: 750,
    primaryColor: '#ec4899',
    description: 'Radiant lotus petals. Brew in Spirit Keg for 1,950 Coins!',
  },
  crop_kampot_pepper: {
    id: 'crop_kampot_pepper',
    name: 'Kampot Peppercorns',
    khmerName: 'ម្រេចកំពត',
    kind: 'crop',
    rarity: 'epic',
    sellCoins: 1600,
    primaryColor: '#7f1d1d',
    description: 'World-famous Kampot pepper prized by master chefs.',
  },
  // Tree Fruits
  fruit_coconut: {
    id: 'fruit_coconut',
    name: 'Fresh Coconut',
    khmerName: 'ដូងស្រស់',
    kind: 'tree_fruit',
    rarity: 'uncommon',
    sellCoins: 95,
    primaryColor: '#16a34a',
    description: 'Refreshing green coconut used in Anti-Venom elixirs.',
  },
  fruit_palm_sap: {
    id: 'fruit_palm_sap',
    name: 'Sugar Palm Sap',
    khmerName: 'ទឹកត្នោតផ្អែម',
    kind: 'tree_fruit',
    rarity: 'uncommon',
    sellCoins: 185,
    primaryColor: '#d97706',
    description: 'Sweet Tnot sap. Boil in Palm Sugar Boiler for Caramelized Palm Sugar!',
  },
  fruit_mango: {
    id: 'fruit_mango',
    name: 'Sweet Mango',
    khmerName: 'ស្វាយទុំ',
    kind: 'tree_fruit',
    rarity: 'rare',
    sellCoins: 360,
    primaryColor: '#facc15',
    description: 'Sun-ripened Cambodian mango. Brew into Aged Fruit Wine!',
  },
  fruit_golden_durian: {
    id: 'fruit_golden_durian',
    name: 'Golden Durian',
    khmerName: 'ធូរេនមាស',
    kind: 'tree_fruit',
    rarity: 'legendary',
    sellCoins: 1400,
    primaryColor: '#eab308',
    description: 'King of fruits for Golden Durian Feasts & Secret Boss rituals.',
  },
  // Livestock Drops
  drop_fresh_egg: {
    id: 'drop_fresh_egg',
    name: 'Fresh Farm Egg',
    khmerName: 'ពងមាន់ស្រែ',
    kind: 'livestock_drop',
    rarity: 'common',
    sellCoins: 115,
    primaryColor: '#fef3c7',
    description: 'Laid by your Village Chicken. Core Num Pang bakery ingredient.',
  },
  drop_fresh_milk: {
    id: 'drop_fresh_milk',
    name: 'Fresh Buffalo Milk',
    khmerName: 'ទឹកដោះគោស្រស់',
    kind: 'livestock_drop',
    rarity: 'rare',
    sellCoins: 340,
    primaryColor: '#f8fafc',
    description: 'Rich creamy milk for Kafé Tek Dos Ko & Durian Feasts.',
  },
  drop_silk_thread: {
    id: 'drop_silk_thread',
    name: 'Golden Silk Thread',
    khmerName: 'សរសៃសូត្រមាស',
    kind: 'livestock_drop',
    rarity: 'epic',
    sellCoins: 680,
    primaryColor: '#fde047',
    description: 'Shimmering golden thread spun by Silk Moths for royal outfits.',
  },
  // Artisan Goods (2x - 5x value multipliers!)
  artisan_rice_noodles: {
    id: 'artisan_rice_noodles',
    name: 'Fine Rice Noodles',
    khmerName: 'នំបញ្ចុក / ម្សៅអង្ករ',
    kind: 'artisan',
    rarity: 'rare',
    sellCoins: 380,
    primaryColor: '#fef9c3',
    description: 'Milled Phka Rumduol rice flour & noodles (2.5x value).',
  },
  artisan_palm_sugar: {
    id: 'artisan_palm_sugar',
    name: 'Caramelized Palm Sugar',
    khmerName: 'ស្ករត្នោតធម្មជាតិ',
    kind: 'artisan',
    rarity: 'rare',
    sellCoins: 460,
    primaryColor: '#b45309',
    description: 'Slow-boiled aromatic Kampong Speu palm sugar.',
  },
  artisan_pickles: {
    id: 'artisan_pickles',
    name: 'Artisan Khmer Pickles',
    khmerName: 'ជ្រក់ត្រកួន',
    kind: 'artisan',
    rarity: 'uncommon',
    sellCoins: 85,
    primaryColor: '#4ade80',
    description: 'Tangy fermented village pickles (3.4x raw Trakuon value).',
  },
  artisan_royal_prahok: {
    id: 'artisan_royal_prahok',
    name: 'Royal Spiced Prahok',
    khmerName: 'ប្រហុកគ្រឿងរាជវាំង',
    kind: 'artisan',
    rarity: 'epic',
    sellCoins: 820,
    primaryColor: '#9a3412',
    description: 'High-value gourmet delicacy granting sturdy defense in raids.',
  },
  artisan_spirit_elixir: {
    id: 'artisan_spirit_elixir',
    name: 'Lotus Spirit Elixir',
    khmerName: 'ទឹកមន្តផ្កាឈូក',
    kind: 'artisan',
    rarity: 'epic',
    sellCoins: 1950,
    primaryColor: '#ec4899',
    description: 'Distilled Pink Lotus arcane elixir (2.6x value).',
  },
  artisan_fruit_wine: {
    id: 'artisan_fruit_wine',
    name: 'Aged Mango Fruit Wine',
    khmerName: 'ស្រាស្វាយបន្ទុំ',
    kind: 'artisan',
    rarity: 'legendary',
    sellCoins: 1150,
    primaryColor: '#f59e0b',
    description: 'Rich artisan mango wine prized across Central Plaza.',
  },
  // Phase 5 Boss Materials & Dungeon Seeds
  drop_slime_core: {
    id: 'drop_slime_core',
    name: 'Slime Core',
    khmerName: 'គ្រាប់រំអិលស្តេចកង្កែប',
    kind: 'artisan',
    rarity: 'uncommon',
    sellCoins: 95,
    primaryColor: '#4ade80',
    description: 'Glowing emerald slime core dropped by Sdech Kongkaeb (King Frog).',
  },
  drop_stone_core: {
    id: 'drop_stone_core',
    name: 'Stone Core',
    khmerName: 'គ្រាប់ថ្មយក្សប្រាសាទ',
    kind: 'artisan',
    rarity: 'rare',
    sellCoins: 240,
    primaryColor: '#a8a29e',
    description: 'Ancient sandstone relic core dropped by Yeak Thmor (Stone Yaksha).',
  },
  seed_spirit_bamboo: {
    id: 'seed_spirit_bamboo',
    name: 'Spirit Bamboo Seed',
    khmerName: 'គ្រាប់ឫស្សីបារមី',
    kind: 'seed',
    rarity: 'epic',
    sellCoins: 850,
    primaryColor: '#34d399',
    description: 'Rare T4 dungeon-loot seed dropped by Yeak Thmor for endgame weapon upgrades.',
  },
  // Phase 8 Riverside Fishing Catches & Dungeon Keys
  fish_mekong_catfish: {
    id: 'fish_mekong_catfish',
    name: 'Mekong Catfish',
    khmerName: 'ត្រីប្រាទន្លេមេគង្គ',
    kind: 'crop',
    rarity: 'common',
    sellCoins: 85,
    primaryColor: '#38bdf8',
    description: 'Plump freshwater Mekong catfish caught at Riverside Pier. Used in the River Altar!',
  },
  fish_silver_carp: {
    id: 'fish_silver_carp',
    name: 'Silver Carp',
    khmerName: 'ត្រីរៀលប្រាក់',
    kind: 'crop',
    rarity: 'uncommon',
    sellCoins: 145,
    primaryColor: '#94a3b8',
    description: 'Gleaming silver river carp prized for Khmer soup bases and River Altar offerings.',
  },
  fish_golden_lotus_koi: {
    id: 'fish_golden_lotus_koi',
    name: 'Golden Lotus Koi',
    khmerName: 'ត្រីគល់រាំងមាស',
    kind: 'crop',
    rarity: 'rare',
    sellCoins: 420,
    primaryColor: '#facc15',
    description: 'Rare radiant lotus-scaled carp swimming deep near the Riverside reeds.',
  },
  drop_stone_key: {
    id: 'drop_stone_key',
    name: 'Ancient Stone Key',
    khmerName: 'សោថ្មប្រាសាទបុរាណ',
    kind: 'artisan',
    rarity: 'epic',
    sellCoins: 600,
    primaryColor: '#d97706',
    description: 'Sunken Angkorian temple key fished from river depths. Accepted by the Blacksmith Altar.',
  },
  // Phase 9 Boss Drops (Arp Prey Chrov & Neak Reach)
  drop_spirit_orb: {
    id: 'drop_spirit_orb',
    name: 'Spirit Ember Orb',
    khmerName: 'ដួងភ្លើងអាបព្រៃជ្រៅ',
    kind: 'artisan',
    rarity: 'rare',
    sellCoins: 185,
    primaryColor: '#10b981',
    description: 'Bioluminescent ghostly ember dropped by Arp Prey Chrov in the Dark Bamboo Woods.',
  },
  drop_naga_scale: {
    id: 'drop_naga_scale',
    name: 'Shadow Naga Scale',
    khmerName: 'ស្រកានាគរាជ',
    kind: 'artisan',
    rarity: 'epic',
    sellCoins: 340,
    primaryColor: '#a855f7',
    description: 'Iridescent violet-emerald serpent scale dropped by Neak Reach (Shadow Naga).',
  },
  // Update 1.1A Travel Relic
  tool_magic_mirror: {
    id: 'tool_magic_mirror',
    name: 'Magic Mirror',
    khmerName: 'កញ្ចក់វេទមន្តត្រឡប់ផ្ទះ',
    kind: 'artisan',
    rarity: 'rare',
    sellCoins: 0,
    primaryColor: '#38bdf8',
    description: 'Gaze into this Angkorian mirror to warp straight back to your Personal Farm & Stilt Home! (Disabled during active Boss fights.)',
  },
  // Update 1.3A Cavern Ores, Reforge Stones & Cavern Essence
  ore_laterite: {
    id: 'ore_laterite',
    name: 'Laterite Ore',
    khmerName: 'រ៉ែថ្មបាយក្រៀម',
    kind: 'artisan',
    rarity: 'uncommon',
    sellCoins: 45,
    primaryColor: '#c2410c',
    description: 'Iron-rich Khmer laterite ore mined inside Underground Caverns. Used to forge Laterite Miner Armor & Wind-Walker Boots.',
  },
  ore_jade_crystal: {
    id: 'ore_jade_crystal',
    name: 'Jade Crystal',
    khmerName: 'គ្រីស្តាល់ថ្មមរកត',
    kind: 'artisan',
    rarity: 'rare',
    sellCoins: 95,
    primaryColor: '#10b981',
    description: 'Luminous emerald cave crystal used at the Blacksmith to fuse Sovereign Aegis Charm & Naga Scale Armor.',
  },
  ore_angkor_gold: {
    id: 'ore_angkor_gold',
    name: 'Angkor Gold',
    khmerName: 'មាសអង្គរបុរាណ',
    kind: 'artisan',
    rarity: 'epic',
    sellCoins: 185,
    primaryColor: '#facc15',
    description: 'Pure deep-vein Khmer temple gold ore used to fuse Angkor Phantom Stride & endgame Combat Armor Sets.',
  },
  mat_reforge_stone: {
    id: 'mat_reforge_stone',
    name: 'Reforge Stone',
    khmerName: 'ថ្មពង្រឹងអាវុធ',
    kind: 'artisan',
    rarity: 'rare',
    sellCoins: 120,
    primaryColor: '#38bdf8',
    description: 'Glowing whetstone discovered in hidden Cavern Relic Chests. Valued by Master Somnang at the Blacksmith.',
  },
  item_jarred_firefly: {
    id: 'item_jarred_firefly',
    name: 'Jarred Firefly',
    khmerName: 'អំពិលអំពែកក្នុងដប',
    kind: 'artisan',
    rarity: 'uncommon',
    sellCoins: 45,
    primaryColor: '#a3e635',
    description:
      'Gently glowing Khmer firefly caught during Firefly Night in Green Park or Bamboo Forest. Combine 3× in House/Yard Decor to craft glowing Firefly Garden Lanterns!',
  },
  drop_cavern_essence: {
    id: 'drop_cavern_essence',
    name: 'Cavern Spirit Essence',
    khmerName: 'ព្រលឹងរូងភ្នំ',
    kind: 'artisan',
    rarity: 'uncommon',
    sellCoins: 65,
    primaryColor: '#c084fc',
    description: 'Shimmering subterranean essence dropped by wandering cavern beasts.',
  },
  // Update 1.3B Rithy 6-Heart Gift
  tool_master_bamboo_rod: {
    id: 'tool_master_bamboo_rod',
    name: 'Master Bamboo Rod',
    khmerName: 'ដងសន្ទូចឫស្សីឯក',
    kind: 'artisan',
    rarity: 'epic',
    sellCoins: 0,
    primaryColor: '#22c55e',
    description: 'Prized hand-lacquered bamboo fishing rod gifted by Rithy at 6 Hearts. Widens your Riverside Fishing catch zone!',
  },
  // Update 1.4 Dynamic World Event & Angkor Relic Museum Collectibles
  mat_eclipse_shard: {
    id: 'mat_eclipse_shard',
    name: 'Eclipse Shard',
    khmerName: 'បំណែកសូរ្យគ្រាស',
    kind: 'artisan',
    rarity: 'epic',
    sellCoins: 140,
    primaryColor: '#dc2626',
    description: 'Crystallized crimson eclipse fragment dropped by Shadow Spirits during Crimson Eclipse. Empower weapons at Master Somnang Blacksmith!',
  },
  relic_sandstone_apsara: {
    id: 'relic_sandstone_apsara',
    name: 'Sandstone Apsara',
    khmerName: 'ចម្លាក់អប្សរាថ្មភក់',
    kind: 'artisan',
    rarity: 'rare',
    sellCoins: 180,
    primaryColor: '#f59e0b',
    description: 'Carved 12th-century Angkor sandstone Apsara sculpture. Donate to the Angkor Relic Museum!',
  },
  relic_jade_naga_seal: {
    id: 'relic_jade_naga_seal',
    name: 'Jade Naga Seal',
    khmerName: 'ត្រានាគថ្មគជ់',
    kind: 'artisan',
    rarity: 'epic',
    sellCoins: 240,
    primaryColor: '#10b981',
    description: 'Imperial seven-headed emerald Naga temple seal mined in deep caverns. Donate to the Angkor Relic Museum!',
  },
  relic_bronze_angkor_bell: {
    id: 'relic_bronze_angkor_bell',
    name: 'Bronze Angkor Bell',
    khmerName: 'ជួងសំរិទ្ធអង្គរ',
    kind: 'artisan',
    rarity: 'epic',
    sellCoins: 260,
    primaryColor: '#eab308',
    description: 'Resonant ceremonial bronze Angkorian temple bell found in gold veins & Relic Chests. Donate to the Museum!',
  },
  relic_laterite_core: {
    id: 'relic_laterite_core',
    name: 'Laterite Core',
    khmerName: 'ស្នូលថ្មបាយក្រៀម',
    kind: 'artisan',
    rarity: 'uncommon',
    sellCoins: 140,
    primaryColor: '#ea580c',
    description: 'Dense volcanic-iron Khmer laterite core unearthed while mining. Donate to the Angkor Relic Museum!',
  },
  fish_sunken_coin_pouch: {
    id: 'fish_sunken_coin_pouch',
    name: 'Sunken Coin Pouch',
    khmerName: 'ថង់ប្រាក់លិចទឹក',
    kind: 'artisan',
    rarity: 'uncommon',
    sellCoins: 120,
    primaryColor: '#d97706',
    description: 'Antique silk merchant satchel fished up from the Mekong river silt. Donate to the Angkor Relic Museum!',
  },
  // Update 1.6 — Boss Essences for Spirit-Infused Farming
  essence_slime: {
    id: 'essence_slime',
    name: 'Slime Essence',
    khmerName: 'បារមីស្តេចកង្កែប',
    kind: 'artisan',
    rarity: 'rare',
    sellCoins: 160,
    primaryColor: '#22d3ee',
    description: 'Luminous emerald-cyan essence dropped by Sdech Kongkaeb & Pagoda Bosses. Infuse planted Jasmine Rice, Pink Lotus, or Kampot Pepper on your Farm!',
  },
  essence_stone: {
    id: 'essence_stone',
    name: 'Stone Essence',
    khmerName: 'បារមីយក្សថ្មប្រាសាទ',
    kind: 'artisan',
    rarity: 'epic',
    sellCoins: 240,
    primaryColor: '#f59e0b',
    description: 'Ancient sandstone guardian core dropped by Yeak Thmor & Pagoda Bosses. Infuse growing crops into Spirit-Infused harvests!',
  },
  essence_naga: {
    id: 'essence_naga',
    name: 'Naga Essence',
    khmerName: 'បារមីនាគរាជស្រមោល',
    kind: 'artisan',
    rarity: 'legendary',
    sellCoins: 340,
    primaryColor: '#a855f7',
    description: 'Mythic astral serpent essence dropped by Neak Reach & Arp Prey Chrov. Infuse growing crops to unlock Raid-Tier Spirit Elixirs!',
  },
  // Update 1.6 — Spirit-Infused Mutated Crops (Sellable on Village Market or Brewed into Raid Elixirs!)
  crop_spirit_jasmine_rice: {
    id: 'crop_spirit_jasmine_rice',
    name: 'Spirit Jasmine Rice',
    khmerName: 'ស្រូវផ្ការំដួលបារមី',
    kind: 'crop',
    rarity: 'epic',
    sellCoins: 520,
    primaryColor: '#38bdf8',
    description: 'Radiant cyan-gold mutated Jasmine Rice infused with Boss Essence. Brew into Elixir of the Naga (+30% Max HP & +10% Lifesteal)!',
  },
  crop_celestial_pink_lotus: {
    id: 'crop_celestial_pink_lotus',
    name: 'Celestial Pink Lotus',
    khmerName: 'ផ្កាឈូកទេពបារមី',
    kind: 'crop',
    rarity: 'legendary',
    sellCoins: 1850,
    primaryColor: '#f472b6',
    description: 'Astral lotus petals glowing with Mekong spirit aura. Brew into Celestial Lotus Draught (+25% Speed, +50% Energy & Poison Immunity)!',
  },
  crop_inferno_kampot_pepper: {
    id: 'crop_inferno_kampot_pepper',
    name: 'Inferno Kampot Pepper',
    khmerName: 'ម្រេចកំពតអគ្គីបារមី',
    kind: 'crop',
    rarity: 'legendary',
    sellCoins: 3200,
    primaryColor: '#fb923c',
    description: 'Blazing gold-ember Kampot peppercorns mutated by Boss Essence. Brew into Angkor Fury Brew (+35% All Damage & +20% Crit)!',
  },
  // Update 1.6 — Torn Angkor Treasure Map
  item_torn_treasure_map: {
    id: 'item_torn_treasure_map',
    name: 'Torn Angkor Treasure Map',
    khmerName: 'ផែនទីកំណប់អង្គររហែក',
    kind: 'artisan',
    rarity: 'epic',
    sellCoins: 0,
    primaryColor: '#d97706',
    description: 'Weathered ancient Angkorian parchment marked with a glowing red X. Click Read Map to reveal the buried Relic Chest clue!',
  },
  // Update 2.6 — Koh Rong Mythic Island Deep-Sea Fish & Pearl Diving Collectibles
  fish_coral_snapper: {
    id: 'fish_coral_snapper',
    name: 'Coral Snapper',
    khmerName: 'ត្រីក្រហមផ្កាថ្ម',
    kind: 'crop',
    rarity: 'common',
    sellCoins: 110,
    primaryColor: '#fb7185',
    description: 'Bright crimson reef snapper caught off Koh Rong Deep-Sea Pier.',
  },
  fish_blue_crab: {
    id: 'fish_blue_crab',
    name: 'Blue Crab',
    khmerName: 'ក្តាមសេះកោះរ៉ុង',
    kind: 'crop',
    rarity: 'common',
    sellCoins: 135,
    primaryColor: '#38bdf8',
    description: 'Sweet Cambodian coastal blue crab prized along Kampot & Koh Rong beaches.',
  },
  fish_tropical_squid: {
    id: 'fish_tropical_squid',
    name: 'Tropical Squid',
    khmerName: 'មឹកសមុទ្រត្រូពិច',
    kind: 'crop',
    rarity: 'uncommon',
    sellCoins: 195,
    primaryColor: '#c084fc',
    description: 'Luminous Koh Rong reef squid favored for grilled beach skewers.',
  },
  fish_mekong_stingray: {
    id: 'fish_mekong_stingray',
    name: 'Mekong Stingray',
    khmerName: 'ត្រីបបែលសមុទ្រជ្រៅ',
    kind: 'crop',
    rarity: 'rare',
    sellCoins: 420,
    primaryColor: '#0ea5e9',
    description: 'Sleek coastal stingray gliding beneath the Koh Rong pier.',
  },
  fish_bioluminescent_jellyfish: {
    id: 'fish_bioluminescent_jellyfish',
    name: 'Bioluminescent Jellyfish',
    khmerName: 'ខ្ញែរសមុទ្រពន្លឺខៀវ',
    kind: 'crop',
    rarity: 'epic',
    sellCoins: 680,
    primaryColor: '#22d3ee',
    description: 'Radiant cyan-glowing Koh Rong plankton jellyfish.',
  },
  fish_sapphire_turtle_shell: {
    id: 'fish_sapphire_turtle_shell',
    name: 'Sapphire Sea Turtle Shell',
    khmerName: 'ស្នូកអណ្តើកសមុទ្រត្បូងខៀវ',
    kind: 'artisan',
    rarity: 'legendary',
    sellCoins: 1150,
    primaryColor: '#2563eb',
    description: 'Iridescent sapphire sea turtle shell from Koh Rong Deep-Sea Pier. Donate to the Ocean Wing of the Angkor Museum!',
  },
  fish_starlight_manta: {
    id: 'fish_starlight_manta',
    name: 'Starlight Manta Ray',
    khmerName: 'ត្រីបបែលពន្លឺផ្កាយ',
    kind: 'crop',
    rarity: 'mythic',
    sellCoins: 2400,
    primaryColor: '#e879f9',
    description: 'Mythic star-speckled manta ray shimmering over Koh Rong midnight reefs. Museum Ocean Wing centerpiece!',
  },
  fish_ancient_golden_barb: {
    id: 'fish_ancient_golden_barb',
    name: 'Ancient Golden Giant Barb',
    khmerName: 'ត្រីគល់រាំងមាសបុរាណ',
    kind: 'crop',
    rarity: 'ancient',
    sellCoins: 5500,
    primaryColor: '#facc15',
    description: 'Cambodia’s legendary Ancient Golden Giant Barb (0.15% catch). Unlocks the Ocean Sovereign title & Ocean Wing crown exhibit!',
  },
  pearl_sea: {
    id: 'pearl_sea',
    name: 'Sea Pearl',
    khmerName: 'គុជសមុទ្រកោះរ៉ុង',
    kind: 'artisan',
    rarity: 'rare',
    sellCoins: 220,
    primaryColor: '#e0f2fe',
    description: 'Lustrous ocean pearl harvested from Giant Clams during Koh Rong Deep-Sea Pearl Diving. Accepted by the Black Market Smuggler!',
  },
  mat_coral_shard: {
    id: 'mat_coral_shard',
    name: 'Coral Shard',
    khmerName: 'បំណែកផ្កាថ្ម',
    kind: 'artisan',
    rarity: 'uncommon',
    sellCoins: 85,
    primaryColor: '#fb7185',
    description: 'Vibrant Koh Rong reef coral fragment recovered from sunken chests and clams.',
  },
  pearl_ancient_bioluminescent: {
    id: 'pearl_ancient_bioluminescent',
    name: 'Ancient Bioluminescent Pearl',
    khmerName: 'គុជពន្លឺសមុទ្របុរាណ',
    kind: 'artisan',
    rarity: 'ancient',
    sellCoins: 4200,
    primaryColor: '#22d3ee',
    description: 'Ultra-rare 0.2% glowing cyan ocean pearl from Koh Rong’s abyssal clams. Donate to the Angkor Relic Museum Ocean Wing!',
  },
};
