import React, { useEffect, useId, useRef, useState } from 'react';
import type { CombatHitResult, DifficultyMode, EmoteSymbol, PlayerState, ZoneType } from '@shared/types';
import {
  calculateCoopBossHp,
  calculateDamageTaken,
  calculateEffectiveDR,
  calculatePlayerDamage,
  getXpForNextLevel,
} from '@shared/balanceFormulas';
import {
  Coins,
  Gamepad2,
  Heart,
  Mail,
  Menu,
  MessageCircle,
  Smile,
  Swords,
  X,
} from 'lucide-react';
import { EventBus } from '../game/EventBus';

interface HUDProps {
  player: PlayerState;
  zone: ZoneType;
  chatOpen: boolean;
  onToggleChat: () => void;
  touchUiEnabled: boolean;
  onToggleTouchUi: () => void;
  lastHit: CombatHitResult | null;
}

const EMOTES: EmoteSymbol[] = ['👋', '😄', '❤️', '🔥'];
const DIFFICULTIES: DifficultyMode[] = ['normal', 'expert', 'calamity', 'death'];

export const HUD: React.FC<HUDProps> = ({
  player,
  zone,
  chatOpen,
  onToggleChat,
  touchUiEnabled,
  onToggleTouchUi,
  lastHit,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [emoteOpen, setEmoteOpen] = useState(false);
  const [unreadMail, setUnreadMail] = useState(true);
  const [previewDiff, setPreviewDiff] = useState<DifficultyMode>('normal');
  const [previewParty, setPreviewParty] = useState(2);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (menuOpen && !dialog.open) dialog.showModal();
    else if (!menuOpen && dialog.open) dialog.close();
  }, [menuOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onClose = () => {
      dialog.returnValue = '';
      setMenuOpen(false);
    };
    dialog.addEventListener('close', onClose);

    // Light-dismiss fallback for browsers without <dialog closedby> (e.g., Safari)
    let cleanupFallback: (() => void) | undefined;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const outside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      const down = (e: PointerEvent) => {
        pressedOutside = outside(e);
      };
      const up = (e: PointerEvent) => {
        if (pressedOutside && outside(e) && dialog.open) dialog.close();
      };
      dialog.addEventListener('pointerdown', down);
      dialog.addEventListener('pointerup', up);
      cleanupFallback = () => {
        dialog.removeEventListener('pointerdown', down);
        dialog.removeEventListener('pointerup', up);
      };
    }

    return () => {
      dialog.removeEventListener('close', onClose);
      cleanupFallback?.();
    };
  }, []);

  const xpNeeded = getXpForNextLevel(player.level);
  const hpPct = Math.max(0, Math.min(100, (player.hp / Math.max(1, player.maxHp)) * 100));

  const sampleHit = calculatePlayerDamage({
    weaponBase: player.weapon.baseDamage,
    upgradeLevel: player.weapon.upgradeLevel,
    flatBonuses: player.level * 2,
    skillPct: player.skillDamagePct,
    armorPct: player.armorDamagePct,
    snackBuffPct: player.snackBuffPct,
    enemyDefense: 6,
    armorPen: player.weapon.armorPen,
    isCritOverride: false,
    rng: () => 0.5,
  });
  const sampleCrit = calculatePlayerDamage({
    weaponBase: player.weapon.baseDamage,
    upgradeLevel: player.weapon.upgradeLevel,
    flatBonuses: player.level * 2,
    skillPct: player.skillDamagePct,
    armorPct: player.armorDamagePct,
    snackBuffPct: player.snackBuffPct,
    enemyDefense: 6,
    armorPen: player.weapon.armorPen,
    isCritOverride: true,
    rng: () => 0.5,
  });
  const sampleEffectiveDr = Math.round(calculateEffectiveDR(0.25) * 1000) / 10;
  const sampleDamageTaken = calculateDamageTaken({
    bossAttack: 24,
    currentDefense: player.defense,
    rawDR: 0.25,
    difficulty: previewDiff,
  });
  const sampleCoopBossHp = calculateCoopBossHp(4500, previewParty, previewDiff);

  const zonePill = (
    <div className="pointer-events-auto stardew-panel px-2.5 sm:px-3.5 py-1 rounded-2xl flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs max-w-full">
      <span
        className={`font-display font-bold px-2 py-0.5 rounded-lg text-[11px] whitespace-nowrap border ${
          zone === 'overworld'
            ? 'bg-emerald-700 text-amber-50 border-emerald-950'
            : 'bg-purple-800 text-amber-100 border-purple-950'
        }`}
      >
        {zone === 'overworld'
          ? `Phum Village • AREA ${player.areaChannel}`
          : 'Ancient Cavern • Dungeon'}
      </span>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1">
          <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-500 shrink-0" />
          <div className="w-16 sm:w-24 h-2.5 rounded-full bg-amber-950/30 border border-amber-950/70 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all"
              style={{ width: `${hpPct}%` }}
            />
          </div>
          <span className="font-bold text-amber-950 text-[11px] whitespace-nowrap">
            {player.hp}/{player.maxHp}
          </span>
        </div>

        <span className="inline-flex items-center gap-1 font-display font-bold text-amber-900 whitespace-nowrap">
          <Coins className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          {player.coins.toLocaleString()}
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* Fixed responsive HUD container: inset-x-0 top-0 px-3 pt-2 — guaranteed zero right-edge clipping */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 w-full max-w-full box-border px-3 pt-2 flex flex-col gap-1.5">
        <div className="w-full flex items-center justify-between gap-2 min-w-0">
          {/* TOP-LEFT: MENU, Mail (red ! dot), Chat toggle */}
          <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="stardew-btn px-2.5 sm:px-3 py-1.5 rounded-xl font-display font-bold text-xs sm:text-sm flex items-center gap-1.5 shrink-0"
            >
              <Menu className="w-4 h-4 shrink-0" />
              <span>MENU</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setUnreadMail(false);
                EventBus.emit('ui:toast', {
                  text: 'Mail: Welcome to ភូមិខ្ញុំ! Walk top-right to enter the Cave Dungeon.',
                });
              }}
              aria-label="Mail Inbox"
              className="stardew-btn relative p-2 rounded-xl shrink-0"
            >
              <Mail className="w-4 h-4" />
              {unreadMail && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-amber-100">
                  !
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onToggleChat}
              aria-label="Toggle Chat"
              className={`stardew-btn p-2 rounded-xl shrink-0 ${chatOpen ? 'ring-2 ring-amber-500' : ''}`}
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          </div>

          {/* TOP-CENTER (inline on lg+, drops cleanly to centered second row on smaller screens) */}
          <div className="hidden lg:flex justify-center min-w-0 flex-1 px-2">
            {zonePill}
          </div>

          {/* TOP-RIGHT: Emote Picker + Touch UI Toggle */}
          <div className="pointer-events-auto flex items-center gap-1.5 shrink-0 relative">
            <button
              type="button"
              onClick={() => setEmoteOpen((o) => !o)}
              aria-label="Emote Picker"
              className="stardew-btn p-2 rounded-xl shrink-0"
            >
              <Smile className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onToggleTouchUi}
              className={`stardew-btn px-2.5 py-1.5 rounded-xl font-display font-bold text-xs flex items-center gap-1 shrink-0 ${
                touchUiEnabled ? 'ring-2 ring-emerald-600' : ''
              }`}
              title="Preview Mobile Touch Controls on Desktop"
            >
              <Gamepad2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Touch UI</span>
            </button>

            {emoteOpen && (
              <div className="absolute right-0 top-12 stardew-panel p-1.5 rounded-2xl flex gap-1.5 z-30">
                {EMOTES.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      EventBus.emit('player:emote', { emoji });
                      setEmoteOpen(false);
                    }}
                    className="w-9 h-9 rounded-xl bg-amber-100 hover:bg-amber-300/70 border border-amber-900/40 flex items-center justify-center text-lg transition"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex lg:hidden justify-center w-full">
          {zonePill}
        </div>
      </div>

      {/* WARM-WOOD STARDEW-STYLED PHASE 1.5 MENU MODAL */}
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        {...({ closedby: 'any' } as Record<string, string>)}
        className="m-auto rounded-2xl overflow-visible shadow-2xl"
      >
        <div className="w-[min(92vw,480px)] stardew-panel rounded-2xl overflow-hidden">
          <div className="px-4 py-3 stardew-wood flex items-center justify-between">
            <div>
              <h2 id={titleId} className="font-display font-bold text-base text-amber-100">
                ភូមិខ្ញុំ · Character & Balance Journal
              </h2>
              <p className="text-[11px] text-amber-200/85">
                {player.name} · Phase 1.5 Pixel-Art Edition
              </p>
            </div>
            <form method="dialog">
              <button
                type="submit"
                aria-label="Close Menu"
                className="p-1.5 rounded-lg bg-amber-950/60 hover:bg-red-700 text-amber-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="p-4 space-y-3.5 text-xs">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-amber-50/90 border-2 border-amber-900/35">
                <div className="text-[10px] font-semibold text-amber-800">Level & XP</div>
                <div className="font-display font-bold text-sm text-amber-950">Lv. {player.level}</div>
                <div className="text-[10px] text-amber-800">
                  {player.xp} / {xpNeeded} XP
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50/90 border-2 border-rose-800/35">
                <div className="text-[10px] font-semibold text-rose-900">Vitality</div>
                <div className="font-display font-bold text-sm text-rose-700">
                  {player.hp}/{player.maxHp}
                </div>
                <div className="text-[10px] text-amber-900">DEF {player.defense}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50/90 border-2 border-amber-700/40">
                <div className="text-[10px] font-semibold text-amber-800">Coins</div>
                <div className="font-display font-bold text-sm text-amber-900">
                  {player.coins.toLocaleString()}
                </div>
                <div className="text-[10px] text-amber-800 truncate">
                  {player.weapon.name} +{player.weapon.upgradeLevel}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-100/80 border-2 border-amber-900/35 space-y-2.5">
              <div className="font-display font-bold text-amber-950 flex items-center gap-1.5">
                <Swords className="w-4 h-4 text-amber-800" />
                <span>@shared/balanceFormulas Live Test</span>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setPreviewDiff(d)}
                    className={`px-2 py-0.5 rounded-lg uppercase text-[10px] font-bold border ${
                      previewDiff === d
                        ? 'bg-amber-800 text-amber-50 border-amber-950'
                        : 'bg-amber-50 text-amber-900 border-amber-900/30'
                    }`}
                  >
                    {d}
                  </button>
                ))}
                <span className="ml-auto text-[11px] font-semibold text-amber-900">Party:</span>
                {[1, 2, 3, 4].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPreviewParty(p)}
                    className={`w-6 h-6 rounded-lg font-bold text-[11px] border ${
                      previewParty === p
                        ? 'bg-purple-700 text-white border-purple-950'
                        : 'bg-amber-50 text-amber-900 border-amber-900/30'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-amber-50/95 border border-amber-900/25">
                  <div className="text-amber-800/80">Expected Swing / Crit</div>
                  <div className="font-bold text-amber-950">
                    {sampleHit.finalDamage} dmg / <span className="text-orange-700">{sampleCrit.finalDamage} CRIT</span>
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-amber-50/95 border border-amber-900/25">
                  <div className="text-amber-800/80">Effective DR (25% Raw)</div>
                  <div className="font-bold text-emerald-800">{sampleEffectiveDr}% Diminishing</div>
                </div>
                <div className="p-2 rounded-lg bg-amber-50/95 border border-amber-900/25">
                  <div className="text-amber-800/80">Boss Hit Taken (24 ATK)</div>
                  <div className="font-bold text-rose-700">
                    -{sampleDamageTaken} HP ({previewDiff})
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-amber-50/95 border border-amber-900/25">
                  <div className="text-amber-800/80">Co-op Boss HP (4,500 base)</div>
                  <div className="font-bold text-purple-800">{sampleCoopBossHp.toLocaleString()} HP</div>
                </div>
              </div>

              {lastHit && (
                <div className="text-[11px] text-amber-950 pt-1.5 border-t border-amber-900/20">
                  Last Hit: <strong>{lastHit.finalDamage}</strong>
                  {lastHit.isCrit ? ' (CRIT 1.75×)' : ''} · raw {lastHit.rawDamage} · variance ×{lastHit.varianceMultiplier}
                </div>
              )}
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
};
