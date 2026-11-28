import React, { useEffect, useState } from 'react';
import type { PlayerState } from '@shared/types';
import {
  REAMKER_QUEST_STEPS,
  SBEK_THOM_VIGNETTES,
  isReamkerStepClaimable,
} from '@shared/reamkerQuests';
import { Award, CheckCircle2, Flame, Play, ScrollText, Sparkles } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface SbekThomModalProps {
  open: boolean;
  player: PlayerState;
  onStartQuestline: () => void;
  onClaimStep: () => void;
  onClose: () => void;
}

export const SbekThomModal: React.FC<SbekThomModalProps> = ({
  open,
  player,
  onStartQuestline,
  onClaimStep,
  onClose,
}) => {
  const [vignetteIdx, setVignetteIdx] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);
  const [playing, setPlaying] = useState(true);

  const vignette = SBEK_THOM_VIGNETTES[vignetteIdx];
  const questStep = player.reamkerQuestStep ?? 0; // 0 = unstarted, 1..5 = active, 6 = completed
  const stepProgress = player.reamkerStepProgress ?? 0;
  const claimable = isReamkerStepClaimable(player);

  useEffect(() => {
    if (!open || !playing) return;
    const t = window.setInterval(() => {
      setLineIdx((prev) => (prev + 1) % vignette.narration.length);
    }, 3400);
    return () => window.clearInterval(t);
  }, [open, playing, vignette.narration.length, vignetteIdx]);

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🎭 Sbek Thom Shadow Puppet Theater (ល្ខោនស្បែកធំ)"
      subtitle="Sacred Backlit Khmer Parchment Stage · Legend of the Reamker & 5-Part Lore Questline"
      maxWidthClass="w-[min(96vw,780px)]"
    >
      <div className="space-y-3 text-xs">
        {/* Animated Backlit Parchment Shadow Puppet Screen */}
        <div className="relative rounded-2xl overflow-hidden border-[3px] border-amber-500/80 bg-gradient-to-b from-amber-950 via-orange-900 to-amber-700 p-4 text-amber-50 shadow-[0_0_30px_rgba(249,115,22,0.35)]">
          {/* Flickering Coconut-Husk Firelight Glow */}
          <div
            className="pointer-events-none absolute inset-0 opacity-45 animate-pulse"
            style={{
              background:
                'radial-gradient(circle at 50% 62%, rgba(254, 240, 138, 0.92), rgba(245, 158, 11, 0.35) 52%, rgba(28, 12, 4, 0.88) 92%)',
            }}
          />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/75 border border-amber-400/50 text-[10px] font-bold text-amber-200">
                <Flame className="w-3 h-3 text-orange-400" /> {vignette.subtitle}
              </div>
              <div className="font-display font-extrabold text-base text-yellow-100 mt-0.5">
                {vignette.title} · <span className="text-amber-300">{vignette.khmerTitle}</span>
              </div>
            </div>
            <div className="flex gap-1">
              {SBEK_THOM_VIGNETTES.map((v, idx) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setVignetteIdx(idx);
                    setLineIdx(0);
                    setPlaying(true);
                  }}
                  className={`px-2 py-1 rounded-lg font-display font-bold text-[10px] border cursor-pointer transition ${
                    vignetteIdx === idx
                      ? 'bg-amber-400 text-amber-950 border-amber-950'
                      : 'bg-amber-950/70 text-amber-100 border-amber-400/40 hover:bg-amber-900'
                  }`}
                >
                  Act {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Stylized Animated Shadow Silhouette Stage */}
          <div className="relative z-10 h-36 rounded-xl bg-gradient-to-b from-amber-200/85 via-amber-400/80 to-orange-500/85 border-2 border-amber-950/70 flex items-center justify-center overflow-hidden shadow-inner">
            <svg viewBox="0 0 420 140" className="w-full h-full">
              {/* Temple silhouette horizon */}
              <path
                d="M0 140 L0 112 L42 112 L52 84 L62 112 L92 112 L106 62 L120 112 L144 112 L144 140 Z M280 140 L280 110 L306 72 L332 110 L368 92 L390 110 L420 110 L420 140 Z"
                fill="#291105"
                opacity="0.55"
              />
              {vignette.id === 'preah_ream' && (
                <g className="animate-bounce" style={{ animationDuration: '2.6s' }}>
                  {/* Preah Ream crowned archer silhouette pulling Golden Bow */}
                  <path
                    d="M175 118 L182 82 L176 58 L188 46 L192 24 L196 46 L206 58 L200 84 L212 118 L198 118 L191 92 L184 118 Z"
                    fill="#1c0a03"
                  />
                  <path d="M214 36 Q244 74 214 112" stroke="#1c0a03" strokeWidth="5" fill="none" />
                  <line x1="214" y1="36" x2="214" y2="112" stroke="#fef08a" strokeWidth="1.5" />
                  <line x1="196" y1="74" x2="262" y2="68" stroke="#fef08a" strokeWidth="3" />
                  <polygon points="268,67 256,62 257,73" fill="#fef08a" />
                </g>
              )}
              {vignette.id === 'hanuman' && (
                <g className="animate-pulse" style={{ animationDuration: '1.8s' }}>
                  {/* Hanuman leaping monkey-warrior silhouette with sweeping tail */}
                  <path
                    d="M148 96 Q168 62 198 52 L212 36 L220 52 L248 44 L232 68 L252 94 L228 90 L210 78 L194 104 L176 92 Z"
                    fill="#1c0a03"
                  />
                  <path d="M168 86 Q128 60 148 34 Q166 22 182 36" stroke="#1c0a03" strokeWidth="5" fill="none" />
                  <circle cx="268" cy="40" r="10" fill="#fef08a" opacity="0.7" />
                </g>
              )}
              {vignette.id === 'krong_reap' && (
                <g className="animate-pulse" style={{ animationDuration: '1.6s' }}>
                  {/* Towering Ten-Headed Krong Reap silhouette */}
                  <path
                    d="M164 124 L176 74 L152 60 L176 48 L192 22 L208 48 L228 22 L244 48 L268 60 L244 74 L256 124 Z"
                    fill="#1c0a03"
                  />
                  <circle cx="204" cy="54" r="3.5" fill="#ef4444" />
                  <circle cx="216" cy="54" r="3.5" fill="#ef4444" />
                  <path d="M146 86 L124 44 L158 56 Z M274 86 L296 44 L262 56 Z" fill="#450a0a" />
                </g>
              )}
            </svg>
          </div>

          {/* Narration Caption Strip */}
          <div className="relative z-10 mt-2.5 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-stone-950/80 border border-amber-400/35">
            <p className="text-[11px] font-medium text-amber-100 italic leading-snug">
              “{vignette.narration[lineIdx]}”
            </p>
            <button
              type="button"
              onClick={() => setLineIdx((prev) => (prev + 1) % vignette.narration.length)}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-amber-950 font-display font-bold text-[10px] shrink-0 inline-flex items-center gap-1 cursor-pointer"
            >
              <Play className="w-3 h-3" /> Next Scene
            </button>
          </div>
        </div>

        {/* 5-Part Reamker Lore Questline */}
        <div className="p-3 rounded-2xl bg-amber-50 border-2 border-amber-900/30 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-display font-extrabold text-sm text-amber-950 flex items-center gap-1.5">
                <ScrollText className="w-4 h-4 text-amber-700" /> 5-Part Reamker Lore Questline
              </div>
              <div className="text-[10px] text-amber-800 font-semibold">
                Grand Finale Rewards: <strong>1,500 Coins</strong> · <strong>50 💎 Diamonds</strong> ·{' '}
                <strong>🎭 Hanuman Spirit Mask</strong> · <strong>🔥 Sbek Thom Shadow Puppet Aura</strong>
              </div>
            </div>

            {questStep === 0 && (
              <button
                type="button"
                onClick={onStartQuestline}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white border-2 border-amber-950 font-display font-extrabold text-xs shadow cursor-pointer"
              >
                🎭 Begin Reamker Questline (Part 1/5)
              </button>
            )}
            {questStep >= 1 && questStep <= 5 && (
              <button
                type="button"
                disabled={!claimable}
                onClick={onClaimStep}
                className={`px-3.5 py-2 rounded-xl border-2 font-display font-extrabold text-xs cursor-pointer ${
                  claimable
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-950 animate-pulse'
                    : 'bg-amber-200 text-amber-900 border-amber-900/30 opacity-70'
                }`}
              >
                {claimable ? `✨ Claim Part ${questStep}/5 Reward!` : `In Progress · Part ${questStep}/5`}
              </button>
            )}
            {questStep >= 6 && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-700 text-white font-display font-bold text-xs">
                <Award className="w-4 h-4 text-yellow-300" /> Legend Completed (5/5)
              </span>
            )}
          </div>

          <div className="space-y-1.5 max-h-[34dvh] overflow-y-auto pr-1">
            {REAMKER_QUEST_STEPS.map((st) => {
              const done = questStep > st.step;
              const active = questStep === st.step;
              const locked = questStep < st.step;
              const curCount = done ? st.targetCount : active ? Math.min(st.targetCount, stepProgress) : 0;

              return (
                <div
                  key={st.step}
                  className={`p-2.5 rounded-xl border-2 flex items-center justify-between gap-2 ${
                    done
                      ? 'bg-emerald-50 border-emerald-500/70'
                      : active
                        ? 'bg-amber-100 border-amber-600 shadow-sm'
                        : 'bg-white/70 border-amber-900/15 opacity-75'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-display font-bold text-xs text-amber-950 flex items-center gap-1.5">
                      <span>{st.icon}</span>
                      <span>
                        Part {st.step}: {st.title}
                      </span>
                      <span className="text-[10px] text-amber-700 font-semibold">({st.khmerTitle})</span>
                    </div>
                    <div className="text-[11px] text-amber-900 mt-0.5">{st.objectiveText}</div>
                    <div className="text-[10px] text-amber-700/90 italic">{st.storyExcerpt}</div>
                  </div>

                  <div className="text-right shrink-0 space-y-0.5">
                    {done ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-display font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4" /> Done
                      </span>
                    ) : active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-800 text-amber-50 font-bold text-[10px]">
                        <Sparkles className="w-3 h-3 text-yellow-300" /> {curCount} / {st.targetCount}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-800/70">
                        {locked ? 'Locked' : ''}
                      </span>
                    )}
                    <div className="text-[10px] font-bold text-amber-900">
                      +{st.rewardCoins.toLocaleString()}c{st.step === 5 ? ' + 50 💎 + Mask & Aura' : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </NativeDialog>
  );
};
