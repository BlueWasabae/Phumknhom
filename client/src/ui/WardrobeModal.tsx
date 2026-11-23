import React from 'react';
import type { EquippedLoadout, EyeStyleId, HairStyleId } from '@shared/types';
import { NativeDialog } from './NativeDialog';
import { PaperDollPreview } from './PaperDollPreview';

interface WardrobeModalProps {
  open: boolean;
  loadout: EquippedLoadout;
  onClose: () => void;
  onCustomize: (patch: Partial<EquippedLoadout>) => void;
}

const SKIN_TONES = ['#fde2c4', '#f4c29f', '#e5a97c', '#c68658', '#8d5524'];
const HAIR_COLORS = ['#1e1b24', '#451a03', '#7c2d12', '#1d4ed8', '#db2777', '#eab308', '#10b981'];
const HAIR_STYLES: Array<{ id: HairStyleId; label: string }> = [
  { id: 'hair_short', label: 'Short' },
  { id: 'hair_bob', label: 'Bob' },
  { id: 'hair_spiky', label: 'Spiky' },
  { id: 'hair_long', label: 'Long' },
];
const EYE_STYLES: Array<{ id: EyeStyleId; label: string }> = [
  { id: 'cheerful', label: 'Cheerful' },
  { id: 'classic', label: 'Classic' },
  { id: 'cool', label: 'Cool' },
  { id: 'starry', label: 'Starry' },
];

export const WardrobeModal: React.FC<WardrobeModalProps> = ({
  open,
  loadout,
  onClose,
  onCustomize,
}) => {
  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="Fashion Boutique · Mirror & Hair Salon"
      subtitle="Customize hair style, hair color, skin tone & expression live!"
      maxWidthClass="w-[min(94vw,540px)]"
    >
      <div className="grid sm:grid-cols-[164px_1fr] gap-4 items-center">
        <div className="flex flex-col items-center gap-2">
          <PaperDollPreview loadout={loadout} width={156} height={156} includePet />
          <span className="text-[11px] font-bold text-amber-900">Updates in Village Live!</span>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <div className="font-display font-bold text-amber-950 mb-1.5">Skin Tone</div>
            <div className="flex flex-wrap gap-2">
              {SKIN_TONES.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onCustomize({ skinColor: color })}
                  style={{ backgroundColor: color }}
                  aria-label={`Skin ${color}`}
                  className={`w-7 h-7 rounded-full border-2 transition ${
                    loadout.skinColor === color ? 'border-amber-950 scale-110 ring-2 ring-amber-500' : 'border-amber-900/40'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="font-display font-bold text-amber-950 mb-1.5">Hair Style</div>
            <div className="flex flex-wrap gap-1.5">
              {HAIR_STYLES.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => onCustomize({ hairStyle: h.id, hair: null })}
                  className={`px-3 py-1.5 rounded-xl font-bold border-2 ${
                    loadout.hairStyle === h.id && !loadout.hair
                      ? 'bg-amber-800 text-amber-50 border-amber-950'
                      : 'bg-amber-50 text-amber-950 border-amber-900/35'
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="font-display font-bold text-amber-950 mb-1.5">Hair Color</div>
            <div className="flex flex-wrap gap-2">
              {HAIR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onCustomize({ hairColor: color })}
                  style={{ backgroundColor: color }}
                  aria-label={`Hair color ${color}`}
                  className={`w-7 h-7 rounded-full border-2 transition ${
                    loadout.hairColor === color ? 'border-amber-950 scale-110 ring-2 ring-amber-500' : 'border-amber-900/40'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="font-display font-bold text-amber-950 mb-1.5">Eyes & Expression</div>
            <div className="flex flex-wrap gap-1.5">
              {EYE_STYLES.map((ey) => (
                <button
                  key={ey.id}
                  type="button"
                  onClick={() => onCustomize({ eyeStyle: ey.id })}
                  className={`px-3 py-1.5 rounded-xl font-bold border-2 ${
                    loadout.eyeStyle === ey.id
                      ? 'bg-amber-800 text-amber-50 border-amber-950'
                      : 'bg-amber-50 text-amber-950 border-amber-900/35'
                  }`}
                >
                  {ey.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </NativeDialog>
  );
};
