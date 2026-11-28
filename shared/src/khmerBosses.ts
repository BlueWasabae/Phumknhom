import type { BossId, BossRigType, DifficultyMode } from './types';
import { calculateCoopBossHp } from './balanceFormulas';

export interface BossLootEntry {
  itemId: string;
  label: string;
  chanceNormal: number;  // 0..1
  chanceExpert: number;  // 0..1 (Expert/Mythic Treasure Bag boost)
  quantity: number;
  isEquipment?: boolean;
}

export interface KhmerBossDef {
  id: BossId;
  rosterNumber: number;
  tier: 1 | 2 | 3 | 4;
  recommendedLevel: number;
  homeMapId?: string;
  khmerName: string;
  englishName: string;
  shortTitle: string;
  biomeName: string;
  rig: BossRigType;
  textureKey: string;
  soloNormalHp: number;
  baseAttack: number;
  defense: number;
  bossDR: number;
  coinsReward: number;
  firstClearGold: number;
  vitalityXp: number;
  charXp: number;
  accentColor: string;
  lore: string;
  trophyName: string;
  trophyIcon: string;
  phase1Summary: string;
  phase2Summary: string;
  phase3Summary?: string;
  isEndgame?: boolean;
  isCalamity?: boolean;
  drops: BossLootEntry[];
  noHitEasterEggItemId?: string;
  noHitEasterEggHint?: string;
}

export interface RolledBossLoot {
  coins: number;
  gold: number;
  items: Array<{ itemId: string; label: string; quantity: number; isEquipment?: boolean }>;
  isTreasureBag: boolean;
  easterEggUnlocked: boolean;
}

/**
 * All 4 Reusable Khmer Boss Rigs (docs/GDD_KHMER_LORE_AND_ANIMATION.md):
 * - #1 Sdech Kongkaeb (QuadrupedHopperRig)
 * - #2 Arp Prey Chrov (FloaterRig)
 * - #5 Yeak Thmor Prasat (HumanoidRig)
 * - #6 Neak Reach — Shadow Naga (MultiSegmentWormRig)
 */
export const KHMER_BOSSES: Record<BossId, KhmerBossDef> = {
  sdech_kongkaeb: {
    id: 'sdech_kongkaeb',
    rosterNumber: 1,
    tier: 1,
    recommendedLevel: 1,
    homeMapId: 'wild_frontier',
    khmerName: 'ស្តេចកង្កែបភក់',
    englishName: 'Sdech Kongkaeb Phok (King Frog)',
    shortTitle: 'King Frog · Boss #1',
    biomeName: 'Muddy Rice Hollow',
    rig: 'QuadrupedHopperRig',
    textureKey: 'boss_sdech_kongkaeb',
    soloNormalHp: 4500,
    baseAttack: 18,
    defense: 6,
    bossDR: 0.04,
    coinsReward: 220,
    firstClearGold: 3,
    vitalityXp: 65,
    charXp: 90,
    accentColor: '#22c55e',
    lore: 'Sovereign of the flooded rice paddies who hoards ancient coins beneath a golden lotus crown.',
    trophyName: 'Golden Frog Crown Trophy',
    trophyIcon: '🐸',
    phase1Summary: 'High jump slams toward player + sticky tongue lash telegraph.',
    phase2Summary: 'Inflates bright red throat pouch → double belly-flop shockwaves + 2 bouncing mini tadpoles.',
    drops: [
      {
        itemId: 'drop_slime_core',
        label: 'Slime Core',
        chanceNormal: 1,
        chanceExpert: 1,
        quantity: 2,
      },
      {
        itemId: 'armor_dash_boots',
        label: 'Starter Dash Boots',
        chanceNormal: 0.25,
        chanceExpert: 0.45,
        quantity: 1,
        isEquipment: true,
      },
      {
        itemId: 'hat_frog_crown',
        label: 'Frog Prince Crown',
        chanceNormal: 0.08,
        chanceExpert: 0.18,
        quantity: 1,
        isEquipment: true,
      },
    ],
    noHitEasterEggItemId: 'weapon_golden_pan',
    noHitEasterEggHint: 'No-Hit Secret: Defeat King Frog taking 0 damage to unlock The Golden Frying Pan!',
  },
  arp_prey_chrov: {
    id: 'arp_prey_chrov',
    rosterNumber: 2,
    tier: 1,
    recommendedLevel: 4,
    homeMapId: 'bamboo_forest',
    khmerName: 'អាបព្រៃជ្រៅ',
    englishName: 'Arp Prey Chrov (Forest Ghost)',
    shortTitle: 'Arp Ghost · Boss #2',
    biomeName: 'Dark Bamboo Woods',
    rig: 'FloaterRig',
    textureKey: 'boss_arp_prey_chrov',
    soloNormalHp: 9000,
    baseAttack: 26,
    defense: 8,
    bossDR: 0.06,
    coinsReward: 340,
    firstClearGold: 4,
    vitalityXp: 90,
    charXp: 130,
    accentColor: '#10b981',
    lore: 'Nocturnal folklore ghost hunting in pitch-dark bamboo woods; its bioluminescent aura is the sole light in the gloom.',
    trophyName: 'Bioluminescent Arp Lantern',
    trophyIcon: '👻',
    phase1Summary: 'Darkens the cavern with a radial spotlight aura; fast figure-8 swoops & laughing spin-dashes.',
    phase2Summary: 'Crimson spectral overdrive → double spin-dashes & radial bioluminescent orb rings.',
    drops: [
      {
        itemId: 'drop_spirit_orb',
        label: 'Spirit Ember Orb',
        chanceNormal: 1,
        chanceExpert: 1,
        quantity: 2,
      },
      {
        itemId: 'hat_spirit_veil',
        label: 'Bamboo Spirit Veil',
        chanceNormal: 0.16,
        chanceExpert: 0.34,
        quantity: 1,
        isEquipment: true,
      },
      {
        itemId: 'wings_arp_aura',
        label: 'Ghostly Lantern Halo',
        chanceNormal: 0.08,
        chanceExpert: 0.2,
        quantity: 1,
        isEquipment: true,
      },
    ],
  },
  yeak_thmor: {
    id: 'yeak_thmor',
    rosterNumber: 5,
    tier: 2,
    recommendedLevel: 8,
    homeMapId: 'mining_quarry',
    khmerName: 'យក្សថ្មប្រាសាទ',
    englishName: 'Yeak Thmor Prasat (Stone Yaksha)',
    shortTitle: 'Stone Yaksha · Boss #5',
    biomeName: 'Ancient Stone Ruins',
    rig: 'HumanoidRig',
    textureKey: 'boss_yeak_thmor',
    soloNormalHp: 18000,
    baseAttack: 40,
    defense: 12,
    bossDR: 0.08,
    coinsReward: 480,
    firstClearGold: 5,
    vitalityXp: 120,
    charXp: 180,
    accentColor: '#f59e0b',
    lore: 'Colossal sandstone temple guardian awakened by ancient tremors, wielding a fiery war club (Dambong).',
    trophyName: 'Sandstone Yaksha Horn',
    trophyIcon: '🗿',
    phase1Summary: 'Telegraphed heavy club slam (red zone) + rolling ground shockwave.',
    phase2Summary: 'Roars, drops 3–4 falling ceiling boulders + faster armored dash charge.',
    drops: [
      {
        itemId: 'drop_stone_core',
        label: 'Stone Core',
        chanceNormal: 1,
        chanceExpert: 1,
        quantity: 2,
      },
      {
        itemId: 'seed_spirit_bamboo',
        label: 'Spirit Bamboo Seed',
        chanceNormal: 0.65,
        chanceExpert: 1,
        quantity: 1,
      },
      {
        itemId: 'weapon_stone_club',
        label: 'Heavy Stone Club',
        chanceNormal: 0.14,
        chanceExpert: 0.3,
        quantity: 1,
        isEquipment: true,
      },
      {
        itemId: 'hat_yaksha_mask',
        label: 'Yaksha Mask',
        chanceNormal: 0.05,
        chanceExpert: 0.15,
        quantity: 1,
        isEquipment: true,
      },
    ],
  },
  neak_reach: {
    id: 'neak_reach',
    rosterNumber: 6,
    tier: 2,
    recommendedLevel: 10,
    homeMapId: 'sunken_ruins',
    khmerName: 'នាគរាជ',
    englishName: 'Neak Reach (Shadow Naga)',
    shortTitle: 'Shadow Naga · Boss #6',
    biomeName: 'Sunken Naga Sanctum',
    rig: 'MultiSegmentWormRig',
    textureKey: 'boss_neak_reach_head',
    soloNormalHp: 24000,
    baseAttack: 46,
    defense: 14,
    bossDR: 0.1,
    coinsReward: 620,
    firstClearGold: 6,
    vitalityXp: 165,
    charXp: 240,
    accentColor: '#a855f7',
    lore: 'Sacred 10-segment serpent weaving effortlessly through sunken Angkor ledges. Drink Coconut Water for Anti-Venom!',
    trophyName: 'Royal Shadow Naga Crest',
    trophyIcon: '🐉',
    phase1Summary: '10-segment sinusoidal serpent weaves through platforms & spits green poison pools (Coconut Anti-Venom counters!).',
    phase2Summary: 'Enraged serpent coils → rapid high-speed platform lunges + 3-way venom pool volleys.',
    drops: [
      {
        itemId: 'drop_naga_scale',
        label: 'Shadow Naga Scale',
        chanceNormal: 1,
        chanceExpert: 1,
        quantity: 2,
      },
      {
        itemId: 'weapon_naga_fang',
        label: 'Naga Venom Fang',
        chanceNormal: 0.16,
        chanceExpert: 0.34,
        quantity: 1,
        isEquipment: true,
      },
      {
        itemId: 'hat_naga_crest',
        label: 'Royal Naga Crest',
        chanceNormal: 0.07,
        chanceExpert: 0.18,
        quantity: 1,
        isEquipment: true,
      },
    ],
  },
  ream_eyso_moni_mekhala: {
    id: 'ream_eyso_moni_mekhala',
    rosterNumber: 10,
    tier: 3,
    recommendedLevel: 24,
    homeMapId: 'temple_district',
    khmerName: 'រាមឥសូរ និង មណីមេខលា',
    englishName: 'Ream Eyso & Moni Mekhala (Storm & Crystal Duo)',
    shortTitle: 'Storm & Crystal Duo · Boss #10',
    biomeName: 'Celestial Monsoon Spire',
    rig: 'DuoStormCrystalRig',
    textureKey: 'boss_ream_eyso_moni_mekhala',
    soloNormalHp: 32000,
    baseAttack: 52,
    defense: 16,
    bossDR: 0.12,
    coinsReward: 950,
    firstClearGold: 9,
    vitalityXp: 240,
    charXp: 340,
    accentColor: '#38bdf8',
    lore: 'Mythic duo of Cambodian celestial folklore: Moni Mekhala glides overhead casting dazzling crystal light-beams while Ream Eyso hurls his thunder-axe Phkak across the storm!',
    trophyName: 'Moni Mekhala Crystal Orb',
    trophyIcon: '⚡',
    phase1Summary: 'Two simultaneous bosses! Moni Mekhala fires telegraphed cyan crystal beams & healing orbs overhead while Ream Eyso throws a boomeranging golden lightning axe + thunder pillars.',
    phase2Summary: 'STORM OVERDRIVE: When one twin falls to 0 HP, the survivor surges with radiant storm energy and accelerated overdrive combos!',
    isEndgame: true,
    drops: [
      {
        itemId: 'drop_storm_crystal_core',
        label: 'Storm Crystal Core',
        chanceNormal: 1,
        chanceExpert: 1,
        quantity: 2,
      },
      {
        itemId: 'mat_lightning_axe_blueprint',
        label: 'Lightning Axe Blueprint',
        chanceNormal: 0.45,
        chanceExpert: 0.85,
        quantity: 1,
      },
      {
        itemId: 'wings_mekhala_halo',
        label: 'Mekhala Celestial Halo',
        chanceNormal: 0.22,
        chanceExpert: 0.5,
        quantity: 1,
        isEquipment: true,
      },
    ],
  },
  krong_reap: {
    id: 'krong_reap',
    rosterNumber: 15,
    tier: 3,
    recommendedLevel: 38,
    homeMapId: 'temple_district',
    khmerName: 'ក្រុងរាពណ៍',
    englishName: 'Krong Reap (Ten-Headed Yaksha Sovereign)',
    shortTitle: 'Yaksha Sovereign · Boss #15',
    biomeName: 'Throne of the Crimson Angkor',
    rig: 'SovereignYakshaRig',
    textureKey: 'boss_krong_reap',
    soloNormalHp: 45000,
    baseAttack: 60,
    defense: 19,
    bossDR: 0.14,
    coinsReward: 1400,
    firstClearGold: 12,
    vitalityXp: 360,
    charXp: 500,
    accentColor: '#e11d48',
    lore: 'The supreme Ten-Headed Yaksha Sovereign of the Reamker epic, wreathed in crimson-and-gold Angkor flames across a blistering 3-phase endgame trial.',
    trophyName: 'Ten-Headed Sovereign Crown',
    trophyIcon: '👑',
    phase1Summary: '100%–65% HP: Multi-directional blooming golden chakram volleys + telegraphed giant sovereign sword slams.',
    phase2Summary: '65%–30% HP: Summons 3 orbiting spectral Yaksha Masks firing synchronized cross-beams while crimson magma vents erupt along the arena floor.',
    phase3Summary: '<30% HP (Sovereign Wrath): Darkens the cavern with a crimson vignette and unleashes rhythmic bullet-hell lotus rings rewarding Double-Jump, Dash, Grapple & Focus/Fury!',
    isEndgame: true,
    drops: [
      {
        itemId: 'relic_angkor_mythic',
        label: 'Angkor Mythic Relic',
        chanceNormal: 1,
        chanceExpert: 1,
        quantity: 1,
      },
      {
        itemId: 'hat_sovereign_crown',
        label: 'Sovereign Crown',
        chanceNormal: 0.35,
        chanceExpert: 0.75,
        quantity: 1,
        isEquipment: true,
      },
      {
        itemId: 'mat_reforge_stone',
        label: 'Reforge Stone',
        chanceNormal: 1,
        chanceExpert: 1,
        quantity: 3,
      },
    ],
  },
  // ==================== UPDATE 3.5: 16-BOSS MYTHIC PANTHEON EXPANSION ====================
  khmouch_chheam_prey: {
    id: 'khmouch_chheam_prey',
    rosterNumber: 3,
    tier: 1,
    recommendedLevel: 5,
    homeMapId: 'bamboo_forest',
    khmerName: 'ខ្មោចឈាមព្រៃ',
    englishName: 'Khmouch Chheam Prey (Bamboo Mist Wraith)',
    shortTitle: 'Mist Wraith · Boss #3',
    biomeName: 'Misty Bamboo Forest',
    rig: 'FloaterRig',
    textureKey: 'boss_arp_prey_chrov',
    soloNormalHp: 11500,
    baseAttack: 29,
    defense: 9,
    bossDR: 0.06,
    coinsReward: 390,
    firstClearGold: 4,
    vitalityXp: 105,
    charXp: 145,
    accentColor: '#34d399',
    lore: 'A swift bamboo-mist phantom weaving through moonlit stalks with jade orb barrages.',
    trophyName: 'Jade Bamboo Spirit Lantern',
    trophyIcon: '🎋',
    phase1Summary: 'Glides through emerald fog firing spirit-orb crescents and swoop dashes.',
    phase2Summary: 'Doubles swoop velocity and spawns twin circling bamboo wisp rings.',
    drops: [
      { itemId: 'drop_spirit_orb', label: 'Spirit Ember Orb', chanceNormal: 1, chanceExpert: 1, quantity: 3 },
      { itemId: 'seed_spirit_bamboo', label: 'Spirit Bamboo Seed', chanceNormal: 0.45, chanceExpert: 0.8, quantity: 1 },
    ],
  },
  preay_krola_plerng: {
    id: 'preay_krola_plerng',
    rosterNumber: 4,
    tier: 1,
    recommendedLevel: 7,
    homeMapId: 'wild_frontier',
    khmerName: 'ព្រាយក្រឡាភ្លើង',
    englishName: 'Preay Krola Plerng (Cinder Spirit)',
    shortTitle: 'Cinder Spirit · Boss #4',
    biomeName: 'Wild Frontier (Night)',
    rig: 'FloaterRig',
    textureKey: 'boss_arp_prey_chrov',
    soloNormalHp: 14500,
    baseAttack: 34,
    defense: 10,
    bossDR: 0.07,
    coinsReward: 440,
    firstClearGold: 5,
    vitalityXp: 120,
    charXp: 170,
    accentColor: '#f97316',
    lore: 'Nocturnal blazing spirit of the Wild Frontier leaving blooming ember trails and erupting flame rings.',
    trophyName: 'Blazing Cinder Brazier',
    trophyIcon: '🔥',
    phase1Summary: 'Floating blazing shroud with blooming ember trails & zigzag fire-dash telegraphs.',
    phase2Summary: 'Ignites erupting ground flame rings and rapid ember-spiral dives.',
    drops: [
      { itemId: 'drop_spirit_orb', label: 'Ember Core', chanceNormal: 1, chanceExpert: 1, quantity: 2 },
      { itemId: 'wings_cinder_shroud', label: 'Cinder Shroud Cape (Rare 8%)', chanceNormal: 0.08, chanceExpert: 0.16, quantity: 1, isEquipment: true },
    ],
  },
  kropeu_neang_kheng: {
    id: 'kropeu_neang_kheng',
    rosterNumber: 7,
    tier: 2,
    recommendedLevel: 13,
    homeMapId: 'green_park',
    khmerName: 'ក្រពើនាងខេង',
    englishName: 'Kropeu Neang Kheng (Giant Mekong Crocodile)',
    shortTitle: 'Mekong Crocodile · Boss #7',
    biomeName: 'Mekong & Koh Rong Waters',
    rig: 'QuadrupedHopperRig',
    textureKey: 'boss_neak_reach_king',
    soloNormalHp: 21500,
    baseAttack: 43,
    defense: 13,
    bossDR: 0.09,
    coinsReward: 560,
    firstClearGold: 6,
    vitalityXp: 155,
    charXp: 215,
    accentColor: '#14b8a6',
    lore: 'Colossal armored Mekong river crocodile from Khmer legend that ambushes from beneath splashing water ripples.',
    trophyName: 'Giant Mekong Crocodile Fang',
    trophyIcon: '🐊',
    phase1Summary: 'Submerges beneath splashing ripples, erupts with snap-jaw lunges & sweeping tail-wave shockwaves.',
    phase2Summary: 'Frenzied river surge — double jaw-ambush leaps and tidal poison bursts!',
    drops: [
      { itemId: 'drop_naga_scale', label: 'River Fang', chanceNormal: 1, chanceExpert: 1, quantity: 2 },
      { itemId: 'armor_mekong_buckler', label: 'Mekong Scale Buckler (Epic 4%)', chanceNormal: 0.04, chanceExpert: 0.09, quantity: 1, isEquipment: true },
    ],
  },
  apsara_srong: {
    id: 'apsara_srong',
    rosterNumber: 8,
    tier: 2,
    recommendedLevel: 16,
    homeMapId: 'sunken_ruins',
    khmerName: 'អប្សរាស្រង៉ែ',
    englishName: 'Apsara Srong (Fallen Temple Dancer)',
    shortTitle: 'Fallen Dancer · Boss #8',
    biomeName: 'Sunken Angkor Ruins',
    rig: 'FloaterRig',
    textureKey: 'boss_arp_prey_chrov',
    soloNormalHp: 25500,
    baseAttack: 46,
    defense: 14,
    bossDR: 0.1,
    coinsReward: 680,
    firstClearGold: 7,
    vitalityXp: 180,
    charXp: 255,
    accentColor: '#fbbf24',
    lore: 'An ancient temple dancer bound by gilded sorrow, spinning lethal golden silk arcs and lotus-petal illusions.',
    trophyName: 'Gilded Apsara Crown',
    trophyIcon: '💃',
    phase1Summary: 'Sweeping golden silk ribbon arcs and spinning lotus-petal storms across the ruins.',
    phase2Summary: 'Illusion Split — summons spectral temple dancers; strike the blooming golden crown to shatter the spell!',
    drops: [
      { itemId: 'drop_spirit_orb', label: 'Celestial Silk', chanceNormal: 1, chanceExpert: 1, quantity: 2 },
      { itemId: 'wings_fallen_apsara_ribbon', label: 'Fallen Apsara Ribbon (Epic 3.5%)', chanceNormal: 0.035, chanceExpert: 0.08, quantity: 1, isEquipment: true },
    ],
  },
  reachsey: {
    id: 'reachsey',
    rosterNumber: 9,
    tier: 2,
    recommendedLevel: 20,
    homeMapId: 'mining_quarry',
    khmerName: 'រាជសីហ៍',
    englishName: 'Reachsey (Mythic Guardian Lion)',
    shortTitle: 'Guardian Lion · Boss #9',
    biomeName: 'Laterite Quarry',
    rig: 'HumanoidRig',
    textureKey: 'boss_yeak_thmor',
    soloNormalHp: 28500,
    baseAttack: 49,
    defense: 16,
    bossDR: 0.11,
    coinsReward: 780,
    firstClearGold: 8,
    vitalityXp: 210,
    charXp: 295,
    accentColor: '#f59e0b',
    lore: 'Fabled Khmer royal lion guardian of the red-laterite quarry whose seismic roars shatter stone pillars.',
    trophyName: 'Golden Reachsey Crest',
    trophyIcon: '🦁',
    phase1Summary: 'Heavy seismic roar waves knocking challengers back + 3-hit golden claw lunges.',
    phase2Summary: 'Shatters the quarry ceiling with falling laterite boulders and unstoppable armored charges!',
    drops: [
      { itemId: 'drop_stone_core', label: 'Golden Laterite Core', chanceNormal: 1, chanceExpert: 1, quantity: 2 },
      { itemId: 'wings_reachsey_mantle', label: 'Reachsey Mane Mantle (Legendary 1.8%)', chanceNormal: 0.018, chanceExpert: 0.045, quantity: 1, isEquipment: true },
    ],
  },
  hanuman_shadow_general: {
    id: 'hanuman_shadow_general',
    rosterNumber: 11,
    tier: 3,
    recommendedLevel: 26,
    homeMapId: 'temple_district',
    khmerName: 'ហនុមានស្រមោល',
    englishName: 'Hanuman Shadow Echo (White General Trial)',
    shortTitle: 'Monkey General · Boss #11',
    biomeName: 'Temple District Sanctum',
    rig: 'HumanoidRig',
    textureKey: 'boss_yeak_thmor',
    soloNormalHp: 34000,
    baseAttack: 54,
    defense: 17,
    bossDR: 0.12,
    coinsReward: 980,
    firstClearGold: 9,
    vitalityXp: 255,
    charXp: 360,
    accentColor: '#e2e8f0',
    lore: 'An astral combat trial left behind by the White Monkey General to test Angkor champions.',
    trophyName: 'White Monkey General Banner',
    trophyIcon: '🐒',
    phase1Summary: 'High-speed acrobatic leap slams and sacred spear shockwaves.',
    phase2Summary: 'Astral flurry dashes + falling temple meteor pillars.',
    drops: [
      { itemId: 'mat_reforge_stone', label: 'Reforge Stone', chanceNormal: 1, chanceExpert: 1, quantity: 2 },
      { itemId: 'weapon_hanuman_banner', label: 'Hanuman War Banner (Rare 6%)', chanceNormal: 0.06, chanceExpert: 0.14, quantity: 1, isEquipment: true },
    ],
  },
  garuda: {
    id: 'garuda',
    rosterNumber: 12,
    tier: 3,
    recommendedLevel: 28,
    homeMapId: 'phnom_kulen',
    khmerName: 'គ្រុឌ',
    englishName: 'Garuda (Solar Sky Sovereign)',
    shortTitle: 'Sky Sovereign · Boss #12',
    biomeName: 'Phnom Kulen Mountain Peak',
    rig: 'FloaterRig',
    textureKey: 'boss_arp_prey_chrov',
    soloNormalHp: 36500,
    baseAttack: 56,
    defense: 17,
    bossDR: 0.12,
    coinsReward: 1100,
    firstClearGold: 10,
    vitalityXp: 280,
    charXp: 395,
    accentColor: '#facc15',
    lore: 'Airborne celestial solar eagle perched above Phnom Kulen peak, unleashing blinding feather-fan barrages & burning dive-bombs.',
    trophyName: 'Solar Garuda Pinion Trophy',
    trophyIcon: '🦅',
    phase1Summary: 'Hovering solar feather-fan barrages & high-speed burning dive-bombs (rewards [Q] Grapple & Double-Jump!).',
    phase2Summary: 'Solar Zenith — wind updraft cyclones paired with blazing figure-8 ember strafes!',
    isEndgame: true,
    drops: [
      { itemId: 'drop_storm_crystal_core', label: 'Sunstone Crest', chanceNormal: 1, chanceExpert: 1, quantity: 2 },
      { itemId: 'wings_garuda_solar_pinions', label: 'Garuda Solar Pinions (Mythic 0.55%)', chanceNormal: 0.0055, chanceExpert: 0.014, quantity: 1, isEquipment: true },
    ],
  },
  kala: {
    id: 'kala',
    rosterNumber: 13,
    tier: 3,
    recommendedLevel: 32,
    homeMapId: 'temple_district',
    khmerName: 'កាល',
    englishName: 'Kala (Devourer of Time)',
    shortTitle: 'Devourer of Time · Boss #13',
    biomeName: 'Temple District Inner Sanctum',
    rig: 'SovereignYakshaRig',
    textureKey: 'boss_arp_prey_chrov',
    soloNormalHp: 40000,
    baseAttack: 58,
    defense: 18,
    bossDR: 0.13,
    coinsReward: 1220,
    firstClearGold: 11,
    vitalityXp: 310,
    charXp: 430,
    accentColor: '#06b6d4',
    lore: 'Giant levitating carved Angkor stone visage that devours centuries inside blooming cyan Time-Slow Rifts.',
    trophyName: 'Chronos Kala Visage',
    trophyIcon: '⏳',
    phase1Summary: 'Casts blooming cyan Time-Slow Rifts across the sanctum floor & snaps shadow jaws.',
    phase2Summary: 'Sweeps rotating prismatic eye-beams alongside synchronized temporal orb rings!',
    phase3Summary: '<30% HP: Fractures time itself with triple cross-beams & accelerated chrono-pulses!',
    isEndgame: true,
    drops: [
      { itemId: 'relic_angkor_mythic', label: 'Time-Worn Relic', chanceNormal: 1, chanceExpert: 1, quantity: 1 },
      { itemId: 'hat_chronos_kala_mask', label: 'Chronos Kala Mask (Mythic 0.5%)', chanceNormal: 0.005, chanceExpert: 0.013, quantity: 1, isEquipment: true },
    ],
  },
  preah_ko_preah_keo: {
    id: 'preah_ko_preah_keo',
    rosterNumber: 14,
    tier: 3,
    recommendedLevel: 35,
    homeMapId: 'phnom_kulen',
    khmerName: 'ព្រះគោ និង ព្រះកែវ',
    englishName: 'Preah Ko & Preah Keo (Sacred Bull & Crystal Sentinel)',
    shortTitle: 'Sacred Bull & Crystal · Boss #14',
    biomeName: 'Phnom Kulen / Sunken Ruins',
    rig: 'DuoStormCrystalRig',
    textureKey: 'boss_ream_eyso_moni_mekhala',
    soloNormalHp: 42500,
    baseAttack: 59,
    defense: 19,
    bossDR: 0.13,
    coinsReward: 1320,
    firstClearGold: 11,
    vitalityXp: 335,
    charXp: 465,
    accentColor: '#10b981',
    lore: 'The sacred armored golden bull Preah Ko and levitating emerald crystal sentinel Preah Keo defending Cambodia’s ancient wisdom.',
    trophyName: 'Sacred Emerald Keo Relic',
    trophyIcon: '🐂',
    phase1Summary: 'Armored golden bull earth-shattering charges while emerald crystal orb fires ricocheting prism lasers.',
    phase2Summary: 'Emerald Aegis Overdrive — crystal sentinel shields Preah Ko until disrupted, unleashing twin beam storms!',
    isEndgame: true,
    drops: [
      { itemId: 'drop_storm_crystal_core', label: 'Sacred Bull Horn', chanceNormal: 1, chanceExpert: 1, quantity: 2 },
      { itemId: 'acc_emerald_keo_prism', label: 'Emerald Keo Prism (Mythic 0.45%)', chanceNormal: 0.0045, chanceExpert: 0.012, quantity: 1, isEquipment: true },
    ],
  },
  rahu: {
    id: 'rahu',
    rosterNumber: 16,
    tier: 4,
    recommendedLevel: 45,
    homeMapId: 'temple_district',
    khmerName: 'រាហ៊ូ',
    englishName: 'Rahu (Eclipse Sovereign — Calamity Superboss)',
    shortTitle: 'CALAMITY SUPERBOSS · #16',
    biomeName: 'Eclipsed Celestial Sanctum',
    rig: 'SovereignYakshaRig',
    textureKey: 'boss_krong_reap',
    soloNormalHp: 68000,
    baseAttack: 74,
    defense: 24,
    bossDR: 0.18,
    coinsReward: 2800,
    firstClearGold: 22,
    vitalityXp: 650,
    charXp: 900,
    accentColor: '#a855f7',
    lore: 'Post-Krong Reap Calamity Superboss! The primordial shadow titan who devours the sun and moon, eclipsing the entire Angkor sky in gold and obsidian.',
    trophyName: 'Obsidian Eclipse Crown of Rahu',
    trophyIcon: '🌑',
    phase1Summary: '100%–65% HP: Physically eclipses the arena sky! Fires synchronized solar/lunar chakram rings & eclipse pillar slams.',
    phase2Summary: '65%–30% HP: Gravity-shift levitation & 3 orbiting eclipse masks sweeping blooming gold-and-void beams!',
    phase3Summary: '<30% HP (TOTAL ECLIPSE): Screen-wide calamity eclipse beams & celestial bullet-hell lotus rings with full WebGL Bloom!',
    isEndgame: true,
    isCalamity: true,
    drops: [
      { itemId: 'relic_angkor_mythic', label: 'Eclipse Core Relic', chanceNormal: 1, chanceExpert: 1, quantity: 2 },
      { itemId: 'armor_eclipse_sovereign', label: 'Eclipse Sovereign Armor Set (Ancient 0.25%)', chanceNormal: 0.0025, chanceExpert: 0.008, quantity: 1, isEquipment: true },
      { itemId: 'wings_rahu_eclipse', label: 'Ancient Rahu Eclipse Wings (Ancient 0.15%)', chanceNormal: 0.0015, chanceExpert: 0.005, quantity: 1, isEquipment: true },
    ],
  },
};

export const KHMER_BOSS_LIST: KhmerBossDef[] = [
  KHMER_BOSSES.sdech_kongkaeb,
  KHMER_BOSSES.arp_prey_chrov,
  KHMER_BOSSES.khmouch_chheam_prey,
  KHMER_BOSSES.preay_krola_plerng,
  KHMER_BOSSES.yeak_thmor,
  KHMER_BOSSES.neak_reach,
  KHMER_BOSSES.kropeu_neang_kheng,
  KHMER_BOSSES.apsara_srong,
  KHMER_BOSSES.reachsey,
  KHMER_BOSSES.ream_eyso_moni_mekhala,
  KHMER_BOSSES.hanuman_shadow_general,
  KHMER_BOSSES.garuda,
  KHMER_BOSSES.kala,
  KHMER_BOSSES.preah_ko_preah_keo,
  KHMER_BOSSES.krong_reap,
  KHMER_BOSSES.rahu,
];

export const BOSS_RUSH_ORDER: BossId[] = [
  'sdech_kongkaeb',
  'arp_prey_chrov',
  'yeak_thmor',
  'neak_reach',
  'ream_eyso_moni_mekhala',
  'krong_reap',
];

export const GRAND_BOSS_RUSH_ORDER: BossId[] = KHMER_BOSS_LIST.map((b) => b.id);

export function getScaledBossMaxHp(
  bossId: BossId,
  difficulty: DifficultyMode,
  partySize = 1
): number {
  const def = KHMER_BOSSES[bossId];
  return calculateCoopBossHp(def.soloNormalHp, partySize, difficulty);
}

export function getDifficultySpeedMultiplier(difficulty: DifficultyMode): number {
  if (difficulty === 'death') return 1.5;
  if (difficulty === 'mythic') return 1.32;
  if (difficulty === 'expert') return 1.18;
  return 1.0;
}

export function rollBossLoot(
  bossId: BossId,
  difficulty: DifficultyMode,
  isFirstClear: boolean,
  noHitKill: boolean,
  rng: () => number = Math.random
): RolledBossLoot {
  const def = KHMER_BOSSES[bossId];
  const isTreasureBag = difficulty !== 'normal';
  const coinMult = difficulty === 'mythic' ? 1.8 : difficulty === 'expert' ? 1.4 : 1;
  const coins = Math.round(def.coinsReward * coinMult);
  const gold = (isFirstClear ? def.firstClearGold : 0) + (difficulty === 'mythic' ? 2 : difficulty === 'expert' ? 1 : 0);

  const items: RolledBossLoot['items'] = [];
  for (const drop of def.drops) {
    const chance = isTreasureBag ? drop.chanceExpert : drop.chanceNormal;
    if (rng() < chance) {
      items.push({
        itemId: drop.itemId,
        label: drop.label,
        quantity: drop.quantity,
        isEquipment: drop.isEquipment,
      });
    }
  }

  const easterEggUnlocked = Boolean(noHitKill && def.noHitEasterEggItemId);
  if (easterEggUnlocked && def.noHitEasterEggItemId) {
    items.push({
      itemId: def.noHitEasterEggItemId,
      label: 'The Golden Frying Pan',
      quantity: 1,
      isEquipment: true,
    });
  }

  return {
    coins,
    gold,
    items,
    isTreasureBag,
    easterEggUnlocked,
  };
}
