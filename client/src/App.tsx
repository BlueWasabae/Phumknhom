import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  INITIAL_PLAYER_STATE,
  type ActiveDungeonFightInfo,
  type BondPartnerRecord,
  type BossId,
  type ChatMessage,
  type CombatHitResult,
  type DifficultyMode,
  type EquipSlot,
  type EquippedLoadout,
  type KromGuild,
  type PlayerState,
  type QualityTier,
  type SkillId,
  type TukTukCartItem,
  type TukTukCartListing,
  type WeaponAuraId,
  type ZoneType,
} from '@shared/types';
import { rollRandomTreasureMap } from '@shared/treasureMaps';
import {
  formatDropRatePct,
  getRarityTierDef,
  isAnnouncementRarity,
  rollChaseDropForSource,
  type DropSourceCategory,
} from '@shared/raritySystem';
import { donateItemToMuseum } from '@shared/museumCatalog';
import type { ActiveWorldEventSnapshot, NightMarketOffer } from '@shared/worldEvents';
import type { FestivalId } from '@shared/festivals';
import { KHMER_CLASSES } from '@shared/khmerClasses';
import { computeVillageToDungeonBridge } from '@shared/skillTrees';
import {
  ACCESSORY_DEFS,
  fuseAccessoryRecipe,
  normalizeAccessorySlots,
} from '@shared/accessoryFusions';
import { craftCombatArmorSet } from './data/armorSets';
import {
  getNpcPerkFlags,
  giveGiftToNpc,
  type KhmerNpcId,
} from '@shared/npcSchedules';
import { buyHouseFurniture } from '@shared/houseDecor';
import {
  getScaledReforgeCost,
  rollReforgeModifier,
  type ReforgeCategory,
} from '@shared/reforgeModifiers';
import type { BiomeId, CityServerId } from '@shared/worldMapData';
import {
  ITEM_CATALOG,
  buildWeaponStatsFromItem,
  buyFashionItem,
  computeLoadoutDefenseAndHp,
  computeStylishScore,
} from './data/items';
import {
  assignQuickSnackSlot,
  buyStreetSnack,
  consumeStreetSnack,
  cookStreetSnack,
} from './data/recipes';
import {
  buyArtisanMachine,
  buyFarmSupply,
  buyFruitTree,
  buyLivestock,
  collectArtisanOutput,
  collectLivestock,
  fastForwardFarmTimers,
  harvestFruitTree,
  sellFarmProduce,
  startArtisanProcess,
  type ActionResult,
} from './game/systems/FarmingEngine';
import { respecAllSkills, unlockSkillTalent, awardSkillXp } from './game/systems/SkillManager';
import { donateToPagodaAltar } from './data/pagodaBundles';
import {
  applyRealMoneySkuPurchase,
  claimDailyVipReliquaryKey,
  getTodayDateKey,
  hasFirstTimeBonusForPack,
  hasFreeDailyCoinSpin,
  isVillagePassActive,
  openReliquaryChests,
  purchaseDiamondShopItem,
  purchaseVipPassWithDiamonds,
  redeemAngkorShards,
  togglePlazaMount,
  type ReliquaryOpenBatchResult,
} from './data/diamondStore';
import {
  applyShimmerTransmute,
  claimKhmerArsenalStarterChest,
  craftKhmerArsenalWeapon,
} from './data/khmerArsenal';
import {
  payBusFare,
  unlockBiomeAndPylon,
  type TravelRequestPayload,
} from './game/systems/TravelAndPylons';
import {
  acceptFriendRequestApi,
  bankActionApi,
  buyMarketListingApi,
  cancelMarketListingApi,
  claimFriendReferralApi,
  createAbaKhqrCheckoutApi,
  createMarketListingApi,
  createStripeCheckoutApi,
  declineFriendRequestApi,
  fetchFriends,
  hydratePlayerStateFromSave,
  loadGuestCreationProfile,
  loadGuestProgressSnapshot,
  popPendingReferralCoinsApi,
  reforgeItemApi,
  sandboxTopUpApi,
  sanitizeLegacyLocalStoragePets,
  saveAccountProfile,
  saveGuestCreationProfile,
  saveGuestProgressSnapshot,
  sendFriendRequestApi,
  syncGoogleAccount,
  type AuthSession,
  type FriendRecord,
  type FriendsListResponse,
  type LeaderboardCategory,
  type MarketListingClient,
  type PromoRedeemReward,
} from './game/network/ApiClient';
import { roomClient } from './game/network/RoomClient';
import { launchPhaserGame } from './game/config';
import {
  EventBus,
  type BossHudPayload,
  type ClassMeterPayload,
  type DungeonOutcomePayload,
  type FarmToolMode,
  type IncomingDungeonInvitePayload,
  type InspectedRemotePlayer,
  type NetworkStatusPayload,
  type SkillXpToastPayload,
} from './game/EventBus';
import { HUD } from './ui/HUD';
import { ChatOverlay } from './ui/ChatOverlay';
import { MobileControls } from './ui/MobileControls';
import { ProfileModal } from './ui/ProfileModal';
import { InventoryModal } from './ui/InventoryModal';
import { FarmModal, type FarmModalTab } from './ui/FarmModal';
import { ShopModal, type ShopMode } from './ui/ShopModal';
import { SkillTreeModal } from './ui/SkillTreeModal';
import { ModeSelectorModal } from './ui/ModeSelectorModal';
import { AreaSwitcherModal } from './ui/AreaSwitcherModal';
import { AuthModal } from './ui/AuthModal';
import { PlayerActionModal } from './ui/PlayerActionModal';
import { FriendsModal } from './ui/FriendsModal';
import { FishingModal, type FishingCatchReward } from './ui/FishingModal';
import { FishingMiniGame } from './ui/FishingMiniGame';
import type { FishingBitePayload } from './game/EventBus';
import {
  COIN_SPIN_COST,
  GOLD_SPIN_COST,
  LuckyWheelModal,
  type WheelPrize,
} from './ui/LuckyWheelModal';
import { PagodaBundleModal } from './ui/PagodaBundleModal';
import { MarketModal } from './ui/MarketModal';
import { BestiaryModal } from './ui/BestiaryModal';
import { DiamondStoreModal } from './ui/DiamondStoreModal';
import { ReliquaryModal } from './ui/ReliquaryModal';
import { WorldMapModal } from './ui/WorldMapModal';
import { ServerCityModal } from './ui/ServerCityModal';
import { ServerTickerBanner } from './ui/ServerTickerBanner';
import { ReforgeModal, type ReforgeTab } from './ui/ReforgeModal';
import { ClubGamesModal, type ClubGameTab } from './ui/ClubGamesModal';
import { CharacterCreatorModal, type CharacterCreationResult } from './ui/CharacterCreatorModal';
import { NpcDialogueModal } from './ui/NpcDialogueModal';
import { HouseDecorModal } from './ui/HouseDecorModal';
import { LeaderboardModal } from './ui/LeaderboardModal';
import { PagodaTowerModal } from './ui/PagodaTowerModal';
import { MuseumModal } from './ui/MuseumModal';
import { NightMarketModal } from './ui/NightMarketModal';
import { FestivalModal } from './ui/FestivalModal';
import { KromModal } from './ui/KromModal';
import { ScryingMirrorModal } from './ui/ScryingMirrorModal';
import { TukTukCartModal } from './ui/TukTukCartModal';
import { TreasureMapModal } from './ui/TreasureMapModal';
import { RunwayModal } from './ui/RunwayModal';
import { BondModal } from './ui/BondModal';
import { BountyBoardModal } from './ui/BountyBoardModal';
import { AdminPanelModal } from './ui/AdminPanelModal';
import { PromoCodeModal } from './ui/PromoCodeModal';
import { PhotoModeOverlay } from './ui/PhotoModeOverlay';
import { DailyLoginModal } from './ui/DailyLoginModal';
import { SeasonPassModal } from './ui/SeasonPassModal';
import { AchievementsModal } from './ui/AchievementsModal';
import {
  claimDailyLoginReward,
  getDailyLoginStatus,
} from '@shared/loginRewards';
import {
  SEASON_PASS_TIERS,
  awardSeasonPassXp,
  claimSeasonPassTier,
  unlockRoyalSeasonPass,
} from '@shared/seasonPass';
import {
  evaluateAchievements,
  type AchievementDef,
  type AchievementId,
} from '@shared/achievements';
import { STARTER_GUIDE_STEPS, WelcomeGuideWidget } from './ui/WelcomeGuideWidget';
import type { StarterGuideStepId } from '@shared/types';
import {
  claimBountyReward,
  getActiveBounties,
  recordBountyProgress,
  type BountyCategory,
} from '@shared/bounties';
import { getMountSpec } from './game/entities/MountEntity';
import { soundManager } from './game/systems/SoundManager';
import { seasonClock } from './game/systems/SeasonClock';
import { worldEventManager } from './game/systems/WorldEventManager';
import { supabase } from './lib/supabaseClient';

type ActiveModalType =
  | null
  | 'profile'
  | 'inventory'
  | 'farm'
  | 'snackShop'
  | 'fashionShop'
  | 'skills'
  | 'modeSelector'
  | 'areaSwitcher'
  | 'friends'
  | 'auth'
  | 'fishing'
  | 'luckyWheel'
  | 'pagoda'
  | 'market'
  | 'bestiary'
  | 'diamondStore'
  | 'worldMap'
  | 'serverCity'
  | 'reforge'
  | 'clubGames'
  | 'houseDecor'
  | 'leaderboard'
  | 'pagodaTower'
  | 'museum'
  | 'nightMarket'
  | 'festival'
  | 'krom'
  | 'scryingMirror'
  | 'tukTukCart'
  | 'treasureMap'
  | 'runway'
  | 'bond'
  | 'bounties'
  | 'promo'
  | 'admin'
  | 'dailyLogin'
  | 'seasonPass'
  | 'achievements'
  | 'reliquary'
  | 'characterCreator';

interface FloatingXpBanner extends SkillXpToastPayload {
  uid: number;
}

export const App: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  const [player, setPlayer] = useState<PlayerState>(() => {
    const savedGuest = loadGuestProgressSnapshot();
    if (savedGuest) {
      return hydratePlayerStateFromSave(savedGuest, savedGuest.name);
    }
    return {
      ...INITIAL_PLAYER_STATE,
      name: `PhumHero_${Math.floor(10 + Math.random() * 89)}`,
      weapon: { ...INITIAL_PLAYER_STATE.weapon },
      loadout: { ...INITIAL_PLAYER_STATE.loadout },
      currencies: { ...INITIAL_PLAYER_STATE.currencies },
      lifeStats: {
        ...INITIAL_PLAYER_STATE.lifeStats,
        stylish: computeStylishScore(INITIAL_PLAYER_STATE.loadout),
      },
    };
  });

  const [activeNpcId, setActiveNpcId] = useState<KhmerNpcId | null>(null);
  const [activeFishingBite, setActiveFishingBite] = useState<FishingBitePayload | null>(null);
  const [focusedCartId, setFocusedCartId] = useState<string | null>(null);
  const [bondPrefillPartner, setBondPrefillPartner] = useState<string | null>(null);
  const [houseDecorateMode, setHouseDecorateMode] = useState(false);
  const [photoMode, setPhotoMode] = useState(false);
  const [canInstallPwa, setCanInstallPwa] = useState(false);
  const deferredInstallPromptRef = useRef<{
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  } | null>(null);
  const pendingReferralRef = useRef<string | null>(null);
  const [leaderboardCategory, setLeaderboardCategory] = useState<LeaderboardCategory>('farmer');
  const [activeWorldEvent, setActiveWorldEvent] = useState<ActiveWorldEventSnapshot | null>(() =>
    worldEventManager.getActiveEvent()
  );
  const [activeFestival, setActiveFestival] = useState<FestivalId | null>(
    () => seasonClock.getSnapshot().activeFestival
  );

  useEffect(() => {
    const u1 = worldEventManager.subscribe(setActiveWorldEvent);
    const u2 = seasonClock.subscribe((snap) => setActiveFestival(snap.activeFestival));

    // Update 2.0: Capture PWA beforeinstallprompt for "Install App" button
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredInstallPromptRef.current = e as unknown as {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
      };
      setCanInstallPwa(true);
    };
    const onAppInstalled = () => {
      deferredInstallPromptRef.current = null;
      setCanInstallPwa(false);
      EventBus.emit('ui:toast', { text: '📲 ភូមិខ្ញុំ installed to your home screen!' });
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);

    // Update 2.0: Parse Friend Invite Referral (?ref=<Username>)
    try {
      const params = new URLSearchParams(window.location.search);
      const refParam = params.get('ref')?.trim();
      if (refParam) {
        pendingReferralRef.current = refParam.slice(0, 24);
        window.sessionStorage.setItem('phum_khnhom_ref', refParam.slice(0, 24));
      } else {
        const storedRef = window.sessionStorage.getItem('phum_khnhom_ref');
        if (storedRef) pendingReferralRef.current = storedRef;
      }
    } catch {
      // ignore URL/storage issues
    }

    return () => {
      u1();
      u2();
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstallPwa = useCallback(async () => {
    const promptEvt = deferredInstallPromptRef.current;
    if (promptEvt) {
      await promptEvt.prompt();
      const choice = await promptEvt.userChoice;
      if (choice.outcome === 'accepted') {
        deferredInstallPromptRef.current = null;
        setCanInstallPwa(false);
      }
      return;
    }
    EventBus.emit('ui:toast', {
      text: '📲 Install App: Open browser menu → "Install App" or "Add to Home Screen"!',
    });
  }, []);

  const [zone, setZone] = useState<ZoneType>('overworld');
  const [networkStatus, setNetworkStatus] = useState<NetworkStatusPayload>({
    online: false,
    areaId: 'AREA 0',
    areaChannel: 0,
    playerCount: 1,
  });
  const [nearPortal, setNearPortal] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatDraftPrefill, setChatDraftPrefill] = useState<{ text: string; nonce: number } | null>(null);
  const [touchUiEnabled, setTouchUiEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const hasCoarsePointer =
        typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
      const hasTouchPoints = (navigator?.maxTouchPoints ?? 0) > 0;
      const isNarrowViewport = window.innerWidth <= 900;
      return Boolean(hasCoarsePointer || (hasTouchPoints && isNarrowViewport));
    } catch {
      return false;
    }
  });
  const [activeModal, setActiveModal] = useState<ActiveModalType>('auth');
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [saveStatus, setSaveStatus] = useState<'guest' | 'saving' | 'saved'>('guest');
  const [friendsTab, setFriendsTab] = useState<'friends' | 'inbox'>('friends');
  const [friendsData, setFriendsData] = useState<FriendsListResponse>({
    accepted: [],
    incoming: [],
    outgoing: [],
  });
  const [dungeonInvites, setDungeonInvites] = useState<IncomingDungeonInvitePayload[]>([]);
  const [inspectedPlayer, setInspectedPlayer] = useState<InspectedRemotePlayer | null>(null);
  const [farmModalTab, setFarmModalTab] = useState<FarmModalTab>('seeds');
  const [shopTab, setShopTab] = useState<'primary' | 'secondary'>('primary');
  const [reforgeTab, setReforgeTab] = useState<ReforgeTab>('reforge');
  const [clubGameTab, setClubGameTab] = useState<ClubGameTab>('tien_len');
  const [clubTableId, setClubTableId] = useState<string>('tl_50');
  const [preselectedBossId, setPreselectedBossId] = useState<BossId>('sdech_kongkaeb');
  const [selectedCropId, setSelectedCropId] = useState('trakuon');
  const [farmToolMode, setFarmToolMode] = useState<FarmToolMode>('smart');
  const [lastHit, setLastHit] = useState<CombatHitResult | null>(null);
  const [bossHud, setBossHud] = useState<BossHudPayload | null>(null);
  const [dungeonOutcome, setDungeonOutcome] = useState<DungeonOutcomePayload | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [xpBanners, setXpBanners] = useState<FloatingXpBanner[]>([]);
  const [achievementBanner, setAchievementBanner] = useState<AchievementDef | null>(null);
  const achievementTimerRef = useRef<number | null>(null);
  const dailyLoginAutoShownDateRef = useRef<string | null>(null);

  const showAchievementBanner = useCallback((unlocked: AchievementDef[]) => {
    if (unlocked.length === 0) return;
    const first = unlocked[0];
    soundManager.playSfx('victory');
    setAchievementBanner(first);
    if (achievementTimerRef.current) window.clearTimeout(achievementTimerRef.current);
    achievementTimerRef.current = window.setTimeout(() => {
      setAchievementBanner(null);
    }, 4400);
  }, []);
  const [classMeter, setClassMeter] = useState<ClassMeterPayload>({
    classId: 'lbokator',
    stealthPct: 0,
    yantStacks: 0,
    lbokatorStance: 1,
  });
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'sys-welcome',
      sender: 'Phum Guide',
      text: 'Phase 6 Multiplayer Plaza live! Open a 2nd tab or phone browser to walk, chat, emote & flex outfits live in AREA 0–2!',
      timestamp: Date.now(),
    },
  ]);

  const runStateAction = useCallback(
    (
      fn: (prev: PlayerState) => { state: PlayerState; ok: boolean; message: string },
      isFarm = false,
      explicitAchievements: AchievementId[] = []
    ) => {
      let unlockedNow: AchievementDef[] = [];
      setPlayer((prev) => {
        const res = fn(prev);
        EventBus.emit('ui:toast', { text: res.message });
        if (res.ok) {
          const achRes = evaluateAchievements(res.state, explicitAchievements);
          unlockedNow = achRes.newlyUnlocked;
          EventBus.emit('player:stateSync', achRes.state);
          if (isFarm) EventBus.emit('farm:stateUpdated', achRes.state);
          return achRes.state;
        }
        return prev;
      });
      if (unlockedNow.length > 0) {
        showAchievementBanner(unlockedNow);
      }
    },
    [showAchievementBanner]
  );

  // Update 2.1: Auto-open 7-Day Login Streak Calendar once per calendar day after entering OverworldScene
  useEffect(() => {
    if (zone !== 'overworld') return;
    if (activeModal !== null || activeNpcId !== null || photoMode) return;
    if (!(player.hasCompletedCreation ?? player.loadout.hasCompletedCreation)) return;

    const status = getDailyLoginStatus(player);
    if (status.claimedToday) return;
    if (dailyLoginAutoShownDateRef.current === status.todayKey) return;

    dailyLoginAutoShownDateRef.current = status.todayKey;
    const t = window.setTimeout(() => {
      setActiveModal((cur) => (cur === null ? 'dailyLogin' : cur));
    }, 650);
    return () => window.clearTimeout(t);
  }, [zone, activeModal, activeNpcId, photoMode, player.hasCompletedCreation, player.loadout.hasCompletedCreation, player.lastLoginDate]);

  const runFarmAction = useCallback(
    (fn: (prev: PlayerState) => ActionResult) => runStateAction(fn, true),
    [runStateAction]
  );

  const applyLoadoutPatch = useCallback((patch: Partial<EquippedLoadout>, toastMsg?: string) => {
    setPlayer((prev) => {
      const nextLoadout: EquippedLoadout = { ...prev.loadout, ...patch };
      const nextWeapon = buildWeaponStatsFromItem(nextLoadout.weapon);
      const nextClass = nextWeapon.classId;
      const derived = computeLoadoutDefenseAndHp(nextLoadout, prev.level);
      const stylish = computeStylishScore(nextLoadout);

      const provisional: PlayerState = {
        ...prev,
        activeClass: nextClass,
        weapon: {
          ...nextWeapon,
          baseDamage: nextWeapon.baseDamage + derived.bonusFlatAtk,
          critChance: Math.min(0.65, nextWeapon.critChance + derived.bonusCrit),
        },
        defense: derived.defense,
        maxHp: derived.maxHp,
        loadout: nextLoadout,
        lifeStats: {
          ...prev.lifeStats,
          stylish,
        },
      };
      const bridge = computeVillageToDungeonBridge(provisional);
      const nextState: PlayerState = {
        ...provisional,
        hp: Math.min(prev.hp, bridge.effectiveMaxHp),
        skillDamagePct: bridge.classSkillDamagePct,
        snackBuffPct: bridge.snackAttackPct,
      };

      EventBus.emit('player:loadoutChanged', {
        loadout: nextLoadout,
        activeClass: nextClass,
        playerState: nextState,
      });

      if (toastMsg) {
        EventBus.emit('ui:toast', { text: toastMsg });
      }
      return nextState;
    });
  }, []);

  const handleEquipItem = useCallback(
    (itemId: string) => {
      const def = ITEM_CATALOG[itemId];
      if (!def) return;
      if (def.slot === 'accessory') {
        const curSlots = normalizeAccessorySlots(playerRef.current.loadout.accessories);
        if (curSlots.includes(def.id)) {
          EventBus.emit('ui:toast', { text: `${def.name} is already equipped in an Accessory slot!` });
          return;
        }
        const emptyIdx = curSlots.findIndex((s) => s === null);
        const nextSlots = [...curSlots];
        const targetIdx = emptyIdx >= 0 ? emptyIdx : nextSlots.length - 1;
        nextSlots[targetIdx] = def.id;
        applyLoadoutPatch(
          { accessories: nextSlots },
          `Equipped ${def.name} in Accessory Slot ${targetIdx + 1}!`
        );
        return;
      }
      const patch: Partial<EquippedLoadout> = {};
      if (def.eyeStyleOverride) {
        patch.eyeStyle = def.eyeStyleOverride;
      } else if (def.faceStyleOverride) {
        patch.faceStyle = def.faceStyleOverride;
      } else {
        patch[def.slot] = def.id;
        if (def.hairStyleOverride) {
          patch.hairStyle = def.hairStyleOverride;
        }
      }
      const clsTag = def.classId ? ` → ${KHMER_CLASSES[def.classId].englishName}` : '';
      applyLoadoutPatch(patch, `Equipped ${def.name}${clsTag}!`);
    },
    [applyLoadoutPatch]
  );

  const handleUnequipSlot = useCallback(
    (slot: EquipSlot) => {
      if (slot === 'weapon' || slot === 'accessory') return;
      applyLoadoutPatch({ [slot]: null }, `Unequipped ${slot}.`);
    },
    [applyLoadoutPatch]
  );

  const handleUnequipAccessory = useCallback(
    (slotIndex: number) => {
      const curSlots = normalizeAccessorySlots(playerRef.current.loadout.accessories);
      const removedId = curSlots[slotIndex];
      if (!removedId) return;
      const nextSlots = [...curSlots];
      nextSlots[slotIndex] = null;
      const name = ACCESSORY_DEFS[removedId]?.name ?? 'Accessory';
      applyLoadoutPatch({ accessories: nextSlots }, `Removed ${name} from Slot ${slotIndex + 1}.`);
    },
    [applyLoadoutPatch]
  );

  const handleToggleVanityOverride = useCallback(
    (showVanity: boolean) => {
      applyLoadoutPatch(
        { showVanityOverArmor: showVanity },
        showVanity
          ? '🎭 Vanity Override ON — fashion outfits display over Combat Armor!'
          : '🛡️ Displaying Combat Armor visuals directly!'
      );
    },
    [applyLoadoutPatch]
  );

  const handleFuseAccessory = useCallback(
    (recipeId: string) => {
      runStateAction((s) => {
        const res = fuseAccessoryRecipe(s, recipeId);
        if (res.ok) {
          soundManager.playSfx('level_up');
          const bridge = computeVillageToDungeonBridge(res.state);
          const nextState: PlayerState = {
            ...res.state,
            hp: Math.min(res.state.hp, bridge.effectiveMaxHp),
          };
          EventBus.emit('player:loadoutChanged', {
            loadout: nextState.loadout,
            activeClass: nextState.activeClass,
            playerState: nextState,
          });
          return { ...res, state: nextState };
        }
        return res;
      });
    },
    [runStateAction]
  );

  const handleBuyBaseAccessory = useCallback(
    (accId: string) => {
      runStateAction((s) => {
        const def = ACCESSORY_DEFS[accId];
        if (!def || !def.buyCoins) {
          return { state: s, ok: false, message: 'Accessory cannot be purchased directly.' };
        }
        if (s.currencies.coins < def.buyCoins) {
          return { state: s, ok: false, message: `Need ${def.buyCoins} Coins to buy ${def.name}.` };
        }
        const nextCoins = s.currencies.coins - def.buyCoins;
        const nextInv = [...s.inventory];
        const idx = nextInv.findIndex((i) => i.itemId === def.id);
        if (idx >= 0) {
          nextInv[idx] = { ...nextInv[idx], quantity: nextInv[idx].quantity + 1 };
        } else {
          nextInv.push({ itemId: def.id, quantity: 1, itemLevel: 2 });
        }
        soundManager.playSfx('coin');
        return {
          state: {
            ...s,
            coins: nextCoins,
            currencies: { ...s.currencies, coins: nextCoins },
            inventory: nextInv,
          },
          ok: true,
          message: `Bought ${def.icon} ${def.name} (-${def.buyCoins}c)! Added to Container.`,
        };
      });
    },
    [runStateAction]
  );

  const handleToggleMount = useCallback(() => {
    const cur = playerRef.current;
    if (cur.zone !== 'overworld') {
      EventBus.emit('ui:toast', { text: '🚲 Mounts can only be ridden outdoors in Overworld maps!' });
      return;
    }
    if (cur.activeMount) {
      runStateAction((s) => {
        roomClient.sendMountState(null);
        soundManager.playSfx('click');
        return {
          state: { ...s, activeMount: null },
          ok: true,
          message: 'Dismounted.',
        };
      });
      return;
    }
    // Use equipped mount slot, or fall back to first owned mount in inventory/ownedMounts
    const equippedMount = cur.loadout.mount;
    const ownedInvMount = cur.inventory.find((i) => ITEM_CATALOG[i.itemId]?.slot === 'mount' && i.quantity > 0)?.itemId;
    const ownedListMount = (cur.ownedMounts ?? [])[0];
    const targetMount = equippedMount || ownedInvMount || ownedListMount || null;
    if (!targetMount) {
      EventBus.emit('ui:toast', {
        text: '🚲 No Mount owned yet! Buy Village Bicycle (450c), Water Buffalo (1,200c), or Mini Tuk-Tuk in Fashion Boutique!',
      });
      return;
    }
    const spec = getMountSpec(targetMount);
    runStateAction((s) => {
      roomClient.sendMountState(targetMount);
      soundManager.playSfx('magic');
      return {
        state: {
          ...s,
          activeMount: targetMount,
          loadout: { ...s.loadout, mount: targetMount },
        },
        ok: true,
        message: `Mounted ${spec?.name ?? targetMount} (+${Math.round((spec?.speedBonusPct ?? 0.35) * 100)}% Move Speed${spec?.allowsPassenger ? ' · [H] Horn & 2-Seat!' : ''})!`,
      };
    });
  }, [runStateAction]);

  const handleCraftArmorSet = useCallback(
    (armorId: string) => {
      runStateAction((s) => {
        const res = craftCombatArmorSet(s, armorId);
        if (res.ok) soundManager.playSfx('level_up');
        return res;
      });
    },
    [runStateAction]
  );

  const handleSelectFarmSeed = useCallback((cropId: string, toolMode: FarmToolMode) => {
    setSelectedCropId(cropId);
    setFarmToolMode(toolMode);
    EventBus.emit('farm:selectSeed', { cropId, toolMode });
  }, []);

  const handleEatQuickSlot = useCallback(
    (slotIndex: 0 | 1 | 2) => {
      let ate = false;
      runStateAction((s) => {
        const snackId = s.quickSnackSlots[slotIndex];
        if (!snackId) {
          return {
            state: s,
            ok: false,
            message: `Quick-Snack Slot [${slotIndex + 1}] is empty. Assign a snack at the Num Pang Cart!`,
          };
        }
        const res = consumeStreetSnack(s, snackId);
        if (res.ok) {
          ate = true;
          soundManager.playSfx('heal');
        }
        return res;
      });
      if (ate) {
        window.setTimeout(() => {
          EventBus.emit('bounty:progress', { category: 'eat_or_cook_snack', amount: 1 });
        }, 0);
      }
    },
    [runStateAction]
  );

  const authSessionRef = useRef<AuthSession | null>(null);
  const playerRef = useRef<PlayerState>(player);
  const inActiveBossFightRef = useRef(false);
  const skipNextAutoSaveRef = useRef(false);
  const syncedGoogleTokenRef = useRef<string | null>(null);

  const inActiveBossFight = Boolean(zone === 'dungeon' && bossHud?.active);
  useEffect(() => {
    inActiveBossFightRef.current = inActiveBossFight;
  }, [inActiveBossFight]);

  useEffect(() => {
    authSessionRef.current = authSession;
  }, [authSession]);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  const refreshFriends = useCallback(async (explicitPlayerId?: string) => {
    const pid = explicitPlayerId ?? authSessionRef.current?.playerId;
    if (!pid) return;
    const data = await fetchFriends(pid);
    setFriendsData(data);
  }, []);

  // Debounced auto-save whenever player harvests, buys/sells, equips, gifts NPCs, decorates home, or switches zones
  useEffect(() => {
    if (!authSession) {
      // Persist Guest / Offline progress (friendships, house decor, accessories, coins, inventory) cleanly in localStorage
      const guestTimer = window.setTimeout(() => {
        saveGuestProgressSnapshot(playerRef.current);
      }, 450);
      return () => window.clearTimeout(guestTimer);
    }
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }
    setSaveStatus('saving');
    const timer = window.setTimeout(() => {
      void saveAccountProfile(authSession, playerRef.current).then((res) => {
        if (res.ok) setSaveStatus('saved');
      });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [authSession, player, zone]);

  // Flush save cleanly before tab refresh/close
  useEffect(() => {
    const onUnload = () => {
      const sess = authSessionRef.current;
      if (sess) {
        void saveAccountProfile(sess, playerRef.current, true);
      } else {
        saveGuestProgressSnapshot(playerRef.current);
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  const handleAuthenticated = useCallback(
    (session: AuthSession, loadedState: PlayerState) => {
      skipNextAutoSaveRef.current = true;
      setAuthSession(session);
      setSaveStatus('saved');
      setPlayer(loadedState);
      const needsCreation = !(
        loadedState.hasCompletedCreation ?? loadedState.loadout.hasCompletedCreation
      );
      setActiveModal(needsCreation ? 'characterCreator' : null);
      EventBus.emit('player:stateSync', loadedState);
      EventBus.emit('auth:identityChanged', {
        playerId: session.playerId,
        playerState: loadedState,
      });
      EventBus.emit('ui:toast', {
        text: needsCreation
          ? `Account ready, ${session.username}! Customize your Hero & Khmer Class.`
          : `Welcome back, ${session.username}! Cloud Save synced (${
              session.storageMode === 'supabase' ? 'Supabase' : 'Local DB'
            }).`,
      });
      void refreshFriends(session.playerId);
      // Claim any Friend Invite coins earned while offline
      void popPendingReferralCoinsApi(session.username).then((bonusCoins) => {
        if (bonusCoins > 0) {
          soundManager.playSfx('coin');
          setPlayer((prev) => {
            const nextCoins = prev.currencies.coins + bonusCoins;
            const next: PlayerState = {
              ...prev,
              coins: nextCoins,
              currencies: { ...prev.currencies, coins: nextCoins },
            };
            EventBus.emit('player:stateSync', next);
            return next;
          });
          EventBus.emit('ui:toast', {
            text: `🎁 Friend Invite Bonus! You earned +${bonusCoins} Coins from invited friends!`,
          });
        }
      });
    },
    [refreshFriends]
  );

  // Supabase Google (Gmail) OAuth session listener: exchanges access_token via POST /api/auth/google-sync
  useEffect(() => {
    if (!supabase) return;

    const handleSupabaseSession = async (
      accessToken: string | undefined,
      userId: string | undefined,
      email: string | undefined
    ) => {
      if (!accessToken || !userId) return;
      if (syncedGoogleTokenRef.current === accessToken) return;
      syncedGoogleTokenRef.current = accessToken;

      const res = await syncGoogleAccount(accessToken, playerRef.current);
      if (!res.ok) {
        syncedGoogleTokenRef.current = null;
        EventBus.emit('ui:toast', { text: `Google Sign-In sync failed: ${res.error}` });
        return;
      }

      handleAuthenticated(
        { ...res.session, email: res.session.email ?? email ?? null },
        res.playerState
      );
    };

    void supabase.auth.getSession().then(({ data }) => {
      const sess = data.session;
      if (sess?.access_token && sess.user?.id) {
        void handleSupabaseSession(sess.access_token, sess.user.id, sess.user.email);
      }
    });

    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') &&
        session?.access_token &&
        session.user?.id
      ) {
        void handleSupabaseSession(session.access_token, session.user.id, session.user.email);
      } else if (event === 'SIGNED_OUT') {
        syncedGoogleTokenRef.current = null;
      }
    });

    return () => {
      authSub.subscription.unsubscribe();
    };
  }, [handleAuthenticated]);

  const handleCompleteCharacterCreation = useCallback(
    (result: CharacterCreationResult) => {
      const nextLoadout: EquippedLoadout = {
        ...result.loadout,
        weapon: result.starterWeaponId,
        pet: null,
        petId: null,
        hasCompletedCreation: true,
      };
      let updatedSnapshot: PlayerState | null = null;
      setPlayer((prev) => {
        const nextWeapon = buildWeaponStatsFromItem(result.starterWeaponId);
        const derived = computeLoadoutDefenseAndHp(nextLoadout, prev.level);
        const stylish = computeStylishScore(nextLoadout);
        const provisional: PlayerState = {
          ...prev,
          name: result.name,
          activeClass: result.selectedClass,
          hasCompletedCreation: true,
          weapon: {
            ...nextWeapon,
            baseDamage: nextWeapon.baseDamage + derived.bonusFlatAtk,
            critChance: Math.min(0.65, nextWeapon.critChance + derived.bonusCrit),
          },
          defense: derived.defense,
          maxHp: derived.maxHp,
          loadout: nextLoadout,
          lifeStats: {
            ...prev.lifeStats,
            stylish,
          },
        };
        const bridge = computeVillageToDungeonBridge(provisional);
        const nextState: PlayerState = {
          ...provisional,
          hp: bridge.effectiveMaxHp,
          skillDamagePct: bridge.classSkillDamagePct,
          snackBuffPct: bridge.snackAttackPct,
        };
        updatedSnapshot = nextState;
        EventBus.emit('player:loadoutChanged', {
          loadout: nextLoadout,
          activeClass: result.selectedClass,
          playerState: nextState,
        });
        EventBus.emit('player:stateSync', nextState);
        return nextState;
      });

      saveGuestCreationProfile({
        name: result.name,
        loadout: nextLoadout,
        activeClass: result.selectedClass,
        hasCompletedCreation: true,
      });

      const sess = authSessionRef.current;
      if (sess && updatedSnapshot) {
        setSaveStatus('saving');
        void saveAccountProfile(sess, updatedSnapshot).then((res) => {
          if (res.ok) setSaveStatus('saved');
        });
      }

      setActiveModal(null);
      EventBus.emit('guide:step', { stepId: 'customize_hero' });
      const pendingRef = pendingReferralRef.current;
      if (pendingRef && pendingRef.toLowerCase() !== result.name.toLowerCase() && !playerRef.current.referredBy) {
        pendingReferralRef.current = null;
        try {
          window.sessionStorage.removeItem('phum_khnhom_ref');
        } catch {
          // ignore
        }
        void claimFriendReferralApi(authSessionRef.current, pendingRef, result.name).then((refRes) => {
          if (refRes.ok && refRes.bonusCoins > 0) {
            soundManager.playSfx('coin');
            setPlayer((prev) => {
              if (prev.referredBy) return prev;
              const nextCoins = prev.currencies.coins + refRes.bonusCoins;
              const next: PlayerState = {
                ...prev,
                coins: nextCoins,
                currencies: { ...prev.currencies, coins: nextCoins },
                referredBy: pendingRef,
              };
              EventBus.emit('player:stateSync', next);
              return next;
            });
            EventBus.emit('ui:toast', {
              text: `🎁 Friend Invite Bonus! You & ${pendingRef} both earned +${refRes.bonusCoins} Bonus Coins!`,
            });
          }
        });
      }
      const clsName = KHMER_CLASSES[result.selectedClass].englishName;
      EventBus.emit('ui:toast', {
        text: `Welcome to ភូមិខ្ញុំ, ${result.name} (${clsName})!`,
      });
    },
    []
  );

  const handleOpenWhisper = useCallback((username: string) => {
    setChatOpen(true);
    setChatDraftPrefill({ text: `/w ${username} `, nonce: Date.now() });
  }, []);

  const handleAddFriendTarget = useCallback(
    async (target: InspectedRemotePlayer) => {
      const sess = authSessionRef.current;
      if (!sess) {
        EventBus.emit('ui:toast', { text: 'Sign in with an account (MENU → Login) to add friends!' });
        setActiveModal('auth');
        return;
      }
      const res = await sendFriendRequestApi(sess, {
        targetPlayerId: target.playerId || undefined,
        targetUsername: target.name,
      });
      if (!res.ok) {
        EventBus.emit('ui:toast', { text: res.error });
        return;
      }
      roomClient.sendFriendRequestPing({
        targetSessionId: target.sessionId,
        targetPlayerId: target.playerId || undefined,
        targetName: target.name,
        friendshipId: res.friendshipId,
      });
      EventBus.emit('ui:toast', {
        text:
          res.status === 'accepted'
            ? `🎉 You and ${res.targetUsername} are now Friends!`
            : `Friend request sent to ${res.targetUsername}!`,
      });
      void refreshFriends(sess.playerId);
    },
    [refreshFriends]
  );

  const handleAddFriendByName = useCallback(
    async (username: string) => {
      const sess = authSessionRef.current;
      if (!sess) {
        setActiveModal('auth');
        return;
      }
      const res = await sendFriendRequestApi(sess, { targetUsername: username });
      if (!res.ok) {
        EventBus.emit('ui:toast', { text: res.error });
        return;
      }
      EventBus.emit('ui:toast', {
        text:
          res.status === 'accepted'
            ? `🎉 You and ${res.targetUsername} are now Friends!`
            : `Friend request sent to ${res.targetUsername}!`,
      });
      void refreshFriends(sess.playerId);
    },
    [refreshFriends]
  );

  const handleAcceptFriend = useCallback(
    async (friendshipId: string) => {
      const sess = authSessionRef.current;
      if (!sess) return;
      const res = await acceptFriendRequestApi(sess, friendshipId);
      if (!res.ok) {
        EventBus.emit('ui:toast', { text: res.error });
        return;
      }
      EventBus.emit('ui:toast', { text: '🎉 Friend request accepted!' });
      void refreshFriends(sess.playerId);
    },
    [refreshFriends]
  );

  const handleDeclineFriend = useCallback(
    async (friendshipId: string) => {
      const sess = authSessionRef.current;
      if (!sess) return;
      await declineFriendRequestApi(sess, friendshipId);
      EventBus.emit('ui:toast', { text: 'Friend request declined.' });
      void refreshFriends(sess.playerId);
    },
    [refreshFriends]
  );

  const handleInviteDungeon = useCallback((target: { sessionId?: string; playerId?: string; name: string }) => {
    const sent = roomClient.sendDungeonInvite({
      targetSessionId: target.sessionId,
      targetPlayerId: target.playerId,
      targetName: target.name,
      bossId: 'sdech_kongkaeb',
    });
    if (!sent) {
      EventBus.emit('ui:toast', { text: 'Connect to the online Village Plaza to send Dungeon invites.' });
    }
  }, []);

  const handleFishingCatch = useCallback(
    (reward: FishingCatchReward) => {
      runStateAction((prev) => {
        const nextInv = prev.inventory.map((i) => ({ ...i }));
        if (reward.itemId) {
          const existing = nextInv.find(
            (i) => i.itemId === reward.itemId && (i.quality ?? 'normal') === 'normal'
          );
          if (existing) existing.quantity += 1;
          else nextInv.push({ itemId: reward.itemId, quantity: 1, itemLevel: 1, quality: 'normal' });
        }
        const nextCoins = prev.currencies.coins + (reward.coins ?? 0);
        let mapNote = '';
        let nextTreasureMap = prev.activeTreasureMap ?? null;
        if (Math.random() < 0.12) {
          const existingMap = nextInv.find((i) => i.itemId === 'item_torn_treasure_map');
          if (existingMap) existingMap.quantity += 1;
          else nextInv.push({ itemId: 'item_torn_treasure_map', quantity: 1, itemLevel: 1, quality: 'normal' });
          if (!nextTreasureMap) {
            nextTreasureMap = rollRandomTreasureMap();
          }
          mapNote = ' + 🗺️ Torn Angkor Treasure Map!';
        }
        let chaseNote = '';
        const chase = rollChaseDropForSource('fishing');
        if (chase) {
          const exChase = nextInv.find((i) => i.itemId === chase.itemId);
          if (exChase) exChase.quantity += 1;
          else nextInv.push({ itemId: chase.itemId, quantity: 1, itemLevel: 5, quality: 'normal' });
          const tier = getRarityTierDef(chase.rarity);
          chaseNote = ` + ${chase.icon} [${tier.label.toUpperCase()} ${formatDropRatePct(chase.dropRatePct)}] ${chase.name}!`;
          if (isAnnouncementRarity(chase.rarity)) {
            const pName = prev.name;
            window.setTimeout(() => {
              soundManager.playSfx('victory');
              EventBus.emit('ticker:push', {
                text: `🌟 [${tier.label.toUpperCase()} DROP · ${formatDropRatePct(chase.dropRatePct)}] ${pName} fished ${chase.icon} ${chase.name}!`,
                category: 'boss',
              });
            }, 0);
          }
        }
        const base: PlayerState = {
          ...prev,
          coins: nextCoins,
          currencies: { ...prev.currencies, coins: nextCoins },
          inventory: nextInv,
          activeTreasureMap: nextTreasureMap,
        };
        const xpRes = awardSkillXp(base, 'fishing', reward.fishingXp, true);
        window.setTimeout(() => {
          EventBus.emit('bounty:progress', { category: 'catch_fish', amount: 1 });
        }, 0);
        return {
          state: xpRes.state,
          ok: true,
          message: `🎣 Caught ${reward.label} (+${reward.fishingXp} Fishing XP)${mapNote}${chaseNote}!`,
        };
      });
    },
    [runStateAction]
  );

  const handleLuckyWheelSpin = useCallback(
    (tier: 'coin' | 'gold', prize: WheelPrize) => {
      runStateAction((prev) => {
        const useFreeVipSpin = tier === 'coin' && hasFreeDailyCoinSpin(prev);
        const coinCost = tier === 'coin' ? (useFreeVipSpin ? 0 : COIN_SPIN_COST) : 0;
        const goldCost = tier === 'gold' ? GOLD_SPIN_COST : 0;
        if (prev.currencies.coins < coinCost || prev.currencies.gold < goldCost) {
          return { state: prev, ok: false, message: 'Not enough currency for this spin.' };
        }

        let nextCoins = prev.currencies.coins - coinCost + (prize.coins ?? 0);
        const nextGold = prev.currencies.gold - goldCost;
        const nextInv = prev.inventory.map((i) => ({ ...i }));
        let dupNote = '';

        if (prize.itemId) {
          const existing = nextInv.find((i) => i.itemId === prize.itemId);
          if (prize.isEquipment && existing) {
            nextCoins += 600;
            dupNote = ' (Already owned → +600 Bonus Coins!)';
          } else if (existing) {
            existing.quantity += prize.quantity ?? 1;
          } else {
            nextInv.push({
              itemId: prize.itemId,
              quantity: prize.quantity ?? 1,
              itemLevel: 1,
              quality: 'normal',
            });
          }
        }

        const nextPity =
          tier === 'gold' ? (prize.isMythic ? 0 : (prev.luckyWheelPity ?? 0) + 1) : prev.luckyWheelPity ?? 0;

        return {
          state: {
            ...prev,
            coins: nextCoins,
            currencies: { ...prev.currencies, coins: nextCoins, gold: nextGold },
            inventory: nextInv,
            luckyWheelPity: nextPity,
            dailyFreeCoinSpinDate: useFreeVipSpin ? getTodayDateKey() : prev.dailyFreeCoinSpinDate,
          },
          ok: true,
          message: `🎡 ${useFreeVipSpin ? '👑 VIP Free Spin! ' : ''}Lucky Wheel Won: ${prize.label}${dupNote}`,
        };
      });
    },
    [runStateAction]
  );

  const handleCheckoutSku = useCallback(
    async (sku: string, method: 'stripe' | 'aba_khqr' | 'sandbox') => {
      const firstTimeBonus = hasFirstTimeBonusForPack(playerRef.current, sku);

      if (method === 'stripe') {
        const res = await createStripeCheckoutApi(authSessionRef.current, sku, firstTimeBonus);
        if (res.ok) {
          if (res.mode === 'stripe' && res.checkoutUrl) {
            window.open(res.checkoutUrl, '_blank', 'noopener');
            EventBus.emit('ui:toast', {
              text: '💳 Opened secure Stripe Checkout in a new tab! Diamonds credit automatically upon payment.',
            });
            return;
          }
          soundManager.playSfx('level_up');
          runStateAction((prev) =>
            applyRealMoneySkuPurchase(prev, sku, {
              diamondsGranted: res.diamondsGranted,
              villagePassUntil: res.villagePassUntil,
              firstTimeDoubled: res.firstTimeDoubled,
            })
          );
          return;
        }
        if (!res.error.includes('Cannot reach Phum server')) {
          EventBus.emit('ui:toast', { text: res.error });
          return;
        }
      } else if (method === 'aba_khqr') {
        const res = await createAbaKhqrCheckoutApi(authSessionRef.current, sku, firstTimeBonus);
        if (res.ok) {
          if (res.mode === 'aba_khqr') {
            EventBus.emit('ui:toast', {
              text: `🇰🇭 ABA PayWay KHQR Order Ready (${res.tranId} · $${res.amount}) — Scan with ABA Mobile!`,
            });
            return;
          }
          soundManager.playSfx('level_up');
          runStateAction((prev) =>
            applyRealMoneySkuPurchase(prev, sku, {
              diamondsGranted: res.diamondsGranted,
              villagePassUntil: res.villagePassUntil,
              firstTimeDoubled: res.firstTimeDoubled,
            })
          );
          return;
        }
        if (!res.error.includes('Cannot reach Phum server')) {
          EventBus.emit('ui:toast', { text: res.error });
          return;
        }
      } else {
        const res = await sandboxTopUpApi(authSessionRef.current, sku, firstTimeBonus);
        if (res.ok) {
          soundManager.playSfx('level_up');
          runStateAction((prev) =>
            applyRealMoneySkuPurchase(prev, sku, {
              diamondsGranted: res.diamondsGranted,
              villagePassUntil: res.villagePassUntil,
              firstTimeDoubled: res.firstTimeDoubled,
            })
          );
          return;
        }
        if (!res.error.includes('Cannot reach Phum server')) {
          EventBus.emit('ui:toast', { text: res.error });
          return;
        }
      }

      // Offline graceful Sandbox fallback when backend server on :2567 is not running
      soundManager.playSfx('level_up');
      runStateAction((prev) => applyRealMoneySkuPurchase(prev, sku));
    },
    [runStateAction]
  );

  const handleOpenReliquaryChests = useCallback(
    (count: 1 | 10): ReliquaryOpenBatchResult => {
      let result: ReliquaryOpenBatchResult = {
        state: playerRef.current,
        ok: false,
        message: 'Failed to open Reliquary.',
        entries: [],
        keysUsed: 0,
        diamondsUsed: 0,
        totalShardsGained: 0,
        topTier: 'common',
        mythicOrAncientPulled: [],
      };
      runStateAction((prev) => {
        result = openReliquaryChests(prev, count);
        return { state: result.state, ok: result.ok, message: result.message };
      });
      if (result.ok) {
        if (
          result.topTier === 'ancient' ||
          result.topTier === 'mythic' ||
          result.topTier === 'legendary'
        ) {
          soundManager.playSfx('victory');
        } else {
          soundManager.playSfx('coin');
        }
        for (const rarePull of result.mythicOrAncientPulled) {
          EventBus.emit('ticker:push', {
            text: `🏺✨ ${playerRef.current.name} unsealed a ${rarePull.tier.toUpperCase()} treasure from the Angkor Reliquary: ${rarePull.reward.icon} ${rarePull.reward.name}!`,
            category: 'club',
          });
        }
      }
      return result;
    },
    [runStateAction]
  );

  const handleReforge = useCallback(
    async (category: ReforgeCategory) => {
      const cur = playerRef.current;
      const cost = getScaledReforgeCost(category, cur.level);
      const currentPrefix = category === 'weapon' ? cur.weaponPrefix : cur.armorPrefix;
      const apiRes = await reforgeItemApi(authSessionRef.current, {
        category,
        currentPrefix,
        walletCoins: cur.currencies.coins,
        playerName: cur.name,
        itemTierPower: cur.level,
      });

      const mod = apiRes.ok ? apiRes.modifier : rollReforgeModifier(category, currentPrefix);
      const charged = apiRes.ok ? apiRes.costCoins : cost;
      if (!apiRes.ok && cur.currencies.coins < cost) {
        EventBus.emit('ui:toast', { text: apiRes.error });
        return;
      }

      soundManager.playSfx('hit');
      soundManager.playSfx(mod.tier === 'mythic' ? 'level_up' : 'coin');
      if (mod.tier === 'mythic') {
        EventBus.emit('ticker:push', {
          text: `🔨 ${cur.name} reforged a ${mod.name.toUpperCase()} (${mod.khmerName}) ${category}!`,
          category: 'reforge',
        });
      }
      runStateAction((prev) => {
        if (prev.currencies.coins < charged) {
          return { state: prev, ok: false, message: `Need ${charged} Coins to reforge.` };
        }
        const nextCoins = prev.currencies.coins - charged;
        return {
          state: {
            ...prev,
            coins: nextCoins,
            currencies: { ...prev.currencies, coins: nextCoins },
            ...(category === 'weapon' ? { weaponPrefix: mod.id } : { armorPrefix: mod.id }),
          },
          ok: true,
          message: `🔨 Reforged ${category} → ${mod.name} (${mod.summary}) [-${charged}c]!`,
        };
      });
    },
    [runStateAction]
  );

  const handleBankAction = useCallback(
    async (action: 'deposit' | 'withdraw', amount: number) => {
      const cur = playerRef.current;
      const apiRes = await bankActionApi(authSessionRef.current, action, {
        amount,
        walletCoins: cur.currencies.coins,
        bankCoins: cur.bankCoins ?? 0,
      });
      if (apiRes.ok) {
        soundManager.playSfx('coin');
        runStateAction((prev) => ({
          state: {
            ...prev,
            coins: apiRes.walletCoins,
            currencies: { ...prev.currencies, coins: apiRes.walletCoins },
            bankCoins: apiRes.bankCoins,
          },
          ok: true,
          message: apiRes.message,
        }));
        return;
      }
      // Offline graceful fallback
      runStateAction((prev) => {
        const bank = prev.bankCoins ?? 0;
        if (action === 'deposit') {
          if (amount > prev.currencies.coins) return { state: prev, ok: false, message: 'Not enough wallet Coins.' };
          const w = prev.currencies.coins - amount;
          soundManager.playSfx('coin');
          return {
            state: { ...prev, coins: w, currencies: { ...prev.currencies, coins: w }, bankCoins: bank + amount },
            ok: true,
            message: `🏧 Deposited ${amount.toLocaleString()}c into ATM Vault!`,
          };
        }
        if (amount > bank) return { state: prev, ok: false, message: 'Not enough ATM Vault Coins.' };
        const w = prev.currencies.coins + amount;
        soundManager.playSfx('coin');
        return {
          state: { ...prev, coins: w, currencies: { ...prev.currencies, coins: w }, bankCoins: bank - amount },
          ok: true,
          message: `💸 Withdrew ${amount.toLocaleString()}c from ATM Vault!`,
        };
      });
    },
    [runStateAction]
  );

  const handleTravel = useCallback(
    (req: TravelRequestPayload, busFareCoins: number) => {
      if (inActiveBossFightRef.current) {
        EventBus.emit('ui:toast', { text: '⚔️ Fast-travel is disabled during an active boss fight!' });
        return;
      }
      if (req.method === 'bus' && busFareCoins > 0) {
        let paid = false;
        runStateAction((prev) => {
          const res = payBusFare(prev, busFareCoins, req.biomeId);
          paid = res.ok;
          return res;
        });
        if (!paid) return;
      }
      EventBus.emit('travel:execute', req);
    },
    [runStateAction]
  );

  const handleUseMagicMirror = useCallback(() => {
    if (inActiveBossFightRef.current) {
      EventBus.emit('ui:toast', { text: '⚔️ Magic Mirror cannot be used during an active boss fight!' });
      return;
    }
    setActiveModal(null);
    soundManager.playSfx('magic');
    EventBus.emit('ui:toast', { text: '🪞 Magic Mirror flashed gold — warping to your Personal Farm!' });
    EventBus.emit('travel:execute', {
      method: 'mirror',
      targetZone: 'farm',
      destinationLabel: 'Personal Farm / Home',
    });
  }, []);

  const handlePrayGoldenShrine = useCallback(() => {
    const today = getTodayDateKey();
    let blessedName: string | null = null;
    runStateAction((prev) => {
      if (prev.lastShrinePrayerDate === today) {
        return {
          state: prev,
          ok: false,
          message: '✨ You already received today’s Golden Shrine Blessing! Return tomorrow.',
        };
      }
      soundManager.playSfx('level_up');
      blessedName = prev.name;
      const nextCoins = prev.currencies.coins + 250;
      const now = Date.now();
      const filteredBuffs = prev.activeBuffs.filter(
        (b) => b.expiresAt > now && b.snackId !== 'golden_shrine_blessing'
      );
      filteredBuffs.push({
        id: `shrine_${now}`,
        snackId: 'golden_shrine_blessing',
        name: 'Golden Shrine (+10% Luck)',
        khmerName: 'ពរជ័យព្រះវិហារមាស',
        icon: '✨',
        color: '#facc15',
        startedAt: now,
        expiresAt: now + 10 * 60 * 1000,
        critChanceBonus: 0.1,
      });
      return {
        state: {
          ...prev,
          coins: nextCoins,
          currencies: { ...prev.currencies, coins: nextCoins },
          activeBuffs: filteredBuffs,
          lastShrinePrayerDate: today,
        },
        ok: true,
        message: '✨ Golden Blessing Shrine granted +250 Coins & +10% Luck for 10 min!',
      };
    });
    if (blessedName) {
      EventBus.emit('ticker:push', {
        text: `✨ ${blessedName} prayed at the Green Park Golden Shrine and received +250 Coins & +10% Luck!`,
        category: 'market',
      });
    }
  }, [runStateAction]);

  const handleBuyMarketListing = useCallback(
    async (listing: MarketListingClient): Promise<boolean> => {
      if (playerRef.current.currencies.coins < listing.priceCoins) {
        EventBus.emit('ui:toast', { text: `Need ${listing.priceCoins.toLocaleString()} Coins.` });
        return false;
      }
      const res = await buyMarketListingApi(authSessionRef.current, listing.id, playerRef.current.name);
      if (!res.ok) {
        EventBus.emit('ui:toast', { text: res.error });
        return false;
      }
      soundManager.playSfx('coin');
      runStateAction((prev) => {
        const nextCoins = Math.max(0, prev.currencies.coins - res.listing.priceCoins);
        const nextInv = prev.inventory.map((i) => ({ ...i }));
        const existing = nextInv.find(
          (i) => i.itemId === res.listing.itemId && (i.quality ?? 'normal') === res.listing.quality
        );
        if (existing) existing.quantity += res.listing.quantity;
        else {
          nextInv.push({
            itemId: res.listing.itemId,
            quantity: res.listing.quantity,
            itemLevel: 1,
            quality: res.listing.quality,
          });
        }
        return {
          state: {
            ...prev,
            coins: nextCoins,
            currencies: { ...prev.currencies, coins: nextCoins },
            inventory: nextInv,
          },
          ok: true,
          message: `Bought ${res.listing.quantity}× ${res.listing.itemName} for ${res.listing.priceCoins.toLocaleString()}c (5% Tax: ${res.taxCoins}c)!`,
        };
      });
      return true;
    },
    [runStateAction]
  );

  const handleCreateMarketListing = useCallback(
    async (payload: {
      itemId: string;
      itemName: string;
      quantity: number;
      quality: QualityTier;
      priceCoins: number;
    }): Promise<boolean> => {
      const res = await createMarketListingApi(authSessionRef.current, {
        ...payload,
        sellerName: playerRef.current.name,
      });
      if (!res.ok) {
        EventBus.emit('ui:toast', { text: res.error });
        return false;
      }
      soundManager.playSfx('coin');
      runStateAction((prev) => {
        const nextInv = prev.inventory.map((i) => ({ ...i }));
        const idx = nextInv.findIndex(
          (i) => i.itemId === payload.itemId && (i.quality ?? 'normal') === payload.quality && i.quantity >= payload.quantity
        );
        if (idx >= 0) {
          nextInv[idx].quantity -= payload.quantity;
        }
        return {
          state: { ...prev, inventory: nextInv.filter((i) => i.quantity > 0) },
          ok: true,
          message: `Listed ${payload.quantity}× ${payload.itemName} for ${payload.priceCoins.toLocaleString()} Coins (5% tax on sale)!`,
        };
      });
      return true;
    },
    [runStateAction]
  );

  const handleCancelMarketListing = useCallback(
    async (listing: MarketListingClient): Promise<boolean> => {
      const res = await cancelMarketListingApi(authSessionRef.current, listing.id);
      if (!res.ok) {
        EventBus.emit('ui:toast', { text: res.error });
        return false;
      }
      soundManager.playSfx('coin');
      runStateAction((prev) => {
        const nextInv = prev.inventory.map((i) => ({ ...i }));
        const existing = nextInv.find(
          (i) => i.itemId === res.listing.itemId && (i.quality ?? 'normal') === res.listing.quality
        );
        if (existing) existing.quantity += res.listing.quantity;
        else {
          nextInv.push({
            itemId: res.listing.itemId,
            quantity: res.listing.quantity,
            itemLevel: 1,
            quality: res.listing.quality,
          });
        }
        return {
          state: { ...prev, inventory: nextInv },
          ok: true,
          message: `Cancelled listing — returned ${res.listing.quantity}× ${res.listing.itemName} to Container.`,
        };
      });
      return true;
    },
    [runStateAction]
  );

  useEffect(() => {
    sanitizeLegacyLocalStoragePets();
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) setTouchUiEnabled(true);
    const blockContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener('contextmenu', blockContextMenu);
    return () => window.removeEventListener('contextmenu', blockContextMenu);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Update 2.0 Global Shortcuts: F9 (Photo / Cinematic Mode) & Ctrl+Shift+G (Founder GM Panel)
      if (e.key === 'F9') {
        e.preventDefault();
        soundManager.playSfx('click');
        setPhotoMode((prev) => !prev);
        return;
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        soundManager.playSfx('click');
        setPhotoMode(false);
        setActiveModal((cur) => (cur === 'admin' ? null : 'admin'));
        return;
      }
      const targetEl = (e.target as HTMLElement | null) ?? (document.activeElement as HTMLElement | null);
      const tag = targetEl?.tagName?.toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || targetEl?.isContentEditable) return;
      if (document.querySelector('dialog[open]')) return;
      const k = e.key.toLowerCase();
      if (k === 'i' || k === 'b') {
        setActiveModal((cur) => (cur === 'inventory' ? null : 'inventory'));
      } else if (k === 'r') {
        if (!document.querySelector('dialog[open]')) {
          EventBus.emit('input:signatureSkill');
        }
      } else if (k === 'p') {
        setActiveModal((cur) => (cur === 'profile' ? null : 'profile'));
      } else if (k === 'k') {
        if (zone !== 'dungeon' && zone !== 'tower' && zone !== 'cavern') {
          setActiveModal((cur) => (cur === 'skills' ? null : 'skills'));
        }
      } else if (k === 'm') {
        setActiveModal((cur) => (cur === 'worldMap' ? null : 'worldMap'));
      } else if (k === '1') {
        handleEatQuickSlot(0);
      } else if (k === '2') {
        handleEatQuickSlot(1);
      } else if (k === '3') {
        handleEatQuickSlot(2);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleEatQuickSlot, zone]);

  useEffect(() => {
    if (!mountRef.current) return;
    const { destroy } = launchPhaserGame(mountRef.current);

    let toastTimer: number | null = null;
    let xpUid = 1;
    const unsubs = [
      EventBus.on('scene:ready', ({ zone: nextZone }) => {
        setZone(nextZone);
        setNearPortal(false);
        if (nextZone !== 'house') {
          setHouseDecorateMode(false);
        }
        if (nextZone !== 'dungeon') {
          setBossHud(null);
          setDungeonOutcome(null);
        }
        if (nextZone === 'cavern' || nextZone === 'dungeon') {
          EventBus.emit('guide:step', { stepId: 'explore_or_boss' });
        }
        // Automatically dismount when entering caverns, dungeons, club, farm, or house indoors!
        if (nextZone !== 'overworld' && playerRef.current.activeMount) {
          const dismounted = { ...playerRef.current, activeMount: null };
          setPlayer(dismounted);
          roomClient.sendMountState(null);
          EventBus.emit('player:stateSync', dismounted);
        } else {
          EventBus.emit('player:stateSync', playerRef.current);
        }
      }),
      EventBus.on('input:toggleMount', () => {
        handleToggleMount();
      }),
      EventBus.on('input:honkMount', () => {
        if (playerRef.current.activeMount === 'mount_mini_tuk_tuk') {
          EventBus.emit('ui:toast', { text: '🚕 Beep-Beep! Mini Tuk-Tuk horn sounded!' });
        }
      }),
      EventBus.on('player:state', (nextPlayer) => {
        setPlayer((prev) => ({
          ...nextPlayer,
          npcFriendships: nextPlayer.npcFriendships ?? prev.npcFriendships,
          houseDecor: nextPlayer.houseDecor ?? prev.houseDecor,
          ownedFurniture: nextPlayer.ownedFurniture ?? prev.ownedFurniture,
          highestTowerFloor: Math.max(nextPlayer.highestTowerFloor ?? 0, prev.highestTowerFloor ?? 0),
          unlockedWeaponAuras: nextPlayer.unlockedWeaponAuras ?? prev.unlockedWeaponAuras,
          museumDonations: nextPlayer.museumDonations ?? prev.museumDonations,
          kromId: nextPlayer.kromId ?? prev.kromId,
          kromTag: nextPlayer.kromTag ?? prev.kromTag,
          kromName: nextPlayer.kromName ?? prev.kromName,
          kromLevel: nextPlayer.kromLevel ?? prev.kromLevel,
          pchumBenBlessingUntil: nextPlayer.pchumBenBlessingUntil ?? prev.pchumBenBlessingUntil,
          festivalSplashCount: nextPlayer.festivalSplashCount ?? prev.festivalSplashCount,
          bestBossRushTimeMs: nextPlayer.bestBossRushTimeMs ?? prev.bestBossRushTimeMs,
          unlockedTitles: nextPlayer.unlockedTitles ?? prev.unlockedTitles,
          activeTitle: nextPlayer.activeTitle ?? prev.activeTitle,
          bountyProgress: nextPlayer.bountyProgress ?? prev.bountyProgress,
          starterGuide: nextPlayer.starterGuide ?? prev.starterGuide,
          redeemedCodes: nextPlayer.redeemedCodes ?? prev.redeemedCodes,
          referredBy: nextPlayer.referredBy ?? prev.referredBy,
          loginStreak: nextPlayer.loginStreak ?? prev.loginStreak,
          lastLoginDate: nextPlayer.lastLoginDate ?? prev.lastLoginDate,
          claimedLoginDays: nextPlayer.claimedLoginDays ?? prev.claimedLoginDays,
          seasonPassXp: Math.max(nextPlayer.seasonPassXp ?? 0, prev.seasonPassXp ?? 0),
          hasRoyalPass: Boolean(nextPlayer.hasRoyalPass || prev.hasRoyalPass),
          claimedPassTiers: nextPlayer.claimedPassTiers ?? prev.claimedPassTiers,
          unlockedAchievements: nextPlayer.unlockedAchievements ?? prev.unlockedAchievements,
          equippedBadgeId: nextPlayer.equippedBadgeId ?? prev.equippedBadgeId,
        }));
      }),
      EventBus.on('npc:openDialogue', ({ npcId }) => {
        setActiveNpcId(npcId);
        EventBus.emit('guide:step', { stepId: 'greet_npc' });
      }),
      EventBus.on('guide:step', ({ stepId }) => {
        let toastMsg: string | null = null;
        let finishedAll = false;
        setPlayer((prev) => {
          const curGuide = prev.starterGuide ?? {
            completedSteps: [],
            finalRewardClaimed: false,
            dismissed: false,
          };
          const completed = new Set<StarterGuideStepId>(curGuide.completedSteps);
          if (completed.has(stepId)) return prev;
          completed.add(stepId);

          const stepDef = STARTER_GUIDE_STEPS.find((s) => s.id === stepId);
          let bonusCoins = stepDef?.rewardCoins ?? 100;
          let finalClaimed = curGuide.finalRewardClaimed;
          const nextTitles = new Set<string>(prev.unlockedTitles ?? []);
          let nextActiveTitle = prev.activeTitle ?? null;

          const allFiveDone = STARTER_GUIDE_STEPS.every((s) => completed.has(s.id));
          if (allFiveDone && !finalClaimed) {
            finalClaimed = true;
            finishedAll = true;
            bonusCoins += 500;
            nextTitles.add('Phum Pioneer');
            if (!nextActiveTitle) nextActiveTitle = 'Phum Pioneer';
            toastMsg = `👑 VILLAGE STARTER GUIDE COMPLETE! Earned "Phum Pioneer" Title + 600 Bonus Coins!`;
          } else {
            toastMsg = `🧭 Starter Guide (${completed.size}/5): ${stepDef?.label ?? stepId} (+${bonusCoins} Bonus Coins!)`;
          }

          const nextCoins = prev.currencies.coins + bonusCoins;
          const nextState: PlayerState = {
            ...prev,
            coins: nextCoins,
            currencies: { ...prev.currencies, coins: nextCoins },
            unlockedTitles: Array.from(nextTitles),
            activeTitle: nextActiveTitle,
            starterGuide: {
              ...curGuide,
              completedSteps: Array.from(completed),
              finalRewardClaimed: finalClaimed,
            },
          };
          EventBus.emit('player:stateSync', nextState);
          if (!authSessionRef.current) {
            saveGuestProgressSnapshot(nextState);
          }
          return nextState;
        });

        if (toastMsg) {
          soundManager.playSfx(finishedAll ? 'victory' : 'level_up');
          EventBus.emit('ui:toast', { text: toastMsg });
          if (finishedAll) {
            EventBus.emit('ticker:push', {
              text: `👑 ${playerRef.current.name} completed the Village Starter Guide and earned the Phum Pioneer title!`,
              category: 'club',
            });
          }
        }
      }),
      EventBus.on('house:decorUpdated', ({ houseDecor, toast }) => {
        setPlayer((prev) => {
          const nextState: PlayerState = {
            ...prev,
            houseDecor: houseDecor.map((d) => ({ ...d })),
          };
          if (!authSessionRef.current) {
            saveGuestProgressSnapshot(nextState);
          }
          return nextState;
        });
        if (toast) {
          EventBus.emit('ui:toast', { text: toast });
        }
      }),
      EventBus.on('house:restHeal', () => {
        runStateAction((prev) => {
          const bridge = computeVillageToDungeonBridge(prev);
          return {
            state: {
              ...prev,
              hp: bridge.effectiveMaxHp,
              lifeStats: {
                ...prev.lifeStats,
                healthy: Math.min(100, prev.lifeStats.healthy + 10),
                happy: Math.min(100, prev.lifeStats.happy + 10),
              },
            },
            ok: true,
            message: `🛏️ Rested in your Khmer Stilt House! HP restored to ${bridge.effectiveMaxHp}/${bridge.effectiveMaxHp} (Healthy +10, Happy +10)!`,
          };
        });
      }),
      EventBus.on('frontier:gather', ({ skillId, xp, coins, itemId, label }) => {
        runStateAction((prev) => {
          const gainedCoins = coins ?? 0;
          const nextCoins = prev.currencies.coins + gainedCoins;
          const nextInv = prev.inventory.map((i) => ({ ...i }));
          if (itemId) {
            const existing = nextInv.find((i) => i.itemId === itemId && (i.quality ?? 'normal') === 'normal');
            if (existing) existing.quantity += 1;
            else nextInv.push({ itemId, quantity: 1, itemLevel: 1, quality: 'normal' });
          }
          let mapNote = '';
          let nextTreasureMap = prev.activeTreasureMap ?? null;
          if (skillId === 'foraging' && Math.random() < 0.12) {
            const existingMap = nextInv.find((i) => i.itemId === 'item_torn_treasure_map');
            if (existingMap) existingMap.quantity += 1;
            else nextInv.push({ itemId: 'item_torn_treasure_map', quantity: 1, itemLevel: 1, quality: 'normal' });
            if (!nextTreasureMap) nextTreasureMap = rollRandomTreasureMap();
            mapNote = ' + 🗺️ Torn Angkor Treasure Map!';
          }
          let chaseNote = '';
          const chaseSource: DropSourceCategory = skillId === 'mining' ? 'mining' : 'foraging';
          const chase = rollChaseDropForSource(chaseSource);
          if (chase) {
            const exChase = nextInv.find((i) => i.itemId === chase.itemId);
            if (exChase) exChase.quantity += 1;
            else nextInv.push({ itemId: chase.itemId, quantity: 1, itemLevel: 5, quality: 'normal' });
            const tier = getRarityTierDef(chase.rarity);
            chaseNote = ` + ${chase.icon} [${tier.label.toUpperCase()} ${formatDropRatePct(chase.dropRatePct)}] ${chase.name}!`;
            if (isAnnouncementRarity(chase.rarity)) {
              const pName = prev.name;
              window.setTimeout(() => {
                soundManager.playSfx('victory');
                EventBus.emit('ticker:push', {
                  text: `🌟 [${tier.label.toUpperCase()} DROP · ${formatDropRatePct(chase.dropRatePct)}] ${pName} discovered ${chase.icon} ${chase.name}!`,
                  category: 'boss',
                });
              }, 0);
            }
          }
          const withLoot: PlayerState = {
            ...prev,
            coins: nextCoins,
            currencies: { ...prev.currencies, coins: nextCoins },
            inventory: nextInv,
            activeTreasureMap: nextTreasureMap,
          };
          const xpRes = awardSkillXp(withLoot, skillId, xp);
          if (skillId === 'mining') {
            window.setTimeout(() => {
              EventBus.emit('bounty:progress', { category: 'mine_ores', amount: 1 });
            }, 0);
          }
          return {
            state: xpRes.state,
            ok: true,
            message: `${label}${mapNote}${chaseNote}`,
          };
        });
      }),
      EventBus.on('cavern:reward', ({ skillId, xp, coins, items, label }) => {
        runStateAction((prev) => {
          const gainedCoins = coins ?? 0;
          const nextCoins = prev.currencies.coins + gainedCoins;
          const nextInv = prev.inventory.map((i) => ({ ...i }));
          let droppedMap = false;
          if (items && items.length > 0) {
            for (const drop of items) {
              if (drop.itemId === 'item_torn_treasure_map') droppedMap = true;
              const existing = nextInv.find(
                (i) => i.itemId === drop.itemId && (i.quality ?? 'normal') === 'normal'
              );
              if (existing) existing.quantity += drop.quantity;
              else nextInv.push({ itemId: drop.itemId, quantity: drop.quantity, itemLevel: 1, quality: 'normal' });
            }
          }
          let chaseNote = '';
          const chase = rollChaseDropForSource('mining');
          if (chase) {
            const exChase = nextInv.find((i) => i.itemId === chase.itemId);
            if (exChase) exChase.quantity += 1;
            else nextInv.push({ itemId: chase.itemId, quantity: 1, itemLevel: 5, quality: 'normal' });
            const tier = getRarityTierDef(chase.rarity);
            chaseNote = ` + ${chase.icon} [${tier.label.toUpperCase()} ${formatDropRatePct(chase.dropRatePct)}] ${chase.name}!`;
            if (isAnnouncementRarity(chase.rarity)) {
              const pName = prev.name;
              window.setTimeout(() => {
                soundManager.playSfx('victory');
                EventBus.emit('ticker:push', {
                  text: `🌟 [${tier.label.toUpperCase()} DROP · ${formatDropRatePct(chase.dropRatePct)}] ${pName} mined ${chase.icon} ${chase.name}!`,
                  category: 'boss',
                });
              }, 0);
            }
          }
          let nextState: PlayerState = {
            ...prev,
            coins: nextCoins,
            currencies: { ...prev.currencies, coins: nextCoins },
            inventory: nextInv,
            activeTreasureMap:
              droppedMap && !prev.activeTreasureMap
                ? rollRandomTreasureMap()
                : prev.activeTreasureMap,
          };
          if (skillId && xp && xp > 0) {
            const xpRes = awardSkillXp(nextState, skillId, xp);
            nextState = xpRes.state;
          }
          if (skillId === 'mining') {
            window.setTimeout(() => {
              EventBus.emit('bounty:progress', { category: 'mine_ores', amount: 1 });
            }, 0);
          }
          return {
            state: nextState,
            ok: true,
            message: `${label}${chaseNote}`,
          };
        });
      }),
      EventBus.on('tower:floorCleared', ({ floor, isBossFloor, coins, vitalityXp, reforgeStones, unlockedAura }) => {
        EventBus.emit('bounty:progress', { category: 'clear_tower_floors', amount: 1 });
        runStateAction((prev) => {
          const nextCoins = prev.currencies.coins + coins;
          const nextInv = prev.inventory.map((i) => ({ ...i }));
          const existingStone = nextInv.find((i) => i.itemId === 'mat_reforge_stone');
          if (existingStone) existingStone.quantity += reforgeStones;
          else nextInv.push({ itemId: 'mat_reforge_stone', quantity: reforgeStones, itemLevel: 1, quality: 'normal' });

          // Update 1.6 Guaranteed Boss Essence drop on every 5th Pagoda Boss Floor!
          let essenceNote = '';
          if (isBossFloor) {
            const cycle = ['essence_slime', 'essence_stone', 'essence_naga'] as const;
            const essenceId = cycle[Math.floor((floor / 5 - 1)) % cycle.length];
            const existingEss = nextInv.find((i) => i.itemId === essenceId);
            if (existingEss) existingEss.quantity += 1;
            else nextInv.push({ itemId: essenceId, quantity: 1, itemLevel: 1, quality: 'normal' });
            essenceNote =
              essenceId === 'essence_slime'
                ? ' · +1 ✨ Slime Essence'
                : essenceId === 'essence_stone'
                ? ' · +1 ✨ Stone Essence'
                : ' · +1 ✨ Naga Essence';
          }

          const prevHighest = prev.highestTowerFloor ?? 0;
          const nextHighest = Math.max(prevHighest, floor);
          const nextAuras = new Set<WeaponAuraId>(prev.unlockedWeaponAuras ?? []);
          if (unlockedAura) nextAuras.add(unlockedAura);
          if (nextHighest >= 10) nextAuras.add('golden_lotus');
          if (nextHighest >= 25) nextAuras.add('emerald_naga');
          if (nextHighest >= 50) nextAuras.add('celestial_angkor');

          const nextLoadout: EquippedLoadout =
            unlockedAura && !prev.loadout.weaponAura
              ? { ...prev.loadout, weaponAura: unlockedAura }
              : { ...prev.loadout };

          const withLoot: PlayerState = {
            ...prev,
            coins: nextCoins,
            currencies: { ...prev.currencies, coins: nextCoins },
            inventory: nextInv,
            loadout: nextLoadout,
            highestTowerFloor: nextHighest,
            unlockedWeaponAuras: Array.from(nextAuras),
          };
          const xpRes = awardSkillXp(withLoot, 'vitality', vitalityXp);
          const auraNote = unlockedAura
            ? ` ✨ UNLOCKED ${unlockedAura.replace(/_/g, ' ').toUpperCase()} WEAPON AURA!`
            : '';
          return {
            state: xpRes.state,
            ok: true,
            message: `🗼 Cleared Pagoda Floor ${floor}${isBossFloor ? ' (Mythic Boss!)' : ''}! +${coins}c · +${vitalityXp} Vitality XP · +${reforgeStones}× Reforge Stone${essenceNote}!${auraNote}`,
          };
        });
        if (isBossFloor || floor % 10 === 0) {
          EventBus.emit('ticker:push', {
            text: `🗼 ${playerRef.current.name} conquered Endless Pagoda Tower Floor ${floor} / 50!`,
            category: 'boss',
          });
        }
      }),
      EventBus.on('worldEvent:reward', ({ skillId, xp, coins, gold, items, label }) => {
        runStateAction((prev) => {
          const nextCoins = prev.currencies.coins + (coins ?? 0);
          const nextGold = prev.currencies.gold + (gold ?? 0);
          const nextInv = prev.inventory.map((i) => ({ ...i }));
          if (items) {
            for (const drop of items) {
              const existing = nextInv.find(
                (i) => i.itemId === drop.itemId && (i.quality ?? 'normal') === 'normal'
              );
              if (existing) existing.quantity += drop.quantity;
              else nextInv.push({ itemId: drop.itemId, quantity: drop.quantity, itemLevel: 1, quality: 'normal' });
            }
          }
          let nextState: PlayerState = {
            ...prev,
            coins: nextCoins,
            currencies: { ...prev.currencies, coins: nextCoins, gold: nextGold },
            inventory: nextInv,
          };
          if (skillId && xp && xp > 0) {
            nextState = awardSkillXp(nextState, skillId, xp).state;
          }
          return { state: nextState, ok: true, message: label };
        });
      }),
      EventBus.on('fishing:biteReady', (bite) => {
        setActiveFishingBite(bite);
      }),
      EventBus.on('festival:raceFinished', ({ place, timeSec, coins, gold, fishingXp, unlockedPaddle }) => {
        runStateAction((prev) => {
          const nextCoins = prev.currencies.coins + coins;
          const nextGold = prev.currencies.gold + gold;
          const nextInv = prev.inventory.map((i) => ({ ...i }));
          if (unlockedPaddle && !nextInv.some((i) => i.itemId === 'weapon_water_paddle')) {
            nextInv.push({ itemId: 'weapon_water_paddle', quantity: 1, itemLevel: 3, quality: 'normal' });
          }
          const withLoot: PlayerState = {
            ...prev,
            coins: nextCoins,
            currencies: { ...prev.currencies, coins: nextCoins, gold: nextGold },
            inventory: nextInv,
          };
          const xpRes = awardSkillXp(withLoot, 'fishing', fishingXp);
          return {
            state: xpRes.state,
            ok: true,
            message: `🛶 Bon Om Touk Place #${place} (${timeSec}s)! +${coins}c${
              gold > 0 ? ` · +${gold} Gold` : ''
            } · +${fishingXp} Fishing XP${unlockedPaddle ? ' · Unlocked Water Festival Rowing Paddle!' : ''}`,
          };
        });
        if (place === 1) {
          EventBus.emit('ticker:push', {
            text: `🛶 ${playerRef.current.name} won 1st Place in the Bon Om Touk Mekong Longboat Race!`,
            category: 'club',
          });
        }
      }),
      EventBus.on('festival:waterSplash', ({ targetName }) => {
        runStateAction((prev) => {
          const nextSplashes = (prev.festivalSplashCount ?? 0) + 1;
          const nextCoins = prev.currencies.coins + 45;
          const nextInv = prev.inventory.map((i) => ({ ...i }));
          let hatNote = '';
          if (nextSplashes >= 3 && !nextInv.some((i) => i.itemId === 'hat_jasmine_garland')) {
            nextInv.push({ itemId: 'hat_jasmine_garland', quantity: 1, itemLevel: 1, quality: 'normal' });
            hatNote = ' 🌸 Unlocked Jasmine Garland Hat!';
          }
          return {
            state: {
              ...prev,
              coins: nextCoins,
              currencies: { ...prev.currencies, coins: nextCoins },
              inventory: nextInv,
              festivalSplashCount: nextSplashes,
              lifeStats: { ...prev.lifeStats, happy: Math.min(100, prev.lifeStats.happy + 5) },
            },
            ok: true,
            message: `💦 Splashed ${targetName}! +45 New Year Coins (${nextSplashes}/3)${hatNote}`,
          };
        });
      }),
      EventBus.on('festival:releaseLantern', () => {
        runStateAction((prev) => {
          if (prev.currencies.coins < 50) {
            return { state: prev, ok: false, message: 'Need 50 Coins to release a Floating Pink Lotus Lantern.' };
          }
          const nextCoins = prev.currencies.coins - 50;
          const until = Date.now() + 10 * 60_000;
          soundManager.playSfx('magic');
          return {
            state: {
              ...prev,
              coins: nextCoins,
              currencies: { ...prev.currencies, coins: nextCoins },
              pchumBenBlessingUntil: until,
              lifeStats: { ...prev.lifeStats, happy: Math.min(100, prev.lifeStats.happy + 10) },
            },
            ok: true,
            message: '🪷 Released Pink Lotus Lantern! +20% All Skill XP & +15% Drop Luck blessed for 10 minutes!',
          };
        });
      }),
      EventBus.on('network:kromChat', (msg) => {
        setMessages((prev) => [
          ...prev.slice(-39),
          {
            id: `krom-in-${msg.timestamp}-${msg.sessionId}`,
            sender: `[${msg.kromTag}] ${msg.name}`,
            text: msg.text,
            timestamp: msg.timestamp,
            channel: 'krom',
            kromTag: msg.kromTag,
          },
        ]);
      }),
      EventBus.on('cart:saleNotice', ({ buyerName, itemName, quantity, revenueCoins, cookingXp }) => {
        soundManager.playSfx('coin');
        runStateAction((prev) => {
          const nextCoins = prev.currencies.coins + revenueCoins;
          const paid: PlayerState = {
            ...prev,
            coins: nextCoins,
            currencies: { ...prev.currencies, coins: nextCoins },
          };
          const xpRes = awardSkillXp(paid, 'cooking', cookingXp, true);
          return {
            state: xpRes.state,
            ok: true,
            message: `🚕 Cart Sale! ${buyerName} bought ${quantity}× ${itemName} → +${revenueCoins.toLocaleString()}c & +${cookingXp} Cooking XP!`,
          };
        });
      }),
      EventBus.on('treasure:dugChest', ({ spotId, coins, gold, reforgeStones, cosmeticItemId, cosmeticLabel }) => {
        runStateAction((prev) => {
          const nextCoins = prev.currencies.coins + coins;
          const nextGold = prev.currencies.gold + gold;
          let nextInv = prev.inventory.map((i) => ({ ...i }));

          // Consume 1 Torn Angkor Treasure Map
          const mapIdx = nextInv.findIndex((i) => i.itemId === 'item_torn_treasure_map' && i.quantity > 0);
          if (mapIdx >= 0) {
            nextInv[mapIdx] = { ...nextInv[mapIdx], quantity: nextInv[mapIdx].quantity - 1 };
            nextInv = nextInv.filter((i) => i.quantity > 0);
          }
          const remainingMaps = nextInv
            .filter((i) => i.itemId === 'item_torn_treasure_map')
            .reduce((acc, i) => acc + i.quantity, 0);

          const addDrop = (itemId: string, qty: number) => {
            const ex = nextInv.find((i) => i.itemId === itemId);
            if (ex) ex.quantity += qty;
            else nextInv.push({ itemId, quantity: qty, itemLevel: 1, quality: 'normal' });
          };
          addDrop('mat_reforge_stone', reforgeStones);
          if (cosmeticItemId) addDrop(cosmeticItemId, 1);

          let chaseNote = '';
          const chase = rollChaseDropForSource('treasure_map', 1.4);
          if (chase) {
            addDrop(chase.itemId, 1);
            const tier = getRarityTierDef(chase.rarity);
            chaseNote = ` · ${chase.icon} [${tier.label.toUpperCase()} ${formatDropRatePct(chase.dropRatePct)}] ${chase.name}`;
            if (isAnnouncementRarity(chase.rarity)) {
              const pName = prev.name;
              window.setTimeout(() => {
                soundManager.playSfx('victory');
                EventBus.emit('ticker:push', {
                  text: `🌟 [${tier.label.toUpperCase()} RELIC · ${formatDropRatePct(chase.dropRatePct)}] ${pName} dug up ${chase.icon} ${chase.name}!`,
                  category: 'boss',
                });
              }, 0);
            }
          }

          const nextActiveMap = remainingMaps > 0 ? rollRandomTreasureMap(spotId) : null;
          const base: PlayerState = {
            ...prev,
            coins: nextCoins,
            currencies: { ...prev.currencies, coins: nextCoins, gold: nextGold },
            inventory: nextInv,
            activeTreasureMap: nextActiveMap,
          };
          const xpRes = awardSkillXp(base, 'foraging', 65, true);
          return {
            state: xpRes.state,
            ok: true,
            message: `🏆 Ancient Relic Chest! +${coins.toLocaleString()}c · +${gold} Gold · +${reforgeStones}× Reforge Stone${
              cosmeticLabel ? ` · Unlocked ${cosmeticLabel}` : ''
            }${chaseNote}!`,
          };
        });
        EventBus.emit('ticker:push', {
          text: `🗺️ ${playerRef.current.name} unearthed an Ancient Angkor Relic Chest${
            cosmeticLabel ? ` and found ${cosmeticLabel}` : ''
          }!`,
          category: 'club',
        });
      }),
      EventBus.on('portal:proximity', ({ nearPortal: near }) => {
        setNearPortal(near);
      }),
      EventBus.on('combat:hit', ({ hit }) => {
        setLastHit(hit);
      }),
      EventBus.on('combat:classMeter', (meter) => {
        setClassMeter(meter);
      }),
      EventBus.on('boss:hudUpdate', (payload) => {
        setBossHud(payload);
      }),
      EventBus.on('dungeon:outcome', (outcome) => {
        if (outcome && outcome.outcome === 'victory') {
          const diffMult =
            outcome.difficulty === 'death'
              ? 2.2
              : outcome.difficulty === 'mythic'
                ? 1.75
                : outcome.difficulty === 'expert'
                  ? 1.35
                  : 1.0;
          const chase = rollChaseDropForSource('boss', diffMult);
          if (chase) {
            const tier = getRarityTierDef(chase.rarity);
            runStateAction((prev) => {
              const nextInv = prev.inventory.map((i) => ({ ...i }));
              const ex = nextInv.find((i) => i.itemId === chase.itemId);
              if (ex) ex.quantity += 1;
              else nextInv.push({ itemId: chase.itemId, quantity: 1, itemLevel: 6, quality: 'normal' });
              return {
                state: { ...prev, inventory: nextInv },
                ok: true,
                message: `🌟 [${tier.label.toUpperCase()} BOSS DROP · ${formatDropRatePct(chase.dropRatePct)}] ${chase.icon} ${chase.name}!`,
              };
            });
            if (isAnnouncementRarity(chase.rarity)) {
              EventBus.emit('ticker:push', {
                text: `🌟 [${tier.label.toUpperCase()} DROP · ${formatDropRatePct(chase.dropRatePct)}] ${playerRef.current.name} looted ${chase.icon} ${chase.name} from a Boss!`,
                category: 'boss',
              });
            }
          }
        }
        setDungeonOutcome(outcome);
      }),
      EventBus.on('network:status', (status) => {
        setNetworkStatus(status);
      }),
      EventBus.on('network:remoteChat', (msg) => {
        setMessages((prev) => [
          ...prev.slice(-39),
          {
            id: `rem-${msg.sessionId}-${msg.timestamp}`,
            sender: msg.name,
            text: msg.text,
            timestamp: msg.timestamp,
          },
        ]);
      }),
      EventBus.on('social:inspectPlayer', (target) => {
        setInspectedPlayer(target);
      }),
      EventBus.on('social:whisper', (msg) => {
        setMessages((prev) => [
          ...prev.slice(-39),
          {
            id: `w-in-${msg.fromSessionId}-${msg.timestamp}`,
            sender: `Whisper ← ${msg.fromName}`,
            text: msg.text,
            timestamp: msg.timestamp,
          },
        ]);
        EventBus.emit('ui:toast', { text: `💬 Whisper from ${msg.fromName}: "${msg.text}"` });
      }),
      EventBus.on('social:friendRequest', (req) => {
        EventBus.emit('ui:toast', {
          text:
            req.status === 'accepted'
              ? `🎉 ${req.fromName} accepted your Friend Request!`
              : `💌 New Friend Request from ${req.fromName}! Check your Mail Inbox.`,
        });
        void refreshFriends();
      }),
      EventBus.on('social:dungeonInvite', (inv) => {
        setDungeonInvites((prev) => [inv, ...prev.filter((i) => i.fromName !== inv.fromName)].slice(0, 6));
        EventBus.emit('ui:toast', {
          text: `⚔️ ${inv.fromName} invited you to a Co-op Dungeon Raid! Check your Mail Inbox.`,
        });
      }),
      EventBus.on('social:dungeonPartyReady', ({ partyId, bossId, difficulty, partnerName }) => {
        setActiveModal(null);
        EventBus.emit('ui:toast', {
          text: `🤝 ${partnerName} accepted! Warping together into Co-op Raid...`,
        });
        EventBus.emit('dungeon:enterRequest', {
          bossId,
          difficulty,
          partyMode: 'coop',
          partyId,
        });
      }),
      EventBus.on('social:marketSale', ({ itemName, quantity, buyerName, payoutCoins, taxCoins }) => {
        soundManager.playSfx('coin');
        setPlayer((prev) => {
          const nextCoins = prev.currencies.coins + payoutCoins;
          const next: PlayerState = {
            ...prev,
            coins: nextCoins,
            currencies: { ...prev.currencies, coins: nextCoins },
          };
          EventBus.emit('player:stateSync', next);
          return next;
        });
        EventBus.emit('ui:toast', {
          text: `💰 Market Sold! ${buyerName} bought ${quantity}× ${itemName} → +${payoutCoins.toLocaleString()}c (-${taxCoins}c 5% tax)!`,
        });
      }),
      EventBus.on('social:notice', ({ text }) => {
        EventBus.emit('ui:toast', { text });
      }),
      EventBus.on('shrine:pray', () => {
        handlePrayGoldenShrine();
      }),
      EventBus.on('skill:xpGained', (payload) => {
        if (payload.leveledUp) {
          soundManager.playSfx('level_up');
        }
        const uid = xpUid++;
        setXpBanners((prev) => [...prev.slice(-2), { ...payload, uid }]);
        window.setTimeout(() => {
          setXpBanners((prev) => prev.filter((b) => b.uid !== uid));
        }, payload.leveledUp ? 3600 : 1900);
      }),
      EventBus.on(
        'ui:openModal',
        ({
          modal,
          farmTab,
          shopTab: requestedShopTab,
          friendsTab: reqFriendsTab,
          reforgeTab: reqReforgeTab,
          clubGame,
          clubTableId: reqClubTableId,
          leaderboardCategory: reqLbCat,
          cartId,
          bondPartnerName,
        }) => {
          if (modal === 'farm' && farmTab) setFarmModalTab(farmTab);
          if (modal === 'friends' && reqFriendsTab) setFriendsTab(reqFriendsTab);
          if (modal === 'reforge' && reqReforgeTab) setReforgeTab(reqReforgeTab);
          if (modal === 'clubGames' && clubGame) setClubGameTab(clubGame);
          if (modal === 'clubGames' && reqClubTableId) setClubTableId(reqClubTableId);
          if (modal === 'leaderboard' && reqLbCat) setLeaderboardCategory(reqLbCat);
          if (modal === 'tukTukCart') setFocusedCartId(cartId ?? null);
          if (modal === 'bond') setBondPrefillPartner(bondPartnerName ?? null);
          if (modal === 'wardrobe') {
            setShopTab('secondary');
            setActiveModal('fashionShop');
            return;
          }
          if ((modal === 'snackShop' || modal === 'fashionShop') && requestedShopTab) {
            setShopTab(requestedShopTab);
          }
          setActiveModal(modal);
        }
      ),
      EventBus.on('bounty:progress', ({ category, amount }) => {
        let completedLabels: string[] = [];
        let newlyUnlockedAchs: AchievementDef[] = [];
        setPlayer((prev) => {
          const res = recordBountyProgress(prev, category as BountyCategory, amount ?? 1);
          completedLabels = res.newlyCompleted.map((b) => `${b.icon} ${b.title}`);
          let next = res.state;

          // Update 2.1: Automatically award Season Pass XP & check activity Achievements!
          const passXpGain =
            category === 'defeat_mythic_boss'
              ? 180
              : category === 'defeat_any_boss'
                ? 140
                : category === 'clear_tower_floors'
                  ? 85
                  : category === 'harvest_crops'
                    ? 45
                    : 25;
          next = awardSeasonPassXp(next, passXpGain * Math.max(1, amount ?? 1)).state;

          const explicitAchs: AchievementId[] = [];
          if (category === 'harvest_crops') explicitAchs.push('first_harvest');
          if (category === 'catch_fish') explicitAchs.push('master_angler');
          if (category === 'mine_ores') explicitAchs.push('cavern_delver');
          if (category === 'eat_or_cook_snack') explicitAchs.push('khmer_chef');
          if (category === 'clear_tower_floors') explicitAchs.push('pagoda_climber');

          const achRes = evaluateAchievements(next, explicitAchs);
          next = achRes.state;
          newlyUnlockedAchs = achRes.newlyUnlocked;

          EventBus.emit('player:stateSync', next);
          if (!authSessionRef.current) {
            saveGuestProgressSnapshot(next);
          }
          return next;
        });
        if (newlyUnlockedAchs.length > 0) {
          showAchievementBanner(newlyUnlockedAchs);
        }
        if (completedLabels.length > 0) {
          soundManager.playSfx('level_up');
          EventBus.emit('ui:toast', {
            text: `📋 Bounty Complete: ${completedLabels.join(', ')}! Claim reward on the Bounty Board!`,
          });
        }
      }),
      EventBus.on(
        'bossRush:completed',
        ({ difficulty, elapsedMs, coins, gold, unlockedSovereignTitle, unlockedSovereignWings }) => {
          soundManager.playSfx('victory');
          const mm = String(Math.floor(elapsedMs / 60000)).padStart(2, '0');
          const ss = String(Math.floor((elapsedMs % 60000) / 1000)).padStart(2, '0');
          const ds = Math.floor((elapsedMs % 1000) / 100);
          const timeStr = `${mm}:${ss}.${ds}`;
          const title = 'Sovereign of Angkor';
          const rewardItemId = 'wings_angkor_sovereign';

          runStateAction((prev) => {
            const nextCoins = prev.currencies.coins + coins;
            const nextGold = prev.currencies.gold + gold;
            const nextInv = prev.inventory.map((i) => ({ ...i }));
            if (unlockedSovereignWings && !nextInv.some((i) => i.itemId === rewardItemId)) {
              nextInv.push({ itemId: rewardItemId, quantity: 1, itemLevel: 6, quality: 'normal' });
            }
            const prevBest = prev.bestBossRushTimeMs ?? null;
            const nextBest = prevBest === null ? elapsedMs : Math.min(prevBest, elapsedMs);
            const titles = new Set<string>(prev.unlockedTitles ?? []);
            if (unlockedSovereignTitle) titles.add(title);
            const nextCleared = Array.from(
              new Set<BossId>([
                ...prev.clearedBosses,
                'sdech_kongkaeb',
                'arp_prey_chrov',
                'yeak_thmor',
                'neak_reach',
                'ream_eyso_moni_mekhala',
                'krong_reap',
              ])
            );
            const nextAuras = new Set<WeaponAuraId>(prev.unlockedWeaponAuras ?? []);
            nextAuras.add('krong_reap_ten_head');

            const nextState: PlayerState = {
              ...prev,
              coins: nextCoins,
              currencies: { ...prev.currencies, coins: nextCoins, gold: nextGold },
              inventory: nextInv,
              bestBossRushTimeMs: nextBest,
              unlockedTitles: Array.from(titles),
              activeTitle: unlockedSovereignTitle ? title : prev.activeTitle,
              clearedBosses: nextCleared,
              unlockedWeaponAuras: Array.from(nextAuras),
            };
            return {
              state: nextState,
              ok: true,
              message: `⚡ MYTHIC BOSS RUSH CLEARED (${timeStr} · ${difficulty.toUpperCase()})! +${coins.toLocaleString()}c · +${gold} Gold · 👑 ${title} · Radiant Angkor Sovereign Wings!`,
            };
          });
          EventBus.emit('bounty:progress', { category: 'defeat_any_boss', amount: 1 });
          EventBus.emit('bounty:progress', { category: 'defeat_mythic_boss', amount: 1 });
          EventBus.emit('ticker:push', {
            text: `⚡ ${playerRef.current.name} conquered the 6-Boss Mythic Boss Rush in ${timeStr} (${difficulty.toUpperCase()}) and earned 👑 ${title}!`,
            category: 'boss',
          });
        }
      ),
      EventBus.on('gm:liveEventTriggered', ({ worldEventId, festivalId }) => {
        if (
          worldEventId === 'crimson_eclipse' ||
          worldEventId === 'golden_frog_rain' ||
          worldEventId === 'khmer_night_market'
        ) {
          worldEventManager.triggerEvent(worldEventId);
        }
        if (
          festivalId === 'bon_om_touk' ||
          festivalId === 'chol_chnam_thmey' ||
          festivalId === 'pchum_ben'
        ) {
          seasonClock.setFestivalOverride(festivalId);
        }
      }),
      EventBus.on('ui:toast', ({ text }) => {
        setToast(text);
        if (toastTimer) window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => setToast(null), 3200);
      }),
    ];

    return () => {
      if (toastTimer) window.clearTimeout(toastTimer);
      unsubs.forEach((u) => u());
      destroy();
    };
  }, []);

  const shopMode: ShopMode = activeModal === 'snackShop' ? 'snack' : 'fashion';
  const inboxCount = friendsData.incoming.length + dungeonInvites.length;

  return (
    <div className="relative w-screen h-dvh max-w-full max-h-dvh overflow-hidden bg-slate-950">
      <div ref={mountRef} className="w-full h-full overflow-hidden" />

      <PhotoModeOverlay active={photoMode} onExit={() => setPhotoMode(false)} />

      {!photoMode && (
        <>
          <HUD
            player={player}
            zone={zone}
            networkStatus={networkStatus}
            authUsername={authSession?.username ?? null}
            saveStatus={saveStatus}
            inboxCount={inboxCount}
            chatOpen={chatOpen}
            onToggleChat={() => setChatOpen((o) => !o)}
            touchUiEnabled={touchUiEnabled}
            onToggleTouchUi={() => setTouchUiEnabled((v) => !v)}
            lastHit={lastHit}
            classMeter={classMeter}
            bossHud={bossHud}
            selectedCropId={selectedCropId}
            farmToolMode={farmToolMode}
            onSelectFarmSeed={handleSelectFarmSeed}
            onEatQuickSlot={handleEatQuickSlot}
            onOpenProfile={() => setActiveModal('profile')}
            onOpenInventory={() => setActiveModal('inventory')}
            onOpenWardrobe={() => {
              setShopTab('secondary');
              setActiveModal('fashionShop');
            }}
            onOpenFarmModal={() => {
              setFarmModalTab('seeds');
              setActiveModal('farm');
            }}
            onOpenSkills={() => setActiveModal('skills')}
            onOpenAreaSwitcher={() => setActiveModal('areaSwitcher')}
            onOpenFriends={() => {
              setFriendsTab('friends');
              setActiveModal('friends');
            }}
            onOpenInbox={() => {
              setFriendsTab('inbox');
              setActiveModal('friends');
            }}
            onOpenAuth={() => setActiveModal('auth')}
            onOpenMarket={() => setActiveModal('market')}
            onOpenBestiary={() => setActiveModal('bestiary')}
            onOpenDiamondStore={() => setActiveModal('diamondStore')}
            onOpenWorldMap={() => setActiveModal('worldMap')}
            onOpenServerCity={() => setActiveModal('serverCity')}
            onOpenReforge={() => {
              setReforgeTab('reforge');
              setActiveModal('reforge');
            }}
            onOpenClubGames={() => {
              setClubGameTab('kla_klok');
              setActiveModal('clubGames');
            }}
            onOpenLeaderboard={() => {
              setLeaderboardCategory('farmer');
              setActiveModal('leaderboard');
            }}
            onOpenPagodaTower={() => setActiveModal('pagodaTower')}
            onOpenMuseum={() => setActiveModal('museum')}
            onOpenNightMarket={() => setActiveModal('nightMarket')}
            onOpenFestival={() => setActiveModal('festival')}
            onOpenKrom={() => setActiveModal('krom')}
            onOpenScryingMirror={() => setActiveModal('scryingMirror')}
            onOpenTukTukCart={() => {
              setFocusedCartId(null);
              setActiveModal('tukTukCart');
            }}
            onOpenTreasureMap={() => setActiveModal('treasureMap')}
            onOpenRunway={() => setActiveModal('runway')}
            onOpenBond={() => {
              setBondPrefillPartner(null);
              setActiveModal('bond');
            }}
            onOpenBounties={() => setActiveModal('bounties')}
            onOpenPromo={() => setActiveModal('promo')}
            onOpenAdmin={() => setActiveModal('admin')}
            onOpenDailyLogin={() => setActiveModal('dailyLogin')}
            onOpenSeasonPass={() => setActiveModal('seasonPass')}
            onOpenAchievements={() => setActiveModal('achievements')}
            onTogglePhotoMode={() => setPhotoMode(true)}
            canInstallPwa={canInstallPwa}
            onInstallPwa={() => void handleInstallPwa()}
            onToggleMount={handleToggleMount}
            onOpenPortableBank={() => {
              setReforgeTab('bank');
              setActiveModal('reforge');
            }}
            onOpenReliquary={() => setActiveModal('reliquary')}
            onOpenHouseDecor={() => setActiveModal('houseDecor')}
            onInviteFriendsHome={() => {
              const hostName = playerRef.current.name;
              roomClient.sendChat(`🏡 [HOME INVITE] Come visit ${hostName}'s decorated Khmer Stilt House!`);
              EventBus.emit('ticker:push', {
                text: `🏡 ${hostName} invited friends to hang out inside their decorated Khmer Stilt House!`,
                category: 'club',
              });
              EventBus.emit('ui:toast', {
                text: `👥 Sent live Home Invite to online friends in ${networkStatus.areaId}!`,
              });
            }}
            onFastForwardFarm={() => runFarmAction((s) => fastForwardFarmTimers(s, 60))}
          />

          <ServerTickerBanner />

          {/* Update 2.1: Golden Achievement Unlocked! Top Slide-In Banner */}
          {achievementBanner && (
            <div className="pointer-events-auto fixed top-16 left-1/2 -translate-x-1/2 z-40 w-[min(92vw,390px)] rounded-2xl bg-gradient-to-r from-amber-900 via-yellow-700 to-amber-900 border-2 border-yellow-300 shadow-[0_8px_30px_rgba(250,204,21,0.55)] px-3.5 py-2.5 text-amber-50 flex items-center gap-3 animate-bounce">
              <span className="w-10 h-10 rounded-xl bg-yellow-300/20 border-2 border-yellow-300 flex items-center justify-center text-2xl shrink-0">
                {achievementBanner.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-display font-bold uppercase tracking-wider text-yellow-200">
                  🏅 Achievement Unlocked!
                </div>
                <div className="font-display font-bold text-sm text-white truncate">
                  {achievementBanner.name} · {achievementBanner.khmerName}
                </div>
                <div className="text-[10px] text-amber-100/90">
                  +{achievementBanner.rewardDiamonds} 💎 Diamonds · Badge ready in Achievements!
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAchievementBanner(null)}
                className="text-yellow-200 hover:text-white text-xs font-bold px-1.5 py-0.5 cursor-pointer"
                aria-label="Close achievement banner"
              >
                ✕
              </button>
            </div>
          )}

          <WelcomeGuideWidget
            player={player}
            zone={zone}
            hiddenByModal={activeModal !== null || Boolean(activeNpcId) || Boolean(dungeonOutcome)}
            onDismiss={() =>
              runStateAction((s) => ({
                state: {
                  ...s,
                  starterGuide: {
                    completedSteps: s.starterGuide?.completedSteps ?? [],
                    finalRewardClaimed: Boolean(s.starterGuide?.finalRewardClaimed),
                    dismissed: true,
                  },
                },
                ok: true,
                message: '🧭 Village Starter Guide dismissed. Have fun exploring ភូមិខ្ញុំ!',
              }))
            }
            onQuickAction={(stepId) => {
              if (stepId === 'plant_crop') {
                handleTravel(
                  { method: 'mirror', targetZone: 'farm', destinationLabel: 'Personal Farm' },
                  0
                );
              } else if (stepId === 'greet_npc') {
                handleTravel(
                  {
                    method: 'pylon',
                    targetZone: 'overworld',
                    mapId: 'market_street',
                    destinationLabel: 'Market Street (NPCs)',
                  },
                  0
                );
              } else if (stepId === 'explore_or_boss') {
                setActiveModal('modeSelector');
              } else if (stepId === 'claim_bounty') {
                setActiveModal('bounties');
              }
            }}
          />

          {/* Floating +XP & LEVEL UP! Skill Notifications */}
          {xpBanners.length > 0 && (
            <div className="pointer-events-none fixed top-24 right-3 z-30 flex flex-col items-end gap-1.5">
              {xpBanners.map((b) => (
                <div
                  key={b.uid}
                  className={`px-3 py-1 rounded-full font-display font-bold text-xs shadow-lg border-2 ${
                    b.leveledUp
                      ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-amber-950 border-amber-900 animate-bounce'
                      : 'bg-slate-900/90 text-emerald-300 border-emerald-500/70'
                  }`}
                >
                  {b.leveledUp ? (
                    <>
                      🎉 {b.icon} {b.skillName} LEVEL UP! Lv.{b.level}
                      {b.talentPointGained ? ' · +1 Talent Point!' : ''}
                    </>
                  ) : (
                    <>
                      {b.icon} +{b.xp} {b.skillName} XP
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <ChatOverlay
            open={chatOpen}
            playerName={player.name}
            kromTag={player.kromTag}
            isVip={isVillagePassActive(player)}
            messages={messages}
            draftPrefill={chatDraftPrefill}
            onAddMessage={(msg) => setMessages((prev) => [...prev.slice(-39), msg])}
          />

          <MobileControls
            visible={touchUiEnabled}
            zone={zone}
            nearPortal={nearPortal}
            bossHud={bossHud}
            equippedWeaponId={player.weapon.id}
          />
        </>
      )}

      <ModeSelectorModal
        open={activeModal === 'modeSelector'}
        player={player}
        initialBossId={preselectedBossId}
        onClose={() => setActiveModal(null)}
        onEnterDungeon={(
          bossId: BossId,
          difficulty: DifficultyMode,
          partyMode: 'solo' | 'coop',
          partyId?: string
        ) => {
          soundManager.playSfx('click');
          setActiveModal(null);
          EventBus.emit('dungeon:enterRequest', { bossId, difficulty, partyMode, partyId });
        }}
        onEnterBossRush={(difficulty: DifficultyMode) => {
          soundManager.playSfx('click');
          setActiveModal(null);
          EventBus.emit('bossRush:enterRequest', { difficulty });
        }}
      />

      <BestiaryModal
        open={activeModal === 'bestiary'}
        player={player}
        onClose={() => setActiveModal(null)}
        onChallengeBoss={(bossId) => {
          soundManager.playSfx('click');
          setPreselectedBossId(bossId);
          setActiveModal('modeSelector');
        }}
      />

      <DiamondStoreModal
        open={activeModal === 'diamondStore'}
        player={player}
        onClose={() => setActiveModal(null)}
        onBuyShopItem={(shopId) =>
          runStateAction((s) => {
            const res = purchaseDiamondShopItem(s, shopId);
            if (res.ok) soundManager.playSfx('coin');
            return res;
          })
        }
        onToggleMount={(mountId) =>
          runStateAction((s) => {
            const res = togglePlazaMount(s, mountId);
            if (res.ok) soundManager.playSfx('click');
            return res;
          })
        }
        onEquipItem={handleEquipItem}
        onCheckoutSku={handleCheckoutSku}
        onBuyVipWithDiamonds={() =>
          runStateAction((s) => {
            const res = purchaseVipPassWithDiamonds(s);
            if (res.ok) soundManager.playSfx('level_up');
            return res;
          })
        }
        onClaimDailyVipKey={() =>
          runStateAction((s) => {
            const res = claimDailyVipReliquaryKey(s);
            if (res.ok) soundManager.playSfx('coin');
            return res;
          })
        }
        onOpenReliquaryModal={() => setActiveModal('reliquary')}
      />

      <ReliquaryModal
        open={activeModal === 'reliquary'}
        player={player}
        onClose={() => setActiveModal(null)}
        onOpenChests={handleOpenReliquaryChests}
        onRedeemShards={(offerId) =>
          runStateAction((s) => {
            const res = redeemAngkorShards(s, offerId);
            if (res.ok) soundManager.playSfx('level_up');
            return res;
          })
        }
        onEquipItem={handleEquipItem}
      />

      <WorldMapModal
        open={activeModal === 'worldMap'}
        player={player}
        inActiveBossFight={inActiveBossFight}
        onClose={() => setActiveModal(null)}
        onUnlockBiomePylon={(biomeId: BiomeId) =>
          runStateAction((s) => {
            const res = unlockBiomeAndPylon(s, biomeId);
            if (res.ok) soundManager.playSfx('level_up');
            return res;
          })
        }
        onTravel={handleTravel}
        onAttuneBiome={(biomeId: BiomeId) =>
          runStateAction((s) => ({
            state: { ...s, activeBiome: biomeId },
            ok: true,
            message: `⚔️ Preah Khan attuned to ${biomeId.replace(/_/g, ' ')}!`,
          }))
        }
      />

      <ServerCityModal
        open={activeModal === 'serverCity'}
        currentCity={player.cityServer ?? 'phnom_penh'}
        currentAreaId={networkStatus.areaId}
        online={networkStatus.online}
        playerCount={networkStatus.playerCount}
        onClose={() => setActiveModal(null)}
        onSelectCity={(city: CityServerId, areaId?: string) => {
          soundManager.playSfx('magic');
          runStateAction((s) => ({
            state: { ...s, cityServer: city },
            ok: true,
            message: `🌏 Connected to ${city.replace(/_/g, ' ').toUpperCase()}${areaId ? ` · ${areaId}` : ''}!`,
          }));
          if (areaId) {
            EventBus.emit('network:switchArea', { areaId });
          }
          EventBus.emit('ticker:push', {
            text: `🌏 Switched City Server hub to ${city.replace(/_/g, ' ').toUpperCase()}${areaId ? ` (${areaId})` : ''}!`,
            category: 'weather',
          });
        }}
      />

      <ReforgeModal
        open={activeModal === 'reforge'}
        initialTab={reforgeTab}
        player={player}
        onClose={() => setActiveModal(null)}
        onReforge={handleReforge}
        onShimmerTransmute={(recipeId) =>
          runStateAction((s) => {
            const res = applyShimmerTransmute(s, recipeId);
            if (res.ok) soundManager.playSfx('level_up');
            return res;
          })
        }
        onBankAction={handleBankAction}
        onCraftArsenalWeapon={(itemId) =>
          runStateAction((s) => {
            const res = craftKhmerArsenalWeapon(s, itemId);
            if (res.ok) soundManager.playSfx('level_up');
            return res;
          })
        }
        onClaimStarterChest={() =>
          runStateAction((s) => {
            const res = claimKhmerArsenalStarterChest(s);
            if (res.ok) soundManager.playSfx('level_up');
            return res;
          })
        }
        onEquipWeapon={handleEquipItem}
        onFuseAccessory={handleFuseAccessory}
        onBuyBaseAccessory={handleBuyBaseAccessory}
        onEquipAccessory={handleEquipItem}
        onCraftArmorSet={handleCraftArmorSet}
        onEquipArmorSet={handleEquipItem}
        onEmpowerEclipseWeapon={() =>
          runStateAction((s) => {
            if (s.weapon.upgradeLevel >= 10) {
              return { state: s, ok: false, message: 'Equipped weapon is already at maximum +10 empowerment!' };
            }
            const shardQty = s.inventory
              .filter((i) => i.itemId === 'mat_eclipse_shard')
              .reduce((sum, i) => sum + i.quantity, 0);
            if (shardQty < 2) {
              return {
                state: s,
                ok: false,
                message: 'Need 2× Eclipse Shards (dropped by Shadow Spirits during Crimson Eclipse).',
              };
            }
            let remaining = 2;
            const nextInv = s.inventory
              .map((entry) => {
                if (entry.itemId !== 'mat_eclipse_shard' || remaining <= 0) return { ...entry };
                const take = Math.min(entry.quantity, remaining);
                remaining -= take;
                return { ...entry, quantity: entry.quantity - take };
              })
              .filter((entry) => entry.quantity > 0);

            const nextLevel = Math.min(10, s.weapon.upgradeLevel + 1);
            soundManager.playSfx('level_up');
            return {
              state: {
                ...s,
                inventory: nextInv,
                weapon: {
                  ...s.weapon,
                  upgradeLevel: nextLevel,
                },
              },
              ok: true,
              message: `🌑 Empowered ${s.weapon.name} to +${nextLevel} (+${nextLevel * 6}% Weapon Power)!`,
            };
          })
        }
      />

      <ClubGamesModal
        open={activeModal === 'clubGames'}
        initialGame={clubGameTab}
        initialTableId={clubTableId}
        player={player}
        onClose={() => setActiveModal(null)}
        onWinClubReward={(coinsDelta, happyGain, label) => {
          runStateAction((s) => {
            const nextCoins = Math.max(0, s.currencies.coins + coinsDelta);
            return {
              state: {
                ...s,
                coins: nextCoins,
                currencies: { ...s.currencies, coins: nextCoins },
                lifeStats: {
                  ...s.lifeStats,
                  happy: Math.min(100, s.lifeStats.happy + happyGain),
                },
              },
              ok: true,
              message: label,
            };
          });
          if (coinsDelta > 0) {
            EventBus.emit('ticker:push', {
              text: `🎲 ${playerRef.current.name}: ${label}`,
              category: 'club',
            });
          }
        }}
      />

      <LeaderboardModal
        open={activeModal === 'leaderboard'}
        initialCategory={leaderboardCategory}
        player={player}
        onClose={() => setActiveModal(null)}
      />

      <PagodaTowerModal
        open={activeModal === 'pagodaTower'}
        player={player}
        onClose={() => setActiveModal(null)}
        onStartFloor={(floor, partyMode) => {
          setActiveModal(null);
          EventBus.emit('tower:enterRequest', { floor, partyMode });
        }}
        onEquipWeaponAura={(auraId) => applyLoadoutPatch({ weaponAura: auraId })}
      />

      <MuseumModal
        open={activeModal === 'museum'}
        player={player}
        onClose={() => setActiveModal(null)}
        onDonateItem={(itemId) =>
          runStateAction((s) => {
            const res = donateItemToMuseum(s, itemId);
            if (res.ok) soundManager.playSfx(res.unlockedScholarHat ? 'level_up' : 'coin');
            return res;
          })
        }
      />

      <NightMarketModal
        open={activeModal === 'nightMarket'}
        player={player}
        activeEvent={activeWorldEvent}
        onClose={() => setActiveModal(null)}
        onBuyOffer={(offer: NightMarketOffer) =>
          runStateAction((s) => {
            if (s.currencies.coins < offer.discountCoins) {
              return { state: s, ok: false, message: `Need ${offer.discountCoins.toLocaleString()} Coins.` };
            }
            const nextCoins = s.currencies.coins - offer.discountCoins;
            const nextInv = s.inventory.map((i) => ({ ...i }));
            const existing = nextInv.find((i) => i.itemId === offer.itemId && (i.quality ?? 'normal') === 'normal');
            if (existing) existing.quantity += offer.quantity;
            else nextInv.push({ itemId: offer.itemId, quantity: offer.quantity, itemLevel: 1, quality: 'normal' });
            soundManager.playSfx('coin');
            return {
              state: {
                ...s,
                coins: nextCoins,
                currencies: { ...s.currencies, coins: nextCoins },
                inventory: nextInv,
              },
              ok: true,
              message: `🏮 Night Market Deal! Bought ${offer.name} for ${offer.discountCoins.toLocaleString()}c (-${offer.discountPct}%)!`,
            };
          })
        }
      />

      <FestivalModal
        open={activeModal === 'festival'}
        activeFestival={activeFestival}
        player={player}
        onClose={() => setActiveModal(null)}
        onStartBoatRace={() => EventBus.emit('festival:startRace')}
        onReleaseLotusLantern={() => EventBus.emit('festival:releaseLantern')}
        onWarpToFestivalMap={(mapId) => {
          EventBus.emit('travel:execute', {
            method: 'pylon',
            destinationLabel: mapId === 'green_park' ? 'Green Park Festival Grounds' : 'Central Plaza Festival',
            targetZone: 'overworld',
            mapId,
          });
        }}
        onTriggerFestivalTest={(fid) => {
          seasonClock.setFestivalOverride(fid);
          EventBus.emit('ui:toast', { text: `🏮 Festival Activated: ${fid.replace(/_/g, ' ').toUpperCase()}!` });
        }}
      />

      <KromModal
        open={activeModal === 'krom'}
        player={player}
        authSession={authSession}
        onClose={() => setActiveModal(null)}
        onKromUpdated={(krom: KromGuild, toastMsg: string, coinCost = 0, consumeCropId?: string) => {
          runStateAction((s) => {
            const nextCoins = Math.max(0, s.currencies.coins - coinCost);
            let nextInv = s.inventory.map((i) => ({ ...i }));
            if (consumeCropId) {
              const idx = nextInv.findIndex((i) => i.itemId === consumeCropId && i.quantity > 0);
              if (idx >= 0) {
                nextInv[idx] = { ...nextInv[idx], quantity: nextInv[idx].quantity - 1 };
                nextInv = nextInv.filter((i) => i.quantity > 0);
              }
            }
            const nextState: PlayerState = {
              ...s,
              coins: nextCoins,
              currencies: { ...s.currencies, coins: nextCoins },
              inventory: nextInv,
              kromId: krom.id,
              kromTag: krom.tag,
              kromName: krom.name,
              kromLevel: krom.level,
            };
            soundManager.playSfx('level_up');
            return { state: nextState, ok: true, message: toastMsg };
          });
        }}
      />

      <ScryingMirrorModal
        open={activeModal === 'scryingMirror'}
        player={player}
        authSession={authSession}
        onClose={() => setActiveModal(null)}
        onSendCheerReward={(fight: ActiveDungeonFightInfo) => {
          runStateAction(
            (s) => {
              if (s.currencies.coins < 50) {
                return { state: s, ok: false, message: 'Need 50 Coins to send a Hot Num Pang Care Package.' };
              }
              const nextCoins = s.currencies.coins - 50;
              soundManager.playSfx('coin');
              return {
                state: {
                  ...s,
                  coins: nextCoins,
                  currencies: { ...s.currencies, coins: nextCoins },
                  lifeStats: {
                    ...s.lifeStats,
                    friendly: Math.min(100, s.lifeStats.friendly + 10),
                  },
                },
                ok: true,
                message: `🥖 Sent a Hot Num Pang Care Package to ${fight.playerName} vs ${fight.bossName}! (-50c, +10 Friendly!)`,
              };
            },
            false,
            ['village_cheerleader']
          );
          EventBus.emit('ticker:push', {
            text: `🥖 ${playerRef.current.name} dropped a Hot Num Pang Care Package to cheer on ${fight.playerName}!`,
            category: 'club',
          });
        }}
        onEnterPreviewCheerFight={(bossId) => {
          EventBus.emit('dungeon:enterRequest', {
            bossId,
            difficulty: 'normal',
            partyMode: 'solo',
          });
          const sender = playerRef.current.name;
          window.setTimeout(() => {
            EventBus.emit('dungeon:villageCheer', {
              senderName: sender,
              healHp: 80,
              attackBonusPct: 0.2,
              durationMs: 30_000,
            });
          }, 1300);
        }}
      />

      <AreaSwitcherModal
        open={activeModal === 'areaSwitcher'}
        networkStatus={networkStatus}
        playerName={player.name}
        onClose={() => setActiveModal(null)}
        onSwitchArea={(areaId) => {
          EventBus.emit('network:switchArea', { areaId });
        }}
        onRenamePlayer={(nextName) => {
          runStateAction((s) => ({
            state: { ...s, name: nextName },
            ok: true,
            message: `Display name updated to ${nextName}!`,
          }));
        }}
      />

      <AuthModal
        open={activeModal === 'auth'}
        starterState={player}
        onAuthenticated={handleAuthenticated}
        onPlayGuest={() => {
          const savedGuest = loadGuestCreationProfile();
          if (savedGuest) {
            handleCompleteCharacterCreation({
              name: savedGuest.name,
              loadout: savedGuest.loadout,
              selectedClass: savedGuest.activeClass,
              starterWeaponId:
                savedGuest.loadout.weapon ?? KHMER_CLASSES[savedGuest.activeClass].starterWeaponId,
            });
            return;
          }
          setActiveModal('characterCreator');
        }}
      />

      <CharacterCreatorModal
        open={activeModal === 'characterCreator'}
        initialPlayer={player}
        onConfirm={handleCompleteCharacterCreation}
      />

      <PlayerActionModal
        target={inspectedPlayer}
        onClose={() => setInspectedPlayer(null)}
        onAddFriend={(target) => void handleAddFriendTarget(target)}
        onWhisper={handleOpenWhisper}
        onInviteDungeon={(target) =>
          handleInviteDungeon({
            sessionId: target.sessionId,
            playerId: target.playerId || undefined,
            name: target.name,
          })
        }
        onOfferBondRing={(target) => {
          setBondPrefillPartner(target.name);
          setActiveModal('bond');
        }}
      />

      <FriendsModal
        open={activeModal === 'friends'}
        initialTab={friendsTab}
        authSession={authSession}
        friendsData={friendsData}
        dungeonInvites={dungeonInvites}
        bondPartner={player.bondPartner}
        onClose={() => setActiveModal(null)}
        onRefresh={() => void refreshFriends()}
        onOpenAuth={() => setActiveModal('auth')}
        onSendFriendRequestByName={(username) => void handleAddFriendByName(username)}
        onAcceptFriend={(id) => void handleAcceptFriend(id)}
        onDeclineFriend={(id) => void handleDeclineFriend(id)}
        onWhisper={handleOpenWhisper}
        onInviteDungeon={(friend: FriendRecord) =>
          handleInviteDungeon({ playerId: friend.playerId, name: friend.username })
        }
        onOfferBondRing={(partnerName) => {
          setBondPrefillPartner(partnerName);
          setActiveModal('bond');
        }}
        onWarpToPartner={(partnerName) => {
          handleTravel(
            {
              method: 'pylon',
              destinationLabel: `${partnerName}'s Plaza`,
              targetZone: 'overworld',
              mapId: 'central_plaza',
            },
            0
          );
          EventBus.emit('ui:toast', {
            text: `🌸 Warping with Pink Lotus Aura to your bonded partner ${partnerName}!`,
          });
        }}
        onOpenBondModal={() => {
          setBondPrefillPartner(null);
          setActiveModal('bond');
        }}
        onAcceptDungeonInvite={(inv) => {
          setDungeonInvites((prev) => prev.filter((i) => i.inviteId !== inv.inviteId));
          roomClient.sendAcceptDungeonInvite({
            fromSessionId: inv.fromSessionId,
            fromName: inv.fromName,
            partyId: inv.partyId,
            bossId: inv.bossId,
            difficulty: inv.difficulty,
          });
          setActiveModal(null);
          EventBus.emit('dungeon:enterRequest', {
            bossId: inv.bossId,
            difficulty: inv.difficulty,
            partyMode: 'coop',
            partyId: inv.partyId,
          });
        }}
        onDeclineDungeonInvite={(inviteId) => {
          setDungeonInvites((prev) => prev.filter((i) => i.inviteId !== inviteId));
        }}
      />

      <FishingModal
        open={activeModal === 'fishing'}
        player={player}
        onClose={() => setActiveModal(null)}
        onCatchReward={handleFishingCatch}
      />

      <FishingMiniGame
        bite={activeFishingBite}
        onComplete={(success, bite) => {
          setActiveFishingBite(null);
          EventBus.emit('fishing:reelComplete', { success, bite });
          if (success) {
            handleFishingCatch({
              itemId: bite.fishId,
              label: bite.label,
              khmerLabel: bite.khmerName,
              rarity: bite.rarity.toUpperCase(),
              fishingXp: bite.fishingXp,
              coins:
                bite.rarity === 'ancient'
                  ? 180
                  : bite.rarity === 'mythic'
                    ? 110
                    : bite.rarity === 'legendary'
                      ? 65
                      : bite.rarity === 'epic'
                        ? 38
                        : 16,
            });
          }
        }}
        onCancel={() => {
          const cur = activeFishingBite;
          setActiveFishingBite(null);
          if (cur) EventBus.emit('fishing:reelComplete', { success: false, bite: cur });
        }}
      />

      <LuckyWheelModal
        open={activeModal === 'luckyWheel'}
        player={player}
        onClose={() => setActiveModal(null)}
        onSpinResult={handleLuckyWheelSpin}
      />

      <PagodaBundleModal
        open={activeModal === 'pagoda'}
        player={player}
        onClose={() => setActiveModal(null)}
        onDonateItem={(altarId, itemId) =>
          runStateAction((s) => donateToPagodaAltar(s, altarId, itemId))
        }
      />

      <MarketModal
        open={activeModal === 'market'}
        player={player}
        authSession={authSession}
        onClose={() => setActiveModal(null)}
        onBuyListing={handleBuyMarketListing}
        onCreateListing={handleCreateMarketListing}
        onCancelListing={handleCancelMarketListing}
      />

      {/* Dungeon Victory / Defeat Overlay */}
      {dungeonOutcome && zone === 'dungeon' && (
        <div className="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="phum-panel w-[min(92vw,440px)] rounded-2xl p-5 text-center space-y-3 shadow-2xl">
            {dungeonOutcome.outcome === 'victory' ? (
              <>
                <div className="font-display font-bold text-2xl text-amber-900">
                  🏆 VICTORY!
                </div>
                <div className="text-xs font-bold text-amber-950">
                  {dungeonOutcome.bossName} · {dungeonOutcome.difficulty.toUpperCase()}
                </div>
                {dungeonOutcome.easterEggUnlocked && (
                  <div className="p-2.5 rounded-xl bg-gradient-to-r from-yellow-200 via-amber-100 to-yellow-200 border-2 border-amber-600 text-amber-950 font-display font-bold text-xs animate-pulse">
                    ✨ EASTER EGG UNLOCKED! No-Hit Victory → The Golden Frying Pan (40% Crit · BONK!) added to Container!
                  </div>
                )}
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-900/30 text-xs text-amber-950 space-y-1">
                  <div className="font-display font-bold">
                    +{dungeonOutcome.coins.toLocaleString()} Coins
                    {dungeonOutcome.gold > 0 ? ` · +${dungeonOutcome.gold} Gold` : ''}
                  </div>
                  {dungeonOutcome.lootLabels.length > 0 && (
                    <div className="text-[11px] text-emerald-900 font-semibold">
                      Loot: {dungeonOutcome.lootLabels.join(' · ')}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDungeonOutcome(null);
                      EventBus.emit('input:rematch');
                    }}
                    className="phum-btn px-4 py-2 rounded-xl font-display font-bold text-xs"
                  >
                    Fight Again
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDungeonOutcome(null);
                      EventBus.emit('input:exitDungeon');
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white border-2 border-emerald-950 font-display font-bold text-xs"
                  >
                    Return to Village
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="font-display font-bold text-2xl text-rose-800">
                  💀 DEFEATED
                </div>
                <p className="text-xs text-amber-950 leading-relaxed">
                  You fell against <strong>{dungeonOutcome.bossName}</strong>. No items were lost — rest in Phum Village, stock up on Street Snacks, and try again!
                </p>
                <div className="flex flex-wrap gap-2 justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDungeonOutcome(null);
                      EventBus.emit('input:rematch');
                    }}
                    className="phum-btn px-4 py-2 rounded-xl font-display font-bold text-xs"
                  >
                    Retry Boss (Full HP)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDungeonOutcome(null);
                      EventBus.emit('input:exitDungeon');
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white border-2 border-rose-950 font-display font-bold text-xs"
                  >
                    Defeated — Return to Village
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <ProfileModal
        open={activeModal === 'profile'}
        player={player}
        onClose={() => setActiveModal(null)}
        onOpenInventory={() => setActiveModal('inventory')}
      />

      <InventoryModal
        open={activeModal === 'inventory'}
        player={player}
        inActiveBossFight={inActiveBossFight}
        onClose={() => setActiveModal(null)}
        onEquip={handleEquipItem}
        onUnequip={handleUnequipSlot}
        onUnequipAccessory={handleUnequipAccessory}
        onToggleVanityOverride={handleToggleVanityOverride}
        onSellFarmItem={(itemId, quality, qty = 1) =>
          runFarmAction((s) => sellFarmProduce(s, itemId, quality, qty))
        }
        onEatSnack={(snackId) =>
          runStateAction((s) => {
            const res = consumeStreetSnack(s, snackId);
            if (res.ok) {
              soundManager.playSfx('heal');
              window.setTimeout(() => {
                EventBus.emit('bounty:progress', { category: 'eat_or_cook_snack', amount: 1 });
              }, 0);
            }
            return res;
          })
        }
        onUseMagicMirror={handleUseMagicMirror}
        onReadTreasureMap={() => {
          runStateAction((s) => {
            if (s.activeTreasureMap) return { state: s, ok: true, message: '' };
            return {
              state: { ...s, activeTreasureMap: rollRandomTreasureMap() },
              ok: true,
              message: '🗺️ Deciphered a new Angkor Treasure Map clue!',
            };
          });
          setActiveModal('treasureMap');
        }}
      />

      <TukTukCartModal
        open={activeModal === 'tukTukCart'}
        player={player}
        authSession={authSession}
        focusedCartId={focusedCartId}
        onClose={() => setActiveModal(null)}
        onCartsChanged={(carts: TukTukCartListing[]) => {
          EventBus.emit('cart:listUpdated', { carts });
        }}
        onStockCartConsume={(cart: TukTukCartListing, stockedItems: TukTukCartItem[], toastMsg: string) => {
          runStateAction((s) => {
            let nextInv = s.inventory.map((i) => ({ ...i }));
            for (const st of stockedItems) {
              const idx = nextInv.findIndex(
                (i) => i.itemId === st.itemId && (i.quality ?? 'normal') === (st.quality ?? 'normal')
              );
              if (idx >= 0) {
                nextInv[idx] = { ...nextInv[idx], quantity: Math.max(0, nextInv[idx].quantity - st.quantity) };
              }
            }
            nextInv = nextInv.filter((i) => i.quantity > 0);
            soundManager.playSfx('level_up');
            return { state: { ...s, inventory: nextInv }, ok: true, message: toastMsg };
          });
          EventBus.emit('ticker:push', {
            text: `🚕 ${cart.signTitle} just parked in ${
              cart.mapId === 'temple_district' ? 'Temple District (Dungeon Portal)' : 'Central Plaza'
            }!`,
            category: 'market',
          });
        }}
        onBuyCartItemComplete={(
          item: TukTukCartItem,
          quantity: number,
          totalPrice: number,
          cartOwnerName: string
        ) => {
          runStateAction((s) => {
            if (s.currencies.coins < totalPrice) {
              return { state: s, ok: false, message: `Need ${totalPrice.toLocaleString()} Coins.` };
            }
            const nextCoins = s.currencies.coins - totalPrice;
            const nextInv = s.inventory.map((i) => ({ ...i }));
            const qual: QualityTier = item.quality ?? 'normal';
            const ex = nextInv.find((i) => i.itemId === item.itemId && (i.quality ?? 'normal') === qual);
            if (ex) ex.quantity += quantity;
            else nextInv.push({ itemId: item.itemId, quantity, itemLevel: 1, quality: qual });
            soundManager.playSfx('coin');
            return {
              state: {
                ...s,
                coins: nextCoins,
                currencies: { ...s.currencies, coins: nextCoins },
                inventory: nextInv,
              },
              ok: true,
              message: `🥖 Bought ${quantity}× ${item.icon} ${item.name} from ${cartOwnerName}'s Tuk-Tuk Cart (-${totalPrice.toLocaleString()}c)!`,
            };
          });
        }}
        onCloseCartReturn={(returnedItems: TukTukCartItem[], revenueCoins: number, toastMsg: string) => {
          runStateAction((s) => {
            const nextInv = s.inventory.map((i) => ({ ...i }));
            for (const item of returnedItems) {
              const qual: QualityTier = item.quality ?? 'normal';
              const ex = nextInv.find((i) => i.itemId === item.itemId && (i.quality ?? 'normal') === qual);
              if (ex) ex.quantity += item.quantity;
              else nextInv.push({ itemId: item.itemId, quantity: item.quantity, itemLevel: 1, quality: qual });
            }
            const nextCoins = s.currencies.coins + revenueCoins;
            soundManager.playSfx('coin');
            return {
              state: {
                ...s,
                coins: nextCoins,
                currencies: { ...s.currencies, coins: nextCoins },
                inventory: nextInv,
              },
              ok: true,
              message: toastMsg,
            };
          });
        }}
      />

      <TreasureMapModal
        open={activeModal === 'treasureMap'}
        player={player}
        onClose={() => setActiveModal(null)}
        onTravelToMap={(mapId) => {
          handleTravel(
            {
              method: 'pylon',
              destinationLabel: mapId.replace(/_/g, ' '),
              targetZone: 'overworld',
              mapId,
            },
            0
          );
        }}
      />

      <RunwayModal
        open={activeModal === 'runway'}
        player={player}
        onClose={() => setActiveModal(null)}
        onCompleteStrut={({ coins, stylishGain, applauseScore, unlockBadge }) => {
          runStateAction((s) => {
            const nextCoins = s.currencies.coins + coins;
            soundManager.playSfx('victory');
            return {
              state: {
                ...s,
                coins: nextCoins,
                currencies: { ...s.currencies, coins: nextCoins },
                lifeStats: {
                  ...s.lifeStats,
                  stylish: s.lifeStats.stylish + stylishGain,
                  happy: Math.min(100, s.lifeStats.happy + 15),
                },
                runwayIconBadge: s.runwayIconBadge || unlockBadge,
                runwayScore: Math.max(s.runwayScore ?? 0, applauseScore),
              },
              ok: true,
              message: `👑 Runway Strut Complete (${applauseScore} pts)! +${coins}c · +${stylishGain} Stylish${
                unlockBadge ? ' · Unlocked 👑 Runway Icon Badge!' : ''
              }`,
            };
          });
          EventBus.emit('ticker:push', {
            text: `👑 ${playerRef.current.name} strutted the Market Street Fashion Runway for ${applauseScore} applause pts!`,
            category: 'club',
          });
        }}
      />

      <BondModal
        open={activeModal === 'bond'}
        player={player}
        authSession={authSession}
        prefillPartnerName={bondPrefillPartner}
        onClose={() => setActiveModal(null)}
        onBuyLotusBondRing={(currency) => {
          runStateAction((s) => {
            if (s.inventory.some((i) => i.itemId === 'acc_lotus_bond_ring' && i.quantity > 0)) {
              return { state: s, ok: false, message: 'You already own a Lotus Bond Ring!' };
            }
            if (currency === 'coins') {
              if (s.currencies.coins < 1000) return { state: s, ok: false, message: 'Need 1,000 Coins.' };
              const nextCoins = s.currencies.coins - 1000;
              soundManager.playSfx('coin');
              return {
                state: {
                  ...s,
                  coins: nextCoins,
                  currencies: { ...s.currencies, coins: nextCoins },
                  inventory: [...s.inventory, { itemId: 'acc_lotus_bond_ring', quantity: 1, itemLevel: 1 }],
                },
                ok: true,
                message: '💍 Purchased Lotus Bond Ring (-1,000 Coins)! Ready to offer to your partner!',
              };
            }
            if (s.currencies.gold < 10) return { state: s, ok: false, message: 'Need 10 Gold.' };
            soundManager.playSfx('coin');
            return {
              state: {
                ...s,
                currencies: { ...s.currencies, gold: s.currencies.gold - 10 },
                inventory: [...s.inventory, { itemId: 'acc_lotus_bond_ring', quantity: 1, itemLevel: 1 }],
              },
              ok: true,
              message: '💍 Purchased Lotus Bond Ring (-10 Gold)! Ready to offer to your partner!',
            };
          });
        }}
        onBondAccepted={(bond: BondPartnerRecord, toastMsg: string) => {
          runStateAction((s) => {
            soundManager.playSfx('victory');
            return {
              state: {
                ...s,
                bondPartner: bond,
                lifeStats: { ...s.lifeStats, friendly: 100, happy: 100 },
              },
              ok: true,
              message: toastMsg,
            };
          });
          EventBus.emit('ticker:push', {
            text: `💖 ${playerRef.current.name} & ${bond.partnerName} sealed a Lotus Bond Ring!`,
            category: 'club',
          });
        }}
        onWarpToPartner={(partnerName) => {
          handleTravel(
            {
              method: 'pylon',
              destinationLabel: `${partnerName}'s Plaza`,
              targetZone: 'overworld',
              mapId: 'central_plaza',
            },
            0
          );
          EventBus.emit('ui:toast', {
            text: `🌸 Warping with Pink Lotus Aura to your bonded partner ${partnerName}!`,
          });
        }}
        onEnterSharedCoopFarm={(bond) => {
          handleTravel(
            {
              method: 'mirror',
              destinationLabel: `Shared Co-op Farm with ${bond.partnerName}`,
              targetZone: 'farm',
            },
            0
          );
          EventBus.emit('ui:toast', {
            text: `🌾 Entered Shared Co-op Farm with ${bond.partnerName}! Water, infuse & harvest together!`,
          });
        }}
      />

      <BountyBoardModal
        open={activeModal === 'bounties'}
        player={player}
        onClose={() => setActiveModal(null)}
        onClaimBounty={(bountyId) =>
          runStateAction(
            (s) => {
              const res = claimBountyReward(s, bountyId);
              if (res.ok) {
                soundManager.playSfx('level_up');
                window.setTimeout(() => {
                  EventBus.emit('guide:step', { stepId: 'claim_bounty' });
                }, 0);
                const passRes = awardSeasonPassXp(res.state, 120);
                const isWeekly = res.bounty?.cadence === 'weekly';
                const finalState = isWeekly
                  ? { ...passRes.state, reliquaryKeys: (passRes.state.reliquaryKeys ?? 0) + 1 }
                  : passRes.state;
                return {
                  ...res,
                  state: finalState,
                  message: `${res.message} (+120 Season XP${
                    isWeekly ? ' · +1 🗝️ Reliquary Key!' : ''
                  }${passRes.tieredUp ? ` · Pass Tier ${passRes.newTier}!` : ''})`,
                };
              }
              return res;
            },
            false,
            ['bounty_hunter']
          )
        }
        onClaimAllReady={() =>
          runStateAction(
            (s) => {
              const active = getActiveBounties();
              let cur = s;
              let claimedCount = 0;
              let totalCoins = 0;
              let totalGold = 0;
              let totalStones = 0;
              let totalXp = 0;
              for (const b of active.all) {
                const res = claimBountyReward(cur, b.id);
                if (res.ok && res.bounty) {
                  cur = res.state;
                  claimedCount += 1;
                  totalCoins += res.bounty.rewardCoins;
                  totalGold += res.bounty.rewardGold;
                  totalStones += res.bounty.rewardReforgeStones;
                  totalXp += res.bounty.rewardXp;
                }
              }
              if (claimedCount === 0) {
                return { state: s, ok: false, message: 'No completed bounties ready to claim yet!' };
              }
              soundManager.playSfx('victory');
              window.setTimeout(() => {
                EventBus.emit('guide:step', { stepId: 'claim_bounty' });
              }, 0);
              const passXp = claimedCount * 120;
              const passRes = awardSeasonPassXp(cur, passXp);
              return {
                state: passRes.state,
                ok: true,
                message: `📋 Claimed ${claimedCount} Bounties! +${totalCoins.toLocaleString()}c · +${totalGold} Gold · +${totalStones}× Reforge Stones · +${totalXp} XP · +${passXp} Season XP!`,
              };
            },
            false,
            ['bounty_hunter']
          )
        }
      />

      <DailyLoginModal
        open={activeModal === 'dailyLogin'}
        player={player}
        onClose={() => setActiveModal(null)}
        onClaimToday={() =>
          runStateAction((s) => {
            const res = claimDailyLoginReward(s);
            if (res.ok) {
              const passRes = awardSeasonPassXp(res.state, 60);
              return { ...res, state: passRes.state };
            }
            return res;
          })
        }
      />

      <SeasonPassModal
        open={activeModal === 'seasonPass'}
        player={player}
        onClose={() => setActiveModal(null)}
        onUnlockRoyalPass={() => runStateAction((s) => unlockRoyalSeasonPass(s))}
        onClaimTier={(tier, track) =>
          runStateAction((s) => claimSeasonPassTier(s, tier, track))
        }
        onClaimAllReady={() =>
          runStateAction((s) => {
            let cur = s;
            let count = 0;
            for (const row of SEASON_PASS_TIERS) {
              const r1 = claimSeasonPassTier(cur, row.tier, 'free');
              if (r1.ok) {
                cur = r1.state;
                count += 1;
              }
              if (cur.hasRoyalPass) {
                const r2 = claimSeasonPassTier(cur, row.tier, 'royal');
                if (r2.ok) {
                  cur = r2.state;
                  count += 1;
                }
              }
            }
            if (count === 0) {
              return { state: s, ok: false, message: 'No unlocked Season Pass rewards ready to claim yet!' };
            }
            return {
              state: cur,
              ok: true,
              message: `🎟️ Claimed ${count} Angkor Season Pass reward${count === 1 ? '' : 's'}!`,
            };
          })
        }
      />

      <AchievementsModal
        open={activeModal === 'achievements'}
        player={player}
        onClose={() => setActiveModal(null)}
        onEquipBadge={(badgeId) =>
          runStateAction((s) => ({
            state: { ...s, equippedBadgeId: badgeId },
            ok: true,
            message: badgeId
              ? '🏅 Equipped Achievement Badge next to your overhead name!'
              : 'Hidden overhead Achievement Badge.',
          }))
        }
      />

      <PromoCodeModal
        open={activeModal === 'promo'}
        player={player}
        authSession={authSession}
        onClose={() => setActiveModal(null)}
        onRewardClaimed={(reward: PromoRedeemReward, redeemedCodes: string[]) => {
          runStateAction((s) => {
            const nextCoins = s.currencies.coins + reward.coins;
            const nextGold = s.currencies.gold + reward.gold;
            const nextDiamonds = s.currencies.diamonds + reward.diamonds;
            const nextInv = s.inventory.map((i) => ({ ...i }));
            for (const item of reward.items) {
              const ex = nextInv.find(
                (i) => i.itemId === item.itemId && (i.quality ?? 'normal') === 'normal'
              );
              if (ex) ex.quantity += item.quantity;
              else {
                nextInv.push({
                  itemId: item.itemId,
                  quantity: item.quantity,
                  itemLevel: 1,
                  quality: 'normal',
                });
              }
            }
            return {
              state: {
                ...s,
                coins: nextCoins,
                currencies: {
                  coins: nextCoins,
                  gold: nextGold,
                  diamonds: nextDiamonds,
                },
                inventory: nextInv,
                redeemedCodes,
              },
              ok: true,
              message: `🎁 Gift Code ${reward.code} Redeemed! ${reward.summary}`,
            };
          });
        }}
      />

      <AdminPanelModal
        open={activeModal === 'admin'}
        authSession={authSession}
        localOnlineCount={networkStatus.playerCount}
        onClose={() => setActiveModal(null)}
      />

      <ShopModal
        open={activeModal === 'snackShop' || activeModal === 'fashionShop'}
        mode={shopMode}
        initialTab={shopTab}
        player={player}
        onClose={() => setActiveModal(null)}
        onBuySnack={(snackId, qty = 1) =>
          runStateAction((s) => {
            const res = buyStreetSnack(s, snackId, qty);
            if (res.ok) soundManager.playSfx('coin');
            return res;
          })
        }
        onCookSnack={(snackId) =>
          runStateAction((s) => {
            const res = cookStreetSnack(s, snackId);
            if (res.ok) {
              soundManager.playSfx('harvest');
              window.setTimeout(() => {
                EventBus.emit('bounty:progress', { category: 'eat_or_cook_snack', amount: 1 });
              }, 0);
            }
            return res;
          })
        }
        onEatSnack={(snackId) =>
          runStateAction((s) => {
            const res = consumeStreetSnack(s, snackId);
            if (res.ok) {
              soundManager.playSfx('heal');
              window.setTimeout(() => {
                EventBus.emit('bounty:progress', { category: 'eat_or_cook_snack', amount: 1 });
              }, 0);
            }
            return res;
          })
        }
        onAssignQuickSlot={(slotIndex, snackId) =>
          runStateAction((s) => assignQuickSnackSlot(s, slotIndex, snackId))
        }
        onBuyFashion={(itemId) =>
          runStateAction((s) => {
            const res = buyFashionItem(s, itemId);
            if (res.ok) soundManager.playSfx('coin');
            return res;
          })
        }
        onBuyFurniture={(itemId) =>
          runStateAction((s) => {
            const perks = getNpcPerkFlags(s);
            const res = buyHouseFurniture(s, itemId, perks.boutiqueDiscountPct);
            if (res.ok) soundManager.playSfx('coin');
            return res;
          })
        }
        onEquipFashion={handleEquipItem}
        onCustomizeLook={(patch, cost) => {
          if (!cost || (cost.coins <= 0 && cost.diamonds <= 0)) {
            applyLoadoutPatch(patch);
            return;
          }
          runStateAction((s) => {
            if (s.currencies.coins < cost.coins) {
              return { state: s, ok: false, message: `Need ${cost.coins.toLocaleString()} Coins for this Salon makeover!` };
            }
            if (s.currencies.diamonds < cost.diamonds) {
              return { state: s, ok: false, message: `Need ${cost.diamonds} Diamonds for these Premium Salon styles!` };
            }
            const nextCoins = s.currencies.coins - cost.coins;
            const nextDiamonds = s.currencies.diamonds - cost.diamonds;
            const nextInv = s.inventory.map((i) => ({ ...i }));
            for (const unlockId of cost.unlockItemIds ?? []) {
              if (!nextInv.some((i) => i.itemId === unlockId)) {
                nextInv.push({ itemId: unlockId, quantity: 1, itemLevel: 1, quality: 'normal' });
              }
            }
            const nextLoadout: EquippedLoadout = { ...s.loadout, ...patch };
            const nextState: PlayerState = {
              ...s,
              coins: nextCoins,
              currencies: { ...s.currencies, coins: nextCoins, diamonds: nextDiamonds },
              loadout: nextLoadout,
              inventory: nextInv,
            };
            soundManager.playSfx('coin');
            window.setTimeout(() => {
              EventBus.emit('player:loadoutChanged', {
                loadout: nextLoadout,
                activeClass: nextState.activeClass,
                playerState: nextState,
              });
            }, 0);
            const parts: string[] = [];
            if (cost.coins > 0) parts.push(`-${cost.coins.toLocaleString()} C`);
            if (cost.diamonds > 0) parts.push(`-${cost.diamonds} 💎`);
            return {
              state: nextState,
              ok: true,
              message: `💈 Salon Makeover Applied (${parts.join(' & ')})!`,
            };
          });
        }}
      />

      <NpcDialogueModal
        open={Boolean(activeNpcId)}
        npcId={activeNpcId}
        player={player}
        onClose={() => setActiveNpcId(null)}
        onGiveGift={(npcId, itemId) => {
          const res = giveGiftToNpc(playerRef.current, npcId, itemId);
          EventBus.emit('ui:toast', { text: res.message });
          if (res.ok) {
            soundManager.playSfx('level_up');
            setPlayer(res.state);
            EventBus.emit('player:stateSync', res.state);
            if (!authSessionRef.current) {
              saveGuestProgressSnapshot(res.state);
            }
          }
          return { ok: res.ok, reactionLine: res.reactionLine };
        }}
      />

      <HouseDecorModal
        open={activeModal === 'houseDecor'}
        player={player}
        decorateMode={houseDecorateMode}
        onToggleDecorateMode={(active, itemId) => {
          setHouseDecorateMode(active);
          EventBus.emit('house:setDecorateMode', { active, itemId: itemId ?? null });
        }}
        onBuyFurniture={(itemId) =>
          runStateAction((s) => {
            const perks = getNpcPerkFlags(s);
            const res = buyHouseFurniture(s, itemId, perks.boutiqueDiscountPct);
            if (res.ok) soundManager.playSfx('coin');
            return res;
          })
        }
        onInviteFriendsHome={() => {
          const hostName = playerRef.current.name;
          roomClient.sendChat(`🏡 [HOME INVITE] Come visit ${hostName}'s decorated Khmer Stilt House!`);
          EventBus.emit('ui:toast', {
            text: `👥 Sent live Home Invite to online friends in ${networkStatus.areaId}!`,
          });
        }}
        onClose={() => setActiveModal(null)}
      />

      <SkillTreeModal
        open={activeModal === 'skills'}
        player={player}
        onClose={() => setActiveModal(null)}
        onUnlockTalent={(skillId: SkillId, talentId: string) =>
          runStateAction((s) => unlockSkillTalent(s, skillId, talentId))
        }
        onRespecAll={() => runStateAction((s) => respecAllSkills(s))}
      />

      <FarmModal
        open={activeModal === 'farm'}
        initialTab={farmModalTab}
        player={player}
        onClose={() => setActiveModal(null)}
        onBuySupply={(itemId, qty = 1) => runFarmAction((s) => buyFarmSupply(s, itemId, qty))}
        onSellProduce={(itemId, quality: QualityTier, qty = 1) =>
          runFarmAction((s) => sellFarmProduce(s, itemId, quality, qty))
        }
        onBuyTree={(treeId) => runFarmAction((s) => buyFruitTree(s, treeId))}
        onHarvestTree={(slotIndex) => runFarmAction((s) => harvestFruitTree(s, slotIndex))}
        onBuyLivestock={(animalId) => runFarmAction((s) => buyLivestock(s, animalId))}
        onCollectLivestock={(slotIndex) => runFarmAction((s) => collectLivestock(s, slotIndex))}
        onBuyMachine={(machineId) => runFarmAction((s) => buyArtisanMachine(s, machineId))}
        onStartMachine={(slotIndex, recipeId) =>
          runFarmAction((s) => startArtisanProcess(s, slotIndex, recipeId))
        }
        onCollectMachine={(slotIndex) => runFarmAction((s) => collectArtisanOutput(s, slotIndex))}
        onFastForward={(seconds = 60) => runFarmAction((s) => fastForwardFarmTimers(s, seconds))}
      />

      {toast && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 -translate-x-1/2 z-40 max-w-[90vw] px-4 py-1.5 rounded-full phum-panel font-display font-bold text-xs text-center">
          {toast}
        </div>
      )}
    </div>
  );
};
