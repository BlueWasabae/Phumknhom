# ភូមិខ្ញុំ (Phum Khnhom) — World Map, City Servers, Village Club & Calamity Arsenal

## 1. City Servers & District Architecture
Players select a regional Khmer City Server before or during play via `ServerCityModal.tsx`:
- **Phnom Penh (ភ្នំពេញ):** Bustling Riverside Metro Hub (`AREA 0–2`), high Player Market volume, Golden Bus Terminal.
- **Siem Reap (សៀមរាប):** Angkor Sanctuary Hub (`AREA 0–2`), Ancient Pagoda & Dungeon Raid party hub.
- **Kampot (កំពត):** Coastal Spice & Fishing Haven (`AREA 0–2`), Kampot Pepper bonus vibe & calm piers.

## 2. Fullscreen World Map, Fog-of-War & Travel Network
- **8 Interconnected Biomes** with Fog-of-War discovery state (`discoveredBiomes`) and **Biome Pylons** (`unlockedPylons`):
  1. `phum_plaza` — **Phum & Central Plaza** *(Discovered by default)*
  2. `emerald_rice_valley` — **Emerald Rice Valley** *(Boss #1: Sdech Kongkaeb)*
  3. `dark_bamboo_woods` — **Dark Bamboo Woods** *(Boss #2: Arp Prey Chrov)*
  4. `sunken_temple_ruins` — **Sunken Temple Ruins** *(Boss #5: Yeak Thmor)*
  5. `sunken_naga_sanctum` — **Sunken Naga Sanctum** *(Boss #6: Neak Reach)*
  6. `red_laterite_mines` — **Red Laterite Highlands & Mines** *(Act I–II Ore Shafts)*
  7. `whispering_palm_jungle` — **Whispering Palm Jungle** *(Golden Durian & Shimmer Cavern)*
  8. `sky_pagoda_spire` — **Sky Pagoda & Astral Spire** *(Act II–III Calamity Peak)*
- **Travel Mechanics (`TravelAndPylons.ts`):**
  - **Animated Village Bus:** Board at the Plaza Bus Stop to glide across districts with a crisp pixel-art bus cutscene.
  - **Biome Pylons:** Instant zero-cost teleport between any two unlocked Sandstone Pylon Shrines.
  - **Magic Mirror:** Instant recall from any Dungeon/Biome back to Phum Central Plaza.
  - **Return Portal:** Opens a linked blue portal from a Dungeon back to Plaza so raiders can restock snacks/reforge and jump straight back into combat.

## 3. Village Club & Khmer Social Mini-Games (`ClubScene.ts` & `ClubRoom.ts`)
- Indoor warm-lit social hangout accessible from the Village Club landmark in `OverworldScene.ts`.
- Synced Colyseus `ClubRoom` with playable **Tien Len (ទៀនឡេន — 13-Card Khmer Poker)** and **Ouk Chaktrang (អុកចត្រង្គ — Traditional Khmer Chess)** tables with friendly practice/Coin stakes and `+Happy` stat boosts.

## 4. Blacksmith Reforging, ATM Bank & Apsara Shimmer
- **Reforge Modifiers (`reforgeModifiers.ts` & `reforgeService.ts`):** Terraria-style weapon prefixes (`Legendary`, `Mythical`, `Unreal`, `Godly`, `Demonic`, `Ruthless`, `Keen`, `Broken`) and armor/accessory prefixes (`Warding`, `Menacing`, `Lucky`, `Quick`, `Armored`, `Arcane`) rolled server-side as a balanced Coin sink.
- **ATM Bank Vault:** Store Coins safely inside the Village Plaza ATM so your wallet stays protected from the Secret Shadow Tax Collector ambush!
- **Apsara Shimmer Spring:** Iridescent temple spring inside `DungeonBossScene.ts` (and Reforge UI tab) that transmutes surplus boss cores or crops into permanent account blessings (e.g., *Apsara Vital Crystal* `+20 Max HP`, *Lotus Luck Dew* `+3% Crit`).

## 5. Calamity Arsenal & Placeable Arena Stations
- **Preah Khan (8-Biome Sacred Blade):** Attunes slash color & elemental bonus to your selected biome.
- **Golden Riel Coin-Shot:** Fires spinning Khmer Riel coins that ricochet into bosses for escalating crit damage.
- **Sovann Reality-Rip Blade:** Melee parry-riposte blade unleashing a dimensional cyan/magenta slash tear.
- **Evolving Relic of Angkor:** Automatically grows stronger with every unique boss kill logged in your Bestiary!
- **Celestial Yant Grimoire:** Calls down converging off-screen sacred golden Yant pillars.
- **Placeable Dungeon Arena Buff Stations:** Toggleable **Heart Lantern** (`+3 HP/s`), **Sacred Campfire** (`+2 HP/s & +20% Focus charge`), and **Angkor Bast Statue** (`+6 DEF`) directly in `DungeonBossScene.ts`.
