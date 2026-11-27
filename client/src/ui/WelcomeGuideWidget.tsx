import React, { useState } from 'react';
import type { PlayerState, StarterGuideStepId, ZoneType } from '@shared/types';
import { CheckCircle2, ChevronDown, ChevronUp, Circle, Compass, Crown, X } from 'lucide-react';
import { soundManager } from '../game/systems/SoundManager';

export interface StarterGuideStepDef {
  id: StarterGuideStepId;
  label: string;
  khmerHint: string;
  rewardCoins: number;
  actionLabel?: string;
}

export const STARTER_GUIDE_STEPS: StarterGuideStepDef[] = [
  {
    id: 'customize_hero',
    label: 'Customize Your Hero & Pick a Khmer Class',
    khmerHint: 'បង្កើតតួអង្គ និងជ្រើសរើសមុខរបរ',
    rewardCoins: 100,
  },
  {
    id: 'plant_crop',
    label: 'Walk to Your Farm & Plant 1 Crop',
    khmerHint: 'ទៅចម្ការរបស់អ្នក ហើយដាំដំណាំ ១ ដើម',
    rewardCoins: 100,
    actionLabel: 'Farm',
  },
  {
    id: 'greet_npc',
    label: 'Say Hello to an NPC on Market Street',
    khmerHint: 'ជម្រាបសួរអ្នកភូមិនៅផ្លូវផ្សារ',
    rewardCoins: 100,
    actionLabel: 'Map',
  },
  {
    id: 'explore_or_boss',
    label: 'Explore the Caverns or Challenge Sdech Kongkaeb',
    khmerHint: 'រុករកល្អាង ឬ ប្រកួតស្តេចកង្កែប',
    rewardCoins: 100,
    actionLabel: 'Raid',
  },
  {
    id: 'claim_bounty',
    label: 'Claim Your First Daily Bounty',
    khmerHint: 'ទទួលរង្វាន់ភារកិច្ចប្រចាំថ្ងៃដំបូង',
    rewardCoins: 100,
    actionLabel: 'Bounties',
  },
];

interface WelcomeGuideWidgetProps {
  player: PlayerState;
  zone: ZoneType;
  hiddenByModal: boolean;
  onDismiss: () => void;
  onQuickAction: (stepId: StarterGuideStepId) => void;
}

/**
 * Update 1.9 — Collapsible New-Player "Village Starter Guide" Onboarding Card.
 * Sits cleanly in the top-left below the HUD until all 5 steps are completed or dismissed.
 */
export const WelcomeGuideWidget: React.FC<WelcomeGuideWidgetProps> = ({
  player,
  zone,
  hiddenByModal,
  onDismiss,
  onQuickAction,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const guide = player.starterGuide;
  if (guide?.dismissed) return null;
  if (hiddenByModal || zone === 'dungeon' || zone === 'tower' || zone === 'festival_race') {
    return null;
  }

  const completedSet = new Set<StarterGuideStepId>(guide?.completedSteps ?? []);
  if (player.hasCompletedCreation || player.loadout.hasCompletedCreation) {
    completedSet.add('customize_hero');
  }
  const doneCount = STARTER_GUIDE_STEPS.filter((s) => completedSet.has(s.id)).length;
  const allDone = doneCount >= STARTER_GUIDE_STEPS.length;

  // Once all 5 are done and final reward claimed, auto-hide unless player hasn't dismissed
  if (allDone && guide?.finalRewardClaimed) {
    return null;
  }

  return (
    <div
      className="pointer-events-auto fixed left-2 sm:left-3 top-[104px] sm:top-[92px] z-20 w-[min(86vw,278px)] phum-panel rounded-2xl overflow-hidden shadow-xl transition-all"
      aria-label="Village Starter Guide"
    >
      {/* Header */}
      <div className="px-2.5 py-1.5 phum-wood flex items-center justify-between gap-1.5">
        <button
          type="button"
          onClick={() => {
            soundManager.playSfx('click');
            setCollapsed((c) => !c);
          }}
          className="flex items-center gap-1.5 min-w-0 text-left flex-1 cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span className="font-display font-bold text-[11px] text-amber-100 truncate">
            Village Starter Guide
          </span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-400/25 border border-amber-300/60 text-amber-200 font-mono font-bold text-[9px] shrink-0">
            {doneCount}/{STARTER_GUIDE_STEPS.length}
          </span>
        </button>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundManager.playSfx('click');
              setCollapsed((c) => !c);
            }}
            aria-label={collapsed ? 'Expand starter guide' : 'Collapse starter guide'}
            className="p-1 rounded-md hover:bg-amber-950/60 text-amber-200 cursor-pointer"
          >
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.playSfx('click');
              onDismiss();
            }}
            aria-label="Dismiss starter guide"
            title="Dismiss Guide"
            className="p-1 rounded-md hover:bg-red-700 text-amber-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-amber-950/20 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-yellow-300 transition-all duration-300"
          style={{ width: `${Math.round((doneCount / STARTER_GUIDE_STEPS.length) * 100)}%` }}
        />
      </div>

      {!collapsed && (
        <div className="p-2 space-y-1.5 text-[11px]">
          {STARTER_GUIDE_STEPS.map((step, idx) => {
            const done = completedSet.has(step.id);
            return (
              <div
                key={step.id}
                className={`px-2 py-1.5 rounded-xl border flex items-center justify-between gap-1.5 transition ${
                  done
                    ? 'bg-emerald-50/90 border-emerald-600/40 text-emerald-950'
                    : 'bg-amber-50/95 border-amber-900/20 text-amber-950'
                }`}
              >
                <div className="flex items-start gap-1.5 min-w-0">
                  {done ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-amber-700/60 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 leading-tight">
                    <div
                      className={`font-display font-bold text-[10.5px] ${
                        done ? 'line-through opacity-75' : ''
                      }`}
                    >
                      {idx + 1}. {step.label}
                    </div>
                    <div className="text-[9px] text-amber-800/85 truncate">{step.khmerHint}</div>
                  </div>
                </div>

                {done ? (
                  <span className="text-[9px] font-bold text-emerald-700 shrink-0">✓ +100c</span>
                ) : step.actionLabel ? (
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playSfx('click');
                      onQuickAction(step.id);
                    }}
                    className="px-1.5 py-0.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-amber-50 font-display font-bold text-[9px] shrink-0 cursor-pointer"
                  >
                    {step.actionLabel}
                  </button>
                ) : (
                  <span className="text-[9px] font-bold text-amber-700 shrink-0">+100c</span>
                )}
              </div>
            );
          })}

          <div className="px-2 py-1.5 rounded-xl bg-gradient-to-r from-amber-200/80 via-yellow-100 to-amber-200/80 border border-amber-600/50 flex items-center justify-between gap-1.5 text-[10px]">
            <span className="font-display font-bold text-amber-950 flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              All 5 Reward:
            </span>
            <span className="font-display font-bold text-amber-900">
              👑 Phum Pioneer + 500c
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
