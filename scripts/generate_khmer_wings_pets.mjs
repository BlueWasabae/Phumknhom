/**
 * Update 2.3 — High-Detail 4-Frame Animated Pixel-Art PNG Spritesheet Generator (Zero External Deps)
 * Writes 32-bit RGBA transparent pixel-art PNGs with crisp #2b1b17 1px outlines & multi-tone shading:
 *   - 6 Animated 4-Frame Wings (192x48 = 4x 48x48) -> client/public/assets/khmer/wings/
 *   - 5 Animated 4-Frame Pets  (128x32 = 4x 32x32) -> client/public/assets/khmer/pets/
 * Also updates client/public/assets/khmer/manifest.json cleanly.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const KHMER_DIR = path.join(ROOT, 'client', 'public', 'assets', 'khmer');
const WINGS_DIR = path.join(KHMER_DIR, 'wings');
const PETS_DIR = path.join(KHMER_DIR, 'pets');
const COSMETICS_DIR = path.join(KHMER_DIR, 'cosmetics');
const MANIFEST_PATH = path.join(KHMER_DIR, 'manifest.json');

const OUTLINE = [43, 27, 23, 255]; // #2b1b17

function hex(s, a = 255) {
  const c = s.replace('#', '');
  return [
    parseInt(c.slice(0, 2), 16),
    parseInt(c.slice(2, 4), 16),
    parseInt(c.slice(4, 6), 16),
    a,
  ];
}

// Pure RGBA Pixel Canvas
class PixelCanvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint8Array(w * h * 4);
  }
  set(x, y, col) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || ix >= this.w || iy < 0 || iy >= this.h) return;
    const o = (iy * this.w + ix) * 4;
    this.data[o] = col[0];
    this.data[o + 1] = col[1];
    this.data[o + 2] = col[2];
    this.data[o + 3] = col[3];
  }
  getA(x, y) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return 0;
    return this.data[(y * this.w + x) * 4 + 3];
  }
  rect(x, y, w, h, col) {
    const x0 = Math.round(x);
    const y0 = Math.round(y);
    for (let j = 0; j < Math.round(h); j++) {
      for (let i = 0; i < Math.round(w); i++) {
        this.set(x0 + i, y0 + j, col);
      }
    }
  }
  ellipse(cx, cy, rx, ry, col) {
    const minX = Math.floor(cx - rx - 1);
    const maxX = Math.ceil(cx + rx + 1);
    const minY = Math.floor(cy - ry - 1);
    const maxY = Math.ceil(cy + ry + 1);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const nx = (x - cx) / Math.max(0.5, rx);
        const ny = (y - cy) / Math.max(0.5, ry);
        if (nx * nx + ny * ny <= 1.0) this.set(x, y, col);
      }
    }
  }
  line(x0, y0, x1, y1, col, thickness = 1) {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x0 + (x1 - x0) * t;
      const py = y0 + (y1 - y0) * t;
      if (thickness <= 1) {
        this.set(px, py, col);
      } else {
        this.ellipse(px, py, thickness * 0.55, thickness * 0.55, col);
      }
    }
  }
  poly(pts, col) {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of pts) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const yStart = Math.max(0, Math.floor(minY));
    const yEnd = Math.min(this.h - 1, Math.ceil(maxY));
    for (let y = yStart; y <= yEnd; y++) {
      const nodes = [];
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if ((yi <= y && yj > y) || (yj <= y && yi > y)) {
          nodes.push(xi + ((y - yi) / (yj - yi)) * (xj - xi));
        }
      }
      nodes.sort((a, b) => a - b);
      for (let i = 0; i < nodes.length - 1; i += 2) {
        const x0 = Math.max(0, Math.ceil(nodes[i]));
        const x1 = Math.min(this.w - 1, Math.floor(nodes[i + 1]));
        for (let x = x0; x <= x1; x++) this.set(x, y, col);
      }
    }
  }
  mirrorLeftToRight() {
    const half = Math.floor(this.w / 2);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < half; x++) {
        const src = (y * this.w + x) * 4;
        if (this.data[src + 3] > 0) {
          const dst = (y * this.w + (this.w - 1 - x)) * 4;
          this.data[dst] = this.data[src];
          this.data[dst + 1] = this.data[src + 1];
          this.data[dst + 2] = this.data[src + 2];
          this.data[dst + 3] = this.data[src + 3];
        }
      }
    }
  }
  addOutline(outlineCol = OUTLINE) {
    const snap = new Uint8Array(this.data);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (snap[(y * this.w + x) * 4 + 3] === 0) {
          let touch = false;
          for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < this.w && ny >= 0 && ny < this.h && snap[(ny * this.w + nx) * 4 + 3] >= 160) {
              touch = true;
              break;
            }
          }
          if (touch) this.set(x, y, outlineCol);
        }
      }
    }
  }
  blit(other, dx, dy) {
    for (let y = 0; y < other.h; y++) {
      for (let x = 0; x < other.w; x++) {
        const s = (y * other.w + x) * 4;
        if (other.data[s + 3] > 0) {
          const d = ((dy + y) * this.w + (dx + x)) * 4;
          this.data[d] = other.data[s];
          this.data[d + 1] = other.data[s + 1];
          this.data[d + 2] = other.data[s + 2];
          this.data[d + 3] = other.data[s + 3];
        }
      }
    }
  }
}

// CRC32 & Minimal RFC-2083 PNG Encoder (32-bit RGBA)
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function makeChunk(type, payload) {
  const tBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(payload.length, 0);
  const body = Buffer.concat([tBuf, payload]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePng(canvas) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(canvas.w, 0);
  ihdr.writeUInt32BE(canvas.h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = canvas.w * 4;
  const raw = Buffer.alloc((stride + 1) * canvas.h);
  for (let y = 0; y < canvas.h; y++) {
    raw[y * (stride + 1)] = 0; // filter None
    Buffer.from(canvas.data.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ==================== 6 ANIMATED WINGS (48x48 per frame -> 192x48) ====================

function wingBambooLeaf(frame) {
  const c = new PixelCanvas(48, 48);
  const flap = [0, -3.5, -1, 2.5][frame];
  const spread = [0, 1.8, 0.5, -1.2][frame];
  const cx = 22, cy = 24;
  const fronds = [
    [0, -10 + flap, 19 + spread, -13 + flap * 1.4, '#15803d', '#4ade80'],
    [0, -5 + flap * 0.7, 21 + spread, -5 + flap * 1.1, '#16a34a', '#86efac'],
    [0, 0 + flap * 0.4, 18 + spread * 0.7, 3 + flap * 0.8, '#15803d', '#4ade80'],
    [0, 5 + flap * 0.2, 13 + spread * 0.4, 11 + flap * 0.5, '#166534', '#22c55e'],
  ];
  for (const [ox, oy, tx, ty, mainH, hiH] of fronds) {
    const x0 = cx - ox, y0 = cy + oy;
    const x1 = Math.max(2, cx - tx), y1 = Math.max(3, Math.min(44, cy + ty));
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - 2.4;
    c.poly([[x0, y0 - 2.5], [mx, my - 2.5], [x1, y1], [mx, my + 4.5], [x0, y0 + 2.5]], hex(mainH));
    c.line(x0, y0 - 1.5, x1 + 2, y1 - 0.5, hex(hiH), 1);
    c.line(x0, y0, x1 + 2, y1, hex('#d9f99d'), 1);
  }
  c.rect(19, 20, 4, 9, hex('#b45309'));
  c.rect(20, 21, 2, 7, hex('#f59e0b'));
  c.mirrorLeftToRight();
  c.addOutline();
  return c;
}

function wingGoldenApsara(frame) {
  const c = new PixelCanvas(48, 48);
  const flap = [0, -4.5, -1.2, 3][frame];
  const cx = 22, cy = 24;
  const layers = [
    [-13 + flap * 1.5, 20, '#f59e0b', '#fef08a', 4.6],
    [-7 + flap * 1.2, 21, '#eab308', '#fef9c3', 4.6],
    [-1 + flap * 0.9, 19, '#d97706', '#fde047', 4.2],
    [5 + flap * 0.6, 16, '#b45309', '#facc15', 3.8],
    [11 + flap * 0.4, 12, '#92400e', '#f59e0b', 3.2],
  ];
  for (const [dyTip, reach, mainH, hiH, thick] of layers) {
    const x0 = cx, y0 = cy + dyTip * 0.28;
    const x1 = Math.max(2, cx - reach), y1 = Math.max(2, Math.min(45, cy + dyTip));
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - 2.2;
    c.poly([[x0, y0 - 2], [mx, my - thick * 0.6], [x1, y1], [mx, my + thick * 0.8], [x0, y0 + 2.5]], hex(mainH));
    c.line(x0, y0 - 1, x1 + 1, y1, hex(hiH), 1);
    c.ellipse(x1 + 1.5, y1, 2, 1.4, hex('#fef9c3'));
  }
  c.ellipse(20, 23.5, 3.2, 3.8, hex('#facc15'));
  c.ellipse(20, 23.5, 1.5, 1.8, hex('#e11d48'));
  c.mirrorLeftToRight();
  c.addOutline();
  return c;
}

function wingStormCrystal(frame) {
  const c = new PixelCanvas(48, 48);
  const pulse = [0, -3.5, -1, 2.5][frame];
  const cx = 22, cy = 24;
  const shards = [
    [21, -15 + pulse * 1.4, '#0284c7', '#7dd3fc'],
    [22, -6 + pulse * 1.1, '#0ea5e9', '#e0f2fe'],
    [19, 3 + pulse * 0.8, '#2563eb', '#38bdf8'],
    [14, 12 + pulse * 0.4, '#1d4ed8', '#60a5fa'],
  ];
  for (const [reach, dy, darkH, lightH] of shards) {
    const x0 = cx - 1, y0 = cy + dy * 0.22;
    const x1 = Math.max(2, cx - reach), y1 = Math.max(2, Math.min(45, cy + dy));
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    c.poly([[x0, y0 - 2.2], [mx + 1, my - 4], [x1, y1], [mx, my + 2]], hex(lightH));
    c.poly([[x0, y0 + 2.2], [mx, my + 1], [x1, y1], [mx + 2, my + 4]], hex(darkH));
  }
  const by = 14 + frame * 5;
  c.line(18, by, 11, by - 3, hex('#fef08a'), 1);
  c.line(11, by - 3, 7, by + 2, hex('#ffffff'), 1);
  c.ellipse(20, 23.5, 2.6, 2.8, hex('#38bdf8'));
  c.set(20, 23, hex('#ffffff'));
  c.mirrorLeftToRight();
  c.addOutline();
  return c;
}

function wingCelestialNaga(frame) {
  const c = new PixelCanvas(48, 48);
  const flap = [0, -5, -1.5, 3.2][frame];
  const pSh = [21, 23];
  const pEl = [13, 13 + flap * 0.8];
  const pTip = [3, 9 + flap * 1.5];
  const pMid = [6, 24 + flap * 1.0];
  const pLow = [11, 35 + flap * 0.6];
  const pIn = [19, 31];
  c.poly([pSh, pEl, pTip, pMid, pLow, pIn], hex('#059669'));
  c.poly([pSh, pEl, pMid, pIn], hex('#047857'));
  c.line(pEl[0], pEl[1], pMid[0], pMid[1], hex('#34d399'), 1);
  c.line(pEl[0], pEl[1], pLow[0], pLow[1], hex('#34d399'), 1);
  c.line(pSh[0], pSh[1], pEl[0], pEl[1], hex('#facc15'), 2.2);
  c.line(pEl[0], pEl[1], pTip[0], pTip[1], hex('#facc15'), 2);
  c.line(pEl[0], pEl[1], pEl[0] - 2, pEl[1] - 4.5, hex('#fef08a'), 1.8);
  c.rect(18, 19, 2, 2, hex('#fef9c3'));
  c.rect(13, Math.round(13 + flap * 0.8), 2, 2, hex('#fef9c3'));
  c.mirrorLeftToRight();
  c.addOutline();
  return c;
}

function wingSolarSeraph(frame) {
  const c = new PixelCanvas(48, 48);
  const flap = [0, -4.2, -1, 2.8][frame];
  // Sacred sunburst halo arc
  for (let a = Math.PI; a <= Math.PI * 1.5; a += 0.08) {
    const rx = 24 + Math.cos(a) * 11;
    const ry = 20 + Math.sin(a) * 11;
    c.ellipse(rx, ry, 1.1, 1.1, hex('#fde047'));
  }
  const six = [
    [[21, 19], [11, 7 + flap * 1.4], [3, 5 + flap * 1.6], [13, 16 + flap * 0.8], '#fef08a', '#ffffff'],
    [[21, 23], [10, 18 + flap * 1.0], [2, 21 + flap * 1.2], [11, 27 + flap * 0.7], '#facc15', '#fef9c3'],
    [[21, 28], [12, 31 + flap * 0.5], [6, 39 + flap * 0.7], [16, 37 + flap * 0.3], '#f59e0b', '#fde047'],
  ];
  for (const [p0, p1, p2, p3, mainH, hiH] of six) {
    c.poly([p0, p1, p2, p3], hex(mainH));
    c.line(p0[0], p0[1], p2[0], p2[1], hex(hiH), 1);
  }
  c.rect(19, 20, 4, 8, hex('#ea580c'));
  c.rect(20, 21, 2, 6, hex('#fef9c3'));
  c.mirrorLeftToRight();
  c.addOutline();
  return c;
}

function wingVoidButterfly(frame) {
  const c = new PixelCanvas(48, 48);
  const scaleX = [1.0, 0.72, 0.52, 0.84][frame];
  const lift = [0, -2.5, -4, -1.2][frame];
  const cx = 22, cy = 24;
  const sx = (dx) => Math.max(2, cx - dx * scaleX);
  c.poly([[cx, cy - 2], [sx(10), cy - 14 + lift], [sx(20), cy - 12 + lift], [sx(19), cy + 1 + lift * 0.5], [cx, cy + 2]], hex('#581c87'));
  c.poly([[cx - 2, cy - 2], [sx(9), cy - 10 + lift], [sx(15), cy - 8 + lift], [sx(14), cy - 1 + lift * 0.5]], hex('#a855f7'));
  c.line(cx, cy - 2, sx(19), cy - 11 + lift, hex('#e879f9'), 1);
  const ex = sx(13), ey = cy - 7 + lift;
  c.ellipse(ex, ey, 2.2, 2.2, hex('#22d3ee'));
  c.set(ex, ey, hex('#ffffff'));
  c.poly([[cx, cy + 2], [sx(16), cy + 3 + lift * 0.4], [sx(14), cy + 15], [sx(8), cy + 18], [cx - 1, cy + 9]], hex('#3b0764'));
  c.poly([[cx - 2, cy + 4], [sx(12), cy + 6], [sx(10), cy + 13], [cx - 2, cy + 9]], hex('#db2777'));
  c.set(sx(17), cy - 3 + lift, hex('#fef08a'));
  c.set(sx(11), cy + 12, hex('#67e8f9'));
  c.mirrorLeftToRight();
  c.addOutline();
  return c;
}

// ==================== 5 ANIMATED PETS (32x32 per frame -> 128x32) ====================

function petVillagePuppy(frame) {
  const c = new PixelCanvas(32, 32);
  const bob = [0, -2, -1, 0][frame];
  const tdx = [0, 2, -1, 1][frame];
  const leg = [0, 1, 0, -1][frame];
  c.line(8, 20 + bob, 5 + tdx, 14 + bob, hex('#d97706'), 2);
  c.ellipse(15, 21 + bob, 7, 4.5, hex('#f59e0b'));
  c.rect(10, 22 + bob, 10, 3, hex('#fef3c7'));
  c.rect(9, 24 + bob + leg, 3, 4, hex('#d97706'));
  c.rect(18, 24 + bob - leg, 3, 4, hex('#d97706'));
  // Red checkered Khmer Krama neckerchief
  c.rect(16, 17 + bob, 6, 3, hex('#dc2626'));
  c.set(17, 18 + bob, hex('#ffffff'));
  c.set(19, 17 + bob, hex('#ffffff'));
  c.set(21, 19 + bob, hex('#ffffff'));
  // Head + floppy ear + snout
  c.ellipse(20, 14 + bob, 5.5, 5, hex('#fbbf24'));
  c.rect(13, 11 + bob, 3, 6, hex('#92400e'));
  c.rect(22, 14 + bob, 4, 4, hex('#fef3c7'));
  c.rect(25, 14 + bob, 2, 2, hex('#1c1917'));
  c.rect(18, 12 + bob, 2, 2, hex('#1c1917'));
  c.set(18, 12 + bob, hex('#ffffff'));
  c.rect(22, 12 + bob, 2, 2, hex('#1c1917'));
  c.set(22, 12 + bob, hex('#ffffff'));
  c.addOutline();
  return c;
}

function petBabyWaterBuffalo(frame) {
  const c = new PixelCanvas(32, 32);
  const bob = [0, -1, 0, -2][frame];
  const step = [0, 1, 0, -1][frame];
  c.line(7, 19 + bob, 4, 23 + bob, hex('#475569'), 1.8);
  c.ellipse(14.5, 20 + bob, 7.5, 5, hex('#475569'));
  c.rect(9, 16 + bob, 11, 2, hex('#64748b'));
  c.rect(8, 24 + bob + step, 3, 4, hex('#334155'));
  c.rect(18, 24 + bob - step, 3, 4, hex('#334155'));
  c.rect(8, 27 + bob + step, 3, 1, hex('#1e293b'));
  c.rect(18, 27 + bob - step, 3, 1, hex('#1e293b'));
  c.ellipse(20.5, 15 + bob, 5.5, 4.8, hex('#475569'));
  // Curved ivory baby horns
  c.line(16, 11 + bob, 13.5, 7 + bob, hex('#fef3c7'), 1.8);
  c.line(24, 11 + bob, 26.5, 7 + bob, hex('#fef3c7'), 1.8);
  // Wide rosy snout + temple bell
  c.ellipse(23.5, 17.5 + bob, 3.6, 2.5, hex('#d6b4a1'));
  c.set(22, 17 + bob, hex('#451a03'));
  c.set(25, 17 + bob, hex('#451a03'));
  c.rect(18, 13 + bob, 2, 2, hex('#0f172a'));
  c.set(18, 13 + bob, hex('#ffffff'));
  c.rect(16, 19 + bob, 4, 2, hex('#dc2626'));
  c.ellipse(18.5, 21.5 + bob, 1.8, 1.8, hex('#facc15'));
  c.addOutline();
  return c;
}

function petMiniGoldenNaga(frame) {
  const c = new PixelCanvas(32, 32);
  const phase = frame * (Math.PI / 2);
  const hover = Math.sin(phase) * 2.2;
  const pts = [];
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    pts.push([5 + t * 18, 18 + hover + Math.sin(t * Math.PI * 2.2 + phase) * 4.5]);
  }
  for (let i = 0; i < pts.length; i++) {
    const [sx, sy] = pts[i];
    const r = i < 2 ? 2 : i < 7 ? 3.2 : 3.8;
    c.ellipse(sx, sy, r, r, hex('#eab308'));
    c.ellipse(sx, sy + 1, r * 0.72, r * 0.55, hex('#10b981'));
    c.set(sx, sy - r + 1, hex('#fef9c3'));
  }
  const hx = pts[8][0] + 1, hy = pts[8][1] - 2;
  c.poly([[hx - 3, hy - 3], [hx - 6, hy - 8], [hx - 1, hy - 5]], hex('#facc15'));
  c.poly([[hx, hy - 4], [hx + 1, hy - 10], [hx + 3, hy - 4]], hex('#fef08a'));
  c.poly([[hx + 2, hy - 3], [hx + 6, hy - 7], [hx + 4, hy - 1]], hex('#facc15'));
  c.ellipse(hx + 1, hy + 0.5, 4.2, 3.5, hex('#facc15'));
  c.rect(hx + 1, hy - 1, 2, 2, hex('#e11d48'));
  c.set(hx + 1, hy - 1, hex('#ffffff'));
  // Floating golden auto-collect coin magnet sparkle
  c.ellipse(13.5, 27 - (frame % 2), 1.8, 1.8, hex('#fde047'));
  c.addOutline();
  return c;
}

function petCelestialLotusKitsune(frame) {
  const c = new PixelCanvas(32, 32);
  const bob = [0, -2, -1, 0][frame];
  const sway = [-2, 0, 2, 0][frame];
  for (const [idx, [tyOff, txOff]] of [[-6, -3], [-1, -5], [4, -3]].entries()) {
    const tx = 8 + txOff + (idx !== 1 ? sway : -sway);
    const ty = 18 + bob + tyOff;
    c.line(12, 21 + bob, tx, ty, hex('#f8fafc'), 3);
    c.ellipse(tx, ty, 2.3, 2.3, hex('#f472b6'));
    c.set(tx, ty, hex('#fef08a'));
  }
  c.ellipse(16, 21 + bob, 6, 4.2, hex('#f8fafc'));
  c.rect(11, 24 + bob, 3, 4, hex('#e2e8f0'));
  c.rect(18, 24 + bob, 3, 4, hex('#e2e8f0'));
  c.ellipse(20.5, 14.5 + bob, 5.2, 4.5, hex('#ffffff'));
  c.poly([[16, 11 + bob], [15, 5 + bob], [19, 10 + bob]], hex('#ffffff'));
  c.set(16, 8 + bob, hex('#f472b6'));
  c.poly([[22, 10 + bob], [25, 5 + bob], [26, 11 + bob]], hex('#ffffff'));
  c.set(24, 8 + bob, hex('#f472b6'));
  c.rect(20, 11 + bob, 2, 2, hex('#facc15'));
  c.rect(18, 14 + bob, 2, 2, hex('#0ea5e9'));
  c.rect(23, 14 + bob, 2, 2, hex('#0ea5e9'));
  c.set(25, 16 + bob, hex('#f472b6'));
  c.addOutline();
  return c;
}

function petBabyAngkorSingha(frame) {
  const c = new PixelCanvas(32, 32);
  const bob = [0, -2, -1, 0][frame];
  const step = [0, 1, 0, -1][frame];
  c.line(8, 20 + bob, 5, 14 + bob, hex('#f59e0b'), 2);
  c.ellipse(6.5, 12 + bob, 2.3, 2.3, hex('#dc2626'));
  c.ellipse(14.5, 21 + bob, 6.5, 4.2, hex('#f59e0b'));
  c.rect(10, 18 + bob, 9, 2, hex('#fde047'));
  c.rect(9, 24 + bob + step, 3, 4, hex('#d97706'));
  c.rect(17, 24 + bob - step, 3, 4, hex('#d97706'));
  // Ornate crimson Singha mane + gold crown jewels
  c.ellipse(20, 14.5 + bob, 7.2, 6.5, hex('#b91c1c'));
  c.ellipse(20, 14.5 + bob, 6, 5.4, hex('#dc2626'));
  for (const [mx, my] of [[15, 8], [20, 7], [25, 8], [26, 14]]) {
    c.rect(mx, my + bob, 2, 2, hex('#facc15'));
  }
  c.ellipse(20.5, 15 + bob, 4.5, 4, hex('#fbbf24'));
  c.rect(20, 10 + bob, 2, 2, hex('#10b981'));
  c.rect(18, 14 + bob, 2, 2, hex('#1c1917'));
  c.set(18, 14 + bob, hex('#fef08a'));
  c.rect(22, 14 + bob, 2, 2, hex('#1c1917'));
  c.set(22, 14 + bob, hex('#fef08a'));
  c.rect(20, 16 + bob, 3, 2, hex('#92400e'));
  c.addOutline();
  return c;
}

function buildSheet(fn, fw, fh, frames = 4) {
  const sheet = new PixelCanvas(fw * frames, fh);
  for (let i = 0; i < frames; i++) {
    sheet.blit(fn(i), i * fw, 0);
  }
  return sheet;
}

fs.mkdirSync(WINGS_DIR, { recursive: true });
fs.mkdirSync(PETS_DIR, { recursive: true });
fs.mkdirSync(COSMETICS_DIR, { recursive: true });

let manifest = {};
if (fs.existsSync(MANIFEST_PATH)) {
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    manifest = {};
  }
}

const wings = [
  ['wings_bamboo_leaf_glider', wingBambooLeaf],
  ['wings_golden_apsara_feathers', wingGoldenApsara],
  ['wings_storm_crystal', wingStormCrystal],
  ['wings_celestial_naga_dragon', wingCelestialNaga],
  ['wings_solar_angkor_seraph', wingSolarSeraph],
  ['wings_void_phantom_butterfly', wingVoidButterfly],
];

for (const [key, fn] of wings) {
  const sheet = buildSheet(fn, 48, 48, 4);
  const out = path.join(WINGS_DIR, `${key}.png`);
  fs.writeFileSync(out, encodePng(sheet));
  manifest[key] = `/assets/khmer/wings/${key}.png`;
  console.log(`[WING] ${key}.png (${sheet.w}x${sheet.h})`);
}

const pets = [
  ['pet_village_puppy', petVillagePuppy],
  ['pet_baby_water_buffalo', petBabyWaterBuffalo],
  ['pet_mini_golden_naga', petMiniGoldenNaga],
  ['pet_celestial_lotus_kitsune', petCelestialLotusKitsune],
  ['pet_baby_angkor_singha', petBabyAngkorSingha],
];

for (const [key, fn] of pets) {
  const sheet = buildSheet(fn, 32, 32, 4);
  const out = path.join(PETS_DIR, `${key}.png`);
  fs.writeFileSync(out, encodePng(sheet));
  manifest[key] = `/assets/khmer/pets/${key}.png`;
  console.log(`[PET]  ${key}.png (${sheet.w}x${sheet.h})`);
}

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`[MANIFEST] Updated ${MANIFEST_PATH} (${Object.keys(manifest).length} sprites)`);
