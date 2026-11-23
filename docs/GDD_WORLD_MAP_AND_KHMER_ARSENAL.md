# ភូមិខ្ញុំ (Phum Khnhom) — World Map, City Servers, Village Club & Khmer Mythic Arsenal

## 1. City Servers & District Architecture
Players select a regional Khmer City Server before or during play via `ServerCityModal.tsx`:
- **Phnom Penh (ភ្នំពេញ):** Bustling Riverside Metro Hub (`AREA 0–2`), high Player Market volume, Green Bus Terminal.
- **Siem Reap (សៀមរាប):** Angkor Sanctuary Hub (`AREA 0–2`), Ancient Pagoda & Boss Cavern party hub.
- **Kampot (កំពត):** Coastal Spice & Fishing Haven (`AREA 0–2`), Kampot Pepper vibe & calm piers.
- **Battambang (បាត់ដំបង):** Rice-Bowl Heritage Hub (`AREA 0–2`), Bamboo arts & tranquil homesteads.

## 2. Fullscreen World Map, Fog-of-War & Travel Network
- **6 City Districts** (unlocked at start): `Downtown Plaza`, `Green Park & Shrine`, `Personal Farm`, `Fishing Pier`, `The Club`, `Ancient Pagoda`.
- **7 Wild Biomes** with Fog-of-War discovery state (`discoveredBiomes`) and **Angkor Biome Pylons** (`unlockedPylons`):
  1. `emerald_rice_valley` — **Emerald Rice Valley** *(Boss #1: Sdech Kongkaeb)*
  2. `angkor_ruins` — **Angkor Ruins** *(Boss #5: Yeak Thmor)*
  3. `laterite_mines` — **Laterite Mines** *(Deep Ore Shafts)*
  4. `palm_jungle` — **Palm Jungle** *(Boss #2: Arp Prey Chrov & Golden Durian Groves)*
  5. `sapphire_coast` — **Sapphire Coast** *(Coastal Fishing & Coral Reefs)*
  6. `blighted_marsh` — **Blighted Marsh** *(Boss #6: Neak Reach)*
  7. `sky_pagoda` — **Sky Pagoda** *(Act III Mythic Trials)*
- **Travel Mechanics (`TravelAndPylons.ts`):**
  - **Animated Green Village Bus:** Drives through Downtown Plaza every 25s, pauses at the Bus Stop with a bouncing `JOIN` arrow to open the World Map.
  - **Angkor Biome Pylons:** Instant zero-cost golden-flash teleport between unlocked Pylons (disabled during active boss fights).
  - **Magic Mirror:** Instant golden-flash recall from `Container` inventory straight to Personal Farm / Home (disabled during active boss fights).
  - **Return Portal:** Links a Boss Cavern back to Phum Plaza so raiders can restock snacks/reforge and jump straight back into combat.

## 3. Village Club & Khmer Social Mini-Games (`ClubScene.ts` & `ClubRoom.ts`)
- Indoor warm-lit social hangout accessible from the Village Club landmark in `OverworldScene.ts`.
- Synced Colyseus `ClubRoom` with playable **Tien Len (ទៀនឡេន — 13-Card Khmer Poker)** and **Ouk Chaktrang (អុកចត្រង្គ — Traditional Khmer Chess)** tables with friendly practice/Coin stakes and `+Happy` stat boosts.

## 4. Blacksmith Reforging, ATM Bank & Apsara Shimmer
- **Reforge Modifiers (`reforgeModifiers.ts` & `reforgeService.ts`):** Blacksmith weapon prefixes (`Legendary`, `Mythical`, `Unreal`, `Godly`, `Demonic`, `Superior`, `Ruthless`, `Keen`, `Shoddy`, `Broken`) and accessory prefixes (`Warding`, `Menacing`, `Lucky`, `Quick`, `Armored`, `Guarding`, `Hard`) rolled server-side as a balanced scaling Coin sink.
- **ATM Bank Vault (`bankService.ts`):** Store Coins safely inside the Village Plaza ATM Vault (persisted via `/api/save` and `/api/bank/*`).
- **Apsara Shimmer Spring:** Iridescent temple spring inside `OverworldScene.ts` and `DungeonBossScene.ts` that transmutes duplicate rare boss drops into other drops of the same tier, or turns *Golden Durian* / *Pink Lotus* into permanent account blessings (`+20 Max HP`, `+5% Luck`).

## 5. Khmer Mythic Arsenal & Placeable Boss Cavern Stations
- **Preah Khan of the 8 Biomes (`ព្រះខ័នប្រាំបីទិស`):** Biome-attuned slash & passive + 0.35s Parry guard → screen-tearing Reality Rip counter.
- **Crossbow of the Golden Riel (`ស្នារៀលមាស`):** Flicks up to 3 spinning Gold Coins into the air; shooting them chains a blinding golden lightning beam into the boss for a guaranteed 100% Super-Crit.
- **Evolving Blade of Angkor (`ដាវជ័យវរ្ម័ន`):** Scales `+15%` Base Damage, `+10%` slash size, and fires golden Yant projectile waves per unique boss defeated in Bestiary.
- **Tome of Fractured Yant (`សាស្ត្រាពន្លឺយ័ន្ត`):** Every magic bolt hit summons 3 extra golden light-blades slashing in from off-screen at crisscrossing angles.
- **Frost Fang of Singha (`ចង្កូមសិង្ហទឹកកក`):** Stealth Strike slices a flat `3%` of the boss's remaining HP ignoring armor.
- **Hanuman Spirit Banner (`កងទ័ពហនុមាន`):** Summons 3 fast golden monkey-warrior spirits that dash-slash bosses in synchronized formations.
- **Placeable Boss Cavern Buff Stations:** Toggleable **Heart Lantern** (`+3 HP/s`), **Sacred Campfire** (`+2 HP/s`), and **Angkor Ward Statue** (`+6 DEF`) directly in `DungeonBossScene.ts`.
