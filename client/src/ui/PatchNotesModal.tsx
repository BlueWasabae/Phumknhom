import React from 'react';
import { Sparkles, ShieldCheck, Music, Trophy, Flower2, Share2 } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

export const CURRENT_PATCH_VERSION = '3.0.0';
const PATCH_SEEN_KEY = 'phum_khnhom_seen_patch_version';

export function hasSeenCurrentPatchNotes(): boolean {
  try {
    return window.localStorage.getItem(PATCH_SEEN_KEY) === CURRENT_PATCH_VERSION;
  } catch {
    return true;
  }
}

export function markCurrentPatchNotesSeen(): void {
  try {
    window.localStorage.setItem(PATCH_SEEN_KEY, CURRENT_PATCH_VERSION);
  } catch {
    // ignore storage quota errors
  }
}

interface PatchNotesModalProps {
  open: boolean;
  onClose: () => void;
  onDownloadHeroCard?: () => void;
  onOpenFeedback?: () => void;
}

export const PatchNotesModal: React.FC<PatchNotesModalProps> = ({
  open,
  onClose,
  onDownloadHeroCard,
  onOpenFeedback,
}) => {
  if (!open) return null;

  const handleClose = () => {
    markCurrentPatchNotesSeen();
    onClose();
  };

  return (
    <NativeDialog
      open={open}
      onClose={handleClose}
      title="📜 What's New in ភូមិខ្ញុំ v3.0 — Grand Milestone"
      subtitle="Sprite & Animation Polish · Security Hardening · Live Khmer Music · Pet Racing · Hero Share Card"
      maxWidthClass="max-w-3xl"
    >
      <div className="space-y-3 text-xs max-h-[72dvh] overflow-y-auto pr-1">
        {/* v3.0 Hero Banner */}
        <div className="rounded-2xl border-2 border-amber-400/70 bg-gradient-to-r from-amber-950 via-rose-950/90 to-slate-950 p-4 text-amber-50">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-display text-base font-black text-amber-300">
              <Sparkles className="h-4 w-4" /> Release 3.0 — Grand Milestone Edition
            </span>
            <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black text-slate-950">
              v3.0.0 LIVE
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-amber-100/90 leading-relaxed">
            Welcome to our biggest polish &amp; community milestone yet! Every corner of Phum Khnhom now shines with
            smoother animations, bulletproof server protection, and instant social sharing.
          </p>
        </div>

        {/* Section Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-amber-900/25 bg-amber-50 p-3 space-y-1">
            <div className="font-display font-bold text-amber-950 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-600" /> v3.0 Sprite &amp; Animation Polish
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-900">
              <li>2-frame idle breathing &amp; smooth walk-cycle bobbing on all avatars.</li>
              <li>Footstep dust puffs on village roads &amp; beach sand + shoreline water ripples in Green Park &amp; Koh Rong.</li>
              <li>Spinning Golden Lotus loader (`Loading ភូមិខ្ញុំ... %`) &amp; graceful fallback textures.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-emerald-900/25 bg-emerald-50 p-3 space-y-1">
            <div className="font-display font-bold text-emerald-950 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-700" /> v3.0 Security &amp; Auto-Reconnect
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-emerald-900">
              <li>Sliding-window rate limiting across all economy, save, auction, trade &amp; promo APIs.</li>
              <li>Exponential-backoff Wi-Fi/4G auto-reconnect with non-blocking HUD status pill.</li>
              <li>Live `GET /api/health` diagnostics + In-Game Bug Reporter (`MENU → Report Bug`).</li>
            </ul>
          </div>

          <div className="rounded-xl border border-sky-900/25 bg-sky-50 p-3 space-y-1">
            <div className="font-display font-bold text-sky-950 flex items-center gap-1.5">
              <Music className="h-4 w-4 text-sky-700" /> v2.9 Live Khmer Music &amp; Pet Racing
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-sky-900">
              <li>Jam live with 5 authentic instruments (`Roneat Aek`, `Chapei`, `Khim`, `Skor Thom`, `Chhing`) + Tip Jar.</li>
              <li>6-Lane **Village Pet Racing Arena** in Green Park with normalized fair stats &amp; Pet XP Treats.</li>
              <li>**Custom Outdoor Garden Yard** with `Lotus Koi Pond`, `Blooming Spirit Tree` &amp; `Golden Naga Fountain`.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-purple-900/25 bg-purple-50 p-3 space-y-1">
            <div className="font-display font-bold text-purple-950 flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-purple-700" /> v2.8 Krom Guild Hall &amp; 3-Stage Pets
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-purple-900">
              <li>Enterable Angkor **Krom Guild Hall** with 12-slot Shared Vault &amp; 7-Boss Trophy Wall.</li>
              <li>**Weekly Krom Territory Wars** flying golden `[TAG]` banners on 3 maps.</li>
              <li>**3-Stage Pet Evolution** (Baby → Adult → Mythic Bloom Aura, zero combat P2W).</li>
            </ul>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-900/20">
          <div className="flex flex-wrap gap-2">
            {onDownloadHeroCard && (
              <button
                type="button"
                onClick={onDownloadHeroCard}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-2 font-display text-xs font-black text-slate-950 shadow hover:brightness-110 cursor-pointer"
              >
                <Share2 className="h-3.5 w-3.5" /> Download My Hero Card (PNG)
              </button>
            )}
            {onOpenFeedback && (
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onOpenFeedback();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-900/30 bg-amber-100 px-3 py-2 font-display text-xs font-bold text-amber-950 hover:bg-amber-200 cursor-pointer"
              >
                <Flower2 className="h-3.5 w-3.5 text-rose-600" /> Send Feedback / Bug Report
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="phum-btn px-5 py-2 rounded-xl font-display font-black text-xs cursor-pointer"
          >
            Enter ភូមិខ្ញុំ v3.0!
          </button>
        </div>
      </div>
    </NativeDialog>
  );
};
