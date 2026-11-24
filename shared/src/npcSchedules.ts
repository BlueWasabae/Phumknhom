import { DEFAULT_LOADOUT, type EquippedLoadout, type NpcFriendshipEntry, type PlayerState } from './types';
import type { VillageMapId } from './worldMapData';

export type KhmerNpcId =
  | 'grandma_srey'
  | 'grandpa_chann'
  | 'bopha'
  | 'achar_vuth'
  | 'rithy'
  | 'dara';

export interface NpcWaypoint {
  x: number;
  y: number;
  pauseMs: number;
}

export interface KhmerNpcDef {
  id: KhmerNpcId;
  name: string;
  khmerName: string;
  roleTitle: string;
  mapId: VillageMapId;
  landmarkLabel: string;
  waypoints: NpcWaypoint[];
  loadout: EquippedLoadout;
  lovedGiftIds: string[];
  lovedGiftLabels: string[];
  likedGiftIds: string[];
  likedGiftLabels: string[];
  reward3Hearts: string;
  reward6Hearts: string;
  reward6GiftItemId?: string;
  reward6GiftLabel?: string;
  dialogues: string[];
  sixHeartSecretLine: string;
}

export const KHMER_NPCS: Record<KhmerNpcId, KhmerNpcDef> = {
  grandma_srey: {
    id: 'grandma_srey',
    name: 'Grandma Srey',
    khmerName: 'យាយស្រី',
    roleTitle: 'Num Pang & Street Kitchen Elder',
    mapId: 'market_street',
    landmarkLabel: 'Market Street · Snack Cart',
    waypoints: [
      { x: 1120, y: 510, pauseMs: 2600 },
      { x: 1020, y: 545, pauseMs: 2200 },
      { x: 1165, y: 545, pauseMs: 2400 },
    ],
    loadout: {
      ...DEFAULT_LOADOUT,
      skinTone: 'medium_tan',
      skinColor: '#b97748',
      hairStyle: 'braided_royal',
      hairColor: '#cbd5e1',
      eyeStyle: 'happy_curve',
      faceStyle: 'warm_smile',
      shirt: 'shirt_krama_set',
      pants: 'pants_sampot_hol',
      hat: 'hat_doun',
      weapon: null,
      armor: null,
    },
    lovedGiftIds: ['crop_phka_rumduol', 'artisan_palm_sugar'],
    lovedGiftLabels: ['Phka Rumduol Rice', 'Palm Sugar'],
    likedGiftIds: ['crop_slek_krey', 'crop_trakuon', 'fruit_coconut', 'snack_num_pang'],
    likedGiftLabels: ['Lemongrass', 'Trakuon', 'Coconut', 'Num Pang'],
    reward3Hearts: '15% Snack Cart Discount',
    reward6Hearts: 'Unlocks secret Royal Fish Amok combat buff recipe',
    dialogues: [
      'Sousdey chao! Fresh crispy Num Pang and warm palm-sugar tea keep every hero strong in the caverns.',
      'Bring me fragrant Phka Rumduol rice or sweet Palm Sugar whenever you pass Market Street!',
      'A full belly gives a steady hand against King Frog and Yeak Thmor, my dear.',
    ],
    sixHeartSecretLine:
      'You are family now! My Royal Fish Amok recipe (+28% Attack, +20% Max HP & Poison Ward) is unlocked in the Kitchen!',
  },
  grandpa_chann: {
    id: 'grandpa_chann',
    name: 'Grandpa Chann',
    khmerName: 'តាចាន់',
    roleTitle: 'Master Blacksmith Apprentice Mentor',
    mapId: 'market_street',
    landmarkLabel: 'Market Street · Blacksmith',
    waypoints: [
      { x: 750, y: 525, pauseMs: 2800 },
      { x: 845, y: 540, pauseMs: 2200 },
      { x: 710, y: 560, pauseMs: 2500 },
    ],
    loadout: {
      ...DEFAULT_LOADOUT,
      skinTone: 'deep_bronze',
      skinColor: '#8d552e',
      hairStyle: 'short_neat',
      hairColor: '#94a3b8',
      eyeStyle: 'sharp_fierce',
      eyebrowStyle: 'thick',
      faceStyle: 'confident_smirk',
      shirt: 'shirt_lbokator_gi',
      pants: 'pants_village_shorts',
      hat: null,
      weapon: null,
      armor: null,
    },
    lovedGiftIds: ['ore_angkor_gold', 'ore_laterite'],
    lovedGiftLabels: ['Angkor Gold', 'Laterite Ore'],
    likedGiftIds: ['ore_jade_crystal', 'mat_reforge_stone', 'snack_kafe'],
    likedGiftLabels: ['Jade Crystal', 'Reforge Stone', 'Iced Kafé'],
    reward3Hearts: '15% cheaper Reforging',
    reward6Hearts: 'Unlocks bonus +5% Reforge mythic luck',
    dialogues: [
      'Hear that anvil ring? Good Laterite Ore and Angkor Gold sing when folded right!',
      'Mine deep in the Wild Frontier Caverns and bring back veins — we will fuse relics worthy of Angkor.',
      'Never fight a Mythic Yaksha with a dull edge. Stop by anytime for a proper Reforge.',
    ],
    sixHeartSecretLine:
      'Haha! My secret hammer temper is yours — enjoy +5% extra luck toward Legendary & Mythical rolls!',
  },
  bopha: {
    id: 'bopha',
    name: 'Bopha',
    khmerName: 'បុប្ផា',
    roleTitle: 'Phum Fashion Boutique Designer',
    mapId: 'market_street',
    landmarkLabel: 'Market Street · Fashion Boutique',
    waypoints: [
      { x: 430, y: 520, pauseMs: 2400 },
      { x: 520, y: 540, pauseMs: 2100 },
      { x: 385, y: 550, pauseMs: 2500 },
    ],
    loadout: {
      ...DEFAULT_LOADOUT,
      skinTone: 'golden_khmer',
      skinColor: '#c88858',
      hairStyle: 'high_ponytail',
      hairColor: '#271a16',
      eyeStyle: 'bright_big',
      faceStyle: 'rosy_blush',
      shirt: 'shirt_apsara_gold',
      pants: 'pants_sampot_hol',
      hat: null,
      weapon: null,
      armor: null,
    },
    lovedGiftIds: ['crop_pink_lotus', 'artisan_golden_silk'],
    lovedGiftLabels: ['Pink Lotus', 'Golden Silk'],
    likedGiftIds: ['crop_phka_rumduol', 'fruit_golden_durian', 'snack_coconut_water'],
    likedGiftLabels: ['Phka Rumduol', 'Golden Durian', 'Coconut Water'],
    reward3Hearts: '15% Boutique Discount',
    reward6Hearts: 'Gifts exclusive Bopha Lotus Hairpin vanity item',
    reward6GiftItemId: 'hat_bopha_lotus_hairpin',
    reward6GiftLabel: 'Bopha Lotus Hairpin (Vanity Hat)',
    dialogues: [
      'Welcome, trendsetter! Remember, Vanity Override lets you stay radiant while wearing heavy raid armor!',
      'I weave every Sampot Hol with silk thread and fresh Pink Lotus dye from the temple ponds.',
      'Looking to spruce up your Khmer Stilt House? Check the new Furniture tab inside my Boutique!',
    ],
    sixHeartSecretLine:
      'For my dearest muse — wear this handcrafted Bopha Lotus Hairpin with pride across every Khmer world!',
  },
  achar_vuth: {
    id: 'achar_vuth',
    name: 'Achar Vuth',
    khmerName: 'អាចារ្យវុទ្ធ',
    roleTitle: 'Ancient Pagoda Keeper',
    mapId: 'temple_district',
    landmarkLabel: 'Temple District · Ancient Pagoda',
    waypoints: [
      { x: 445, y: 740, pauseMs: 3000 },
      { x: 555, y: 740, pauseMs: 2400 },
      { x: 495, y: 785, pauseMs: 2600 },
    ],
    loadout: {
      ...DEFAULT_LOADOUT,
      skinTone: 'medium_tan',
      skinColor: '#b97748',
      hairStyle: 'short_neat',
      hairColor: '#e2e8f0',
      eyeStyle: 'classic_round',
      faceStyle: 'warm_smile',
      shirt: 'shirt_achar_robe',
      pants: 'pants_sampot_hol',
      hat: null,
      weapon: null,
      armor: null,
    },
    lovedGiftIds: ['snack_lotus_tea', 'artisan_lotus_tea', 'crop_pink_lotus'],
    lovedGiftLabels: ['Lotus Spirit Tea', 'Pink Lotus'],
    likedGiftIds: ['crop_phka_rumduol', 'drop_spirit_orb', 'ore_jade_crystal'],
    likedGiftLabels: ['Phka Rumduol', 'Spirit Ember Orb', 'Jade Crystal'],
    reward3Hearts: '+10% Daily Shrine Blessing',
    reward6Hearts: 'Reveals hidden Cavern Shrine & Relic Chest hints',
    dialogues: [
      'Peace upon your journey, traveler. Offer your harvests to the Pagoda Altars to awaken ancient blessings.',
      'Steeping Pink Lotus into Spirit Tea calms the mind before descending into the Boss Caverns.',
      'The four archways to the north bridge our temple straight into the deep sandstone hollows.',
    ],
    sixHeartSecretLine:
      'Whispered Secret: Grapple [G] up to Tier 4 (x=1280, y=270) inside the Ancient Caverns for the hidden Lotus Jump Charm chest, and strike the cracked sandstone wall at x=780 inside Boss Caverns!',
  },
  rithy: {
    id: 'rithy',
    name: 'Rithy',
    khmerName: 'រិទ្ធី',
    roleTitle: 'Mekong Riverside Angler',
    mapId: 'green_park',
    landmarkLabel: 'Green Park · Riverside Pier',
    waypoints: [
      { x: 595, y: 780, pauseMs: 2500 },
      { x: 675, y: 820, pauseMs: 2300 },
      { x: 575, y: 855, pauseMs: 2600 },
    ],
    loadout: {
      ...DEFAULT_LOADOUT,
      skinTone: 'deep_bronze',
      skinColor: '#965c34',
      hairStyle: 'silver_spiky',
      hairColor: '#1e1b24',
      eyeStyle: 'classic_round',
      faceStyle: 'cheerful_open',
      shirt: 'shirt_traveler_vest',
      pants: 'pants_village_shorts',
      hat: 'hat_doun',
      weapon: null,
      armor: null,
    },
    lovedGiftIds: ['fish_mekong_catfish', 'snack_kafe'],
    lovedGiftLabels: ['Mekong Catfish', 'Kafé Tek Dos Ko'],
    likedGiftIds: ['fish_silver_carp', 'fish_golden_lotus_koi', 'snack_num_pang'],
    likedGiftLabels: ['Silver Carp', 'Golden Lotus Koi', 'Num Pang'],
    reward3Hearts: '+15% Fishing Catch Zone',
    reward6Hearts: 'Gifts the Master Bamboo Rod',
    reward6GiftItemId: 'tool_master_bamboo_rod',
    reward6GiftLabel: 'Master Bamboo Rod (Fishing Relic)',
    dialogues: [
      'Nothing beats an iced Kafé Tek Dos Ko while watching ripples roll off the Mekong pier!',
      'Keep your line steady — rumor says sunken Angkor Stone Keys glitter beneath the reeds.',
      'Have you visited the Duck Pond nearby? Best spot in Phum Khnhom to catch your breath.',
    ],
    sixHeartSecretLine:
      'Take my prized Master Bamboo Rod! With our friendship +15% catch zone, even Golden Lotus Koi bite easily!',
  },
  dara: {
    id: 'dara',
    name: 'Dara',
    khmerName: 'តារា',
    roleTitle: 'Night Market & Wandering Trader',
    mapId: 'central_plaza',
    landmarkLabel: 'Central Plaza · Wandering Trader',
    waypoints: [
      { x: 645, y: 690, pauseMs: 2400 },
      { x: 955, y: 690, pauseMs: 2400 },
      { x: 800, y: 760, pauseMs: 2200 },
    ],
    loadout: {
      ...DEFAULT_LOADOUT,
      skinTone: 'golden_khmer',
      skinColor: '#c88858',
      hairStyle: 'messy_fringe',
      hairColor: '#312e81',
      eyeStyle: 'sharp_fierce',
      faceStyle: 'confident_smirk',
      shirt: 'shirt_shadow_cloak',
      pants: 'pants_casual_jeans',
      hat: null,
      weapon: null,
      armor: null,
    },
    lovedGiftIds: ['fruit_golden_durian', 'crop_kampot_pepper'],
    lovedGiftLabels: ['Golden Durian', 'Kampot Pepper'],
    likedGiftIds: ['ore_angkor_gold', 'drop_stone_key', 'snack_pepper_skewer'],
    likedGiftLabels: ['Angkor Gold', 'Stone Key', 'Pepper Skewer'],
    reward3Hearts: 'Reveals rare rotating trader stock',
    reward6Hearts: '10% Market Tax Reduction',
    dialogues: [
      'Psst! I travel between Phnom Penh, Kampot, and Siem Reap on the Green Express Bus every dusk.',
      'Bring me genuine Kampot Pepper or a Golden Durian and I will share my finest trade secrets!',
      'Your Khmer Stilt House is just northwest of here — step right up the stairs to decorate it!',
    ],
    sixHeartSecretLine:
      'Partner’s rate activated! You now get a 10% Market Tax Reduction and VIP access to my rotating rare stock!',
  },
};

export const KHMER_NPC_LIST: KhmerNpcDef[] = Object.values(KHMER_NPCS);

export function getNpcsForMap(mapId: VillageMapId): KhmerNpcDef[] {
  return KHMER_NPC_LIST.filter((n) => n.mapId === mapId);
}

export function getTodayDateKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getNpcFriendship(state: PlayerState, npcId: KhmerNpcId): NpcFriendshipEntry {
  const raw = state.npcFriendships?.[npcId];
  return {
    hearts: typeof raw?.hearts === 'number' ? Math.max(0, Math.min(10, Math.round(raw.hearts * 10) / 10)) : 0,
    lastGiftDay: typeof raw?.lastGiftDay === 'string' ? raw.lastGiftDay : null,
    claimedRewards: Array.isArray(raw?.claimedRewards) ? raw.claimedRewards : [],
  };
}

export function evaluateGiftReaction(
  npc: KhmerNpcDef,
  itemId: string
): { tier: 'loved' | 'liked' | 'normal'; heartDelta: number; friendlyDelta: number; reactionLine: string } {
  if (npc.lovedGiftIds.includes(itemId)) {
    return {
      tier: 'loved',
      heartDelta: 1.0,
      friendlyDelta: 8,
      reactionLine: `Oh! My absolute favorite! Thank you so much! (+1.0 Heart ❤️)`,
    };
  }
  if (npc.likedGiftIds.includes(itemId)) {
    return {
      tier: 'liked',
      heartDelta: 0.5,
      friendlyDelta: 5,
      reactionLine: `How thoughtful — I really like this! (+0.5 Heart 💛)`,
    };
  }
  return {
    tier: 'normal',
    heartDelta: 0.2,
    friendlyDelta: 3,
    reactionLine: `Thank you for thinking of me, friend! (+0.2 Heart 💬)`,
  };
}

export function getNpcPerkFlags(state: PlayerState): {
  snackDiscountPct: number;
  royalFishAmokUnlocked: boolean;
  reforgeDiscountPct: number;
  reforgeLuckBonusPct: number;
  boutiqueDiscountPct: number;
  shrineBlessingBonusPct: number;
  cavernHintsUnlocked: boolean;
  fishingCatchZoneBonusPct: number;
  rareTraderStockUnlocked: boolean;
  marketTaxReductionPct: number;
} {
  const hSrey = getNpcFriendship(state, 'grandma_srey').hearts;
  const hChann = getNpcFriendship(state, 'grandpa_chann').hearts;
  const hBopha = getNpcFriendship(state, 'bopha').hearts;
  const hVuth = getNpcFriendship(state, 'achar_vuth').hearts;
  const hRithy = getNpcFriendship(state, 'rithy').hearts;
  const hDara = getNpcFriendship(state, 'dara').hearts;

  return {
    snackDiscountPct: hSrey >= 3 ? 0.15 : 0,
    royalFishAmokUnlocked: hSrey >= 6,
    reforgeDiscountPct: hChann >= 3 ? 0.15 : 0,
    reforgeLuckBonusPct: hChann >= 6 ? 0.05 : 0,
    boutiqueDiscountPct: hBopha >= 3 ? 0.15 : 0,
    shrineBlessingBonusPct: hVuth >= 3 ? 0.1 : 0,
    cavernHintsUnlocked: hVuth >= 6,
    fishingCatchZoneBonusPct: hRithy >= 3 ? 0.15 : 0,
    rareTraderStockUnlocked: hDara >= 3,
    marketTaxReductionPct: hDara >= 6 ? 0.1 : 0,
  };
}

export function giveGiftToNpc(
  state: PlayerState,
  npcId: KhmerNpcId,
  itemId: string,
  todayKey = getTodayDateKey()
): {
  state: PlayerState;
  ok: boolean;
  message: string;
  reactionLine?: string;
  newHearts?: number;
} {
  const npc = KHMER_NPCS[npcId];
  if (!npc) return { state, ok: false, message: 'Villager not found.' };

  const current = getNpcFriendship(state, npcId);
  if (current.lastGiftDay === todayKey) {
    return {
      state,
      ok: false,
      message: `You already gave ${npc.name} a gift today! Visit again tomorrow.`,
    };
  }

  const invIdx = state.inventory.findIndex((i) => i.itemId === itemId && i.quantity > 0);
  if (invIdx < 0) {
    return { state, ok: false, message: 'Selected gift item is not in your Container.' };
  }

  const reaction = evaluateGiftReaction(npc, itemId);
  const nextHearts = Math.min(10, Math.round((current.hearts + reaction.heartDelta) * 10) / 10);
  const nextClaimed = [...(current.claimedRewards ?? [])];

  // Consume 1 gifted item from inventory
  const nextInv = state.inventory
    .map((entry, idx) => (idx === invIdx ? { ...entry, quantity: entry.quantity - 1 } : entry))
    .filter((entry) => entry.quantity > 0);

  let rewardNotice = '';
  if (nextHearts >= 3 && !nextClaimed.includes(3)) {
    nextClaimed.push(3);
    rewardNotice += ` 🎉 3-Heart Perk Unlocked: ${npc.reward3Hearts}!`;
  }
  if (nextHearts >= 6 && !nextClaimed.includes(6)) {
    nextClaimed.push(6);
    rewardNotice += ` 🏆 6-Heart Perk Unlocked: ${npc.reward6Hearts}!`;
    if (npc.reward6GiftItemId) {
      const already = nextInv.some((i) => i.itemId === npc.reward6GiftItemId);
      if (!already) {
        nextInv.push({ itemId: npc.reward6GiftItemId, quantity: 1, itemLevel: 6 });
        rewardNotice += ` Gifted ${npc.reward6GiftLabel ?? npc.reward6GiftItemId} to Container!`;
      }
    }
  }

  const nextFriendships: Record<string, NpcFriendshipEntry> = {
    ...(state.npcFriendships ?? {}),
    [npcId]: {
      hearts: nextHearts,
      lastGiftDay: todayKey,
      claimedRewards: nextClaimed,
    },
  };

  const nextFriendly = Math.min(100, (state.lifeStats.friendly ?? 40) + reaction.friendlyDelta);

  const nextState: PlayerState = {
    ...state,
    inventory: nextInv,
    npcFriendships: nextFriendships,
    lifeStats: {
      ...state.lifeStats,
      friendly: nextFriendly,
    },
  };

  return {
    state: nextState,
    ok: true,
    reactionLine: reaction.reactionLine,
    newHearts: nextHearts,
    message: `💝 Gifted ${npc.name} (+${reaction.heartDelta.toFixed(1)}❤️ → ${nextHearts.toFixed(1)}/10 · Friendly +${reaction.friendlyDelta})${rewardNotice}`,
  };
}
