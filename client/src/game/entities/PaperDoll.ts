import Phaser from 'phaser';
import type { EquippedLoadout } from '@shared/types';
import type { HeroCharacterKey } from '../scenes/BootScene';
import { ITEM_CATALOG } from '../../data/items';

export type PaperDollPose =
  | 'idle'
  | 'walk1'
  | 'walk2'
  | 'walk3'
  | 'walk4'
  | 'jump'
  | 'attack'
  | 'parry';
export type PaperDollFacing = 'down' | 'up' | 'left' | 'right';

const NA_BASE = '/assets/packs/ninja-adventure/Ninja Adventure - Asset Pack';

const CHAR_SHEET_URLS: Record<HeroCharacterKey, string> = {
  char_boy: `${NA_BASE}/Actor/Character/Boy/SpriteSheet.png`,
  char_fighter: `${NA_BASE}/Actor/Character/FighterRed/SpriteSheet.png`,
  char_hunter: `${NA_BASE}/Actor/Character/Hunter/SpriteSheet.png`,
  char_monk: `${NA_BASE}/Actor/Character/Monk/SpriteSheet.png`,
  char_ninja: `${NA_BASE}/Actor/Character/NinjaDark/SpriteSheet.png`,
  char_sultan: `${NA_BASE}/Actor/Character/Sultan/SpriteSheet.png`,
  char_knight: `${NA_BASE}/Actor/Character/KnightGold/SpriteSheet.png`,
  char_princess: `${NA_BASE}/Actor/Character/Princess/SpriteSheet.png`,
  char_master: `${NA_BASE}/Actor/Character/Master/SpriteSheet.png`,
};

const WEAPON_URLS: Record<string, string> = {
  wp_axe: `${NA_BASE}/Items/Weapons/Axe/SpriteInHand.png`,
  wp_bigsword: `${NA_BASE}/Items/Weapons/BigSword/SpriteInHand.png`,
  wp_sword2: `${NA_BASE}/Items/Weapons/Sword2/SpriteInHand.png`,
  wp_bow: `${NA_BASE}/Items/Weapons/Bow/Sprite.png`,
  wp_bow2: `${NA_BASE}/Items/Weapons/Bow2/Sprite.png`,
  wp_book: `${NA_BASE}/Items/Weapons/Book/SpriteInHand.png`,
  wp_whip: `${NA_BASE}/Items/Weapons/Whip/SpriteInHand.png`,
  wp_lance2: `${NA_BASE}/Items/Weapons/Lance2/SpriteInHand.png`,
  wp_sai: `${NA_BASE}/Items/Weapons/Sai/SpriteInHand.png`,
  wp_club: `${NA_BASE}/Items/Weapons/Club/SpriteInHand.png`,
};

const previewImgCache = new Map<string, HTMLImageElement>();
function getCachedHtmlImg(url: string): HTMLImageElement | null {
  let img = previewImgCache.get(url);
  if (!img && typeof Image !== 'undefined') {
    img = new Image();
    img.src = url;
    previewImgCache.set(url, img);
  }
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

/**
 * Maps equipped wardrobe shirt / Khmer class loadout to a real 16x16 Ninja Adventure chibi sheet.
 */
export function resolveHeroSheetKey(loadout: EquippedLoadout): HeroCharacterKey {
  if (loadout.shirt === 'shirt_kny_royal') return 'char_knight';
  if (loadout.shirt === 'shirt_cyber_apsara') return 'char_princess';
  if (loadout.shirt === 'shirt_lbokator_gi') return 'char_fighter';
  if (loadout.shirt === 'shirt_achar_robe') return 'char_monk';
  if (loadout.shirt === 'shirt_shadow_cloak') return 'char_ninja';
  if (loadout.shirt === 'shirt_krama_set') return 'char_sultan';

  const weaponDef = loadout.weapon ? ITEM_CATALOG[loadout.weapon] : undefined;
  const cls = weaponDef?.classId;
  if (cls === 'archer') return 'char_hunter';
  if (cls === 'mystic') return 'char_monk';
  if (cls === 'shadow') return 'char_ninja';
  if (cls === 'tamer') return 'char_princess';
  if (loadout.weapon === 'weapon_preah_khan' || loadout.weapon === 'weapon_evolving_angkor_blade') {
    return 'char_fighter';
  }
  return 'char_boy';
}

/**
 * Maps equipped Khmer weapon to a real Ninja Adventure weapon sprite key & optional elemental tint.
 */
export function resolveWeaponSprite(weaponId: string | null): { key: string; tint?: number } | null {
  if (!weaponId) return null;
  if (weaponId === 'weapon_preah_khan') return { key: 'wp_bigsword', tint: 0xfacc15 };
  if (weaponId === 'weapon_evolving_angkor_blade') return { key: 'wp_sword2', tint: 0xfde047 };
  if (weaponId === 'weapon_golden_riel_shot') return { key: 'wp_bow2', tint: 0xfacc15 };
  if (weaponId === 'weapon_thnu') return { key: 'wp_bow' };
  if (
    weaponId === 'weapon_fractured_yant_tome' ||
    weaponId === 'weapon_celestial_yant_tome' ||
    weaponId === 'weapon_sastra'
  ) {
    return { key: 'wp_book', tint: weaponId === 'weapon_sastra' ? undefined : 0xfde047 };
  }
  if (weaponId === 'weapon_frost_fang_singha') return { key: 'wp_sai', tint: 0x7dd3fc };
  if (weaponId === 'weapon_kambet' || weaponId === 'weapon_naga_fang' || weaponId === 'weapon_reality_rip_blade') {
    return { key: 'wp_sai', tint: weaponId === 'weapon_reality_rip_blade' ? 0xe879f9 : undefined };
  }
  if (weaponId === 'weapon_hanuman_banner') return { key: 'wp_lance2', tint: 0xfacc15 };
  if (weaponId === 'weapon_krama_whip' || weaponId === 'weapon_evolving_angkor_relic') {
    return { key: 'wp_whip' };
  }
  if (weaponId === 'weapon_golden_pan') return { key: 'wp_club', tint: 0xfacc15 };
  if (weaponId === 'weapon_stone_club') return { key: 'wp_club' };
  return { key: 'wp_axe' };
}

/**
 * Computes exact 16x16 frame index inside Ninja Adventure 4x7 SpriteSheet (64x112):
 * Col 0=down, 1=up, 2=left, 3=right | Rows 0..3=walk, Row 4=attack, Row 5=jump
 */
function frameIndexFor(pose: PaperDollPose, facing: PaperDollFacing): number {
  const col = facing === 'down' ? 0 : facing === 'up' ? 1 : facing === 'left' ? 2 : 3;
  if (pose === 'attack' || pose === 'parry') return 16 + col;
  if (pose === 'jump') return 20 + col;
  if (pose === 'walk1') return 4 + col;
  if (pose === 'walk2') return 8 + col;
  if (pose === 'walk3') return 12 + col;
  return col;
}

/**
 * Draws the REAL Ninja Adventure chibi sprite + real weapon sprite onto React UI preview canvases
 * (ProfileModal, Wardrobe, PlayerActionModal). Zero procedural rectangles!
 */
export function drawFullPaperDollToCanvas(
  ctx: CanvasRenderingContext2D,
  loadout: EquippedLoadout,
  pose: PaperDollPose = 'idle',
  facing: PaperDollFacing = 'down',
  timeMs = 0
): void {
  const sheetKey = resolveHeroSheetKey(loadout);
  const charImg = getCachedHtmlImg(CHAR_SHEET_URLS[sheetKey]);
  const weaponInfo = resolveWeaponSprite(loadout.weapon);
  const weaponImg = weaponInfo ? getCachedHtmlImg(WEAPON_URLS[weaponInfo.key]) : null;
  const bob = Math.sin(timeMs / 320) > 0.25 ? -1 : 0;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  // Soft ground shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
  ctx.beginPath();
  ctx.ellipse(32, 60, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (charImg) {
    const col = facing === 'down' ? 0 : facing === 'up' ? 1 : facing === 'left' ? 2 : 3;
    const row = pose === 'walk1' ? 1 : pose === 'walk2' ? 2 : pose === 'walk3' ? 3 : 0;
    ctx.drawImage(charImg, col * 16, row * 16, 16, 16, 10, 16 + bob, 44, 44);
  }
  if (weaponImg) {
    ctx.save();
    ctx.translate(48, 42 + bob);
    ctx.rotate(-0.35);
    ctx.drawImage(weaponImg, -weaponImg.width, -weaponImg.height * 1.4, weaponImg.width * 2.2, weaponImg.height * 2.2);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * REAL Ninja Adventure 16x16 Animated Chibi Character Container + Real Held Weapon Sprite.
 * Replaces all procedural body/face/hat rectangles with crisp pixelArt:true sprites!
 */
export class PaperDoll extends Phaser.GameObjects.Container {
  private heroSprite: Phaser.GameObjects.Sprite;
  private weaponSprite: Phaser.GameObjects.Image;
  private auraGlow: Phaser.GameObjects.Image;
  private parryArc: Phaser.GameObjects.Arc;

  private loadout: EquippedLoadout;
  private currentSheet: HeroCharacterKey;
  private currentPose: PaperDollPose = 'idle';
  private currentFacing: PaperDollFacing = 'down';
  private isStealth = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    loadout: EquippedLoadout,
    _keyPrefix = 'paperdoll'
  ) {
    super(scene, x, y);
    this.loadout = { ...loadout };
    this.currentSheet = resolveHeroSheetKey(loadout);

    // Subtle back aura when magical wings/halo are equipped
    this.auraGlow = scene.add
      .image(0, -18, 'torch_glow')
      .setScale(0.36)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);

    // Real 16x16 Ninja Adventure Chibi Sprite scaled crisply 2.5x inside container
    this.heroSprite = scene.add
      .sprite(0, 0, this.currentSheet, 0)
      .setOrigin(0.5, 0.94)
      .setScale(2.5);
    console.log(`[PaperDoll] Loaded sprite key: ${this.currentSheet}`);

    // Real Ninja Adventure Weapon Sprite positioned at character's hand
    this.weaponSprite = scene.add
      .image(14, -14, 'wp_axe')
      .setOrigin(0.5, 0.8)
      .setScale(2.15)
      .setVisible(false);

    // Golden Angkor Parry Guard arc (visible only during 0.35s Preah Khan parry!)
    this.parryArc = scene.add
      .arc(12, -16, 22, -70, 70, false, 0xfacc15, 0.35)
      .setStrokeStyle(3, 0xfef9c3, 1)
      .setVisible(false);

    this.add([this.auraGlow, this.heroSprite, this.weaponSprite, this.parryArc]);
    this.applyVisualLoadout();
    scene.add.existing(this);
  }

  private applyVisualLoadout(): void {
    const nextSheet = resolveHeroSheetKey(this.loadout);
    if (nextSheet !== this.currentSheet && this.scene.textures.exists(nextSheet)) {
      this.currentSheet = nextSheet;
      this.heroSprite.setTexture(nextSheet, frameIndexFor(this.currentPose, this.currentFacing));
      console.log(`[PaperDoll] Loaded sprite key: ${this.currentSheet}`);
    }

    // Real held weapon sprite
    const wInfo = resolveWeaponSprite(this.loadout.weapon);
    if (wInfo && this.scene.textures.exists(wInfo.key)) {
      this.weaponSprite.setTexture(wInfo.key).setVisible(true);
      if (wInfo.tint) this.weaponSprite.setTint(wInfo.tint);
      else this.weaponSprite.clearTint();
    } else {
      this.weaponSprite.setVisible(false);
    }

    // Subtle additive wing/halo aura when legendary back cosmetic equipped
    const wingDef = this.loadout.wings ? ITEM_CATALOG[this.loadout.wings] : undefined;
    if (wingDef && wingDef.styleVariant !== 'basket') {
      const tintNum = Number(wingDef.primaryColor.replace('#', '0x'));
      this.auraGlow.setTint(Number.isFinite(tintNum) ? tintNum : 0xfacc15).setAlpha(0.5).setVisible(true);
    } else {
      this.auraGlow.setVisible(false);
    }
  }

  public setLoadout(next: EquippedLoadout): void {
    this.loadout = { ...next };
    this.applyVisualLoadout();
  }

  public setPoseAndFacing(pose: PaperDollPose, facing: PaperDollFacing, time: number): void {
    this.currentPose = pose;
    this.currentFacing = facing;

    const isWalking = pose === 'walk1' || pose === 'walk2' || pose === 'walk3' || pose === 'walk4';
    const walkAnimKey = `${this.currentSheet}_walk_${facing}`;

    if (isWalking && this.scene.anims.exists(walkAnimKey)) {
      if (this.heroSprite.anims.currentAnim?.key !== walkAnimKey || !this.heroSprite.anims.isPlaying) {
        this.heroSprite.play(walkAnimKey, true);
      }
    } else {
      if (this.heroSprite.anims.isPlaying) {
        this.heroSprite.stop();
      }
      this.heroSprite.setFrame(frameIndexFor(pose, facing));
    }

    // Crisp 1px idle breathing bob
    const idleBob = !isWalking && pose === 'idle' ? (Math.sin(time / 340) > 0.25 ? -1 : 0) : 0;
    this.heroSprite.setY(idleBob);

    // Position real held weapon cleanly at the character's right hand & swing on attack!
    const dir = facing === 'left' ? -1 : 1;
    const isUp = facing === 'up';
    const handX = facing === 'down' ? 14 : facing === 'up' ? -14 : dir * 16;
    const handY = (pose === 'attack' ? -16 : -12) + idleBob;

    this.weaponSprite.setPosition(handX, handY);
    this.weaponSprite.setFlipX(dir < 0);
    this.weaponSprite.setDepth(isUp ? -1 : 2);
    if (pose === 'attack') {
      this.weaponSprite.setRotation(dir * 1.15);
    } else if (pose === 'parry') {
      this.weaponSprite.setRotation(dir * -0.15);
    } else {
      this.weaponSprite.setRotation(dir * -0.28 + (isWalking ? Math.sin(time / 120) * 0.14 : 0));
    }

    this.parryArc.setVisible(pose === 'parry');
    if (pose === 'parry') {
      this.parryArc.setPosition(dir * 14, -18).setScale(dir, 1);
    }
  }

  public setStealthTint(stealthFull: boolean): void {
    this.isStealth = stealthFull;
    if (stealthFull) {
      this.heroSprite.setTint(0xc084fc);
      this.weaponSprite.setTint(0xc084fc);
      this.setAlpha(0.48);
    } else {
      this.heroSprite.clearTint();
      const wInfo = resolveWeaponSprite(this.loadout.weapon);
      if (wInfo?.tint) this.weaponSprite.setTint(wInfo.tint);
      else this.weaponSprite.clearTint();
      this.setAlpha(1);
    }
  }

  public flashWhite(durationMs = 110): void {
    this.heroSprite.setTintFill(0xffffff);
    this.weaponSprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(durationMs, () => {
      if (!this.scene) return;
      this.setStealthTint(this.isStealth);
    });
  }
}
