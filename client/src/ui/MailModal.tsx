import React, { useEffect, useState } from 'react';
import type { PlayerMailEntry, TradeAuctionHistoryEntry } from '@shared/types';
import { getRarityTierDef } from '@shared/raritySystem';
import { CheckCircle2, History, Mail, PackageCheck, RefreshCw } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface MailModalProps {
  open: boolean;
  mailEntries: PlayerMailEntry[];
  history: TradeAuctionHistoryEntry[];
  loading: boolean;
  onRefresh: () => void;
  onClaimMail: (mailId?: string) => Promise<{ ok: boolean; message: string }>;
  onClose: () => void;
}

export const MailModal: React.FC<MailModalProps> = ({
  open,
  mailEntries,
  history,
  loading,
  onRefresh,
  onClaimMail,
  onClose,
}) => {
  const [tab, setTab] = useState<'mailbox' | 'history'>('mailbox');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (open) {
      setStatus(null);
      onRefresh();
    }
  }, [open]);

  const unclaimedCount = mailEntries.filter((m) => !m.claimed).length;

  const triggerClaim = async (mailId?: string) => {
    setBusy(true);
    const res = await onClaimMail(mailId);
    setBusy(false);
    setStatus({ ok: res.ok, text: res.message });
  };

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="📬 Phum Mailbox & Trade Ledger · ប្រអប់សំបុត្រ និងប្រវត្តិដេញថ្លៃ"
      subtitle="Claim won Auction items, Coin/Gold payouts, outbid refunds & view P2P Trade history (offline-safe!)"
      maxWidthClass="w-[min(95vw,720px)]"
    >
      <div className="space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTab('mailbox')}
              className={`px-3.5 py-1.5 rounded-xl font-display font-bold border-2 inline-flex items-center gap-1.5 cursor-pointer ${
                tab === 'mailbox'
                  ? 'bg-sky-800 text-white border-sky-950 shadow'
                  : 'bg-amber-50 text-amber-950 border-amber-900/25'
              }`}
            >
              <Mail className="w-3.5 h-3.5" /> Mailbox
              {unclaimedCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px]">
                  {unclaimedCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setTab('history')}
              className={`px-3.5 py-1.5 rounded-xl font-display font-bold border-2 inline-flex items-center gap-1.5 cursor-pointer ${
                tab === 'history'
                  ? 'bg-amber-800 text-white border-amber-950 shadow'
                  : 'bg-amber-50 text-amber-950 border-amber-900/25'
              }`}
            >
              <History className="w-3.5 h-3.5" /> Trade &amp; Auction History ({history.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {tab === 'mailbox' && unclaimedCount > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void triggerClaim()}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white border-2 border-emerald-950 font-display font-black text-xs inline-flex items-center gap-1.5 shadow cursor-pointer"
              >
                <PackageCheck className="w-4 h-4" /> Claim All ({unclaimedCount})
              </button>
            )}
            <button
              type="button"
              disabled={loading}
              onClick={onRefresh}
              className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 border border-amber-900/30 text-amber-950 cursor-pointer"
              title="Refresh Mailbox"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {status && (
          <div
            className={`px-3.5 py-2 rounded-xl border-2 font-bold ${
              status.ok
                ? 'bg-emerald-50 border-emerald-600 text-emerald-950'
                : 'bg-rose-50 border-rose-600 text-rose-950'
            }`}
          >
            {status.text}
          </div>
        )}

        {tab === 'mailbox' ? (
          <div className="max-h-[54vh] overflow-y-auto space-y-2 pr-1">
            {mailEntries.length === 0 ? (
              <div className="p-8 rounded-xl bg-amber-50 border border-amber-900/20 text-center text-amber-900/80 font-bold">
                Your Mailbox is empty. Won Auction items, sale payouts &amp; outbid refunds arrive here automatically!
              </div>
            ) : (
              mailEntries.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    m.claimed
                      ? 'bg-stone-100 border-stone-300 opacity-70'
                      : 'bg-amber-50 border-amber-700/60 shadow-sm'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="font-display font-black text-sm text-amber-950">{m.title}</div>
                    <p className="text-[11px] text-amber-900/90 leading-snug">{m.body}</p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {m.coins > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-950 font-bold text-[10px]">
                          🪙 +{m.coins.toLocaleString()} Coins
                        </span>
                      )}
                      {m.gold > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-yellow-200 text-amber-950 font-bold text-[10px]">
                          🥇 +{m.gold.toLocaleString()} Gold
                        </span>
                      )}
                      {m.items.map((it, i) => {
                        const tier = getRarityTierDef((it.rarity ?? 'common') as never);
                        return (
                          <span
                            key={`${it.itemId}_${i}`}
                            className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-bold text-[10px] border"
                            style={{ borderColor: tier.colorHex, color: tier.colorHex }}
                          >
                            🎁 {it.quantity}× {it.itemName}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {m.claimed ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void triggerClaim(m.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-950 font-display font-bold text-xs cursor-pointer"
                      >
                        Claim
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="max-h-[54vh] overflow-y-auto space-y-1.5 pr-1">
            {history.length === 0 ? (
              <div className="p-8 rounded-xl bg-amber-50 border border-amber-900/20 text-center text-amber-900/80 font-bold">
                No P2P trades or Auction House transactions recorded yet.
              </div>
            ) : (
              history.map((h) => (
                <div
                  key={h.id}
                  className="p-2.5 rounded-xl bg-amber-50 border border-amber-900/25 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-amber-950">{h.summary}</div>
                    <div className="text-[10px] text-amber-800/80">
                      {new Date(h.timestamp).toLocaleString()}
                      {h.counterParty ? ` · With ${h.counterParty}` : ''}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-200/80 text-amber-950 font-black text-[10px] uppercase">
                    {h.kind.replace(/_/g, ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </NativeDialog>
  );
};
