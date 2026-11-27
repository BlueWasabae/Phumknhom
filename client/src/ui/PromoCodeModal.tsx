import React, { useState } from 'react';
import type { PlayerState } from '@shared/types';
import { Check, Copy, Gift, Share2, Sparkles, Ticket } from 'lucide-react';
import {
  redeemPromoCodeApi,
  type AuthSession,
  type PromoRedeemReward,
} from '../game/network/ApiClient';
import { soundManager } from '../game/systems/SoundManager';
import { NativeDialog } from './NativeDialog';

interface PromoCodeModalProps {
  open: boolean;
  player: PlayerState;
  authSession: AuthSession | null;
  onClose: () => void;
  onRewardClaimed: (reward: PromoRedeemReward, redeemedCodes: string[]) => void;
}

const KNOWN_PUBLIC_CODES = [
  { code: 'PHUM2026', desc: '+500 Coins + 2× Reforge Stones' },
  { code: 'ANGKOR100', desc: '+100 Diamonds' },
  { code: 'KHMERHERO', desc: 'Exclusive Launch Cape (Vanity Back)' },
];

export const PromoCodeModal: React.FC<PromoCodeModalProps> = ({
  open,
  player,
  authSession,
  onClose,
  onRewardClaimed,
}) => {
  const [codeInput, setCodeInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const redeemedSet = new Set((player.redeemedCodes ?? []).map((c) => c.toUpperCase()));
  const safeRefName = encodeURIComponent(player.name.trim() || 'PhumHero');
  const inviteUrl = `https://www.bluexacedamy.space/?ref=${safeRefName}`;

  const handleRedeem = async (explicitCode?: string) => {
    const raw = (explicitCode ?? codeInput).trim().toUpperCase();
    if (!raw) {
      setFeedback({ ok: false, text: 'Enter a Launch Gift Code (e.g. PHUM2026).' });
      return;
    }
    setBusy(true);
    setFeedback(null);
    const res = await redeemPromoCodeApi(authSession, {
      code: raw,
      playerName: player.name,
      alreadyRedeemed: player.redeemedCodes ?? [],
    });
    setBusy(false);

    if (!res.ok) {
      soundManager.playSfx('hit');
      setFeedback({ ok: false, text: res.error });
      return;
    }

    soundManager.playSfx('victory');
    setCodeInput('');
    setFeedback({
      ok: true,
      text: `🎉 Redeemed ${res.reward.code}! Received ${res.reward.summary}!`,
    });
    onRewardClaimed(res.reward, res.redeemedCodes);
  };

  const handleCopyInvite = async () => {
    soundManager.playSfx('coin');
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback copy via temporary textarea
      const el = document.createElement('textarea');
      el.value = inviteUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🎁 Gift Codes & Friend Invites · កូដអំណោយ និងអញ្ជើញមិត្ត"
      subtitle="Claim 1.0 Public Launch gift codes & invite friends for +300 Bonus Coins each!"
      maxWidthClass="w-[min(95vw,580px)]"
    >
      <div className="space-y-3.5 text-xs">
        {/* Redeem Gift Code Section */}
        <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-700/40 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display font-bold text-sm text-amber-950 flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-rose-600" /> Redeem Launch Gift Code
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-800 text-amber-50 font-bold text-[10px]">
              {redeemedSet.size}/{KNOWN_PUBLIC_CODES.length} Claimed
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[190px]">
              <Ticket className="w-4 h-4 text-amber-700 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleRedeem();
                }}
                placeholder="Enter code (e.g. PHUM2026)"
                maxLength={24}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border-2 border-amber-900/35 font-mono font-bold text-amber-950 uppercase tracking-wider"
              />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleRedeem()}
              className="px-4 py-2 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white border-2 border-emerald-950 font-display font-bold text-xs shadow cursor-pointer disabled:opacity-50"
            >
              {busy ? 'Checking...' : 'Redeem Code'}
            </button>
          </div>

          {feedback && (
            <div
              className={`px-3 py-2 rounded-xl border font-display font-bold text-[11px] ${
                feedback.ok
                  ? 'bg-emerald-100 border-emerald-600 text-emerald-950'
                  : 'bg-rose-100 border-rose-600 text-rose-950'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {/* Launch Gift Code Reference Chips */}
          <div className="space-y-1.5 pt-1 border-t border-amber-900/15">
            <div className="text-[10px] font-bold uppercase text-amber-900/80 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" /> 1.0 Public Launch Celebration Codes
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              {KNOWN_PUBLIC_CODES.map((entry) => {
                const claimed = redeemedSet.has(entry.code);
                return (
                  <button
                    key={entry.code}
                    type="button"
                    disabled={claimed || busy}
                    onClick={() => void handleRedeem(entry.code)}
                    className={`p-2 rounded-xl border text-left transition ${
                      claimed
                        ? 'bg-emerald-50 border-emerald-500/50 text-emerald-900 opacity-75 cursor-default'
                        : 'bg-white hover:bg-amber-100 border-amber-900/25 text-amber-950 cursor-pointer'
                    }`}
                  >
                    <div className="font-mono font-bold text-[11px] flex items-center justify-between">
                      <span>{entry.code}</span>
                      <span className="text-[9px] font-display">
                        {claimed ? '✓ Claimed' : 'Tap to Claim'}
                      </span>
                    </div>
                    <div className="text-[9.5px] opacity-85 mt-0.5">{entry.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Personal Friend Invite Link */}
        <div className="p-3 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 border-2 border-sky-700/40 space-y-2">
          <div className="font-display font-bold text-sm text-sky-950 flex items-center gap-1.5">
            <Share2 className="w-4 h-4 text-sky-700" /> Personal Friend Invite Link
          </div>
          <p className="text-[11px] text-sky-950/90 leading-snug">
            Share your personal link below! When a new villager joins through your link,{' '}
            <strong>BOTH you and your friend receive +300 Bonus Coins</strong>!
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-[200px] px-3 py-1.5 rounded-xl bg-white border border-sky-800/35 font-mono text-[11px] text-sky-950"
            />
            <button
              type="button"
              onClick={() => void handleCopyInvite()}
              className="px-3.5 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white border border-sky-950 font-display font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>

          {player.referredBy && (
            <div className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-500/40">
              ✓ Invited by <strong>{player.referredBy}</strong> — +300 Welcome Bonus Coins received!
            </div>
          )}
        </div>
      </div>
    </NativeDialog>
  );
};
