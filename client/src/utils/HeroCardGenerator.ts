import type { PlayerState } from '@shared/types';
import { KHMER_CLASSES } from '@shared/khmerClasses';
import { getPetProgress } from '@shared/petEvolution';
import { getAchievementBadgeIcon } from '@shared/achievements';
import { drawFullPaperDollToCanvas } from '../game/entities/PaperDoll';
import { drawPetToCanvas } from '../game/entities/Pet';
import { ITEM_CATALOG } from '../data/items';

/**
 * Update 3.0 — 1-Click Shareable Hero Card PNG Generator (800x450).
 * Renders a stylized Angkor sunset card featuring the player's customized Human Paper-Doll,
 * Equipped Wings & Evolved Pet, [KROM] Tag, Active Title, Bestiary/Tower/Race stats,
 * and www.bluexacedamy.space branding ready for Facebook, TikTok & Telegram!
 */
export function renderHeroCardDataUrl(player: PlayerState): string {
  const W = 800;
  const H = 450;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Rich Angkor Sunset & Night Temple Gradient Backdrop
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1e1028');
  bg.addColorStop(0.45, '#451a03');
  bg.addColorStop(0.85, '#7c2d12');
  bg.addColorStop(1, '#1c1917');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Warm radial sunset halo behind the hero portrait
  const sunGlow = ctx.createRadialGradient(210, 235, 18, 210, 235, 220);
  sunGlow.addColorStop(0, 'rgba(250, 204, 21, 0.45)');
  sunGlow.addColorStop(0.55, 'rgba(249, 115, 22, 0.18)');
  sunGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, W, H);

  // Subtle Angkor Wat silhouette spires along bottom horizon
  ctx.fillStyle = 'rgba(15, 23, 42, 0.38)';
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, 355);
  ctx.lineTo(75, 355);
  ctx.lineTo(95, 315);
  ctx.lineTo(115, 355);
  ctx.lineTo(185, 355);
  ctx.lineTo(210, 285);
  ctx.lineTo(235, 355);
  ctx.lineTo(310, 355);
  ctx.lineTo(330, 318);
  ctx.lineTo(350, 355);
  ctx.lineTo(W, 355);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();

  // Ornate gilded double border frame
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 14, W - 28, H - 28);
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(22, 22, W - 44, H - 44);

  // 2. Left Hero Stage Pedestal & PaperDoll + Wings + Pet
  ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(42, 62, 290, 326, 22);
  ctx.fill();
  ctx.stroke();

  // Sandstone pedestal shadow under hero
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(196, 336, 76, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Render 10-layer Human Chibi PaperDoll with equipped wings/hat/armor/weapon
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const dollScale = 3.5;
  ctx.translate(196 - 32 * dollScale, 344 - 58 * dollScale);
  ctx.scale(dollScale, dollScale);
  drawFullPaperDollToCanvas(ctx, player.loadout, 'idle', 'down', Date.now());
  ctx.restore();

  // Render Equipped Companion Pet with Stage 1/2/3 visual evolution aura
  if (player.loadout.pet) {
    const petStage = getPetProgress(player, player.loadout.pet).stage;
    drawPetToCanvas(ctx, player.loadout.pet, 102, 302, 2.2, Date.now(), petStage);
  }

  // Class pill at bottom of portrait panel
  const cls = KHMER_CLASSES[player.activeClass];
  ctx.fillStyle = cls.badgeBg;
  ctx.strokeStyle = cls.accentColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(62, 348, 250, 28, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fef9c3';
  ctx.font = 'bold 13px "Fredoka", "Kantumruy Pro", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${cls.khmerName} · ${cls.englishName}`, 187, 362);

  // 3. Right Side: Player Identity, Krom Tag, Title & Hero Stats
  const rx = 362;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Top Header Branding
  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 15px "Fredoka", "Kantumruy Pro", sans-serif';
  ctx.fillText('ភូមិខ្ញុំ · PHUM KHNHOM — HERO CARD v3.0', rx, 44);

  // Player Name + [KROM] Tag + Achievement Badge
  const badgeIcon = getAchievementBadgeIcon(player.equippedBadgeId);
  const displayName = `${badgeIcon ? `${badgeIcon} ` : ''}${player.kromTag ? `[${player.kromTag}] ` : ''}${player.name}`;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px "Fredoka", "Kantumruy Pro", sans-serif';
  ctx.fillText(displayName.slice(0, 24), rx, 72);

  // Active Title & Krom Guild subtitle
  const titleText = player.activeTitle
    ? `👑 ${player.activeTitle}`
    : player.lifeStats.stylish >= 220
      ? '👑 Angkor Royalty'
      : '🌾 Phum Khnhom Adventurer';
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 15px "Fredoka", sans-serif';
  ctx.fillText(
    `${titleText}${player.kromName ? `  ·  🛡️ ${player.kromName}` : ''}`,
    rx,
    112
  );

  // Stat Grid (6 crisp cards)
  const wingDef = player.loadout.wings ? ITEM_CATALOG[player.loadout.wings] : null;
  const petDef = player.loadout.pet ? ITEM_CATALOG[player.loadout.pet] : null;
  const petProg = player.loadout.pet ? getPetProgress(player, player.loadout.pet) : null;

  const statCards: Array<{ label: string; value: string; accent: string }> = [
    { label: 'HERO LEVEL', value: `Lv. ${player.level}`, accent: '#facc15' },
    { label: 'STYLISH SCORE', value: `${player.lifeStats.stylish} ★`, accent: '#f472b6' },
    { label: 'MYTHIC BESTIARY', value: `${player.clearedBosses.length} / 6 Bosses`, accent: '#fb923c' },
    { label: 'PAGODA TOWER', value: `Floor ${player.highestTowerFloor ?? 0} / 50`, accent: '#c084fc' },
    { label: 'FARM & PET RACES', value: `Farm Lv.${player.lifeStats.farmLevel} · ${player.petRaceWins ?? 0}W`, accent: '#4ade80' },
    {
      label: 'COMPANION PET',
      value: petDef ? `${petDef.name.slice(0, 14)} (S${petProg?.stage ?? 1})` : 'None Equipped',
      accent: '#38bdf8',
    },
  ];

  statCards.forEach((sc, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = rx + col * 204;
    const cy = 148 + row * 68;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx, cy, 192, 56, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px "Fredoka", sans-serif';
    ctx.fillText(sc.label, cx + 12, cy + 10);

    ctx.fillStyle = sc.accent;
    ctx.font = 'bold 16px "Fredoka", sans-serif';
    ctx.fillText(sc.value, cx + 12, cy + 27);
  });

  // Equipped Gear Ribbon
  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.beginPath();
  ctx.roundRect(rx, 358, 396, 30, 10);
  ctx.fill();
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 12px "Fredoka", sans-serif';
  const gearSummary = `⚔️ ${player.weapon.name}  ·  🪽 ${wingDef ? wingDef.name : 'Classic Back'}`;
  ctx.fillText(gearSummary.slice(0, 52), rx + 12, 367);

  // Footer Website Branding
  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 14px "Fredoka", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Play Free in Browser → www.bluexacedamy.space', W - 36, H - 44);

  return canvas.toDataURL('image/png');
}

export function downloadHeroCardPng(player: PlayerState): string {
  const dataUrl = renderHeroCardDataUrl(player);
  if (!dataUrl) return '';
  const safeName = player.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 24) || 'PhumHero';
  const link = document.createElement('a');
  link.download = `PhumKhnhom-HeroCard-${safeName}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return dataUrl;
}
