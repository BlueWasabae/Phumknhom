import React, { useEffect, useState } from 'react';
import type { KromGuild, KromVaultSlot, PlayerState } from '@shared/types';
import { computeKromBuffs } from '@shared/festivals';
import {
  Archive,
  Building2,
  Coins,
  Crown,
  PackageOpen,
  Shield,
  Sparkles,
  Sprout,
  Swords,
  Users,
} from 'lucide-react';
import {
  createKromApi,
  depositKromVaultApi,
  donateKromApi,
  fetchKromByIdApi,
  fetchKromsApi,
  joinKromApi,
  withdrawKromVaultApi,
  type AuthSession,
} from '../game/network/ApiClient';
import { ITEM_CATALOG } from '../data/items';
import { FARM_ITEMS } from '../data/cropsAndArtisan';
import { STREET_SNACKS } from '../data/recipes';
import { EventBus } from '../game/EventBus';
import { NativeDialog } from './NativeDialog';

interface KromModalProps {
  open: boolean;
  initialTab?: 'overview' | 'vault' | 'war';
  player: PlayerState;
  authSession: AuthSession | null;
  onClose: () => void;
  onKromUpdated: (krom: KromGuild, toast: string, coinCost?: number, consumeCropId?: string) => void;
  onVaultDepositItem?: (itemId: string, quantity: number, quality?: 'normal' | 'gold_star') => void;
  onVaultWithdrawItem?: (slot: KromVaultSlot) => void;
  onOpenTerritoryWar?: () => void;
}

const DONATABLE_CROPS: Array<{ itemId: string; label: string; value: number }> = [
  { itemId: 'crop_phka_rumduol', label: 'Phka Rumduol', value: 140 },
  { itemId: 'crop_pink_lotus', label: 'Pink Lotus', value: 260 },
  { itemId: 'crop_slek_krey', label: 'Lemongrass', value: 90 },
  { itemId: 'crop_trakuon', label: 'Morning Glory', value: 75 },
];

function isVaultShareableItem(itemId: string): boolean {
  return (
    itemId.startsWith('crop_') ||
    itemId.startsWith('ore_') ||
    itemId.startsWith('mat_') ||
    itemId.startsWith('snack_') ||
    itemId.startsWith('elixir_') ||
    itemId.startsWith('fish_') ||
    itemId.startsWith('fruit_') ||
    itemId.startsWith('artisan_') ||
    itemId.startsWith('seed_') ||
    itemId === 'fertilizer'
  );
}

function resolveItemLabel(itemId: string): string {
  return ITEM_CATALOG[itemId]?.name ?? FARM_ITEMS[itemId]?.name ?? STREET_SNACKS[itemId]?.name ?? itemId;
}

export const KromModal: React.FC<KromModalProps> = ({
  open,
  initialTab = 'overview',
  player,
  authSession,
  onClose,
  onKromUpdated,
  onVaultDepositItem,
  onVaultWithdrawItem,
  onOpenTerritoryWar,
}) => {
  const [tab, setTab] = useState<'overview' | 'vault'>('overview');
  const [kroms, setKroms] = useState<KromGuild[]>([]);
  const [myKrom, setMyKrom] = useState<KromGuild | null>(null);
  const [createName, setCreateName] = useState('');
  const [createTag, setCreateTag] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    const list = await fetchKromsApi();
    setKroms(list);
    if (player.kromId || player.kromTag) {
      const found =
        (player.kromId ? await fetchKromByIdApi(player.kromId) : null) ??
        list.find((k) => k.id === player.kromId || k.tag === player.kromTag) ??
        null;
      setMyKrom(
        found ?? {
          id: player.kromId ?? `local_${player.kromTag}`,
          name: player.kromName ?? `${player.kromTag} Krom`,
          tag: player.kromTag ?? 'PHUM',
          leaderName: player.name,
          level: Math.max(1, player.kromLevel ?? 1),
          xp: 0,
          treasuryCoins: 0,
          members: [
            {
              playerId: authSession?.playerId ?? 'local',
              username: player.name,
              role: 'leader',
              donatedCoins: 0,
              joinedAt: new Date().toISOString(),
            },
          ],
          vault: Array.from({ length: 12 }, () => null),
          trophyBosses: [],
          createdAt: new Date().toISOString(),
        }
      );
    } else {
      setMyKrom(null);
    }
  };

  useEffect(() => {
    if (open) {
      setErrorMsg(null);
      setTab(initialTab === 'vault' ? 'vault' : 'overview');
      void loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialTab, player.kromId, player.kromTag]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErrorMsg(null);
    const cleanTag = createTag.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
    const cleanName = createName.trim();
    if (cleanName.length < 3) {
      setErrorMsg('Krom name must be at least 3 characters.');
      return;
    }
    if (cleanTag.length < 3 || cleanTag.length > 4) {
      setErrorMsg('Guild Tag must be 3–4 letters or digits (e.g. ANGK, PHUM).');
      return;
    }
    setBusy(true);
    try {
      const res = await createKromApi(authSession, {
        name: cleanName,
        tag: cleanTag,
        username: player.name,
      });
      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }
      setMyKrom(res.krom);
      setCreateName('');
      setCreateTag('');
      onKromUpdated(
        res.krom,
        `🛡️ Founded Krom [${res.krom.tag}] ${res.krom.name}! Gold guild tag now shines above your name!`
      );
      void loadData();
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (krom: KromGuild) => {
    if (busy) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await joinKromApi(authSession, {
        kromId: krom.id,
        tag: krom.tag,
        username: player.name,
      });
      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }
      setMyKrom(res.krom);
      onKromUpdated(res.krom, `🛡️ Joined Krom [${res.krom.tag}] ${res.krom.name} (Lv.${res.krom.level})!`);
      void loadData();
    } finally {
      setBusy(false);
    }
  };

  const handleDonateCoins = async (amount: number) => {
    if (!myKrom || busy || player.currencies.coins < amount) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await donateKromApi(authSession, {
        kromId: myKrom.id,
        username: player.name,
        coins: amount,
      });
      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }
      setMyKrom(res.krom);
      onKromUpdated(
        res.krom,
        res.leveledUp
          ? `🎉 Krom [${res.krom.tag}] LEVELED UP to Lv.${res.krom.level}! All guild passive buffs increased!`
          : `🪙 Donated ${amount.toLocaleString()} Coins to [${res.krom.tag}] Shrine!`,
        amount
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDonateCrop = async (itemId: string, label: string, value: number) => {
    if (!myKrom || busy) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await donateKromApi(authSession, {
        kromId: myKrom.id,
        username: player.name,
        coins: 0,
        cropValue: value,
      });
      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }
      setMyKrom(res.krom);
      onKromUpdated(
        res.krom,
        res.leveledUp
          ? `🎉 Donated ${label} & leveled Krom [${res.krom.tag}] to Lv.${res.krom.level}!`
          : `🌾 Donated 1× ${label} (+${value} Krom XP) to [${res.krom.tag}] Shrine!`,
        0,
        itemId
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDepositVault = async (itemId: string, quality: 'normal' | 'gold_star' = 'normal') => {
    if (!myKrom || busy) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const itemName = resolveItemLabel(itemId);
      const res = await depositKromVaultApi(authSession, {
        kromId: myKrom.id,
        username: player.name,
        itemId,
        itemName,
        quantity: 1,
        quality,
      });
      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }
      setMyKrom(res.krom);
      onVaultDepositItem?.(itemId, 1, quality);
      EventBus.emit('ui:toast', {
        text: `📦 Deposited 1× ${itemName} into [${myKrom.tag}] Shared Vault!`,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleWithdrawVault = async (slotIndex: number) => {
    if (!myKrom || busy) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await withdrawKromVaultApi(authSession, {
        kromId: myKrom.id,
        slotIndex,
        quantity: 1,
      });
      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }
      setMyKrom(res.krom);
      onVaultWithdrawItem?.(res.withdrawn);
      EventBus.emit('ui:toast', {
        text: `🎒 Withdrew ${res.withdrawn.quantity}× ${res.withdrawn.itemName} from [${myKrom.tag}] Vault!`,
      });
    } finally {
      setBusy(false);
    }
  };

  const buffs = computeKromBuffs(myKrom?.level ?? player.kromLevel ?? 0);
  const ownedCrops = DONATABLE_CROPS.map((c) => ({
    ...c,
    qty: player.inventory.filter((i) => i.itemId === c.itemId).reduce((s, i) => s + i.quantity, 0),
  })).filter((c) => c.qty > 0);

  const shareableBagItems = player.inventory.filter((i) => i.quantity > 0 && isVaultShareableItem(i.itemId));
  const vaultSlots: Array<KromVaultSlot | null> = Array.from({ length: 12 }, (_, idx) => myKrom?.vault?.[idx] ?? null);

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🛡️ Krom Guild Hall · សមាគមក្រុមភូមិខ្ញុំ"
      subtitle={
        myKrom
          ? `Member of [${myKrom.tag}] ${myKrom.name} · Lv.${myKrom.level}/10 · Passive Buffs +${Math.round(buffs.bossDamagePct * 100)}%`
          : 'Create or Join a Khmer Krom for a Gold [TAG], Enterable Guild Hall, Shared Vault & Weekly Territory Wars!'
      }
      maxWidthClass="w-[min(96vw,780px)]"
    >
      <div className="space-y-3 text-xs max-h-[75dvh] overflow-y-auto pr-1">
        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-500 text-rose-900 font-bold">
            {errorMsg}
          </div>
        )}

        {/* Quick Guild Action Bar: Warp to Hall, Shared Vault Tab & Territory War */}
        {myKrom && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-950/90 p-2 border border-amber-400/50">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setTab('overview')}
                className={`px-3 py-1.5 rounded-lg font-display font-bold text-xs cursor-pointer transition ${
                  tab === 'overview'
                    ? 'bg-amber-400 text-amber-950'
                    : 'bg-amber-900/60 text-amber-100 hover:bg-amber-800/70'
                }`}
              >
                ⛩️ Overview & Shrine
              </button>
              <button
                type="button"
                onClick={() => setTab('vault')}
                className={`px-3 py-1.5 rounded-lg font-display font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition ${
                  tab === 'vault'
                    ? 'bg-amber-400 text-amber-950'
                    : 'bg-amber-900/60 text-amber-100 hover:bg-amber-800/70'
                }`}
              >
                <Archive className="w-3.5 h-3.5" /> Shared Vault ({vaultSlots.filter(Boolean).length}/12)
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenTerritoryWar) onOpenTerritoryWar();
                  else EventBus.emit('ui:openModal', { modal: 'kromWar' });
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-amber-50 font-display font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
              >
                <Swords className="w-3.5 h-3.5" /> Territory War
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                EventBus.emit('kromHall:enterRequest');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-display font-black text-xs inline-flex items-center gap-1.5 shadow cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" /> Warp to Krom Hall
            </button>
          </div>
        )}

        {/* TAB 2: KROM SHARED VAULT (12 SLOTS) */}
        {myKrom && tab === 'vault' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-900/35 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="font-display font-bold text-sm text-amber-950 flex items-center gap-1.5">
                  <PackageOpen className="w-4 h-4 text-amber-700" />
                  [{myKrom.tag}] Shared Krom Vault (12 Guild Slots)
                </div>
                <span className="text-[10px] font-bold text-amber-800">
                  Share crops, ores & snacks with guildmates!
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {vaultSlots.map((slot, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-xl border-2 flex flex-col justify-between min-h-[78px] ${
                      slot
                        ? 'bg-white border-amber-500/70 shadow-sm'
                        : 'bg-amber-100/50 border-dashed border-amber-900/25'
                    }`}
                  >
                    {slot ? (
                      <>
                        <div>
                          <div className="font-display font-bold text-[11px] text-amber-950 truncate">
                            {slot.quality === 'gold_star' ? '★ ' : ''}
                            {slot.itemName}
                          </div>
                          <div className="text-[10px] text-amber-800">
                            Qty: <b>×{slot.quantity}</b> · by {slot.depositedBy}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleWithdrawVault(idx)}
                          className="mt-1.5 w-full py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-display font-bold text-[10px] cursor-pointer disabled:opacity-45"
                        >
                          Withdraw 1
                        </button>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-[10px] font-bold text-amber-900/45">
                        Slot {idx + 1} · Empty
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-900/25 space-y-2">
              <div className="font-display font-bold text-amber-950">
                🎒 Deposit Spare Crops, Ores & Potions from Container
              </div>
              {shareableBagItems.length === 0 ? (
                <div className="text-amber-800 text-[11px]">
                  No shareable crops, ores, fish, or potions in your Container right now.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {shareableBagItems.map((it) => (
                    <button
                      key={`${it.itemId}_${it.quality ?? 'normal'}`}
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDepositVault(it.itemId, it.quality ?? 'normal')}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-amber-100 border border-amber-900/30 text-amber-950 font-bold text-[11px] cursor-pointer"
                    >
                      + {it.quality === 'gold_star' ? '★ ' : ''}
                      {resolveItemLabel(it.itemId)} (×{it.quantity})
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: OVERVIEW, SHRINE, ROSTER & DIRECTORY */}
        {(!myKrom || tab === 'overview') && (
          <>
            {myKrom && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 text-amber-50 border-2 border-amber-400/80 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-xl bg-amber-400 text-amber-950 font-display font-bold text-sm shadow">
                        [{myKrom.tag}]
                      </span>
                      <div>
                        <div className="font-display font-bold text-base text-amber-100">{myKrom.name}</div>
                        <div className="text-[10px] text-amber-300">
                          Leader: {myKrom.leaderName} · {myKrom.members.length} Member
                          {myKrom.members.length === 1 ? '' : 's'} · Treasury: {myKrom.treasuryCoins.toLocaleString()}c
                          {' · '}🏆 Trophies: {(myKrom.trophyBosses ?? []).length}/7
                        </div>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-xl bg-emerald-700 text-white font-display font-bold text-xs">
                      Krom Lv.{myKrom.level} / 10
                    </span>
                  </div>

                  {/* XP Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-amber-200">
                      <span>Shrine Level Progress</span>
                      <span>
                        {myKrom.level >= 10
                          ? 'MAX LEVEL ★'
                          : `${myKrom.xp.toLocaleString()} / ${buffs.nextLevelXp.toLocaleString()} XP`}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-950 overflow-hidden border border-amber-500/40">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all"
                        style={{
                          width: `${
                            myKrom.level >= 10
                              ? 100
                              : Math.min(100, Math.round((myKrom.xp / Math.max(1, buffs.nextLevelXp)) * 100))
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Passive Krom Buffs */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="p-2 rounded-xl bg-white/10 border border-amber-400/30 text-center">
                      <div className="text-[10px] text-amber-200">🌾 Farm Speed</div>
                      <div className="font-display font-bold text-sm text-emerald-300">
                        +{Math.round(buffs.farmSpeedPct * 100)}%
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-white/10 border border-amber-400/30 text-center">
                      <div className="text-[10px] text-amber-200">⚔️ Boss Damage</div>
                      <div className="font-display font-bold text-sm text-amber-300">
                        +{Math.round(buffs.bossDamagePct * 100)}%
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-white/10 border border-amber-400/30 text-center">
                      <div className="text-[10px] text-amber-200">🪙 Coin Drops</div>
                      <div className="font-display font-bold text-sm text-yellow-300">
                        +{Math.round(buffs.coinDropPct * 100)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Krom Donation Shrine */}
                <div className="p-3 rounded-xl bg-amber-50 border-2 border-amber-900/30 space-y-2">
                  <div className="font-display font-bold text-amber-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" /> Krom Donation Shrine (Level Up Lv.1 → Lv.10)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy || player.currencies.coins < 100}
                      onClick={() => void handleDonateCoins(100)}
                      className="phum-btn px-3 py-1.5 rounded-xl font-display font-bold text-xs inline-flex items-center gap-1 disabled:opacity-45 cursor-pointer"
                    >
                      <Coins className="w-3.5 h-3.5" /> Donate 100 Coins
                    </button>
                    <button
                      type="button"
                      disabled={busy || player.currencies.coins < 500}
                      onClick={() => void handleDonateCoins(500)}
                      className="px-3 py-1.5 rounded-xl bg-amber-800 hover:bg-amber-700 text-amber-50 border border-amber-950 font-display font-bold text-xs inline-flex items-center gap-1 disabled:opacity-45 cursor-pointer"
                    >
                      <Crown className="w-3.5 h-3.5" /> Donate 500 Coins
                    </button>
                    {ownedCrops.map((crop) => (
                      <button
                        key={crop.itemId}
                        type="button"
                        disabled={busy}
                        onClick={() => void handleDonateCrop(crop.itemId, crop.label, crop.value)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-display font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Sprout className="w-3.5 h-3.5" /> Donate {crop.label} (×{crop.qty} → +{crop.value} XP)
                      </button>
                    ))}
                  </div>
                </div>

                {/* Members Roster */}
                <div className="p-3 rounded-xl bg-amber-50/85 border border-amber-900/25 space-y-1.5">
                  <div className="font-display font-bold text-amber-950 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Krom Roster ({myKrom.members.length})
                  </div>
                  <div className="grid sm:grid-cols-2 gap-1.5">
                    {myKrom.members.map((m) => (
                      <div
                        key={`${m.playerId}_${m.username}`}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-amber-900/20 flex items-center justify-between"
                      >
                        <span className="font-bold text-amber-950">
                          <span className="text-amber-700">[{myKrom.tag}]</span> {m.username}
                        </span>
                        <span className="text-[10px] font-bold text-amber-800">
                          {m.role === 'leader' ? '👑 Leader' : 'Member'} · {m.donatedCoins}c
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Create New Krom Form */}
            <form
              onSubmit={(e) => void handleCreate(e)}
              className="p-3 rounded-xl bg-amber-50 border-2 border-amber-900/30 space-y-2"
            >
              <div className="font-display font-bold text-amber-950 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-amber-700" />
                {myKrom ? 'Found a Different Krom Guild' : 'Create a New Krom Guild'}
              </div>
              <div className="grid sm:grid-cols-[1fr_130px_auto] gap-2">
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  maxLength={28}
                  placeholder="Krom Name (e.g. Angkor Guardians)"
                  className="px-3 py-1.5 rounded-xl bg-white border-2 border-amber-900/30 text-amber-950 font-semibold focus:outline-none focus:border-amber-700"
                />
                <input
                  type="text"
                  value={createTag}
                  onChange={(e) =>
                    setCreateTag(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4))
                  }
                  maxLength={4}
                  placeholder="TAG (3-4)"
                  className="px-3 py-1.5 rounded-xl bg-white border-2 border-amber-900/30 text-amber-950 font-display font-bold uppercase tracking-wider focus:outline-none focus:border-amber-700"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="phum-btn px-4 py-1.5 rounded-xl font-display font-bold text-xs cursor-pointer disabled:opacity-45"
                >
                  Create Krom
                </button>
              </div>
            </form>

            {/* Browse & Join Directory */}
            <div className="p-3 rounded-xl bg-amber-50/85 border border-amber-900/25 space-y-2">
              <div className="font-display font-bold text-amber-950">🏘️ Active Village Kroms</div>
              <div className="grid sm:grid-cols-2 gap-2">
                {kroms.map((k) => {
                  const isMine = myKrom?.id === k.id || player.kromTag === k.tag;
                  const kBuff = computeKromBuffs(k.level);
                  return (
                    <div
                      key={k.id}
                      className="p-2.5 rounded-xl bg-white border-2 border-amber-900/25 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-display font-bold text-xs text-amber-950 truncate">
                          <span className="text-amber-700">[{k.tag}]</span> {k.name}
                        </div>
                        <div className="text-[10px] text-amber-800">
                          Lv.{k.level} · {k.members.length} members · +{Math.round(kBuff.bossDamagePct * 100)}% All Buffs
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={busy || isMine}
                        onClick={() => void handleJoin(k)}
                        className={`px-3 py-1 rounded-lg font-display font-bold text-[11px] shrink-0 ${
                          isMine
                            ? 'bg-emerald-700 text-white'
                            : 'bg-amber-800 hover:bg-amber-700 text-amber-50 cursor-pointer'
                        }`}
                      >
                        {isMine ? '✓ Joined' : 'Join'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </NativeDialog>
  );
};
