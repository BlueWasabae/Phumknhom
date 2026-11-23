import type {
  EquipSlot,
  EquippedLoadout,
  HairStyleId,
  ItemRarity,
  KhmerClassId,
  PlayerState,
  WeaponStats,
} from '@shared/types';

export interface ItemStats {
  attack?: number;
  defense?: number;
  maxHp?: number;
  critChance?: number;
  armorPen?: number;
  attackCooldownMs?: number;
  knockbackForce?: number;
}

export interface CatalogItem {
  id: string;
  name: string;
  khmerName: string;
  slot: EquipSlot;
  rarity: ItemRarity;
  stylishScore: number;
  description: string;
  primaryColor: string;
  accentColor: string;
  styleVariant: string;
  classId?: KhmerClassId;
  hairStyleOverride?: HairStyleId;
  shopPrice?: {
    coins?: number;
    gold?: number;
  };
  stats: ItemStats;
}

export const ITEM_CATALOG: Record<string, CatalogItem> = {
  // ==================== 5 KHMER CLASS STARTER WEAPONS ====================
  weapon_phkak: {
    id: 'weapon_phkak',
    name: 'Phkak',
    khmerName: 'ផ្គាក់ (Lbokator Pole-Axe)',
    slot: 'weapon',
    rarity: 'rare',
    stylishScore: 22,
    description: 'Traditional curved Khmer battle pole-axe. Unlocks 3-hit Animal-Stance combos & golden dust dash.',
    primaryColor: '#cbd5e1',
    accentColor: '#d97706',
    styleVariant: 'phkak',
    classId: 'lbokator',
    stats: {
      attack: 22,
      armorPen: 3,
      critChance: 0.22,
      attackCooldownMs: 310,
      knockbackForce: 210,
    },
  },
  weapon_thnu: {
    id: 'weapon_thnu',
    name: 'Thnu',
    khmerName: 'ធ្នូទេព (Reamker Longbow)',
    slot: 'weapon',
    rarity: 'rare',
    stylishScore: 24,
    description: 'Golden-tipped Reamker longbow. Fires fast glowing arrows + backflip aerial shot dash.',
    primaryColor: '#a16207',
    accentColor: '#22c55e',
    styleVariant: 'thnu',
    classId: 'archer',
    stats: {
      attack: 19,
      armorPen: 4,
      critChance: 0.26,
      attackCooldownMs: 280,
      knockbackForce: 120,
    },
  },
  weapon_sastra: {
    id: 'weapon_sastra',
    name: 'Sastra Sleuk Rith',
    khmerName: 'សាស្ត្រាស្លឹករឹត (Sacred Palm-Leaf Tome)',
    slot: 'weapon',
    rarity: 'epic',
    stylishScore: 30,
    description: 'Ancient Khmer palm-leaf spell tome. Weaves golden Yant sigils that detonate on the 3rd stack.',
    primaryColor: '#eab308',
    accentColor: '#fef08a',
    styleVariant: 'sastra',
    classId: 'mystic',
    stats: {
      attack: 21,
      armorPen: 5,
      critChance: 0.2,
      attackCooldownMs: 340,
      knockbackForce: 140,
    },
  },
  weapon_krama_whip: {
    id: 'weapon_krama_whip',
    name: 'Krama Whip',
    khmerName: 'ក្រមាបារមី (Checkered Spirit Scarf)',
    slot: 'weapon',
    rarity: 'rare',
    stylishScore: 26,
    description: 'Woven red-and-white checkered Krama. Marks foes so your companion spirit auto-attacks them.',
    primaryColor: '#dc2626',
    accentColor: '#ffffff',
    styleVariant: 'krama_whip',
    classId: 'tamer',
    stats: {
      attack: 17,
      armorPen: 2,
      critChance: 0.18,
      attackCooldownMs: 300,
      knockbackForce: 150,
    },
  },
  weapon_kambet: {
    id: 'weapon_kambet',
    name: 'Kambet Bantoh',
    khmerName: 'កាំបិតបន្ទោះ (Twin Curved Knives)',
    slot: 'weapon',
    rarity: 'epic',
    stylishScore: 28,
    description: 'Twin shadow blades. Builds a Stealth Bar when idle for guaranteed purple Shadow Strike Crits.',
    primaryColor: '#6b21a8',
    accentColor: '#e879f9',
    styleVariant: 'kambet',
    classId: 'shadow',
    stats: {
      attack: 20,
      armorPen: 5,
      critChance: 0.28,
      attackCooldownMs: 250,
      knockbackForce: 130,
    },
  },
  weapon_stone_club: {
    id: 'weapon_stone_club',
    name: 'Heavy Stone Club',
    khmerName: 'ដំបងថ្មយក្ស (Dambong Thmor)',
    slot: 'weapon',
    rarity: 'epic',
    stylishScore: 64,
    description: 'Massive carved sandstone war club dropped by Yeak Thmor. High base power & heavy armor pierce.',
    primaryColor: '#78716c',
    accentColor: '#f59e0b',
    styleVariant: 'stone_club',
    classId: 'lbokator',
    stats: {
      attack: 38,
      armorPen: 8,
      critChance: 0.24,
      attackCooldownMs: 360,
      knockbackForce: 290,
    },
  },
  weapon_golden_pan: {
    id: 'weapon_golden_pan',
    name: 'The Golden Frying Pan',
    khmerName: 'ខ្ទះឆាមាស (Secret No-Hit Relic)',
    slot: 'weapon',
    rarity: 'legendary',
    stylishScore: 120,
    description: 'Secret Easter Egg weapon earned by defeating King Frog without taking a hit! 40% Crit & loud BONK! impact.',
    primaryColor: '#facc15',
    accentColor: '#fef9c3',
    styleVariant: 'golden_pan',
    classId: 'lbokator',
    stats: {
      attack: 34,
      armorPen: 6,
      critChance: 0.4,
      attackCooldownMs: 280,
      knockbackForce: 260,
    },
  },

  // ==================== HATS ====================
  hat_doun: {
    id: 'hat_doun',
    name: 'Farmer Conical Hat',
    khmerName: 'ដួនស្លឹកត្នោត (Doun)',
    slot: 'hat',
    rarity: 'common',
    stylishScore: 14,
    description: 'Handwoven palm-leaf farmer hat worn across every Cambodian village.',
    primaryColor: '#eab308',
    accentColor: '#854d0e',
    styleVariant: 'doun',
    stats: { defense: 1 },
  },
  hat_yaksha_mask: {
    id: 'hat_yaksha_mask',
    name: 'Yaksha Mask',
    khmerName: 'មុខយក្សថ្ម',
    slot: 'hat',
    rarity: 'legendary',
    stylishScore: 68,
    description: 'Fierce carved stone & gold Yaksha ceremonial mask dropped by Yeak Thmor.',
    primaryColor: '#10b981',
    accentColor: '#facc15',
    styleVariant: 'yaksha_mask',
    stats: { attack: 4, defense: 3 },
  },
  hat_frog_crown: {
    id: 'hat_frog_crown',
    name: 'Frog Prince Crown',
    khmerName: 'មកុដស្តេចកង្កែប',
    slot: 'hat',
    rarity: 'rare',
    stylishScore: 42,
    description: 'Playful emerald crown treasured by conquerors of Muddy Rice Hollow.',
    primaryColor: '#22c55e',
    accentColor: '#facc15',
    styleVariant: 'frog_crown',
    stats: { maxHp: 15 },
  },
  hat_royal_crown: {
    id: 'hat_royal_crown',
    name: 'Royal Golden Crown',
    khmerName: 'មកុដមាសរាជវាំង',
    slot: 'hat',
    rarity: 'epic',
    stylishScore: 60,
    description: 'Spired Angkorian golden mokot crown gleaming in Central Plaza.',
    primaryColor: '#facc15',
    accentColor: '#ef4444',
    styleVariant: 'royal_crown',
    stats: { critChance: 0.04, defense: 2 },
  },

  // ==================== HAIR ITEMS ====================
  hair_item_short: {
    id: 'hair_item_short',
    name: 'Village Classic Crop',
    khmerName: 'សក់ខ្លីធម្មតា',
    slot: 'hair',
    rarity: 'common',
    stylishScore: 8,
    description: 'Neat everyday village hairstyle.',
    primaryColor: '#1e1b24',
    accentColor: '#3f3f46',
    styleVariant: 'hair_short',
    hairStyleOverride: 'hair_short',
    stats: {},
  },
  hair_item_spiky: {
    id: 'hair_item_spiky',
    name: 'Lbokator Spikes',
    khmerName: 'សក់បះអ្នកចម្បាំង',
    slot: 'hair',
    rarity: 'uncommon',
    stylishScore: 18,
    description: 'Energetic spiked martial-arts hairstyle.',
    primaryColor: '#312e81',
    accentColor: '#6366f1',
    styleVariant: 'hair_spiky',
    hairStyleOverride: 'hair_spiky',
    stats: {},
  },
  hair_item_long: {
    id: 'hair_item_long',
    name: 'Apsara Silk Locks',
    khmerName: 'សក់វែងសូត្រ',
    slot: 'hair',
    rarity: 'rare',
    stylishScore: 26,
    description: 'Flowing silk-smooth long hair.',
    primaryColor: '#451a03',
    accentColor: '#b45309',
    styleVariant: 'hair_long',
    hairStyleOverride: 'hair_long',
    stats: {},
  },

  // ==================== OUTFITS / SHIRTS ====================
  shirt_village_tunic: {
    id: 'shirt_village_tunic',
    name: 'Village Tunic',
    khmerName: 'អាវភូមិ',
    slot: 'shirt',
    rarity: 'common',
    stylishScore: 12,
    description: 'Breathable cotton tunic woven for sunny farm work.',
    primaryColor: '#3b82f6',
    accentColor: '#fef3c7',
    styleVariant: 'tunic',
    stats: { defense: 1 },
  },
  shirt_krama_set: {
    id: 'shirt_krama_set',
    name: 'Traditional Krama Scarf Set',
    khmerName: 'ឈុតអាវក្រមាប្រពៃណី',
    slot: 'shirt',
    rarity: 'uncommon',
    stylishScore: 26,
    description: 'Crisp cream shirt paired with an iconic checkered red Khmer Krama.',
    primaryColor: '#ef4444',
    accentColor: '#ffffff',
    styleVariant: 'krama_set',
    stats: { defense: 2, maxHp: 10 },
  },
  shirt_lbokator_gi: {
    id: 'shirt_lbokator_gi',
    name: 'Lbokator Fighter Gi',
    khmerName: 'ឈុតអ្នកចម្បាំងល្បុក្កតោ',
    slot: 'shirt',
    rarity: 'rare',
    stylishScore: 38,
    description: 'Sleeveless martial wrap with sacred golden armbands.',
    primaryColor: '#b45309',
    accentColor: '#facc15',
    styleVariant: 'lbokator_gi',
    stats: { attack: 4, defense: 3 },
  },
  shirt_achar_robe: {
    id: 'shirt_achar_robe',
    name: 'Achar Mystic Robe',
    khmerName: 'អាវគ្រូមន្តអាគម',
    slot: 'shirt',
    rarity: 'epic',
    stylishScore: 46,
    description: 'Saffron & gold ceremonial silk robe inscribed with protective Yant patterns.',
    primaryColor: '#f59e0b',
    accentColor: '#fef9c3',
    styleVariant: 'achar_robe',
    stats: { attack: 3, critChance: 0.04 },
  },
  shirt_shadow_cloak: {
    id: 'shirt_shadow_cloak',
    name: 'Shadow Cloak',
    khmerName: 'អាវឃ្លុំស្រមោល',
    slot: 'shirt',
    rarity: 'epic',
    stylishScore: 48,
    description: 'Night-woven twilight cloak favored by Shadow Hunters.',
    primaryColor: '#3b0764',
    accentColor: '#c084fc',
    styleVariant: 'shadow_cloak',
    stats: { critChance: 0.06, attack: 3 },
  },

  // ==================== PANTS ====================
  pants_village_shorts: {
    id: 'pants_village_shorts',
    name: 'Village Trousers',
    khmerName: 'ខោភូមិ',
    slot: 'pants',
    rarity: 'common',
    stylishScore: 8,
    description: 'Sturdy slate village pants.',
    primaryColor: '#334155',
    accentColor: '#64748b',
    styleVariant: 'shorts',
    stats: { defense: 1 },
  },
  pants_sampot_hol: {
    id: 'pants_sampot_hol',
    name: 'Golden Sampot Hol',
    khmerName: 'សំពត់ហូលមាស',
    slot: 'pants',
    rarity: 'rare',
    stylishScore: 34,
    description: 'Hand-dyed crimson & gold silk Sampot Hol.',
    primaryColor: '#7c2d12',
    accentColor: '#fbbf24',
    styleVariant: 'sampot',
    stats: { defense: 2, maxHp: 12 },
  },

  // ==================== ARMOR ====================
  armor_rattan_guard: {
    id: 'armor_rattan_guard',
    name: 'Woven Rattan Guard',
    khmerName: 'អាវការពារផ្តៅ',
    slot: 'armor',
    rarity: 'common',
    stylishScore: 10,
    description: 'Lightweight rattan shoulder bracers for rookie raiders.',
    primaryColor: '#a16207',
    accentColor: '#fde68a',
    styleVariant: 'rattan',
    stats: { defense: 3, maxHp: 10 },
  },
  armor_angkor_bronze: {
    id: 'armor_angkor_bronze',
    name: 'Angkor Bronze Pauldrons',
    khmerName: 'គ្រឿងក្រោះសំរិទ្ធអង្គរ',
    slot: 'armor',
    rarity: 'epic',
    stylishScore: 44,
    description: 'Engraved bronze temple shoulder guards boosting durability.',
    primaryColor: '#d97706',
    accentColor: '#fef08a',
    styleVariant: 'angkor_bronze',
    stats: { defense: 7, maxHp: 30 },
  },
  armor_dash_boots: {
    id: 'armor_dash_boots',
    name: 'Starter Dash Boots',
    khmerName: 'ស្បែកជើងរហ័សកង្កែប',
    slot: 'armor',
    rarity: 'rare',
    stylishScore: 36,
    description: 'Springy emerald frog-hide combat boots dropped by Sdech Kongkaeb.',
    primaryColor: '#16a34a',
    accentColor: '#facc15',
    styleVariant: 'dash_boots',
    stats: { defense: 4, maxHp: 22, critChance: 0.03 },
  },

  // ==================== WINGS / BACK ====================
  wings_bamboo_basket: {
    id: 'wings_bamboo_basket',
    name: 'Bamboo Basket',
    khmerName: 'កន្ត្រកឫស្សី',
    slot: 'wings',
    rarity: 'common',
    stylishScore: 14,
    description: 'Cozy handwoven farmer backpack basket.',
    primaryColor: '#b45309',
    accentColor: '#fde68a',
    styleVariant: 'basket',
    stats: { maxHp: 10 },
  },
  wings_ember: {
    id: 'wings_ember',
    name: 'Ember Wings',
    khmerName: 'ស្លាបអណ្តាតភ្លើង',
    slot: 'wings',
    rarity: 'epic',
    stylishScore: 72,
    description: 'Blazing crimson-orange demon-flame wings forged in Burning Palm Woods.',
    primaryColor: '#ef4444',
    accentColor: '#facc15',
    styleVariant: 'ember_wings',
    stats: { attack: 4 },
  },
  wings_garuda: {
    id: 'wings_garuda',
    name: 'Radiant Garuda Wings',
    khmerName: 'ស្លាបគ្រុឌមាសវេហា',
    slot: 'wings',
    rarity: 'legendary',
    stylishScore: 115,
    description: 'Majestic golden-and-crimson plumage of Krut Meas — ultimate Plaza prestige.',
    primaryColor: '#f59e0b',
    accentColor: '#dc2626',
    styleVariant: 'garuda_wings',
    stats: { attack: 5, critChance: 0.04 },
  },
  wings_yant_halo: {
    id: 'wings_yant_halo',
    name: 'Golden Yant Halo',
    khmerName: 'រង្វង់យ័ន្តមាស',
    slot: 'wings',
    rarity: 'legendary',
    stylishScore: 95,
    description: 'Slowly rotating sacred geometric Khmer Yant mandala floating behind your back.',
    primaryColor: '#facc15',
    accentColor: '#fef9c3',
    styleVariant: 'yant_halo',
    stats: { defense: 3, critChance: 0.05 },
  },

  // ==================== PETS ====================
  pet_mini_naga: {
    id: 'pet_mini_naga',
    name: 'Mini-Naga Spirit',
    khmerName: 'កូននាគរាជបារមី',
    slot: 'pet',
    rarity: 'legendary',
    stylishScore: 80,
    description: 'Hovering emerald Naga guardian. Fires mystic bolts when paired with Krama Whip!',
    primaryColor: '#10b981',
    accentColor: '#facc15',
    styleVariant: 'mini_naga',
    stats: { attack: 3 },
  },
  pet_firefly_lantern: {
    id: 'pet_firefly_lantern',
    name: 'Firefly Lantern',
    khmerName: 'ចង្កៀងអំពិលអំពែក',
    slot: 'pet',
    rarity: 'rare',
    stylishScore: 44,
    description: 'Warm glowing jar of Mekong fireflies lighting up dark caverns.',
    primaryColor: '#fde047',
    accentColor: '#fb923c',
    styleVariant: 'firefly_lantern',
    stats: { critChance: 0.03 },
  },
  pet_lucky_kitten: {
    id: 'pet_lucky_kitten',
    name: 'Lucky White Kitten',
    khmerName: 'កូនឆ្មាសសំណាង',
    slot: 'pet',
    rarity: 'epic',
    stylishScore: 56,
    description: 'Adorable cream-white village kitten wearing a tiny red Krama scarf.',
    primaryColor: '#f8fafc',
    accentColor: '#ef4444',
    styleVariant: 'lucky_kitten',
    stats: { maxHp: 15 },
  },

  // ==================== PHASE 4 FASHION BOUTIQUE EXCLUSIVES ====================
  hat_krama_bandana: {
    id: 'hat_krama_bandana',
    name: 'Red Krama Headband',
    khmerName: 'ក្រមាចងក្បាល',
    slot: 'hat',
    rarity: 'uncommon',
    stylishScore: 28,
    description: 'Crisp checkered crimson Krama tied martial-arts style across the forehead.',
    primaryColor: '#dc2626',
    accentColor: '#ffffff',
    styleVariant: 'krama_bandana',
    shopPrice: { coins: 180 },
    stats: { defense: 1, critChance: 0.02 },
  },
  hat_sun_straw: {
    id: 'hat_sun_straw',
    name: 'Mekong Sun Hat',
    khmerName: 'មួកស្លឹកមេគង្គ',
    slot: 'hat',
    rarity: 'uncommon',
    stylishScore: 30,
    description: 'Wide-brimmed river-festival straw hat trimmed with a lotus ribbon.',
    primaryColor: '#fde047',
    accentColor: '#ec4899',
    styleVariant: 'sun_straw',
    shopPrice: { coins: 220 },
    stats: { maxHp: 12 },
  },
  hat_apsara_crown: {
    id: 'hat_apsara_crown',
    name: 'Apsara Lotus Tiara',
    khmerName: 'មកុដអប្សរាផ្កាឈូក',
    slot: 'hat',
    rarity: 'epic',
    stylishScore: 76,
    description: 'Delicate golden Apsara celestial spire studded with pink lotus gems.',
    primaryColor: '#facc15',
    accentColor: '#ec4899',
    styleVariant: 'apsara_crown',
    shopPrice: { coins: 480 },
    stats: { defense: 2, critChance: 0.05 },
  },
  shirt_water_fest: {
    id: 'shirt_water_fest',
    name: 'Boat Captain Vest',
    khmerName: 'អាវប្រធានទូកង',
    slot: 'shirt',
    rarity: 'rare',
    stylishScore: 44,
    description: 'Vibrant Water Festival racing jersey with golden wave embroidery.',
    primaryColor: '#0284c7',
    accentColor: '#facc15',
    styleVariant: 'tunic',
    shopPrice: { coins: 360 },
    stats: { defense: 2, maxHp: 18 },
  },
  shirt_lotus_dress: {
    id: 'shirt_lotus_dress',
    name: 'Pink Lotus Tunic',
    khmerName: 'អាវសូត្រផ្កាឈូក',
    slot: 'shirt',
    rarity: 'rare',
    stylishScore: 52,
    description: 'Silky lotus-blossom tunic beloved across Central Plaza hangouts.',
    primaryColor: '#ec4899',
    accentColor: '#fef08a',
    styleVariant: 'achar_robe',
    shopPrice: { coins: 420 },
    stats: { maxHp: 15, critChance: 0.03 },
  },
  shirt_royal_silk: {
    id: 'shirt_royal_silk',
    name: 'Khmer New Year Royal Silk',
    khmerName: 'ឈុតសូត្រចូលឆ្នាំខ្មែរ',
    slot: 'shirt',
    rarity: 'legendary',
    stylishScore: 88,
    description: 'Opulent woven gold-and-emerald royal brocade crafted for festival champions.',
    primaryColor: '#047857',
    accentColor: '#fde047',
    styleVariant: 'achar_robe',
    shopPrice: { coins: 680 },
    stats: { attack: 4, defense: 4, maxHp: 20 },
  },
  pants_royal_sampot: {
    id: 'pants_royal_sampot',
    name: 'Indigo Silk Sampot',
    khmerName: 'សំពត់ហូលពណ៌ស្វាយ',
    slot: 'pants',
    rarity: 'rare',
    stylishScore: 40,
    description: 'Deep indigo silk Sampot woven with shimmering silver borders.',
    primaryColor: '#312e81',
    accentColor: '#e2e8f0',
    styleVariant: 'sampot',
    shopPrice: { coins: 320 },
    stats: { defense: 3, maxHp: 14 },
  },
  wings_lotus_aura: {
    id: 'wings_lotus_aura',
    name: 'Sacred Lotus Aura',
    khmerName: 'រស្មីផ្កាឈូកទេព',
    slot: 'wings',
    rarity: 'epic',
    stylishScore: 86,
    description: 'Orbiting glowing pink lotus petals drifting serenely behind your shoulders.',
    primaryColor: '#ec4899',
    accentColor: '#fef08a',
    styleVariant: 'lotus_aura',
    shopPrice: { coins: 850 },
    stats: { maxHp: 20, critChance: 0.03 },
  },
  wings_dragon_cape: {
    id: 'wings_dragon_cape',
    name: 'Royal Naga Wings',
    khmerName: 'ស្លាបនាគរាជមរកត',
    slot: 'wings',
    rarity: 'epic',
    stylishScore: 98,
    description: 'Iridescent emerald-and-gold Naga spirit wings shimmering with Mekong mist.',
    primaryColor: '#10b981',
    accentColor: '#facc15',
    styleVariant: 'garuda_wings',
    shopPrice: { coins: 1100 },
    stats: { attack: 4, defense: 3 },
  },
  wings_angel_feather: {
    id: 'wings_angel_feather',
    name: 'Celestial Apsara Wings',
    khmerName: 'ស្លាបទេពអប្សរាស',
    slot: 'wings',
    rarity: 'legendary',
    stylishScore: 135,
    description: 'Pure pearl-white feathered wings tipped in radiant Angkor gold.',
    primaryColor: '#f8fafc',
    accentColor: '#facc15',
    styleVariant: 'garuda_wings',
    shopPrice: { gold: 3 },
    stats: { maxHp: 25, critChance: 0.05 },
  },
  pet_golden_frog: {
    id: 'pet_golden_frog',
    name: 'Golden Lucky Frog',
    khmerName: 'កង្កែបមាសនាំលាភ',
    slot: 'pet',
    rarity: 'rare',
    stylishScore: 62,
    description: 'Cheerful golden rice-field frog that hops beside you bringing Plaza fortune.',
    primaryColor: '#facc15',
    accentColor: '#16a34a',
    styleVariant: 'golden_frog',
    shopPrice: { coins: 750 },
    stats: { critChance: 0.03, maxHp: 10 },
  },
  pet_baby_elephant: {
    id: 'pet_baby_elephant',
    name: 'Baby Angkor Elephant',
    khmerName: 'កូនដំរីអង្គរ',
    slot: 'pet',
    rarity: 'legendary',
    stylishScore: 110,
    description: 'Adorable royal baby elephant dressed in a crimson-and-gold temple saddle.',
    primaryColor: '#94a3b8',
    accentColor: '#dc2626',
    styleVariant: 'baby_elephant',
    shopPrice: { gold: 4 },
    stats: { defense: 3, maxHp: 25 },
  },
};

export const FASHION_SHOP_ITEMS: CatalogItem[] = Object.values(ITEM_CATALOG).filter(
  (item) => Boolean(item.shopPrice)
);

export function buyFashionItem(
  state: PlayerState,
  itemId: string
): { state: PlayerState; ok: boolean; message: string } {
  const def = ITEM_CATALOG[itemId];
  if (!def || !def.shopPrice) {
    return { state, ok: false, message: 'Item is not available in the Fashion Boutique.' };
  }

  const alreadyOwned = state.inventory.some((i) => i.itemId === itemId && i.quantity > 0);
  if (alreadyOwned) {
    return { state, ok: false, message: `You already own ${def.name}!` };
  }

  const coinCost = def.shopPrice.coins ?? 0;
  const goldCost = def.shopPrice.gold ?? 0;

  if (coinCost > 0 && state.currencies.coins < coinCost) {
    return { state, ok: false, message: `Need ${coinCost.toLocaleString()} Coins to buy ${def.name}.` };
  }
  if (goldCost > 0 && state.currencies.gold < goldCost) {
    return { state, ok: false, message: `Need ${goldCost} Gold to buy ${def.name}.` };
  }

  const nextCoins = state.currencies.coins - coinCost;
  const nextGold = state.currencies.gold - goldCost;
  const nextInv = [...state.inventory, { itemId: def.id, quantity: 1, itemLevel: 1 }];

  const costText =
    goldCost > 0 ? `${goldCost} Gold` : `${coinCost.toLocaleString()} Coins`;

  return {
    state: {
      ...state,
      coins: nextCoins,
      currencies: {
        ...state.currencies,
        coins: nextCoins,
        gold: nextGold,
      },
      inventory: nextInv,
    },
    ok: true,
    message: `Purchased ${def.name} (-${costText})! Added to Container.`,
  };
}

export function computeStylishScore(loadout: EquippedLoadout): number {
  const slots: EquipSlot[] = ['hat', 'hair', 'shirt', 'pants', 'wings', 'pet', 'weapon', 'armor'];
  let total = 0;
  for (const s of slots) {
    const id = loadout[s];
    if (id && ITEM_CATALOG[id]) {
      total += ITEM_CATALOG[id].stylishScore;
    }
  }
  return total;
}

export function buildWeaponStatsFromItem(weaponId: string | null): WeaponStats {
  const item = weaponId ? ITEM_CATALOG[weaponId] : ITEM_CATALOG.weapon_phkak;
  const fallback = ITEM_CATALOG.weapon_phkak;
  const src = item && item.slot === 'weapon' ? item : fallback;
  return {
    id: src.id,
    name: src.name,
    khmerName: src.khmerName,
    classId: src.classId ?? 'lbokator',
    baseDamage: src.stats.attack ?? 18,
    upgradeLevel: 1,
    armorPen: src.stats.armorPen ?? 2,
    critChance: src.stats.critChance ?? 0.2,
    attackCooldownMs: src.stats.attackCooldownMs ?? 320,
    knockbackForce: src.stats.knockbackForce ?? 180,
  };
}

export function computeLoadoutDefenseAndHp(
  loadout: EquippedLoadout,
  baseLevel: number
): { defense: number; maxHp: number; bonusCrit: number; bonusFlatAtk: number } {
  const slots: EquipSlot[] = ['hat', 'shirt', 'pants', 'wings', 'pet', 'armor'];
  let defense = 5 + baseLevel * 2;
  let maxHp = 120 + (baseLevel - 1) * 15;
  let bonusCrit = 0;
  let bonusFlatAtk = 0;

  for (const s of slots) {
    const id = loadout[s];
    const def = id ? ITEM_CATALOG[id] : undefined;
    if (!def) continue;
    defense += def.stats.defense ?? 0;
    maxHp += def.stats.maxHp ?? 0;
    bonusCrit += def.stats.critChance ?? 0;
    bonusFlatAtk += def.stats.attack ?? 0;
  }

  return { defense, maxHp, bonusCrit, bonusFlatAtk };
}
