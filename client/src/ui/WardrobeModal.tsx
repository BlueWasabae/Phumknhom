import React, { useState } from 'react';
import type { EquippedLoadout } from '@shared/types';
import {
  ALL_EYE_STYLES,
  ALL_FACE_STYLES,
  ALL_HAIR_STYLES,
  EYE_COLORS,
  EYEBROW_STYLES,
  HAIR_COLORS,
  SKIN_TONES,
} from '@shared/characterStyles';
import { RotateCcw, RotateCw } from 'lucide-react';
import type { PaperDollFacing } from '../game/entities/PaperDoll';
import { NativeDialog } from './NativeDialog';
import { PaperDollPreview } from './PaperDollPreview';

interface WardrobeModalProps {
  open: boolean;
  loadout: EquippedLoadout;
  ownedItemIds?: Set<string>;
  onClose: () => void;
  onCustomize: (patch: Partial<EquippedLoadout>) => void;
}

const FACINGS: PaperDollFacing[] = ['down', 'right', 'up', 'left'];

export const WardrobeModal: React.FC<WardrobeModalProps> = ({
  open,
  loadout,
  ownedItemIds,
  onClose,
  onCustomize,
}) => {
  const [facingIdx, setFacingIdx] = useState(0);
  const owns = (itemId?: string) => !itemId || Boolean(ownedItemIds?.has(itemId));

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="Fashion Boutique · Mirror & Hair Salon"
      subtitle="Customize skin tone, hair, eyes, eyebrows & expression live!"
      maxWidthClass="w-[min(95vw,660px)]"
    >
      <div className="grid sm:grid-cols-[180px_1fr] gap-4 items-start">
        <div className="flex flex-col items-center gap-2">
          <PaperDollPreview
            loadout={loadout}
            width={168}
            height={168}
            includePet
            facing={FACINGS[facingIdx]}
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setFacingIdx((i) => (i + 3) % 4)}
              className="phum-btn px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Turn
            </button>
            <button
              type="button"
              onClick={() => setFacingIdx((i) => (i + 1) % 4)}
              className="phum-btn px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1"
            >
              Turn <RotateCw className="w-3 h-3" />
            </button>
          </div>
          <span className="text-[11px] font-bold text-amber-900">Updates in Village Live!</span>
        </div>

        <div className="space-y-3 text-xs max-h-[56dvh] overflow-y-auto pr-1">
          <div>
            <div className="font-display font-bold text-amber-950 mb-1">Skin Tone</div>
            <div className="flex flex-wrap gap-1.5">
              {SKIN_TONES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  title={s.label}
                  onClick={() => onCustomize({ skinTone: s.id, skinColor: s.hex })}
                  style={{ backgroundColor: s.hex }}
                  aria-label={`Skin ${s.label}`}
                  className={`w-7 h-7 rounded-full border-2 transition ${
                    loadout.skinColor === s.hex || loadout.skinTone === s.id
                      ? 'border-amber-950 scale-110 ring-2 ring-amber-500'
                      : 'border-amber-900/40'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="font-display font-bold text-amber-950 mb-1">Hair Style &amp; Color</div>
            <div className="flex flex-wrap gap-1">
              {ALL_HAIR_STYLES.map((h) => {
                const unlocked = owns(h.premiumItemId);
                return (
                  <button
                    key={h.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() =>
                      onCustomize({
                        hairStyle: h.id,
                        hair: h.premiumItemId ?? null,
                      })
                    }
                    className={`px-2.5 py-1 rounded-xl font-bold border-2 text-[11px] disabled:opacity-45 ${
                      loadout.hairStyle === h.id
                        ? 'bg-amber-800 text-amber-50 border-amber-950'
                        : 'bg-amber-50 text-amber-950 border-amber-900/35'
                    }`}
                  >
                    {h.premiumItemId ? `★ ${h.label}` : h.label}
                    {!unlocked ? ' 🔒' : ''}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {HAIR_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  onClick={() => onCustomize({ hairColor: c.hex })}
                  style={{ backgroundColor: c.hex }}
                  aria-label={`Hair color ${c.label}`}
                  className={`w-6 h-6 rounded-full border-2 transition ${
                    loadout.hairColor === c.hex
                      ? 'border-amber-950 scale-110 ring-2 ring-amber-500'
                      : 'border-amber-900/40'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="font-display font-bold text-amber-950 mb-1">Eyes &amp; Color</div>
            <div className="flex flex-wrap gap-1">
              {ALL_EYE_STYLES.map((ey) => {
                const unlocked = owns(ey.premiumItemId);
                return (
                  <button
                    key={ey.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => onCustomize({ eyeStyle: ey.id })}
                    className={`px-2.5 py-1 rounded-xl font-bold border-2 text-[11px] disabled:opacity-45 ${
                      loadout.eyeStyle === ey.id
                        ? 'bg-amber-800 text-amber-50 border-amber-950'
                        : 'bg-amber-50 text-amber-950 border-amber-900/35'
                    }`}
                  >
                    {ey.premiumItemId ? `★ ${ey.label}` : ey.label}
                    {!unlocked ? ' 🔒' : ''}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {EYE_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  onClick={() => onCustomize({ eyeColor: c.hex })}
                  style={{ backgroundColor: c.hex }}
                  aria-label={`Eye color ${c.label}`}
                  className={`w-6 h-6 rounded-full border-2 transition ${
                    loadout.eyeColor === c.hex
                      ? 'border-amber-950 scale-110 ring-2 ring-amber-500'
                      : 'border-amber-900/40'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="font-display font-bold text-amber-950 mb-1">Eyebrows</div>
            <div className="flex flex-wrap gap-1">
              {EYEBROW_STYLES.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onCustomize({ eyebrowStyle: b.id })}
                  className={`px-2.5 py-1 rounded-xl font-bold border-2 text-[11px] ${
                    loadout.eyebrowStyle === b.id
                      ? 'bg-amber-800 text-amber-50 border-amber-950'
                      : 'bg-amber-50 text-amber-950 border-amber-900/35'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="font-display font-bold text-amber-950 mb-1">Face &amp; Expression</div>
            <div className="flex flex-wrap gap-1">
              {ALL_FACE_STYLES.map((f) => {
                const unlocked = owns(f.premiumItemId);
                return (
                  <button
                    key={f.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => onCustomize({ faceStyle: f.id })}
                    className={`px-2.5 py-1 rounded-xl font-bold border-2 text-[11px] disabled:opacity-45 ${
                      loadout.faceStyle === f.id
                        ? 'bg-amber-800 text-amber-50 border-amber-950'
                        : 'bg-amber-50 text-amber-950 border-amber-900/35'
                    }`}
                  >
                    {f.premiumItemId ? `★ ${f.label}` : f.label}
                    {!unlocked ? ' 🔒' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </NativeDialog>
  );
};
