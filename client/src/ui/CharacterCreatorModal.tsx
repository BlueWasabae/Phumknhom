import React, { useEffect, useRef, useState } from 'react';
import { DEFAULT_LOADOUT, type EquippedLoadout, type KhmerClassId, type PlayerState } from '@shared/types';
import {
  EYE_COLORS,
  EYEBROW_STYLES,
  FREE_EYE_STYLES,
  FREE_FACE_STYLES,
  FREE_HAIR_STYLES,
  HAIR_COLORS,
  SKIN_TONES,
  STARTER_OUTFITS,
  normalizeEyeStyleId,
  normalizeEyebrowStyleId,
  normalizeFaceStyleId,
  normalizeHairStyleId,
  resolveSkinToneDef,
  type StarterOutfitId,
} from '@shared/characterStyles';
import { KHMER_CLASSES, KHMER_CLASS_LIST } from '@shared/khmerClasses';
import {
  Dices,
  Palette,
  RotateCcw,
  RotateCw,
  Sparkles,
  Swords,
} from 'lucide-react';
import type { PaperDollFacing } from '../game/entities/PaperDoll';
import { soundManager } from '../game/systems/SoundManager';
import { NativeDialog } from './NativeDialog';
import { PaperDollPreview } from './PaperDollPreview';

export interface CharacterCreationResult {
  name: string;
  loadout: EquippedLoadout;
  selectedClass: KhmerClassId;
  starterWeaponId: string;
}

interface CharacterCreatorModalProps {
  open: boolean;
  initialPlayer: PlayerState;
  onConfirm: (result: CharacterCreationResult) => void;
}

const FACING_ORDER: PaperDollFacing[] = ['down', 'right', 'up', 'left'];
const FACING_LABELS: Record<PaperDollFacing, string> = {
  down: 'Front',
  right: 'Right Side',
  up: 'Back',
  left: 'Left Side',
};

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const CharacterCreatorModal: React.FC<CharacterCreatorModalProps> = ({
  open,
  initialPlayer,
  onConfirm,
}) => {
  const sanitizeDraftLoadout = (raw?: Partial<EquippedLoadout> | null): EquippedLoadout => {
    const merged = { ...DEFAULT_LOADOUT, ...(raw ?? {}) };
    const skin = resolveSkinToneDef(merged.skinTone || merged.skinColor);
    return {
      ...merged,
      skinTone: skin.id,
      skinColor: skin.hex,
      hairStyle: normalizeHairStyleId(merged.hairStyle),
      eyeStyle: normalizeEyeStyleId(merged.eyeStyle),
      eyebrowStyle: normalizeEyebrowStyleId(merged.eyebrowStyle),
      faceStyle: normalizeFaceStyleId(merged.faceStyle),
      hat: null,
      hair: null,
      pet: null,
      petId: null,
    };
  };

  const [tab, setTab] = useState<'appearance' | 'class'>('appearance');
  const [facingIdx, setFacingIdx] = useState(0);
  const [walkPreview, setWalkPreview] = useState(false);
  const [name, setName] = useState(initialPlayer?.name || 'PhumHero');
  const [selectedClass, setSelectedClass] = useState<KhmerClassId>(
    initialPlayer?.activeClass && initialPlayer.activeClass in KHMER_CLASSES
      ? initialPlayer.activeClass
      : 'lbokator'
  );
  const [draftLoadout, setDraftLoadout] = useState<EquippedLoadout>(() =>
    sanitizeDraftLoadout(initialPlayer?.loadout)
  );

  const wasOpenRef = useRef(false);
  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened) return;
    setTab('appearance');
    setFacingIdx(0);
    setName(initialPlayer?.name || 'PhumHero');
    setSelectedClass(
      initialPlayer?.activeClass && initialPlayer.activeClass in KHMER_CLASSES
        ? initialPlayer.activeClass
        : 'lbokator'
    );
    setDraftLoadout(sanitizeDraftLoadout(initialPlayer?.loadout));
  }, [open, initialPlayer]);

  const facing = FACING_ORDER[facingIdx];
  const activeClassDef = KHMER_CLASSES[selectedClass] ?? KHMER_CLASSES.lbokator;

  const handleSelectOutfit = (outfitId: StarterOutfitId) => {
    const def = STARTER_OUTFITS.find((o) => o.id === outfitId);
    if (!def) return;
    soundManager.playSfx('click');
    setDraftLoadout((prev) => ({
      ...prev,
      starterOutfit: def.id,
      shirt: def.shirtId,
      pants: def.pantsId,
      hat: null,
    }));
  };

  const handleSelectClass = (classId: KhmerClassId) => {
    const def = KHMER_CLASSES[classId];
    soundManager.playSfx('click');
    setSelectedClass(classId);
    setDraftLoadout((prev) => ({
      ...prev,
      weapon: def.starterWeaponId,
    }));
  };

  const handleRandomize = () => {
    soundManager.playSfx('click');
    const skin = pickRandom(SKIN_TONES);
    const hair = pickRandom(FREE_HAIR_STYLES);
    const hairCol = pickRandom(HAIR_COLORS);
    const eye = pickRandom(FREE_EYE_STYLES);
    const eyeCol = pickRandom(EYE_COLORS);
    const brow = pickRandom(EYEBROW_STYLES);
    const face = pickRandom(FREE_FACE_STYLES);
    const outfit = pickRandom(STARTER_OUTFITS);
    setDraftLoadout((prev) => ({
      ...prev,
      skinTone: skin.id,
      skinColor: skin.hex,
      hairStyle: hair.id,
      hair: null,
      hairColor: hairCol.hex,
      eyeStyle: eye.id,
      eyeColor: eyeCol.hex,
      eyebrowStyle: brow.id,
      faceStyle: face.id,
      starterOutfit: outfit.id,
      shirt: outfit.shirtId,
      pants: outfit.pantsId,
      hat: null,
    }));
  };

  const handleSubmit = () => {
    const cleanName = name.trim().slice(0, 20) || initialPlayer.name || 'PhumHero';
    soundManager.playSfx('level_up');
    onConfirm({
      name: cleanName,
      loadout: {
        ...draftLoadout,
        weapon: activeClassDef.starterWeaponId,
        pet: null,
        petId: null,
        hasCompletedCreation: true,
      },
      selectedClass,
      starterWeaponId: activeClassDef.starterWeaponId,
    });
  };

  return (
    <NativeDialog
      open={open}
      onClose={() => {
        /* Keep Pre-Game Character Creator open until player clicks "Enter ភូមិខ្ញុំ" */
      }}
      title="ភូមិខ្ញុំ · Create Your Hero"
      subtitle="Customize your Human Chibi look and pick your Khmer Fighting Class before entering Phum Village!"
      maxWidthClass="w-[min(96vw,840px)]"
    >
      <div className="grid md:grid-cols-[248px_1fr] gap-4 items-start text-xs">
        {/* LEFT / TOP: Live Zoomed Preview + Rotate + Name + Randomize */}
        <div className="flex flex-col items-center gap-2.5 p-3 rounded-2xl bg-amber-50/90 border-2 border-amber-900/35">
          <div className="relative">
            <PaperDollPreview
              loadout={draftLoadout}
              width={196}
              height={196}
              includePet={false}
              facing={facing}
              pose={walkPreview ? 'walk1' : 'idle'}
            />
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-100 font-display font-bold text-[10px] whitespace-nowrap">
              {FACING_LABELS[facing]}
            </span>
          </div>

          <div className="flex items-center gap-1.5 w-full justify-center">
            <button
              type="button"
              onClick={() => {
                soundManager.playSfx('click');
                setFacingIdx((i) => (i + FACING_ORDER.length - 1) % FACING_ORDER.length);
              }}
              className="phum-btn px-2.5 py-1.5 rounded-xl font-display font-bold text-[11px] flex items-center gap-1"
              title="Rotate Character Left"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Left
            </button>
            <button
              type="button"
              onClick={() => setWalkPreview((w) => !w)}
              className={`px-2.5 py-1.5 rounded-xl font-display font-bold text-[11px] border-2 transition ${
                walkPreview
                  ? 'bg-emerald-700 text-white border-emerald-950'
                  : 'bg-amber-100 text-amber-950 border-amber-900/35'
              }`}
            >
              {walkPreview ? 'Stride' : 'Idle'}
            </button>
            <button
              type="button"
              onClick={() => {
                soundManager.playSfx('click');
                setFacingIdx((i) => (i + 1) % FACING_ORDER.length);
              }}
              className="phum-btn px-2.5 py-1.5 rounded-xl font-display font-bold text-[11px] flex items-center gap-1"
              title="Rotate Character Right"
            >
              Right <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-full space-y-1">
            <label
              htmlFor="phum-creator-name"
              className="block font-display font-bold text-[11px] text-amber-950"
            >
              Character Name
            </label>
            <input
              id="phum-creator-name"
              type="text"
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. SovannHero"
              className="w-full px-3 py-1.5 rounded-xl bg-white border-2 border-amber-900/35 font-bold text-xs text-amber-950 focus:outline-none focus:border-amber-700"
            />
          </div>

          <div className="w-full p-2 rounded-xl bg-amber-100/80 border border-amber-900/25 text-center space-y-0.5">
            <div className="text-[10px] font-bold uppercase text-amber-800">Selected Class</div>
            <div className="font-display font-bold text-xs text-amber-950">
              {activeClassDef.englishName} · {activeClassDef.starterWeaponName}
            </div>
            <div className="text-[10px] text-amber-900">{activeClassDef.khmerName}</div>
          </div>

          <button
            type="button"
            onClick={handleRandomize}
            className="w-full py-1.5 rounded-xl bg-amber-200 hover:bg-amber-300 border-2 border-amber-900/40 text-amber-950 font-display font-bold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <Dices className="w-4 h-4" /> Randomize Look
          </button>
        </div>

        {/* RIGHT / BOTTOM: Appearance & Class Picker Tabs */}
        <div className="space-y-3 min-w-0">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTab('appearance')}
              className={`py-2 rounded-xl font-display font-bold text-xs border-2 flex items-center justify-center gap-1.5 transition ${
                tab === 'appearance'
                  ? 'bg-amber-800 text-amber-50 border-amber-950'
                  : 'bg-amber-50 text-amber-950 border-amber-900/30 hover:bg-amber-100'
              }`}
            >
              <Palette className="w-4 h-4" /> 1. Appearance
            </button>
            <button
              type="button"
              onClick={() => setTab('class')}
              className={`py-2 rounded-xl font-display font-bold text-xs border-2 flex items-center justify-center gap-1.5 transition ${
                tab === 'class'
                  ? 'bg-emerald-800 text-amber-50 border-emerald-950'
                  : 'bg-amber-50 text-amber-950 border-amber-900/30 hover:bg-amber-100'
              }`}
            >
              <Swords className="w-4 h-4" /> 2. Khmer Class
            </button>
          </div>

          {tab === 'appearance' && (
            <div className="space-y-3 max-h-[52dvh] overflow-y-auto pr-1">
              {/* Skin Tone (6) */}
              <div>
                <div className="font-display font-bold text-amber-950 mb-1">Skin Tone (6)</div>
                <div className="flex flex-wrap gap-1.5">
                  {SKIN_TONES.map((s) => {
                    const active = draftLoadout.skinTone === s.id || draftLoadout.skinColor === s.hex;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          soundManager.playSfx('click');
                          setDraftLoadout((p) => ({ ...p, skinTone: s.id, skinColor: s.hex }));
                        }}
                        className={`px-2 py-1 rounded-xl border-2 flex items-center gap-1.5 text-[11px] font-bold transition ${
                          active
                            ? 'bg-amber-800 text-amber-50 border-amber-950'
                            : 'bg-amber-50 text-amber-950 border-amber-900/30 hover:bg-amber-100'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-amber-950/50 shrink-0"
                          style={{ backgroundColor: s.hex }}
                        />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hair Style (8) + Hair Color (8) */}
              <div className="space-y-1.5">
                <div className="font-display font-bold text-amber-950">Hair Style (8)</div>
                <div className="flex flex-wrap gap-1.5">
                  {FREE_HAIR_STYLES.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => {
                        soundManager.playSfx('click');
                        setDraftLoadout((p) => ({ ...p, hairStyle: h.id, hair: null }));
                      }}
                      className={`px-2.5 py-1 rounded-xl border-2 text-[11px] font-bold transition ${
                        draftLoadout.hairStyle === h.id
                          ? 'bg-amber-800 text-amber-50 border-amber-950'
                          : 'bg-amber-50 text-amber-950 border-amber-900/30 hover:bg-amber-100'
                      }`}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] font-bold text-amber-900 mr-1">Hair Color:</span>
                  {HAIR_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      title={c.label}
                      aria-label={`Hair color ${c.label}`}
                      onClick={() => {
                        soundManager.playSfx('click');
                        setDraftLoadout((p) => ({ ...p, hairColor: c.hex }));
                      }}
                      style={{ backgroundColor: c.hex }}
                      className={`w-6 h-6 rounded-full border-2 transition ${
                        draftLoadout.hairColor === c.hex
                          ? 'border-amber-950 scale-110 ring-2 ring-amber-500'
                          : 'border-amber-900/40'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Eye Style (6) + Eye Color (6) */}
              <div className="space-y-1.5">
                <div className="font-display font-bold text-amber-950">Eyes (6) &amp; Color</div>
                <div className="flex flex-wrap gap-1.5">
                  {FREE_EYE_STYLES.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        soundManager.playSfx('click');
                        setDraftLoadout((p) => ({ ...p, eyeStyle: e.id }));
                      }}
                      className={`px-2.5 py-1 rounded-xl border-2 text-[11px] font-bold transition ${
                        draftLoadout.eyeStyle === e.id
                          ? 'bg-amber-800 text-amber-50 border-amber-950'
                          : 'bg-amber-50 text-amber-950 border-amber-900/30 hover:bg-amber-100'
                      }`}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] font-bold text-amber-900 mr-1">Eye Color:</span>
                  {EYE_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      title={c.label}
                      aria-label={`Eye color ${c.label}`}
                      onClick={() => {
                        soundManager.playSfx('click');
                        setDraftLoadout((p) => ({ ...p, eyeColor: c.hex }));
                      }}
                      style={{ backgroundColor: c.hex }}
                      className={`w-6 h-6 rounded-full border-2 transition ${
                        draftLoadout.eyeColor === c.hex
                          ? 'border-amber-950 scale-110 ring-2 ring-amber-500'
                          : 'border-amber-900/40'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Eyebrows (5) */}
              <div>
                <div className="font-display font-bold text-amber-950 mb-1">Eyebrows (5)</div>
                <div className="flex flex-wrap gap-1.5">
                  {EYEBROW_STYLES.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        soundManager.playSfx('click');
                        setDraftLoadout((p) => ({ ...p, eyebrowStyle: b.id }));
                      }}
                      className={`px-2.5 py-1 rounded-xl border-2 text-[11px] font-bold transition ${
                        draftLoadout.eyebrowStyle === b.id
                          ? 'bg-amber-800 text-amber-50 border-amber-950'
                          : 'bg-amber-50 text-amber-950 border-amber-900/30 hover:bg-amber-100'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Face / Mouth (5) */}
              <div>
                <div className="font-display font-bold text-amber-950 mb-1">Face &amp; Expression (5)</div>
                <div className="flex flex-wrap gap-1.5">
                  {FREE_FACE_STYLES.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        soundManager.playSfx('click');
                        setDraftLoadout((p) => ({ ...p, faceStyle: f.id }));
                      }}
                      className={`px-2.5 py-1 rounded-xl border-2 text-[11px] font-bold transition ${
                        draftLoadout.faceStyle === f.id
                          ? 'bg-amber-800 text-amber-50 border-amber-950'
                          : 'bg-amber-50 text-amber-950 border-amber-900/30 hover:bg-amber-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Starter Outfits (4) */}
              <div>
                <div className="font-display font-bold text-amber-950 mb-1">Starter Outfit (4)</div>
                <div className="grid sm:grid-cols-2 gap-1.5">
                  {STARTER_OUTFITS.map((o) => {
                    const active = draftLoadout.starterOutfit === o.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => handleSelectOutfit(o.id)}
                        className={`p-2 rounded-xl border-2 text-left flex items-center gap-2 transition ${
                          active
                            ? 'bg-amber-800 text-amber-50 border-amber-950'
                            : 'bg-amber-50 text-amber-950 border-amber-900/30 hover:bg-amber-100'
                        }`}
                      >
                        <span
                          className="w-6 h-6 rounded-lg border border-amber-950/40 shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${o.previewColor} 60%, ${o.accentColor} 60%)`,
                          }}
                        />
                        <div className="min-w-0">
                          <div className="font-display font-bold text-[11px] truncate">{o.label}</div>
                          <div
                            className={`text-[10px] truncate ${
                              active ? 'text-amber-200' : 'text-amber-800'
                            }`}
                          >
                            {o.khmerLabel}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'class' && (
            <div className="space-y-2 max-h-[52dvh] overflow-y-auto pr-1">
              {KHMER_CLASS_LIST.map((cls) => {
                const active = selectedClass === cls.id;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => handleSelectClass(cls.id)}
                    className={`w-full p-2.5 rounded-xl border-2 text-left transition ${
                      active
                        ? 'bg-emerald-900/95 text-amber-50 border-amber-400 shadow'
                        : 'bg-amber-50 text-amber-950 border-amber-900/30 hover:bg-amber-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-display font-bold text-xs flex items-center gap-1.5">
                          <span>{cls.englishName}</span>
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
                            style={{ backgroundColor: cls.badgeBg }}
                          >
                            {cls.role}
                          </span>
                        </div>
                        <div className={`text-[10px] ${active ? 'text-amber-200' : 'text-amber-800'}`}>
                          {cls.khmerName} · Weapon: <strong>{cls.starterWeaponName}</strong> ({cls.starterWeaponKhmer})
                        </div>
                      </div>
                      {active && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 font-display font-bold text-[10px] shrink-0">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] mt-1 leading-snug ${active ? 'text-amber-100' : 'text-amber-900/90'}`}>
                      <strong>{cls.mechanicTitle}:</strong> {cls.mechanicSummary}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Confirm CTA */}
          <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-amber-900/20">
            <span className="text-[10px] text-amber-900 font-semibold">
              Tip: Visit the Downtown Fashion Boutique anytime for Premium Sets &amp; Salon Styles!
            </span>
            <button
              type="button"
              onClick={handleSubmit}
              className="phum-btn px-5 py-2.5 rounded-xl font-display font-bold text-sm flex items-center gap-1.5 shadow-md"
            >
              <Sparkles className="w-4 h-4" /> Enter ភូមិខ្ញុំ
            </button>
          </div>
        </div>
      </div>
    </NativeDialog>
  );
};
