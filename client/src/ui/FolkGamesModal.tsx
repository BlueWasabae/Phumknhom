import React from 'react';
import type { PlayerState } from '@shared/types';
import { Award, Play, Sparkles, Trophy } from 'lucide-react';
import type { FolkGameMode } from '../game/scenes/FolkGamesScene';
import { NativeDialog } from './NativeDialog';

interface FolkGamesModalProps {
  open: boolean;
  player: PlayerState;
  onClose: () => void;
  onLaunchGame: (game: FolkGameMode) => void;
}

const FOLK_GAMES: Array<{
  id: FolkGameMode;
  icon: string;
  title: string;
  khmerTitle: string;
  badge: string;
  rewardText: string;
  description: string;
  accent: string;
}> = [
  {
    id: 'bos_angkunh',
    icon: '🌰',
    title: 'Bos Angkunh',
    khmerTitle: 'បោះអង្គញ់ · Seed Tossing',
    badge: 'Precision Aim',
    rewardText: 'Up to 240 C · +30 Friendly XP',
    description:
      'Aim with your cursor and hold/release power to flick your Kaoy Bos seed at the 5-seed pyramid. Authentic rule: knock down all 4 outer seeds BEFORE the golden center seed!',
    accent: 'from-amber-600 to-orange-700 border-amber-400',
  },
  {
    id: 'veay_kaom',
    icon: '🏺',
    title: "Veay K'aom",
    khmerTitle: 'វាយក្អម · Smash the Clay Pot',
    badge: 'Rare Crown Drop',
    rewardText: '220 C · Sweet Buff · Rare Clay Pot Crown',
    description:
      'Blindfolded beneath a swinging Kampong Chhnang clay pot! Follow the live crowd directional cues (Left / Right / Strike Now!) and swing your bamboo stick to burst flour & coins.',
    accent: 'from-rose-600 to-red-700 border-rose-400',
  },
  {
    id: 'teanh_prot',
    icon: '🪢',
    title: 'Teanh Prot',
    khmerTitle: 'ទាញព្រ័ត្រ · Khmer Tug of War',
    badge: 'Team Champion Badge',
    rewardText: '260 C Pot · Tug-of-War Champion Badge',
    description:
      'Two-team village rope showdown! Rapidly tap Spacebar or Click in rhythm to drag the red krama rope marker across your team’s victory line.',
    accent: 'from-emerald-600 to-teal-700 border-emerald-400',
  },
];

export const FolkGamesModal: React.FC<FolkGamesModalProps> = ({
  open,
  player,
  onClose,
  onLaunchGame,
}) => {
  const totalWins = player.folkGameWins ?? 0;
  const hasTugBadge = Boolean(player.folkBadges?.includes('badge_tug_of_war_champ'));

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="Khmer Village Folk Games Courtyard"
      subtitle="ល្បែងប្រជាប្រិយខ្មែរ · Festive Green Park Courtyard"
      maxWidthClass="w-[min(96vw,740px)]"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-amber-950/60 border border-amber-500/40 px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2 text-amber-200 font-bold">
            <Trophy className="w-4 h-4 text-yellow-300" />
            <span>Courtyard Victories: {totalWins}</span>
          </div>
          <div className="flex items-center gap-2">
            {hasTugBadge ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-200">
                <Award className="w-3.5 h-3.5" /> Tug-of-War Champion
              </span>
            ) : (
              <span className="text-[11px] text-amber-300/80">
                Win Teanh Prot to unlock the Tug-of-War Champion badge!
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {FOLK_GAMES.map((g) => (
            <div
              key={g.id}
              className="rounded-2xl bg-slate-900/90 border-2 border-amber-700/60 p-3.5 flex flex-col justify-between gap-3 shadow-lg"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{g.icon}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/40">
                    {g.badge}
                  </span>
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-amber-100">{g.title}</h3>
                  <p className="font-khmer text-[11px] text-amber-300">{g.khmerTitle}</p>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300">{g.description}</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-700/60">
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-300">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>{g.rewardText}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLaunchGame(g.id);
                  }}
                  className={`w-full py-2 rounded-xl font-display font-bold text-xs text-white bg-gradient-to-b ${g.accent} border flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-[0.98] transition cursor-pointer`}
                >
                  <Play className="w-3.5 h-3.5" /> Play {g.title}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </NativeDialog>
  );
};
