#!/usr/bin/env python3
"""
ភូមិខ្ញុំ (Phum Khnhom) — Reusable Khmer Pixel-Art Sprite Cleaner
Performs edge-connected flood-fill background removal (threshold >= 240) so interior
white highlights (fangs, teeth, glass glints, awning stripes) stay untouched,
trims transparent margins, resizes with NEAREST neighbor for razor-sharp pixel art,
and writes client/public/assets/khmer/manifest.json so BootScene loads only existing PNGs
with ZERO console 404 errors.
"""

from __future__ import annotations

import json
from collections import deque
from pathlib import Path
from typing import Literal

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = REPO_ROOT / "client" / "public" / "assets" / "raw_khmer"
KHMER_ROOT = REPO_ROOT / "client" / "public" / "assets" / "khmer"
OUT_BUILDINGS = KHMER_ROOT / "buildings"
OUT_BOSSES = KHMER_ROOT / "bosses"
OUT_TREES = KHMER_ROOT / "trees"
OUT_WINGS = KHMER_ROOT / "wings"
OUT_PETS = KHMER_ROOT / "pets"
OUT_COSMETICS = KHMER_ROOT / "cosmetics"
MANIFEST_PATH = KHMER_ROOT / "manifest.json"

WHITE_THRESHOLD = 240

# (stem -> (output_dir, dimension_axis, target_px))
SPRITE_RULES: dict[str, tuple[Path, Literal["width", "height"], int]] = {
    "khmer_stilt_house": (OUT_BUILDINGS, "width", 128),
    "angkor_portal": (OUT_BUILDINGS, "width", 128),
    "ancient_pagoda": (OUT_BUILDINGS, "width", 128),
    "fashion_boutique": (OUT_BUILDINGS, "width", 120),
    "num_pang_cart": (OUT_BUILDINGS, "width", 88),
    "sugar_palm_tree": (OUT_TREES, "height", 96),
    "golden_durian_tree": (OUT_TREES, "height", 92),
    "boss_yeak_thmor": (OUT_BOSSES, "height", 144),
    "boss_sdech_kongkaeb": (OUT_BOSSES, "height", 112),
    "boss_arp_prey_chrov": (OUT_BOSSES, "height", 96),
    "boss_neak_reach_head": (OUT_BOSSES, "height", 84),
    "wings_bamboo_leaf_glider": (OUT_WINGS, "height", 48),
    "wings_golden_apsara_feathers": (OUT_WINGS, "height", 48),
    "wings_storm_crystal": (OUT_WINGS, "height", 48),
    "wings_celestial_naga_dragon": (OUT_WINGS, "height", 48),
    "wings_solar_angkor_seraph": (OUT_WINGS, "height", 48),
    "wings_void_phantom_butterfly": (OUT_WINGS, "height", 48),
    "pet_village_puppy": (OUT_PETS, "height", 32),
    "pet_baby_water_buffalo": (OUT_PETS, "height", 32),
    "pet_mini_golden_naga": (OUT_PETS, "height", 32),
    "pet_celestial_lotus_kitsune": (OUT_PETS, "height", 32),
    "pet_baby_angkor_singha": (OUT_PETS, "height", 32),
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
    for d in (OUT_BUILDINGS, OUT_BOSSES, OUT_TREES, OUT_WINGS, OUT_PETS, OUT_COSMETICS):
        d.mkdir(parents=True, exist_ok=True)

    sources = sorted(
        p for p in RAW_DIR.iterdir() if p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
    ) if RAW_DIR.exists() else []

    for src in sources:
        stem = src.stem
        out_dir, axis, target_px = SPRITE_RULES.get(
            stem,
            (
                OUT_BOSSES
                if stem.startswith("boss_")
                else OUT_WINGS
                if stem.startswith("wings_")
                else OUT_PETS
                if stem.startswith("pet_")
                else OUT_COSMETICS
                if stem.startswith("cosmetic_")
                else OUT_TREES
                if stem.endswith("_tree")
                else OUT_BUILDINGS,
                "width",
                128,
            ),
        )
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"{stem}.png"

        with Image.open(src) as raw:
            cleaned = flood_fill_remove_bg(raw, WHITE_THRESHOLD)
            final = trim_and_resize(cleaned, axis, target_px)
            final.save(out_path, format="PNG", optimize=True)
            print(f"[OK] {src.name} -> {out_path.relative_to(REPO_ROOT)} ({final.width}x{final.height})")

    # Build manifest of all cleaned transparent Khmer PNGs currently on disk
    manifest: dict[str, str] = {}
    for folder in (OUT_BUILDINGS, OUT_BOSSES, OUT_TREES, OUT_WINGS, OUT_PETS, OUT_COSMETICS):
        if not folder.exists():
            continue
        for png in sorted(folder.glob("*.png")):
            rel = png.relative_to(REPO_ROOT / "client" / "public").as_posix()
            manifest[png.stem] = f"/{rel}"

    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"[MANIFEST] Wrote {len(manifest)} sprite(s) to {MANIFEST_PATH.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    clean_all()
