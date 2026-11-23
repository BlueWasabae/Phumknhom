# ភូមិខ្ញុំ (Phum Khnhom) — Step-by-Step Build Roadmap

Check off each phase only after testing on **both Desktop and Mobile browsers** and running `git commit`.

- [x] **Phase 1 — Project Setup & Dual-Mode Skeleton**
  - Initialize `/shared`, `/client` (Vite + React + TypeScript + Tailwind + Phaser 3), and `/server` scaffold.
  - Top-Down Village (`gravity = 0`) + yellow `join` portal → Side-Scrolling Dungeon (`gravity = 800`) + Exit portal.
  - Responsive PC (`WASD`/Arrows + `Space` + `E`) and Mobile touch joystick + action buttons.
  - Local overhead chat speech bubble (4-second display).
- [x] **Phase 2 — Avatar World HUD & Character Paper-Doll**
  - Top-left `MENU` / Mail / Chat and top-right Action / Emote HUD.
  - Modular paper-doll sprite renderer (`Wings -> Body -> Face -> Pants -> Shirt -> Hair -> Hat -> Weapon -> Pet`).
  - Profile Card (`Farm Level`, `Stylish`, `Friendly`, `Happy`, `Healthy`) & `Wearing`/`Container` inventory tabs.
- [ ] **Phase 3 — Stardew Farming, Timers & Artisan Loop**
  - Personal `FARM` gate, tilling, watering (-20% time), Fertilizer (Gold-Star chance), and real-timestamp crop growth.
  - Starter crops (`Trakuon` → `Kampot Pepper`), perennial fruit trees, livestock, and first Artisan machines.
- [ ] **Phase 4 — Shops, Street Snack Cart & 12-Skill Foundation**
  - Clothing Boutique, Street Snack Cart (`Num Pang`, `Kafé`, `Skewers`, `Coconut Water`), and Village-to-Dungeon stat bridge.
  - Implement `/shared/src/balanceFormulas.ts` and the 12-Skill XP/Talent framework.
- [ ] **Phase 5 — Terraria/Calamity Combat & First Bosses**
  - 5 Class weapon types, Dash/Double-Jump, Quick-Slot snack healing, Focus/Fury gauges, and Normal/Expert/Calamity toggles.
  - Build Boss #1 (*Sdech Kongkaeb — King Frog*) & Boss #5 (*Yeak Thmor — Stone Yaksha*) with Treasure Bags, cracked secret walls, and the No-Hit *Golden Frying Pan* Easter egg.
- [ ] **Phase 6 — Online Multiplayer Plaza (Colyseus)**
  - Real-time multi-channel `AREA 0` / `AREA 1` village plaza, synced movement, overhead chat bubbles, and emotes.
- [ ] **Phase 7 — Accounts, Cloud Saves & Social (Supabase)**
  - Login/Register, persistent Coins/Gold/Diamonds, farm/machine timers, inventory, friends list, and tap-on-player menu.
- [ ] **Phase 8 — Co-op Boss Raids, Open World & Side Activities**
  - 2–4 player scaled Boss Rooms, Endless Pagoda Tower, Riverside Fishing, Lucky Wheel, Pagoda Bundles, NPCs/Hearts, and Player Market (5% tax).
- [ ] **Phase 9 — Custom Khmer Art, Audio & Content Expansion**
  - Replace placeholders with cohesive chibi pixel art, 4 seasonal palettes, 8 biomes, sound effects, and rolling out Bosses #2–#28 + Boss Rush.
- [ ] **Phase 10 — Live Launch on `www.bluexacedamy.space`**
  - Deploy client to Vercel (`www.bluexacedamy.space`), server to Railway/Fly.io, connect Stripe / ABA PayWay KHQR for Diamond Store & Village Pass, and run closed alpha with friends.
