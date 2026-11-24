import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  INITIAL_PLAYER_STATE,
  type BossId,
  type ChatMessage,
  type CombatHitResult,
  type DifficultyMode,
  type EquipSlot,
  type EquippedLoadout,
  type PlayerState,
  type QualityTier,
  type SkillId,
  type ZoneType,
} from '@shared/types';
import { KHMER_CLASSES } from '@shared/khmerClasses';
import { computeVillageToDungeonBridge } from '@shared/skillTrees';
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
  getTodayDateKey,
  hasFreeDailyCoinSpin,
  purchaseDiamondShopItem,
  togglePlazaMount,
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
  createMarketListingApi,
  declineFriendRequestApi,
  fetchFriends,
  loadGuestCreationProfile,
  reforgeItemApi,
  sandboxTopUpApi,
  sanitizeLegacyLocalStoragePets,
  saveAccountProfile,
  saveGuestCreationProfile,
  sendFriendRequestApi,
  syncGoogleAccount,
  type AuthSession,
  type FriendRecord,
  type FriendsListResponse,
  type MarketListingClient,
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
import { WorldMapModal } from './ui/WorldMapModal';
import { ServerCityModal } from './ui/ServerCityModal';
import { ServerTickerBanner } from './ui/ServerTickerBanner';
import { ReforgeModal, type ReforgeTab } from './ui/ReforgeModal';
import { ClubGamesModal, type ClubGameTab } from './ui/ClubGamesModal';
import { CharacterCreatorModal, type CharacterCreationResult } from './ui/CharacterCreatorModal';
import { soundManager } from './game/systems/SoundManager';
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
  | 'characterCreator';

interface FloatingXpBanner extends SkillXpToastPayload {
  uid: number;
}

export const App: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  const [player, setPlayer] = useState<PlayerState>(() => ({
    ...INITIAL_PLAYER_STATE,
    name: `PhumHero_${Math.floor(10 + Math.random() * 89)}`,
    weapon: { ...INITIAL_PLAYER_STATE.weapon },
    loadout: { ...INITIAL_PLAYER_STATE.loadout },
    currencies: { ...INITIAL_PLAYER_STATE.currencies },
    lifeStats: {
      ...INITIAL_PLAYER_STATE.lifeStats,
      stylish: computeStylishScore(INITIAL_PLAYER_STATE.loadout),
    },
  }));

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
  const [touchUiEnabled, setTouchUiEnabled] = useState(false);
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
  const [preselectedBossId, setPreselectedBossId] = useState<BossId>('sdech_kongkaeb');
  const [selectedCropId, setSelectedCropId] = useState('trakuon');
  const [farmToolMode, setFarmToolMode] = useState<FarmToolMode>('smart');
  const [lastHit, setLastHit] = useState<CombatHitResult | null>(null);
  const [bossHud, setBossHud] = useState<BossHudPayload | null>(null);
  const [dungeonOutcome, setDungeonOutcome] = useState<DungeonOutcomePayload | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [xpBanners, setXpBanners] = useState<FloatingXpBanner[]>([]);
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
    (fn: (prev: PlayerState) => { state: PlayerState; ok: boolean; message: string }, isFarm = false) => {
      setPlayer((prev) => {
        const res = fn(prev);
        EventBus.emit('ui:toast', { text: res.message });
        if (res.ok) {
          EventBus.emit('player:stateSync', res.state);
          if (isFarm) EventBus.emit('farm:stateUpdated', res.state);
          return res.state;
        }
        return prev;
      });
    },
    []
  );

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
      if (slot === 'weapon') return;
      applyLoadoutPatch({ [slot]: null }, `Unequipped ${slot}.`);
    },
    [applyLoadoutPatch]
  );

  const handleSelectFarmSeed = useCallback((cropId: string, toolMode: FarmToolMode) => {
    setSelectedCropId(cropId);
    setFarmToolMode(toolMode);
    EventBus.emit('farm:selectSeed', { cropId, toolMode });
  }, []);

  const handleEatQuickSlot = useCallback(
    (slotIndex: 0 | 1 | 2) => {
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
        if (res.ok) soundManager.playSfx('heal');
        return res;
      });
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

  // Debounced auto-save whenever player harvests, buys/sells, equips, levels a skill, defeats a boss, or switches zones
  useEffect(() => {
    if (!authSession) return;
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
        let nextInv = prev.inventory.map((i) => ({ ...i }));
        if (reward.itemId) {
          const existing = nextInv.find(
            (i) => i.itemId === reward.itemId && (i.quality ?? 'normal') === 'normal'
          );
          if (existing) existing.quantity += 1;
          else nextInv.push({ itemId: reward.itemId, quantity: 1, itemLevel: 1, quality: 'normal' });
        }
        const nextCoins = prev.currencies.coins + (reward.coins ?? 0);
        const base: PlayerState = {
          ...prev,
          coins: nextCoins,
          currencies: { ...prev.currencies, coins: nextCoins },
          inventory: nextInv,
        };
        const xpRes = awardSkillXp(base, 'fishing', reward.fishingXp, true);
        return {
          state: xpRes.state,
          ok: true,
          message: `🎣 Caught ${reward.label} (+${reward.fishingXp} Fishing XP)!`,
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

  const handleSandboxTopUp = useCallback(
    async (sku: string) => {
      const res = await sandboxTopUpApi(authSessionRef.current, sku);
      if (!res.ok) {
        EventBus.emit('ui:toast', { text: res.error });
        return;
      }
      soundManager.playSfx('level_up');
      runStateAction((prev) => ({
        state: {
          ...prev,
          currencies: {
            ...prev.currencies,
            diamonds: prev.currencies.diamonds + res.diamondsGranted,
          },
          villagePassUntil: res.villagePassUntil ?? prev.villagePassUntil ?? null,
        },
        ok: true,
        message: `💎 Sandbox Top-Up Complete: ${res.label} (+${res.diamondsGranted} Diamonds)!`,
      }));
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
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (k === 'i' || k === 'b') {
        setActiveModal((cur) => (cur === 'inventory' ? null : 'inventory'));
      } else if (k === 'p') {
        setActiveModal((cur) => (cur === 'profile' ? null : 'profile'));
      } else if (k === 'k') {
        setActiveModal((cur) => (cur === 'skills' ? null : 'skills'));
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
  }, [handleEatQuickSlot]);

  useEffect(() => {
    if (!mountRef.current) return;
    const { destroy } = launchPhaserGame(mountRef.current);

    let toastTimer: number | null = null;
    let xpUid = 1;
    const unsubs = [
      EventBus.on('scene:ready', ({ zone: nextZone }) => {
        setZone(nextZone);
        setNearPortal(false);
        if (nextZone !== 'dungeon') {
          setBossHud(null);
          setDungeonOutcome(null);
        }
      }),
      EventBus.on('player:state', (nextPlayer) => {
        setPlayer(nextPlayer);
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
          const withLoot: PlayerState = {
            ...prev,
            coins: nextCoins,
            currencies: { ...prev.currencies, coins: nextCoins },
            inventory: nextInv,
          };
          const xpRes = awardSkillXp(withLoot, skillId, xp);
          return {
            state: xpRes.state,
            ok: true,
            message: label,
          };
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
        ({ modal, farmTab, shopTab: requestedShopTab, friendsTab: reqFriendsTab, reforgeTab: reqReforgeTab, clubGame }) => {
          if (modal === 'farm' && farmTab) setFarmModalTab(farmTab);
          if (modal === 'friends' && reqFriendsTab) setFriendsTab(reqFriendsTab);
          if (modal === 'reforge' && reqReforgeTab) setReforgeTab(reqReforgeTab);
          if (modal === 'clubGames' && clubGame) setClubGameTab(clubGame);
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
          setClubGameTab('tien_len');
          setActiveModal('clubGames');
        }}
        onFastForwardFarm={() => runFarmAction((s) => fastForwardFarmTimers(s, 60))}
      />

      <ServerTickerBanner />

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
        onSandboxTopUp={handleSandboxTopUp}
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
      />

      <ClubGamesModal
        open={activeModal === 'clubGames'}
        initialGame={clubGameTab}
        player={player}
        onClose={() => setActiveModal(null)}
        onWinClubReward={(coins, happyGain, label) => {
          runStateAction((s) => {
            const nextCoins = s.currencies.coins + coins;
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
              message: `🃏 ${label}: +${coins} Coins & +${happyGain} Happy!`,
            };
          });
          EventBus.emit('ticker:push', {
            text: `🃏 ${playerRef.current.name} won ${label} at the Phum Night Club!`,
            category: 'club',
          });
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
      />

      <FriendsModal
        open={activeModal === 'friends'}
        initialTab={friendsTab}
        authSession={authSession}
        friendsData={friendsData}
        dungeonInvites={dungeonInvites}
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
        onSellFarmItem={(itemId, quality, qty = 1) =>
          runFarmAction((s) => sellFarmProduce(s, itemId, quality, qty))
        }
        onEatSnack={(snackId) => runStateAction((s) => consumeStreetSnack(s, snackId))}
        onUseMagicMirror={handleUseMagicMirror}
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
            if (res.ok) soundManager.playSfx('harvest');
            return res;
          })
        }
        onEatSnack={(snackId) =>
          runStateAction((s) => {
            const res = consumeStreetSnack(s, snackId);
            if (res.ok) soundManager.playSfx('heal');
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
        onEquipFashion={handleEquipItem}
        onCustomizeLook={(patch) => applyLoadoutPatch(patch)}
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
