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
import { respecAllSkills, unlockSkillTalent } from './game/systems/SkillManager';
import { launchPhaserGame } from './game/config';
import {
  EventBus,
  type BossHudPayload,
  type ClassMeterPayload,
  type DungeonOutcomePayload,
  type FarmToolMode,
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

type ActiveModalType =
  | null
  | 'profile'
  | 'inventory'
  | 'farm'
  | 'snackShop'
  | 'fashionShop'
  | 'skills'
  | 'modeSelector'
  | 'areaSwitcher';

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
  const [touchUiEnabled, setTouchUiEnabled] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModalType>(null);
  const [farmModalTab, setFarmModalTab] = useState<FarmModalTab>('seeds');
  const [shopTab, setShopTab] = useState<'primary' | 'secondary'>('primary');
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
      const patch: Partial<EquippedLoadout> = { [def.slot]: def.id };
      if (def.hairStyleOverride) {
        patch.hairStyle = def.hairStyleOverride;
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
        return consumeStreetSnack(s, snackId);
      });
    },
    [runStateAction]
  );

  useEffect(() => {
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
      EventBus.on('skill:xpGained', (payload) => {
        const uid = xpUid++;
        setXpBanners((prev) => [...prev.slice(-2), { ...payload, uid }]);
        window.setTimeout(() => {
          setXpBanners((prev) => prev.filter((b) => b.uid !== uid));
        }, payload.leveledUp ? 3600 : 1900);
      }),
      EventBus.on('ui:openModal', ({ modal, farmTab, shopTab: requestedShopTab }) => {
        if (modal === 'farm' && farmTab) setFarmModalTab(farmTab);
        if (modal === 'wardrobe') {
          setShopTab('secondary');
          setActiveModal('fashionShop');
          return;
        }
        if ((modal === 'snackShop' || modal === 'fashionShop') && requestedShopTab) {
          setShopTab(requestedShopTab);
        }
        setActiveModal(modal);
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

  return (
    <div className="relative w-screen h-dvh max-w-full max-h-dvh overflow-hidden bg-slate-950">
      <div ref={mountRef} className="w-full h-full overflow-hidden" />

      <HUD
        player={player}
        zone={zone}
        networkStatus={networkStatus}
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
        onFastForwardFarm={() => runFarmAction((s) => fastForwardFarmTimers(s, 60))}
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
        messages={messages}
        onAddMessage={(msg) => setMessages((prev) => [...prev.slice(-39), msg])}
      />

      <MobileControls
        visible={touchUiEnabled}
        zone={zone}
        nearPortal={nearPortal}
        bossHud={bossHud}
      />

      <ModeSelectorModal
        open={activeModal === 'modeSelector'}
        player={player}
        onClose={() => setActiveModal(null)}
        onEnterDungeon={(bossId: BossId, difficulty: DifficultyMode) => {
          setActiveModal(null);
          EventBus.emit('dungeon:enterRequest', { bossId, difficulty });
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

      {/* Dungeon Victory / Defeat Overlay */}
      {dungeonOutcome && zone === 'dungeon' && (
        <div className="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="stardew-panel w-[min(92vw,440px)] rounded-2xl p-5 text-center space-y-3 shadow-2xl">
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
                    className="stardew-btn px-4 py-2 rounded-xl font-display font-bold text-xs"
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
                    className="stardew-btn px-4 py-2 rounded-xl font-display font-bold text-xs"
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
        onClose={() => setActiveModal(null)}
        onEquip={handleEquipItem}
        onUnequip={handleUnequipSlot}
        onSellFarmItem={(itemId, quality, qty = 1) =>
          runFarmAction((s) => sellFarmProduce(s, itemId, quality, qty))
        }
        onEatSnack={(snackId) => runStateAction((s) => consumeStreetSnack(s, snackId))}
      />

      <ShopModal
        open={activeModal === 'snackShop' || activeModal === 'fashionShop'}
        mode={shopMode}
        initialTab={shopTab}
        player={player}
        onClose={() => setActiveModal(null)}
        onBuySnack={(snackId, qty = 1) => runStateAction((s) => buyStreetSnack(s, snackId, qty))}
        onCookSnack={(snackId) => runStateAction((s) => cookStreetSnack(s, snackId))}
        onEatSnack={(snackId) => runStateAction((s) => consumeStreetSnack(s, snackId))}
        onAssignQuickSlot={(slotIndex, snackId) =>
          runStateAction((s) => assignQuickSnackSlot(s, slotIndex, snackId))
        }
        onBuyFashion={(itemId) => runStateAction((s) => buyFashionItem(s, itemId))}
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
        <div className="pointer-events-none fixed bottom-24 left-1/2 -translate-x-1/2 z-40 max-w-[90vw] px-4 py-1.5 rounded-full stardew-panel font-display font-bold text-xs text-center">
          {toast}
        </div>
      )}
    </div>
  );
};
