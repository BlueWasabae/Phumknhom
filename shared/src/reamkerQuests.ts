import type { PlayerState } from './types';

export interface ReamkerQuestStepDef {
  step: 1 | 2 | 3 | 4 | 5;
  title: string;
  khmerTitle: string;
  icon: string;
  objectiveText: string;
  targetCount: number;
  hintZone: string;
  rewardCoins: number;
  storyExcerpt: string;
}

export interface ShadowVignetteDef {
  id: 'preah_ream' | 'hanuman' | 'krong_reap';
  title: string;
  khmerTitle: string;
  subtitle: string;
  narration: string[];
  accentColor: string;
}

export const SBEK_THOM_VIGNETTES: ShadowVignetteDef[] = [
  {
    id: 'preah_ream',
    title: 'Preah Ream & The Golden Bow',
    khmerTitle: 'ព្រះរាម និងធ្នូមាសសក្តិសិទ្ធិ',
    subtitle: 'Act I · The Royal Archer of Ayodhya',
    accentColor: '#f59e0b',
    narration: [
      'Before the coconut-husk firelight, the grand cowhide silhouette rises...',
      'Prince Preah Ream lifts the sacred Bow of Shiva — a weapon no mortal king could bend.',
      'As the golden string snaps taut, thunder echoes across the ancient Khmer forest!',
    ],
  },
  {
    id: 'hanuman',
    title: "Hanuman's Leap Across the Sea",
    khmerTitle: 'ហនុមានហោះឆ្លងមហាសមុទ្រ',
    subtitle: 'Act II · The White Monkey General',
    accentColor: '#fbbf24',
    narration: [
      'Drums of Skor Thom quicken as Hanuman, the fearless White Monkey, bounds toward the clouds!',
      'With a single leap across the emerald waters of the Mekong and Lanka, he carries hope to Neang Seda.',
      'No demon army can match his cunning, loyalty, and radiant spirit!',
    ],
  },
  {
    id: 'krong_reap',
    title: 'The Shadow of Krong Reap',
    khmerTitle: 'ស្រមោលក្រុងរាពណ៍មុខដប់',
    subtitle: 'Act III · The Ten-Headed Yaksha Sovereign',
    accentColor: '#ef4444',
    narration: [
      'Ten crowned heads cast a towering crimson shadow across the parchment screen!',
      'Krong Reap summons storms of laterite and fire — yet light always pierces the deepest shadow.',
      'Heroes of Phum Khnhom: carry the torch of the Reamker into Angkor!',
    ],
  },
];

export const REAMKER_QUEST_STEPS: ReamkerQuestStepDef[] = [
  {
    step: 1,
    title: "The White Monkey's Trial",
    khmerTitle: 'ការសាកល្បងរបស់ហនុមាន',
    icon: '🎋',
    objectiveText: 'Collect 3 Bamboo Hearts (or harvest bamboo herbs/wood) in Misty Bamboo Forest',
    targetCount: 3,
    hintZone: 'Misty Bamboo Forest',
    rewardCoins: 200,
    storyExcerpt: 'Master Puppeteer Ta Sorn asks you to gather supple spirit bamboo to carve a new Hanuman shadow puppet.',
  },
  {
    step: 2,
    title: 'Crossing the Mekong',
    khmerTitle: 'ឆ្លងកាត់ទន្លេមេគង្គ',
    icon: '🐚',
    objectiveText: 'Catch 2 Rare+ Fish (Green Park / Koh Rong) or dive for 2 Sea Pearls',
    targetCount: 2,
    hintZone: 'Green Park Pier / Koh Rong Island',
    rewardCoins: 250,
    storyExcerpt: 'Like Hanuman leaping across the waves, prove your mastery of Cambodia’s rivers and seas.',
  },
  {
    step: 3,
    title: 'The Golden Bow',
    khmerTitle: 'ធ្នូមាសព្រះរាម',
    icon: '🏹',
    objectiveText: "Craft, Temper, or Reforge any weapon at Grandpa Chann's Blacksmith",
    targetCount: 1,
    hintZone: 'Market Street (Blacksmith)',
    rewardCoins: 300,
    storyExcerpt: 'Awaken the spirit of Preah Ream’s Golden Bow by forging or reforging your own weapon.',
  },
  {
    step: 4,
    title: 'Echoes of the Ten-Headed',
    khmerTitle: 'សំឡេងរំពងនៃក្រុងរាពណ៍',
    icon: '🏯',
    objectiveText: 'Clear Floor 5+ of the Endless Pagoda Tower or defeat any Mythic Boss',
    targetCount: 1,
    hintZone: 'Temple District (Pagoda Tower / Bosses)',
    rewardCoins: 350,
    storyExcerpt: 'Confront the echoing power of Krong Reap high inside the Endless Pagoda Tower or Mythic Sanctum.',
  },
  {
    step: 5,
    title: 'Shadow of Angkor',
    khmerTitle: 'ស្រមោលនៃអង្គរ',
    icon: '🎭',
    objectiveText: 'Donate 1 Relic to the Angkor Museum & defeat Krong Reap or Sdech Kongkaeb',
    targetCount: 1,
    hintZone: 'Temple District (Museum & Boss Portal)',
    rewardCoins: 1500,
    storyExcerpt: 'Honor Angkor’s heritage in the Museum and triumph in battle to earn the Hanuman Spirit Mask & Shadow Puppet Aura!',
  },
];

export type ReamkerTriggerKind =
  | 'bamboo_gather'
  | 'rare_fish_or_pearl'
  | 'weapon_forge_or_reforge'
  | 'tower_or_mythic_boss'
  | 'museum_and_boss';

export function startReamkerQuestline(
  state: PlayerState
): { state: PlayerState; ok: boolean; message: string } {
  const cur = state.reamkerQuestStep ?? 0;
  if (cur >= 1 && cur <= 5) {
    return { state, ok: false, message: `Reamker Questline Part ${cur}/5 is already active!` };
  }
  if (cur >= 6) {
    return { state, ok: false, message: 'You have already completed the entire 5-Part Reamker Legend!' };
  }
  return {
    state: {
      ...state,
      reamkerQuestStep: 1,
      reamkerStepProgress: 0,
    },
    ok: true,
    message: '🎭 Started Reamker Questline — Part 1/5: The White Monkey’s Trial!',
  };
}

export function advanceReamkerQuestProgress(
  state: PlayerState,
  trigger: ReamkerTriggerKind,
  delta = 1
): { state: PlayerState; updated: boolean; stepReady: boolean } {
  const step = state.reamkerQuestStep ?? 0;
  if (step < 1 || step > 5) return { state, updated: false, stepReady: false };

  const match =
    (step === 1 && trigger === 'bamboo_gather') ||
    (step === 2 && trigger === 'rare_fish_or_pearl') ||
    (step === 3 && trigger === 'weapon_forge_or_reforge') ||
    (step === 4 && trigger === 'tower_or_mythic_boss') ||
    (step === 5 && trigger === 'museum_and_boss');

  if (!match) return { state, updated: false, stepReady: false };

  const def = REAMKER_QUEST_STEPS[step - 1];
  const prevProg = state.reamkerStepProgress ?? 0;
  const nextProg = Math.min(def.targetCount, prevProg + Math.max(1, delta));
  if (nextProg === prevProg) return { state, updated: false, stepReady: nextProg >= def.targetCount };

  return {
    state: {
      ...state,
      reamkerStepProgress: nextProg,
    },
    updated: true,
    stepReady: nextProg >= def.targetCount,
  };
}

export function isReamkerStepClaimable(state: PlayerState): boolean {
  const step = state.reamkerQuestStep ?? 0;
  if (step < 1 || step > 5) return false;
  const def = REAMKER_QUEST_STEPS[step - 1];
  if ((state.reamkerStepProgress ?? 0) >= def.targetCount) return true;

  // Also honor existing milestone completion for Steps 4 & 5 so veteran players aren't blocked!
  if (step === 4 && (state.highestTowerFloor ?? 0) >= 5) return true;
  if (
    step === 5 &&
    (state.museumDonations?.length ?? 0) >= 1 &&
    ((state.clearedBosses ?? []).includes('krong_reap') ||
      (state.clearedBosses ?? []).includes('sdech_kongkaeb'))
  ) {
    return true;
  }
  return false;
}

export function claimReamkerStepReward(
  state: PlayerState
): { state: PlayerState; ok: boolean; message: string; completedAll?: boolean } {
  const step = state.reamkerQuestStep ?? 0;
  if (step < 1 || step > 5) {
    return { state, ok: false, message: 'No active Reamker quest step to claim.' };
  }
  if (!isReamkerStepClaimable(state)) {
    const def = REAMKER_QUEST_STEPS[step - 1];
    return {
      state,
      ok: false,
      message: `Complete Part ${step} (${def.objectiveText}) before claiming!`,
    };
  }

  const def = REAMKER_QUEST_STEPS[step - 1];
  const isFinal = step === 5;
  const nextCoins = state.currencies.coins + def.rewardCoins;
  const nextDiamonds = state.currencies.diamonds + (isFinal ? 50 : 0);
  const nextInv = state.inventory.map((i) => ({ ...i }));

  if (isFinal) {
    for (const grantId of ['hat_hanuman_spirit_mask', 'wings_sbek_thom_aura']) {
      if (!nextInv.some((i) => i.itemId === grantId && i.quantity > 0)) {
        nextInv.push({ itemId: grantId, quantity: 1, itemLevel: 1, quality: 'normal' });
      }
    }
  }

  const nextStep = isFinal ? 6 : step + 1;
  return {
    state: {
      ...state,
      coins: nextCoins,
      currencies: {
        ...state.currencies,
        coins: nextCoins,
        diamonds: nextDiamonds,
      },
      inventory: nextInv,
      reamkerQuestStep: nextStep,
      reamkerStepProgress: 0,
    },
    ok: true,
    completedAll: isFinal,
    message: isFinal
      ? '🎭 REAMKER GRAND FINALE COMPLETE! +1,500 Coins · +50 💎 Diamonds · Unlocked Hanuman Spirit Mask & Sbek Thom Shadow Puppet Aura!'
      : `🎭 Completed Reamker Part ${step}/5: ${def.title} (+${def.rewardCoins}c)! Next: Part ${nextStep}/5!`,
  };
}
