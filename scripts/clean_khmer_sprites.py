#!/usr/bin/env python3
"""
ភូមិខ្ញុំ (Phum Khnhom) — Reusable Khmer Pixel-Art Sprite Cleaner
Performs edge-connected flood-fill background removal (threshold >= 240) so interior
white highlights (fangs, teeth, glass glints, awning stripes) stay untouched,
trims transparent margins, and resizes with NEAREST neighbor for razor-sharp pixel art.
"""

from __future__ import annotations

from collections import deque
from pathlib import Path
from typing import Literal

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = REPO_ROOT / "client" / "public" / "assets" / "raw_khmer"
OUT_BUILDINGS = REPO_ROOT / "client" / "public" / "assets" / "khmer" / "buildings"
OUT_BOSSES = REPO_ROOT / "client" / "public" / "assets" / "khmer" / "bosses"

WHITE_THRESHOLD = 240

# (stem -> (output_dir, dimension_axis, target_px))
SPRITE_RULES: dict[str, tuple[Path, Literal["width", "height"], int]] = {
    "khmer_stilt_house": (OUT_BUILDINGS, "width", 128),
    "angkor_portal": (OUT_BUILDINGS, "width", 128),
    "num_pang_cart": (OUT_BUILDINGS, "width", 88),
    "boss_yeak_thmor": (OUT_BOSSES, "height", 144),
}


def is_near_white(r: int, g: int, b: int, threshold: int = WHITE_THRESHOLD) -> bool:
    return r >= threshold and g >= threshold and b >= threshold


def flood_fill_remove_bg(img: Image.Image, threshold: int = WHITE_THRESHOLD) -> Image.Image:
    """Edge-connected 4-neighbor BFS flood-fill removing outer near-white background."""
    rgba = img.convert("RGBA")
    w, h = rgba.size
    pixels = rgba.load()
    assert pixels is not None

    visited = bytearray(w * h)
    queue: deque[tuple[int, int]] = deque()

    def try_seed(x: int, y: int) -> None:
        idx = y * w + x
        if visited[idx]:
            return
        r, g, b, a = pixels[x, y]
        if a == 0 or is_near_white(r, g, b, threshold):
            visited[idx] = 1
            queue.append((x, y))

    for x in range(w):
        try_seed(x, 0)
        try_seed(x, h - 1)
    for y in range(h):
        try_seed(0, y)
        try_seed(w - 1, y)

    while queue:
        cx, cy = queue.popleft()
        pixels[cx, cy] = (0, 0, 0, 0)
        for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
            if 0 <= nx < w and 0 <= ny < h:
                idx = ny * w + nx
                if not visited[idx]:
                    r, g, b, a = pixels[nx, ny]
                    if a == 0 or is_near_white(r, g, b, threshold):
                        visited[idx] = 1
                        queue.append((nx, ny))

    return rgba


def trim_and_resize(
    img: Image.Image, axis: Literal["width", "height"], target_px: int
) -> Image.Image:
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)

    w, h = img.size
    if axis == "width":
        new_w = target_px
        new_h = max(1, round(h * (target_px / w)))
    else:
        new_h = target_px
        new_w = max(1, round(w * (target_px / h)))

    return img.resize((new_w, new_h), Image.Resampling.NEAREST)


def clean_all() -> None:
    OUT_BUILDINGS.mkdir(parents=True, exist_ok=True)
    OUT_BOSSES.mkdir(parents=True, exist_ok=True)

    sources = sorted(
        p for p in RAW_DIR.iterdir() if p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
    )
    if not sources:
        raise FileNotFoundError(f"No raw sprites found in {RAW_DIR}")

    for src in sources:
        stem = src.stem
        out_dir, axis, target_px = SPRITE_RULES.get(
            stem,
            (OUT_BOSSES if stem.startswith("boss_") else OUT_BUILDINGS, "width", 128),
        )
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"{stem}.png"

        with Image.open(src) as raw:
            cleaned = flood_fill_remove_bg(raw, WHITE_THRESHOLD)
            final = trim_and_resize(cleaned, axis, target_px)
            final.save(out_path, format="PNG", optimize=True)
            print(f"[OK] {src.name} -> {out_path.relative_to(REPO_ROOT)} ({final.width}x{final.height})")


if __name__ == "__main__":
    clean_all()
