import React, { useMemo, useState } from 'react';
import type { PlayerState } from '@shared/types';
import {
  KHMER_NPCS,
  evaluateGiftReaction,
  getNpcFriendship,
  getTodayDateKey,
  type KhmerNpcId,
} from '@shared/npcSchedules';
import { FARM_ITEMS } from '../data/cropsAndArtisan';
import { STREET_SNACKS } from '../data/recipes';
import { ITEM_CATALOG } from '../data/items';
import { Gift, Heart, Lock, Sparkles, Unlock } from 'lucide-react';
import { NativeDialog } from './NativeDialog';
import { PaperDollPreview } from './PaperDollPreview';

interface NpcDialogueModalProps {
  open: boolean;
  npcId: KhmerNpcId | null;
  player: PlayerState;
  onClose: () => void;
  onGiveGift: (npcId: KhmerNpcId, itemId: string) => { ok: boolean; reactionLine?: string };
}

export const NpcDialogueModal: React.FC<NpcDialogueModalProps> = ({
  open,
  npcId,
  player,
  onClose,
  onGiveGift,
}) => {
  const [selectedGiftId, setSelectedGiftId] = useState<string>('');
  const [lastReaction, setLastReaction] = useState<string | null>(null);

  const npc = npcId ? KHMER_NPCS[npcId] : null;
  const todayKey = getTodayDateKey();

  const friendship = npc ? getNpcFriendship(player, npc.id) : { hearts: 0, lastGiftDay: null };
  const giftedToday = friendship.lastGiftDay === todayKey;

  const giftableItems = useMemo(() => {
    if (!npc) return [];
    const seen = new Set<string>();
    const list: Array<{
      itemId: string;
      name: string;
      qty: number;
      tier: 'loved' | 'liked' | 'normal';
      heartDelta: number;
      color: string;
    }> = [];

    for (const entry of player.inventory) {
      if (entry.quantity <= 0 || seen.has(entry.itemId)) continue;
      // Exclude core weapons/armor/tools so players never accidentally gift equipped gear
      const eq = ITEM_CATALOG[entry.itemId];
      if (eq && (eq.slot === 'weapon' || eq.slot === 'armor' || eq.slot === 'accessory')) continue;
      if (entry.itemId === 'tool_magic_mirror' || entry.itemId === 'tool_master_bamboo_rod') continue;

      const fm = FARM_ITEMS[entry.itemId];
      const sn = STREET_SNACKS[entry.itemId];
      if (!fm && !sn) continue;

      seen.add(entry.itemId);
      const reaction = evaluateGiftReaction(npc, entry.itemId);
      list.push({
        itemId: entry.itemId,
        name: fm?.name ?? sn?.name ?? entry.itemId,
        qty: entry.quantity,
        tier: reaction.tier,
        heartDelta: reaction.heartDelta,
        color: fm?.primaryColor ?? sn?.primaryColor ?? '#d97706',
      });
    }

    const tierRank = { loved: 0, liked: 1, normal: 2 };
    list.sort((a, b) => tierRank[a.tier] - tierRank[b.tier] || a.name.localeCompare(b.name));
    return list;
  }, [npc, player.inventory]);

  if (!npc) return null;

  const dayHash = Number(todayKey.replace(/-/g, '')) + npc.id.length;
  const dailyDialogue =
    lastReaction ??
    (friendship.hearts >= 6 ? npc.sixHeartSecretLine : npc.dialogues[dayHash % npc.dialogues.length]);

  const effectiveSelected =
    giftableItems.some((g) => g.itemId === selectedGiftId)
      ? selectedGiftId
      : giftableItems[0]?.itemId ?? '';

  const handleGiftSubmit = () => {
    if (!effectiveSelected || giftedToday) return;
    const res = onGiveGift(npc.id, effectiveSelected);
    if (res.ok && res.reactionLine) {
      setLastReaction(res.reactionLine);
    }
  };

  const fullHearts = Math.floor(friendship.hearts);
  const hasHalfHeart = friendship.hearts - fullHearts >= 0.45;

  return (
    <NativeDialog
      open={open}
      onClose={() => {
        setLastReaction(null);
        onClose();
      }}
      title={`${npc.name} (${npc.khmerName})`}
      subtitle={`${npc.roleTitle} · ${npc.landmarkLabel} · Friendly ${player.lifeStats.friendly}/100`}
      maxWidthClass="w-[min(95vw,660px)]"
    >
      <div className="space-y-3 text-xs">
        {/* Top Portrait + Heart Meter + Speech Bubble */}
        <div className="grid sm:grid-cols-[136px_1fr] gap-3 items-center">
          <div className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-amber-100/80 border-2 border-amber-900/30">
            <PaperDollPreview loadout={npc.loadout} width={112} height={112} />
            <div className="text-[10px] font-display font-bold text-amber-950 text-center">
              {npc.khmerName}
            </div>
          </div>

          <div className="space-y-2.5">
            {/* 0..10 Heart Meter */}
            <div className="p-2.5 rounded-xl bg-rose-50 border-2 border-rose-300/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-rose-900 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-600" />
                  Friendship Hearts
                </span>
                <span className="font-display font-bold text-rose-800">
                  {friendship.hearts.toFixed(1)} / 10.0
                </span>
              </div>
              <div className="flex items-center gap-0.5 text-sm leading-none">
                {Array.from({ length: 10 }, (_, i) => {
                  if (i < fullHearts) return <span key={i}>❤️</span>;
                  if (i === fullHearts && hasHalfHeart) return <span key={i}>🩷</span>;
                  return (
                    <span key={i} className="opacity-30">
                      🤍
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Daily Dialogue Speech Box */}
            <div className="p-3 rounded-2xl bg-white border-2 border-amber-900/35 shadow-sm">
              <p className="text-xs font-medium text-amber-950 leading-relaxed">“{dailyDialogue}”</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 font-bold border border-rose-300">
                  ❤️ Loves: {npc.lovedGiftLabels.join(', ')}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
                  💛 Likes: {npc.likedGiftLabels.slice(0, 3).join(', ')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Heart Rewards Tracker (3 Hearts & 6 Hearts) */}
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            { threshold: 3, text: npc.reward3Hearts },
            { threshold: 6, text: npc.reward6Hearts },
          ].map((rew) => {
            const unlocked = friendship.hearts >= rew.threshold;
            return (
              <div
                key={rew.threshold}
                className={`p-2.5 rounded-xl border-2 flex items-start gap-2 ${
                  unlocked
                    ? 'bg-emerald-50 border-emerald-600/60 text-emerald-950'
                    : 'bg-amber-50/70 border-amber-900/25 text-amber-900'
                }`}
              >
                {unlocked ? (
                  <Unlock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Lock className="w-4 h-4 text-amber-700/60 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-display font-bold text-[11px]">
                    {rew.threshold} Hearts Reward {unlocked ? '✓ UNLOCKED' : ''}
                  </div>
                  <div className="text-[10px] leading-snug">{rew.text}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Give Gift (1/day per NPC) */}
        <div className="p-3 rounded-2xl bg-amber-50/95 border-2 border-amber-900/35 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display font-bold text-xs text-amber-950 flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-rose-600" />
              Give Daily Gift (1/day per Villager · Boosts Friendly!)
            </span>
            {giftedToday && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-700 text-white text-[10px] font-bold">
                ✓ Gifted Today
              </span>
            )}
          </div>

          {giftableItems.length === 0 ? (
            <div className="text-[11px] text-amber-900/80">
              No crops, ores, fish, or snacks in your Container right now. Harvest crops, mine cavern ores, or buy snacks to gift!
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                {giftableItems.map((g) => {
                  const selected = effectiveSelected === g.itemId;
                  return (
                    <button
                      key={g.itemId}
                      type="button"
                      disabled={giftedToday}
                      onClick={() => setSelectedGiftId(g.itemId)}
                      className={`p-2 rounded-xl border-2 text-left flex items-center justify-between gap-1.5 transition disabled:opacity-55 ${
                        selected
                          ? 'bg-rose-100 border-rose-600 ring-1 ring-rose-500'
                          : 'bg-white border-amber-900/25 hover:bg-amber-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-display font-bold text-[11px] text-amber-950 truncate">
                          {g.name} <span className="text-amber-700">×{g.qty}</span>
                        </div>
                        <div
                          className={`text-[9px] font-bold ${
                            g.tier === 'loved'
                              ? 'text-rose-700'
                              : g.tier === 'liked'
                                ? 'text-amber-700'
                                : 'text-slate-600'
                          }`}
                        >
                          {g.tier === 'loved'
                            ? '❤️ Loved (+1.0)'
                            : g.tier === 'liked'
                              ? '💛 Liked (+0.5)'
                              : '💬 Normal (+0.2)'}
                        </div>
                      </div>
                      <span
                        className="w-4 h-4 rounded-full border border-amber-950/30 shrink-0"
                        style={{ backgroundColor: g.color }}
                      />
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={giftedToday || !effectiveSelected}
                onClick={handleGiftSubmit}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-display font-bold text-xs border-2 border-rose-950 flex items-center justify-center gap-1.5 shadow disabled:opacity-45"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {giftedToday
                  ? `Already Gifted ${npc.name} Today`
                  : `Give Gift to ${npc.name} (+Hearts & +Friendly)`}
              </button>
            </>
          )}
        </div>
      </div>
    </NativeDialog>
  );
};
