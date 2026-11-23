# ភូមិខ្ញុំ (Phum Khnhom) — Step-by-Step Build Roadmap

Check off each phase only after testing on **both Desktop and Mobile browsers** and running `git commit`.

- [x] **Phase 1 — Project Setup & Dual-Mode Skeleton**
  - Initialize `/shared`, `/client` (Vite + React + TypeScript + Tailwind + Phaser 3), and `/server` scaffold.
  - Top-Down Village (`gravity = 0`) + yellow `join` portal → Side-Scrolling Dungeon (`gravity = 800`) + Exit portal.
  - Responsive PC (`WASD`/Arrows + `Space` + `E`) and Mobile touch joystick + action buttons.
  - Local overhead chat speech bubble (4-second display).
- [x] **Phase 2 — Social Village HUD & Character Paper-Doll**
  - Top-left `MENU` / Mail / Chat and top-right Action / Emote HUD.
  - Modular paper-doll sprite renderer (`Wings -> Body -> Face -> Pants -> Shirt -> Hair -> Hat -> Weapon -> Pet`).
  - Profile Card (`Farm Level`, `Stylish`, `Friendly`, `Happy`, `Healthy`) & `Wearing`/`Container` inventory tabs.
- [x] **Phase 3 — Homestead Farming, Timers & Artisan Loop**
  - Personal `FARM` gate, tilling, watering (-20% time), Fertilizer (Gold-Star chance), and real-timestamp crop growth.
  - Starter crops (`Trakuon` → `Kampot Pepper`), perennial fruit trees, livestock, and first Artisan machines.
- [x] **Phase 4 — Shops, Street Snack Cart & 12-Skill Foundation**
  - Clothing Boutique, Street Snack Cart (`Num Pang`, `Kafé`, `Skewers`, `Coconut Water`), and Village-to-Dungeon stat bridge.
  - Implement `/shared/src/balanceFormulas.ts` and the 12-Skill XP/Talent framework.
- [x] **Phase 5 — Side-Scrolling Boss Cavern Combat & First Bosses**
  - 5 Class weapon types, Dash/Double-Jump, Quick-Slot snack healing, Focus/Fury gauges, and Normal/Expert/Mythic toggles.
  - Build Boss #1 (*Sdech Kongkaeb — King Frog*) & Boss #5 (*Yeak Thmor — Stone Yaksha*) with Treasure Bags, cracked secret walls, and the No-Hit *Golden Frying Pan* Easter egg.
- [x] **Phase 6 — Online Multiplayer Plaza (Colyseus)**
  - Real-time multi-channel `AREA 0` / `AREA 1` village plaza, synced movement, overhead chat bubbles, and emotes.
- [x] **Phase 7 — Accounts, Cloud Saves & Social (Supabase)**
  - Login/Register, persistent Coins/Gold/Diamonds, farm/machine timers, inventory, friends list, and tap-on-player menu.
- [x] **Phase 8 — Co-op Boss Raids, Open World & Side Activities**
  - 2–4 player scaled Boss Rooms, Endless Pagoda Tower, Riverside Fishing, Lucky Wheel, Pagoda Bundles, NPCs/Hearts, and Player Market (5% tax).
- [x] **Phase 9 — Custom Khmer Art, Audio & Content Expansion**
  - Replace placeholders with cohesive chibi pixel art, 4 seasonal palettes, 8 biomes, sound effects, and rolling out Bosses #2–#28 + Boss Rush.
- [x] **Phase 10 — Live Launch on `www.bluexacedamy.space`**
  - Deploy client to Vercel (`www.bluexacedamy.space`), server to Railway/Fly.io, connect Stripe / ABA PayWay KHQR for Diamond Store & Village Pass, and run closed alpha with friends.
- [x] **Phase 11 — World Map, City Servers, Village Club, Pylons & Khmer Mythic Arsenal Expansion**
  - Fullscreen clickable Fog-of-War World Map (`[M]`), Phnom Penh / Siem Reap / Kampot / Battambang City Servers, Animated Green Bus, Angkor Biome Pylons, Magic Mirror & Return Portal.
  - Phum Night Club (`ClubScene` & Colyseus `ClubRoom`) with Tien Len & Ouk Chaktrang mini-games, Global Event Ticker, ATM Bank Vault, Server-Validated Blacksmith Reforging, Apsara Shimmer Spring, Placeable Boss Cavern Buff Stations, and 6 Khmer Mythic Arsenal weapons (*Preah Khan of the 8 Biomes*, *Crossbow of the Golden Riel*, *Evolving Blade of Angkor*, *Tome of Fractured Yant*, *Frost Fang of Singha*, *Hanuman Spirit Banner*).
