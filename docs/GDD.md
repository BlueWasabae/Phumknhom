# ភូមិខ្ញុំ (Phum Khnhom) — Master Game Design Document (GDD)

## 1. High-Concept Vision
**ភូមិខ្ញុំ (Phum Khnhom)** is a cross-platform (PC & Mobile Web) 2D online RPG that fuses three iconic experiences into one seamless world:
1. **Stardew Valley (Village & Farm):** Cozy top-down farming, crop timers, fishing, crafting, and building a personal homestead.
2. **Classic 2D Social MMO (Town Plaza & Style):** Crowded multi-channel village squares (`AREA 0`, `AREA 1`), chibi paper-doll fashion, wings, pets, street snack carts, Lucky Wheel spins, quiz NPCs, and live overhead chat bubbles.
3. **Terraria (Dungeons & Boss Raids):** Entering a Dungeon Portal shifts the game into 2D side-scrolling action-platforming with jumping, dodging, weapon combat, breakable loot nodes, and multi-phase solo or co-op boss fights.

**Target Platforms:** Web Browser (Desktop & Mobile responsive) hosted on `www.bluexacedamy.space` (later wrappable to Android/iOS via Capacitor).

---

## 2. Core Gameplay Loop (How Everything Connects)
Every system feeds into the next so players naturally alternate between cozy social life and high-stakes dungeon raids:
1. **Farm & Fish (Village):** Grow crops and catch fish to earn **Coins** and harvest cooking/crafting ingredients.
2. **Hang Out & Prep (Plaza):** Chat in Area channels, show off outfits/pets, spin the Lucky Wheel, and buy **Street Snacks** that refill `Healthy` / `Happy` stats and grant timed **Dungeon Combat Buffs**.
3. **Raid (Dungeon):** Step through the Dungeon Portal solo or in a 2–4 player party → camera switches to side-scrolling combat → defeat mobs and bosses for rare materials, weapons, and exclusive cosmetics.
4. **Upgrade & Flex (Return):** Craft stronger gear, unlock rare wings/pets/outfits, climb the **Top Ten** leaderboard, and decorate/upgrade your farm.

---

## 3. Visual Style, Camera & UI Layout

### Dual-Perspective Art Strategy
* **Character Style:** Vibrant 2D chibi pixel/cartoon art (front-and-side readable sprites so the same layered character animations work cleanly in both Top-Down Village and Side-Scrolling Dungeon).
* **Village Camera:** Top-down 2.5D (`gravity = 0`) with Y-sorting (characters walk naturally behind and in front of trees, stalls, benches, and carts).
* **Dungeon Camera:** Side-scrolling 2D platformer (`gravity = 800`) with parallax cave/temple backgrounds, solid platforms, one-way ledges, and boss arena lock-in.

### HUD & Interface (Inspired by Classic 2D Social Hubs)
* **Top-Left Cluster:**
  * `MENU` button (Profile, Inventory, Quests, Friends, Area Switcher, Settings).
  * **Mail / Inbox** icon (with red `!` notification badge for rewards, friend requests, and party invites).
  * **Chat** button (opens chat input bar + channel selector: `Area`, `Party`, `Whisper`).
* **Top-Right Cluster:**
  * **Quick Action / Sprint / Interact** button.
  * **Emote / Expression** button (wave, laugh, heart, cry, sit on benches).
* **In-World Markers:**
  * **Yellow Downward `join` Arrows** placed over every doorway, farm entrance, shop, fishing dock, and dungeon portal.
  * **White Rounded Speech Bubbles** floating directly above a player's head for 4–5 seconds whenever they chat.
  * **`AREA 0` Street Signs** showing the current online channel (tapping opens the Area/Channel Switcher).
* **Mobile Controls (Auto-shown on touchscreens):**
  * Bottom-left virtual thumbstick.
  * Bottom-right context buttons: `Interact` (Village) → automatically swaps to `Jump`, `Attack`, `Dash`, and `Eat Snack` quick-slots inside Dungeons.

### Player Profile & Inventory Modals
* **Profile Card:**
  * Character + active Pet preview.
  * Currencies: **Coins** (soft currency) & **Gold** (rare currency), plus **Level + XP %**.
  * **5 Life Progress Bars:** `Farm Level`, `Stylish`, `Friendly`, `Happy`, `Healthy`.
* **Inventory Tabs:**
  * `Wearing` (currently equipped fashion, wings, pet, weapon, armor).
  * `Container` (bag grid storing seeds, crops, snacks, boss drops, and spare outfits with item rarity, stats, and level).

---

## 4. World Map & Districts
Players move between districts using `join` gates or the **Village Bus**:

| District | Mode | Key Locations & NPCs |
| :--- | :--- | :--- |
| **1. Phum (Home Village)** | Top-Down | `FARM` wooden gate (instanced personal farm), Village General Shop, ATM/Bank, Street Snack Cart, `TOP TEN` leaderboard sign, Bus Stop. |
| **2. Central Plaza (Social Hub)** | Top-Down (30–50 players/Area) | Multi-channel town square (`AREA 0`, `AREA 1`...), Fashion & Hair Boutique, Pet Shop, **Lucky Wheel** NPC, Arcade Mini-Game Kiosk, Street Snack Carts, Park Benches. |
| **3. Riverside Park & Pier** | Top-Down | Fishing Pond & wooden docks, `Fish Store` NPC (rods & bait), Daily Quiz NPC (answers reward Coins/XP), Flower Archway hangout spot. |
| **4. Ancient Ruins Gate** | Top-Down → Side-Scroll | Party staging zone, Blacksmith/Crafter NPC, glowing **Dungeon Portal** (`join`) leading into instanced side-scrolling dungeons. |

---

## 5. Character Paper-Doll & Stat Bridge

### Modular Paper-Doll Layers (Render Order Bottom → Top)
1. `Back / Wings` (angel wings, fire wings, lotus aura, backpack)
2. `Body` (skin tones + base walk/idle/jump/attack frames)
3. `Eyes / Face` (expressions)
4. `Pants / Bottoms`
5. `Shirt / Dress / Armor`
6. `Hair`
7. `Hat / Headgear` (conical farmer hat, crown, Yaksha mask, cap)
8. `Weapon / Held Item` (sword, bow, staff, fishing rod, soccer ball)
9. `Pet Entity` (follows slightly behind player with bobbing idle animation)

### How Village Stats Power Up Dungeon Combat
| Village Stat | How to Raise It | Dungeon Combat Bonus |
| :--- | :--- | :--- |
| **Healthy (0–100)** | Eat nutritious street snacks & cooked farm meals | Up to **+20% Max HP** in dungeons |
| **Happy (0–100)** | Hang out, use emotes, play mini-games, eat sweet snacks | Up to **+15% Critical Hit Chance** |
| **Stylish (Score)** | Collect & equip rare clothing, hats, wings, and boss cosmetics | Unlocks VIP Village titles & NPC discounts |
| **Friendly (0–100)** | Chat, add friends, help party members in raids | **+5% Party ATK/DEF aura** per friend in co-op |
| **Farm Level** | Plant, water, and harvest crops | Unlocks higher-tier crops & stronger snack recipes |

---

## 6. Farming, Fishing & Street Snacks

### Starter Crops (Stardew-Style Personal Farm)
* **Trakuon (Water Morning Glory):** Fast growth (2 min) | Cheap starter crop | Used in basic HP snacks.
* **Jasmine Rice (Phka Rumduol):** Medium growth (10 min) | Steady coin profit | Core cooking staple.
* **Pink Lotus:** Medium-long growth (20 min) | High value | Used in Magic/Energy potions.
* **Mango & Golden Durian Trees:** Long growth / regrowing harvest | Rare high-profit fruit for elite Dungeon Buff snacks.

### Street Snack Cart Menu (Khmer-Inspired)
Snacks can be eaten in the village (restoring `Healthy`/`Happy`) OR slotted into the Dungeon Quick-Bar for mid-boss recovery and buffs:
* **Num Pang (Crispy Baguette):** Restores 40 HP + `Healthy +15`.
* **Kafé Tek Dos Ko (Iced Milk Coffee):** +20% Move Speed & Jump responsiveness for 3 minutes.
* **Sach Ang (Grilled Skewers):** +15% Melee/Ranged Attack for 3 minutes.
* **Num Akor (Steamed Palm Cake):** Restores Energy/MP + `Happy +15`.
* **Fresh Coconut Water:** Instant HP heal + clears poison/burn status in dungeons.

### Fishing System
* Buy Rod & Bait at the Riverside `Fish Store`.
* Cast into water → wait for bobber splash → tap timing bar to reel in fish, sunken coins, or rare dungeon keys.

---

## 7. Terraria-Style Dungeons & Boss Progression

### Dungeon Mechanics
* **Controls:** Left/Right movement, Jump + Double Jump (or Dash with brief invincibility frames), Primary Weapon Attack, Quick-Slot Snack heal.
* **Exploration:** Breakable glowing ore veins/pots for coins and crafting shards, spike traps, elevated platforms, and mini-mobs before the Boss Chamber.
* **Weapon Archetypes:**
  * *Melee* (Khmer Short Sword / Heavy Spear — wide arc, knockback).
  * *Ranged* (Bamboo Bow / Elemental Slingshot — safe distance, fast shots).
  * *Magic* (Lotus Staff — homing orbs, uses Energy bar).
* **Co-op Scaling:** 1–4 players can enter together; Boss HP scales (+65% per extra player), and every player gets instanced loot drops.

### First 3 Bosses (Build Boss #1 First for MVP)
1. **Tier 1 — Cavern of the Stone Giant: *Yeak Thmor (Stone Yaksha)***
   * *Phase 1 (100%–50% HP):* Telegraphed club slam (red warning zone) + ground shockwave players must jump over.
   * *Phase 2 (<50% HP):* Roars and drops falling ceiling boulders + faster charge dash.
   * *Drops:* Stone Core (weapon crafting), **Yaksha Mask** (rare headgear cosmetic), Coins.
2. **Tier 2 — Sunken Lotus Crypt: *Neak Reach (Shadow Naga)***
   * *Mechanics:* Sweeps across lower platforms, spits poison pools (countered by Coconut Water), summons mini water spirits.
   * *Drops:* Naga Scales (armor crafting), **Mini Naga Pet**.
3. **Tier 3 — Sky Pagoda Spire: *Garuda Sentinel***
   * *Mechanics:* Aerial swoops, feather barrage patterns, high-platform dodging.
   * *Drops:* Golden Feathers, **Radiant Garuda Wings** (prestigious Village flex cosmetic).

---

## 8. Economy, Shops & Social Features
* **Coins:** Earned freely from farming, fishing, daily quizzes, and dungeon loot. Used for seeds, snacks, starter weapons, standard clothes, and Coin Lucky Wheel spins (e.g., 15,000 Coins).
* **Gold:** Earned from first-time boss clears, weekly leaderboard milestones, and rare drops. Used for exclusive fashion, special pets, and Gold Lucky Wheel spins (e.g., 5 Gold). **Rule: No pay-to-win dungeon power**—rare cosmetics can be premium, while combat strength is always earned through gameplay.
* **Lucky Wheel:** Interactive spinning wheel NPC in Central Plaza offering random snacks, coins, rare outfits, and pet eggs.
* **Tap-on-Player Menu:** Clicking/tapping another player opens a compact radial card: `View Profile`, `Add Friend`, `Whisper`, `Invite to Dungeon`.

---

## 9. Technical Architecture
* **Client (`/client`):** Vite + React + TypeScript + Tailwind CSS + **Phaser 3**. Deployed to `www.bluexacedamy.space` via Vercel.
* **Server (`/server`):** Node.js + **Colyseus** (real-time room state synchronization for `VillageRoom`, `FarmRoom`, and `DungeonRoom`). Deployed to Railway / Fly.io.
* **Database & Auth:** **Supabase** (PostgreSQL + Auth) storing:
  * `users` (username, coins, gold, level, xp, life_stats)
  * `inventory` (item_id, quantity, is_equipped, slot, durability)
  * `farm_plots` (plot_index, crop_id, planted_at, watered)
  * `friends` & `leaderboards`
