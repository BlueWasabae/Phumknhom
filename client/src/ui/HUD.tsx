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
    <div className="pointer-events-auto hud-dark px-2.5 sm:px-3.5 py-1.5 rounded-2xl flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs max-w-full">
      <span
        className={`font-display font-bold px-2 py-0.5 rounded-lg text-[11px] whitespace-nowrap ${
          zone === 'overworld'
            ? 'bg-emerald-600/80 text-amber-100 border border-emerald-300/50'
            : 'bg-purple-700/90 text-amber-200 border border-purple-300/50'
        }`}
      >
        {zone === 'overworld'
          ? `Phum Village • AREA ${player.areaChannel}`
          : 'Ancient Cavern • Dungeon'}
      </span>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1">
          <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-500 shrink-0" />
          <div className="w-16 sm:w-24 h-2.5 rounded-full bg-slate-800 border border-rose-500/50 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all"
              style={{ width: `${hpPct}%` }}
            />
          </div>
          <span className="font-bold text-rose-200 text-[11px] whitespace-nowrap">
            {player.hp}/{player.maxHp}
          </span>
        </div>

        <span className="inline-flex items-center gap-1 font-bold text-yellow-300 whitespace-nowrap">
          <Coins className="w-3.5 h-3.5 shrink-0" />
          {player.coins.toLocaleString()}
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* Fixed responsive HUD container with box-border & zero right-edge clipping */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 w-full max-w-full box-border px-2.5 sm:px-3 pt-2.5 flex flex-col gap-1.5">
        <div className="w-full flex items-center justify-between gap-2 min-w-0">
          {/* TOP-LEFT: MENU, Mail (red ! dot), Chat toggle */}
          <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="hud-pill px-2.5 sm:px-3 py-1.5 rounded-xl font-display font-bold text-xs sm:text-sm flex items-center gap-1.5 active:translate-y-0.5 shrink-0"
            >
              <Menu className="w-4 h-4 shrink-0" />
              <span>MENU</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setUnreadMail(false);
                EventBus.emit('ui:toast', {
                  text: 'Mail: Welcome to ភូមិខ្ញុំ! Walk top-right to test the Dungeon Portal.',
                });
              }}
              aria-label="Mail Inbox"
              className="hud-pill relative p-2 rounded-xl active:translate-y-0.5 shrink-0"
            >
              <Mail className="w-4 h-4" />
              {unreadMail && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center border border-amber-100">
                  !
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onToggleChat}
              aria-label="Toggle Chat"
              className={`hud-pill p-2 rounded-xl active:translate-y-0.5 shrink-0 ${chatOpen ? 'ring-2 ring-amber-300' : ''}`}
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          </div>

          {/* TOP-CENTER (Desktop md+ inline — shrinks gracefully without pushing top-right off-screen) */}
          <div className="hidden lg:flex justify-center min-w-0 flex-1 px-2">
            {zonePill}
          </div>

          {/* TOP-RIGHT: Emote Picker + Touch UI Toggle (always anchored inside right edge) */}
          <div className="pointer-events-auto flex items-center gap-1.5 shrink-0 relative">
            <button
              type="button"
              onClick={() => setEmoteOpen((o) => !o)}
              aria-label="Emote Picker"
              className="hud-pill p-2 rounded-xl active:translate-y-0.5 shrink-0"
            >
              <Smile className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onToggleTouchUi}
              className={`hud-pill px-2.5 py-1.5 rounded-xl font-display font-bold text-xs flex items-center gap-1 active:translate-y-0.5 shrink-0 ${
                touchUiEnabled ? 'ring-2 ring-emerald-400' : ''
              }`}
              title="Preview Mobile Touch Controls on Desktop"
            >
              <Gamepad2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Touch UI</span>
            </button>

            {emoteOpen && (
              <div className="absolute right-0 top-12 hud-dark p-1.5 rounded-2xl flex gap-1.5 z-30">
                {EMOTES.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      EventBus.emit('player:emote', { emoji });
                      setEmoteOpen(false);
                    }}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-amber-400/25 flex items-center justify-center text-xl transition"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Second row for compact screens (< lg) so top-right never clips */}
        <div className="flex lg:hidden justify-center w-full">
          {zonePill}
        </div>
      </div>

      {/* PHASE 1 MENU PREVIEW DRAWER (Native <dialog> modal) */}
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        {...({ closedby: 'any' } as Record<string, string>)}
        className="m-auto rounded-2xl overflow-visible shadow-2xl"
      >
        <div className="w-[min(92vw,480px)] rounded-2xl border-2 border-amber-400/80 bg-slate-900/95 text-slate-100 overflow-hidden shadow-2xl">
          <div className="px-4 py-3 bg-gradient-to-r from-amber-900/80 to-slate-900 border-b border-amber-500/40 flex items-center justify-between">
            <div>
              <h2 id={titleId} className="font-display font-bold text-base text-amber-200">
                ភូមិខ្ញុំ · Phase 1 Character & Balance Preview
              </h2>
              <p className="text-[11px] text-amber-100/75">
                {player.name} · Real Pixel-Art Packs Active
              </p>
            </div>
            <form method="dialog">
              <button
                type="submit"
                aria-label="Close Menu"
                className="p-1.5 rounded-lg bg-slate-950/70 hover:bg-red-500/80 text-amber-100"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="p-4 space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700">
                <div className="text-[10px] text-slate-400">Level & XP</div>
                <div className="font-display font-bold text-sm text-amber-300">Lv. {player.level}</div>
                <div className="text-[10px] text-slate-300">
                  {player.xp} / {xpNeeded} XP
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/90 border border-rose-500/35">
                <div className="text-[10px] text-slate-400">Vitality</div>
                <div className="font-display font-bold text-sm text-rose-300">
                  {player.hp}/{player.maxHp}
                </div>
                <div className="text-[10px] text-slate-300">DEF {player.defense}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/90 border border-yellow-500/35">
                <div className="text-[10px] text-slate-400">Coins</div>
                <div className="font-display font-bold text-sm text-yellow-300">
                  {player.coins.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-300">
                  {player.weapon.name} +{player.weapon.upgradeLevel}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/75 border border-amber-400/35 space-y-2.5">
              <div className="font-display font-bold text-amber-300 flex items-center gap-1.5">
                <Swords className="w-4 h-4" />
                <span>@shared/balanceFormulas Live Test</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setPreviewDiff(d)}
                    className={`px-2 py-0.5 rounded-lg uppercase text-[10px] font-bold border ${
                      previewDiff === d
                        ? 'bg-amber-400 text-slate-950 border-amber-200'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {d}
                  </button>
                ))}
                <span className="ml-auto text-[11px] text-slate-400">Party:</span>
                {[1, 2, 3, 4].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPreviewParty(p)}
                    className={`w-6 h-6 rounded-lg font-bold text-[11px] ${
                      previewParty === p ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-slate-400">Expected Swing / Crit</div>
                  <div className="font-bold text-slate-100">
                    {sampleHit.finalDamage} dmg / <span className="text-amber-300">{sampleCrit.finalDamage} CRIT</span>
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-slate-400">Effective DR (25% Raw)</div>
                  <div className="font-bold text-emerald-300">{sampleEffectiveDr}% Diminishing</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-slate-400">Boss Hit Taken (24 ATK)</div>
                  <div className="font-bold text-rose-300">
                    -{sampleDamageTaken} HP ({previewDiff})
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-slate-400">Co-op Boss HP (4,500 base)</div>
                  <div className="font-bold text-purple-300">{sampleCoopBossHp.toLocaleString()} HP</div>
                </div>
              </div>

              {lastHit && (
                <div className="text-[11px] text-sky-300 pt-1 border-t border-slate-800">
                  Last Training Dummy Hit: <strong>{lastHit.finalDamage}</strong>
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
