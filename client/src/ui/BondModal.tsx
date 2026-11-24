import React, { useEffect, useState } from 'react';
import type { BondPartnerRecord, PlayerState } from '@shared/types';
import { Check, Coins, Heart, Navigation, Sparkles, Sprout } from 'lucide-react';
import {
  acceptBondRequestApi,
  fetchBondStatusApi,
  requestBondApi,
  type AuthSession,
} from '../game/network/ApiClient';
import { NativeDialog } from './NativeDialog';

interface BondModalProps {
  open: boolean;
  player: PlayerState;
  authSession: AuthSession | null;
  prefillPartnerName?: string | null;
  onClose: () => void;
  onBuyLotusBondRing: (currency: 'coins' | 'gold') => void;
  onBondAccepted: (bond: BondPartnerRecord, toastMsg: string) => void;
  onWarpToPartner: (partnerName: string) => void;
  onEnterSharedCoopFarm: (bond: BondPartnerRecord) => void;
}

export const BondModal: React.FC<BondModalProps> = ({
  open,
  player,
  authSession,
  prefillPartnerName,
  onClose,
  onBuyLotusBondRing,
  onBondAccepted,
  onWarpToPartner,
  onEnterSharedCoopFarm,
}) => {
  const [partnerInput, setPartnerInput] = useState('');
  const [incoming, setIncoming] = useState<BondPartnerRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const ownsRing = player.inventory.some((i) => i.itemId === 'acc_lotus_bond_ring' && i.quantity > 0);
  const activeBond = player.bondPartner?.status === 'accepted' ? player.bondPartner : null;

  useEffect(() => {
    if (!open) return;
    setFeedback(null);
    if (prefillPartnerName) setPartnerInput(prefillPartnerName);
    void (async () => {
      const status = await fetchBondStatusApi(
        authSession?.token,
        authSession?.playerId ?? 'guest',
        player.name
      );
      setIncoming(status.incoming);
      if (status.activeBond && !activeBond) {
        onBondAccepted(
          status.activeBond,
          `💍 Lotus Bond active with ${status.activeBond.partnerName}!`
        );
      }
    })();
  }, [open, prefillPartnerName, authSession?.token, authSession?.playerId, player.name]);

  const handleOfferRing = async (e: React.FormEvent, instantDemo = false) => {
    e.preventDefault();
    const targetName = (partnerInput.trim() || (instantDemo ? 'Bopha_Lotus' : '')).slice(0, 24);
    if (!ownsRing) {
      setFeedback('Buy a Lotus Bond Ring (1,000 Coins or 10 Gold) first!');
      return;
    }
    if (!targetName) {
      setFeedback('Enter your Best Friend or Partner username.');
      return;
    }
    setBusy(true);
    setFeedback(null);
    const res = await requestBondApi(authSession?.token, {
      requesterId: authSession?.playerId ?? 'guest',
      requesterName: player.name,
      targetName,
      instantAcceptDemo: instantDemo,
    });
    setBusy(false);
    if (!res.ok || !res.bond) {
      setFeedback(res.error ?? 'Could not send Lotus Bond Ring offer.');
      return;
    }
    if (res.bond.status === 'accepted') {
      onBondAccepted(
        res.bond,
        `💖 ${res.bond.partnerName} accepted your Lotus Bond Ring! Pink Lotus Aura, Warp to Partner & Shared Co-op Farm unlocked!`
      );
      setFeedback(`💍 Bonded with ${res.bond.partnerName}!`);
    } else {
      setFeedback(`💌 Sent Lotus Bond Ring offer to ${targetName}! Waiting for them to accept.`);
    }
  };

  const handleAcceptIncoming = async (req: BondPartnerRecord) => {
    setBusy(true);
    const res = await acceptBondRequestApi(authSession?.token, {
      bondId: req.bondId,
      accepterId: authSession?.playerId ?? 'guest',
      accepterName: player.name,
    });
    setBusy(false);
    if (!res.ok || !res.bond) {
      setFeedback(res.error ?? 'Could not accept Bond Ring.');
      return;
    }
    setIncoming((prev) => prev.filter((b) => b.bondId !== req.bondId));
    onBondAccepted(
      res.bond,
      `💖 Bonded with ${res.bond.partnerName}! Pink Lotus Aura & Shared Co-op Farm unlocked!`
    );
  };

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="💍 Lotus Bond Ring · Best-Friend & Couple Sanctuary"
      subtitle="Bond with your best friend or partner for a blooming Pink Lotus Heart Aura, Warp to Partner & Shared Co-op Farm!"
      maxWidthClass="w-[min(95vw,580px)]"
    >
      <div className="space-y-3 text-xs">
        {feedback && (
          <div className="px-3 py-2 rounded-xl bg-pink-100 border border-pink-500/40 text-pink-950 font-semibold">
            {feedback}
          </div>
        )}

        {/* Active Bond Partner Dashboard */}
        {activeBond ? (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 border-2 border-pink-500/60 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center text-xl shadow-lg">
                  💍
                </span>
                <div>
                  <div className="font-display font-bold text-base text-pink-950">
                    Bonded with {activeBond.partnerName}
                  </div>
                  <div className="text-[11px] text-pink-800 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-pink-600" />
                    Pink Lotus Heart Aura Active Nearby
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-pink-600 text-white text-[10px] font-bold">
                💖 SOUL BOND
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onWarpToPartner(activeBond.partnerName);
                }}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white border-2 border-rose-950 font-display font-bold flex items-center justify-center gap-1.5"
              >
                <Navigation className="w-4 h-4" /> 🌸 Warp to Partner
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEnterSharedCoopFarm(activeBond);
                }}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-2 border-emerald-950 font-display font-bold flex items-center justify-center gap-1.5"
              >
                <Sprout className="w-4 h-4" /> 🌾 Shared Co-op Farm
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Step 1: Acquire Lotus Bond Ring */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-900/25 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-display font-bold text-sm text-amber-950 flex items-center gap-1.5">
                    💍 Lotus Bond Ring
                    {ownsRing && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-700 text-white text-[10px]">
                        ✓ Owned in Bag
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-amber-900/90">
                    Hand-carved sacred pink lotus band (also stocked in the Fashion Boutique).
                  </div>
                </div>
              </div>
              {!ownsRing && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={player.currencies.coins < 1000}
                    onClick={() => onBuyLotusBondRing('coins')}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-600 text-white font-display font-bold flex items-center gap-1 disabled:opacity-45"
                  >
                    <Coins className="w-3.5 h-3.5" /> Buy · 1,000 Coins
                  </button>
                  <button
                    type="button"
                    disabled={player.currencies.gold < 10}
                    onClick={() => onBuyLotusBondRing('gold')}
                    className="px-3.5 py-1.5 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-amber-950 border border-amber-950 font-display font-bold flex items-center gap-1 disabled:opacity-45"
                  >
                    ✨ Buy · 10 Gold
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Offer Bond Ring to a Player */}
            <form onSubmit={(e) => void handleOfferRing(e, false)} className="p-3 rounded-xl bg-pink-50/90 border border-pink-400/45 space-y-2.5">
              <div className="font-display font-bold text-pink-950 flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-pink-600" /> Offer Lotus Bond Ring
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={24}
                  value={partnerInput}
                  onChange={(e) => setPartnerInput(e.target.value)}
                  placeholder="Enter Best Friend / Partner username..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-pink-400/60 text-pink-950 font-semibold"
                />
                <button
                  type="submit"
                  disabled={busy || !ownsRing}
                  className="px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-display font-bold disabled:opacity-45 shrink-0"
                >
                  💍 Offer Ring
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-pink-300/40">
                <span className="text-[10px] text-pink-900">
                  Testing solo/offline? Bond immediately with village companion <strong>Bopha_Lotus</strong>:
                </span>
                <button
                  type="button"
                  disabled={busy || !ownsRing}
                  onClick={(e) => void handleOfferRing(e, true)}
                  className="px-2.5 py-1 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-display font-bold text-[10px] disabled:opacity-45 shrink-0"
                >
                  💖 Demo Bond (Instant)
                </button>
              </div>
            </form>
          </>
        )}

        {/* Incoming Pending Bond Offers */}
        {incoming.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-900/25 space-y-2">
            <div className="font-display font-bold text-amber-950">💌 Incoming Lotus Bond Ring Offers</div>
            {incoming.map((req) => (
              <div
                key={req.bondId}
                className="p-2 rounded-xl bg-white border border-pink-300 flex items-center justify-between gap-2"
              >
                <span className="font-display font-bold text-pink-950">
                  💍 {req.partnerName} offered you a Lotus Bond Ring!
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleAcceptIncoming(req)}
                  className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-display font-bold inline-flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> Accept
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </NativeDialog>
  );
};
