import React, { useEffect, useState } from 'react';
import type { EquipSlot } from '@shared/types';
import { MessageSquare, Sparkles, Swords, User, UserPlus } from 'lucide-react';
import { ITEM_CATALOG } from '../data/items';
import type { InspectedRemotePlayer } from '../game/EventBus';
import { NativeDialog } from './NativeDialog';
import { PaperDollPreview } from './PaperDollPreview';

interface PlayerActionModalProps {
  target: InspectedRemotePlayer | null;
  onClose: () => void;
  onAddFriend: (target: InspectedRemotePlayer) => void;
  onWhisper: (username: string) => void;
  onInviteDungeon: (target: InspectedRemotePlayer) => void;
}

const DISPLAY_SLOTS: Array<{ slot: Exclude<EquipSlot, 'accessory'>; label: string }> = [
  { slot: 'weapon', label: 'Weapon' },
  { slot: 'hat', label: 'Hat' },
  { slot: 'shirt', label: 'Outfit' },
  { slot: 'pants', label: 'Sampot' },
  { slot: 'wings', label: 'Wings' },
  { slot: 'pet', label: 'Pet' },
  { slot: 'armor', label: 'Armor' },
];

export const PlayerActionModal: React.FC<PlayerActionModalProps> = ({
  target,
  onClose,
  onAddFriend,
  onWhisper,
  onInviteDungeon,
}) => {
  const [viewingProfile, setViewingProfile] = useState(false);

  useEffect(() => {
    setViewingProfile(false);
  }, [target?.sessionId]);

  return (
    <NativeDialog
      open={Boolean(target)}
      onClose={onClose}
      title={target ? `${target.name} · ${target.areaId}` : 'Player'}
      subtitle={
        target
          ? `Lv.${target.level} · Stylish Score ${target.stylish}`
          : ''
      }
      maxWidthClass={viewingProfile ? 'w-[min(94vw,520px)]' : 'w-[min(92vw,380px)]'}
    >
      {target && (
        <div className="space-y-3 text-xs">
          {!viewingProfile ? (
            <>
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-50 border border-amber-900/25">
                <PaperDollPreview loadout={target.loadout} width={96} height={96} includePet />
                <div className="space-y-1 min-w-0">
                  <div className="font-display font-bold text-base text-amber-950 truncate">
                    {target.name}
                  </div>
                  <div className="flex flex-wrap gap-1 text-[10px] font-bold">
                    <span className="px-2 py-0.5 rounded bg-amber-800 text-amber-50">
                      Lv.{target.level}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-pink-100 text-pink-900 border border-pink-400/50 inline-flex items-center gap-0.5">
                      <Sparkles className="w-3 h-3" /> Stylish {target.stylish}
                    </span>
                  </div>
                  <div className="text-[10px] text-amber-800">
                    Tap an action below to interact in {target.areaId}.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setViewingProfile(true)}
                  className="phum-btn py-2.5 px-3 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <User className="w-4 h-4 text-amber-900" /> View Profile
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onAddFriend(target);
                    onClose();
                  }}
                  className="py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white border-2 border-emerald-950 font-display font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" /> Add Friend
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onWhisper(target.name);
                    onClose();
                  }}
                  className="py-2.5 px-3 rounded-xl bg-purple-700 hover:bg-purple-600 text-white border-2 border-purple-950 font-display font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" /> Whisper
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onInviteDungeon(target);
                    onClose();
                  }}
                  className="py-2.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white border-2 border-orange-950 font-display font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Swords className="w-4 h-4" /> Invite Dungeon
                </button>
              </div>
            </>
          ) : (
            /* Read-Only Remote Player Profile Card */
            <div className="space-y-3">
              <div className="grid sm:grid-cols-[152px_1fr] gap-3 items-start">
                <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-amber-50 border border-amber-900/25">
                  <PaperDollPreview loadout={target.loadout} width={132} height={132} includePet />
                  <div className="font-display font-bold text-sm text-amber-950">{target.name}</div>
                  <div className="text-[11px] font-bold text-pink-800">
                    Lv.{target.level} · Stylish {target.stylish}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="font-display font-bold text-amber-900 uppercase text-[10px]">
                    Equipped Gear & Fashion
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 max-h-[42dvh] overflow-y-auto pr-1">
                    {DISPLAY_SLOTS.map(({ slot, label }) => {
                      const id = target.loadout[slot];
                      const def = id ? ITEM_CATALOG[id] : null;
                      return (
                        <div
                          key={slot}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-900/20 flex items-center justify-between gap-2"
                        >
                          <span className="text-[10px] font-bold uppercase text-amber-800/80">
                            {label}
                          </span>
                          <span className="font-display font-bold text-xs text-amber-950 truncate">
                            {def ? def.name : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setViewingProfile(false)}
                  className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-900/35 font-display font-bold text-xs text-amber-950"
                >
                  Back to Actions
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onAddFriend(target);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-display font-bold text-xs"
                >
                  Add Friend
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </NativeDialog>
  );
};
