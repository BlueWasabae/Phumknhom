import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  INITIAL_PLAYER_STATE,
  type ChatMessage,
  type CombatHitResult,
  type EquipSlot,
  type EquippedLoadout,
  type PlayerState,
  type ZoneType,
} from '@shared/types';
import { KHMER_CLASSES } from '@shared/khmerClasses';
import {
  ITEM_CATALOG,
  buildWeaponStatsFromItem,
  computeLoadoutDefenseAndHp,
  computeStylishScore,
} from './data/items';
import { launchPhaserGame } from './game/config';
import { EventBus, type ClassMeterPayload } from './game/EventBus';
import { HUD } from './ui/HUD';
import { ChatOverlay } from './ui/ChatOverlay';
import { MobileControls } from './ui/MobileControls';
import { ProfileModal } from './ui/ProfileModal';
import { InventoryModal } from './ui/InventoryModal';
import { WardrobeModal } from './ui/WardrobeModal';

type ActiveModalType = null | 'profile' | 'inventory' | 'wardrobe';

export const App: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  const [player, setPlayer] = useState<PlayerState>(() => ({
    ...INITIAL_PLAYER_STATE,
    weapon: { ...INITIAL_PLAYER_STATE.weapon },
    loadout: { ...INITIAL_PLAYER_STATE.loadout },
    currencies: { ...INITIAL_PLAYER_STATE.currencies },
    lifeStats: {
      ...INITIAL_PLAYER_STATE.lifeStats,
      stylish: computeStylishScore(INITIAL_PLAYER_STATE.loadout),
    },
  }));

  const [zone, setZone] = useState<ZoneType>('overworld');
  const [nearPortal, setNearPortal] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [touchUiEnabled, setTouchUiEnabled] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModalType>(null);
  const [lastHit, setLastHit] = useState<CombatHitResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);
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
      text: 'Phase 2 live! Press [I] to equip all 5 Khmer Class Weapons, Wings & Pets — or visit FASHION SHOP!',
      timestamp: Date.now(),
    },
  ]);

  const applyLoadoutPatch = useCallback((patch: Partial<EquippedLoadout>, toastMsg?: string) => {
    setPlayer((prev) => {
      const nextLoadout: EquippedLoadout = { ...prev.loadout, ...patch };
      const nextWeapon = buildWeaponStatsFromItem(nextLoadout.weapon);
      const nextClass = nextWeapon.classId;
      const derived = computeLoadoutDefenseAndHp(nextLoadout, prev.level);
      const stylish = computeStylishScore(nextLoadout);

      const nextState: PlayerState = {
        ...prev,
        activeClass: nextClass,
        weapon: {
          ...nextWeapon,
          baseDamage: nextWeapon.baseDamage + derived.bonusFlatAtk,
          critChance: Math.min(0.65, nextWeapon.critChance + derived.bonusCrit),
        },
        defense: derived.defense,
        maxHp: derived.maxHp,
        hp: Math.min(prev.hp, derived.maxHp),
        loadout: nextLoadout,
        lifeStats: {
          ...prev.lifeStats,
          stylish,
        },
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

  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) setTouchUiEnabled(true);
  }, []);

  // Global keyboard shortcuts: I / B for Inventory, P for Profile
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (k === 'i' || k === 'b') {
        setActiveModal((cur) => (cur === 'inventory' ? null : 'inventory'));
      } else if (k === 'p') {
        setActiveModal((cur) => (cur === 'profile' ? null : 'profile'));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;
    const { destroy } = launchPhaserGame(mountRef.current);

    let toastTimer: number | null = null;
    const unsubs = [
      EventBus.on('scene:ready', ({ zone: nextZone }) => {
        setZone(nextZone);
        setNearPortal(false);
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
      EventBus.on('ui:openModal', ({ modal }) => {
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

  return (
    <div className="relative w-screen h-dvh max-w-full max-h-dvh overflow-hidden bg-slate-950">
      <div ref={mountRef} className="w-full h-full overflow-hidden" />

      <HUD
        player={player}
        zone={zone}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen((o) => !o)}
        touchUiEnabled={touchUiEnabled}
        onToggleTouchUi={() => setTouchUiEnabled((v) => !v)}
        lastHit={lastHit}
        classMeter={classMeter}
        onOpenProfile={() => setActiveModal('profile')}
        onOpenInventory={() => setActiveModal('inventory')}
        onOpenWardrobe={() => setActiveModal('wardrobe')}
      />

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
      />

      {/* Phase 2 Avatar World Modals */}
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
      />

      <WardrobeModal
        open={activeModal === 'wardrobe'}
        loadout={player.loadout}
        onClose={() => setActiveModal(null)}
        onCustomize={(patch) => applyLoadoutPatch(patch)}
      />

      {toast && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 -translate-x-1/2 z-40 max-w-[90vw] px-4 py-1.5 rounded-full stardew-panel font-display font-bold text-xs text-center">
          {toast}
        </div>
      )}
    </div>
  );
};
