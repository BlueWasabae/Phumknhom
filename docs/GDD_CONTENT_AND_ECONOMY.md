# ភូមិខ្ញុំ (Phum Khnhom) — Content, Economy, Easter Eggs & IAP Design

## 1. Expanded Farming Ecosystem (Seeds, Trees, Livestock & Timers)

Active short crops give higher **profit per minute** for active players, while long crops and trees give higher **profit per harvest** for players checking in every few hours.

### Row Crops (Replantable Seeds)
| Tier | Crop Name | Seed Cost | Growth Time | Sell Price | Net Profit | Primary Cooking / Crafting Use |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **T1** | **Trakuon** *(Water Morning Glory)* | 10 Coins | 2 min | 25 Coins | +15 | Basic HP Snacks, Starter Quests |
| **T1** | **Slek Krey** *(Lemongrass)* | 25 Coins | 5 min | 60 Coins | +35 | Anti-Poison Elixirs, Soup Base |
| **T2** | **Phka Rumduol** *(Jasmine Rice)* | 60 Coins | 15 min | 150 Coins | +90 | Num Pang, Rice Bowls, Pet Food |
| **T2** | **Mtes** *(Red Chili)* | 120 Coins | 25 min | 300 Coins | +180 | Attack Buff Skewers, Fire Potions |
| **T3** | **Pink Lotus** | 300 Coins | 45 min | 750 Coins | +450 | Mana/Energy Teas, Magic Staff Crafting |
| **T3** | **Kampot Pepper** | 600 Coins | 90 min | 1,600 Coins | +1,000 | Elite Boss Buff Meals, High Coin Export |
| **T4** | **Spirit Bamboo** *(Dungeon Seed)* | *Loot Only* | 120 min | 3,500 Coins | +3,500 | Tier 4+ Weapon & Armor Upgrades |

### Perennial Fruit Trees (Plant Once, Harvest Forever)
| Tree Sapling | One-Time Cost | Initial Grow Time | Harvest Cooldown | Output & Use |
| :--- | :--- | :--- | :--- | :--- |
| **Coconut Palm** | 2,000 Coins | 2 hours | Every 60 min | 2x Fresh Coconut (Poison Cure + Instant Heal) |
| **Sugar Palm (Tnot)** | 5,000 Coins | 4 hours | Every 90 min | Palm Sugar (Sweet Snacks, Kafé, Speed Buffs) |
| **Mango Tree** | 10,000 Coins | 6 hours | Every 2 hours | 2x Sweet Mango (Crit Buff Desserts, High Happy) |
| **Golden Durian Tree** | 25,000 Coins | 8 hours | Every 3 hours | 1x Golden Durian (Endgame Raid Food + **Secret Boss Trigger**) |

### Farm Livestock & Helpers
* **Village Chicken (1,500 Coins):** Drops **Fresh Eggs** every 20 min (requires 1 Rice feed). Used in bakery snacks.
* **Water Buffalo (8,000 Coins):** Produces **Fresh Milk** & **Rich Fertilizer** every 45 min.
* **Golden Silk Moth (18,000 Coins):** Produces **Silk Threads** every 2 hours (required to craft rare village outfits & capes).

### Core Farming Mechanics & Upgrades
* **Watering Bonus:** Watering a planted tile cuts remaining growth time by **20%** (and boosts `Farm Level` XP).
* **Fertilizer System:** Applying Fertilizer (200 Coins or from Water Buffalo) gives a **20% chance** to harvest a **Gold-Star Crop** (sells for **1.5x Coins** and makes cooked snacks last **+60 seconds longer**).
* **Weather Events (Global Server Timer):** Every 2 real-time hours, weather rotates (`Sunny`, `Monsoon Rain` = auto-waters all farms, `Night Market` = +15% Snack Cart profit, `Blood Moon` = +20% Dungeon Boss drop rate).

---

## 2. Cooking & Street Snack Alchemy (Farm → Dungeon Bridge)

Players cook at their Farm Kitchen or buy ready-made snacks (at a slightly higher Coin markup) from Village Street Carts. Snacks refill Village `Healthy`/`Happy` bars AND slot into the Dungeon Quick-Bar.

| Snack / Dish | Ingredients Required | Village Effect | Dungeon Combat Effect |
| :--- | :--- | :--- | :--- |
| **Num Pang** *(Crispy Baguette)* | 1 Rice + 1 Egg | `Healthy +15` | Instant +60 HP heal |
| **Kafé Tek Dos Ko** *(Iced Coffee)* | 1 Palm Sugar + 1 Milk | `Happy +15` | +20% Move Speed & Jump Power (3 min) |
| **Coconut Anti-Venom** | 1 Coconut + 1 Lemongrass | `Healthy +20` | Instant +80 HP + Poison Immunity (2 min) |
| **Kampot Pepper Skewers** | 1 Chili + 1 Kampot Pepper + 1 Mob Meat | `Healthy +25` | +25% Melee & Ranged Attack (4 min) |
| **Lotus Spirit Tea** | 2 Pink Lotus + 1 Palm Sugar | `Happy +25` | +50% Energy/MP Regen (4 min) |
| **Golden Durian Feast** *(Raid Food)* | 1 Golden Durian + 1 Mango + 1 Milk | `Healthy +50, Happy +50` | **+20% Max HP, +15% ATK, +15% Crit** (5 min) |

---

## 3. Core 6-Tier Boss Blueprint (Foundation Roster)

Every boss is fought in a **2D side-scrolling arena** with distinct platform layouts, telegraphed attacks, and scalable co-op HP (`+65%` per extra party member). *(See `GDD_SYSTEMS_SKILLS_AND_BALANCE.md` for the full 28-boss expansion.)*

| Tier | Dungeon Biome & Boss | Entry Requirement | Signature Attack Phases | Guaranteed & Rare Drops |
| :--- | :--- | :--- | :--- | :--- |
| **T1** | **Muddy Rice Hollow** — *Sdech Kongkaeb (King Frog)* | None (Starter) | **P1:** High jump slams + tongue grab. **P2 (<50% HP):** Spawns mini tadpoles + double belly-flop shockwaves. | Slime Core, Starter Coins, **Rare (8%):** *Frog Prince Crown* (Hat) |
| **T2** | **Ancient Stone Ruins** — *Yeak Thmor (Stone Yaksha)* | Lv. 5 + 1 Stone Key *(from T1)* | **P1:** Telegraphed heavy club slam + rolling ground wave. **P2:** Roars, drops ceiling boulders, armored dash charge. | Stone Core, Spirit Bamboo Seed, **Rare (5%):** *Yaksha Mask* + *Heavy Stone Club* |
| **T3** | **Sunken Lotus Crypt** — *Neak Reach (Shadow Naga)* | Lv. 12 + T2 Gear | **P1:** Multi-segment serpent weaving through platforms + poison pools. **P2:** Floods bottom floor (forces players onto high ledges) + water orbs. | Naga Scales, Lotus Essence, **Rare (4%):** *Venom Fang Blade* + *Mini Naga Pet* |
| **T4** | **Burning Palm Woods** — *Preay Phleung (Ember Demon)* | Lv. 20 + Fire Charm | **P1:** Teleports between platforms firing flame rings. **P2:** Summons 2 shadow clones + vertical fire pillars across arena. | Ember Silk, Flame Ore, **Rare (3%):** *Ignis Bow* + *Ember Wings* |
| **T5** | **Sky Pagoda Spire** — *Kroth Meas (Garuda Sentinel)* | Lv. 30 + Wind Key | **P1:** Aerial dive swoops + feather bullet-hell barrages. **P2:** Gust winds pushing players toward arena edges + lightning strikes. | Golden Feathers, Sky Shards, **Rare (2%):** *Skybreaker Spear* + *Radiant Garuda Wings* |
| **T6** | **The Eclipse Sanctum** — *Rahu (Devourer of the Moon)* | Lv. 40 + 2–4 Player Party Recommended | **P1:** Darkens screen (torches/pets light up radius) + sweeping claw slashes. **P2:** Low-gravity eclipse phase + giant lunar laser beam. **P3 (<20%):** Enraged meteor storm. | Eclipse Shards, Gold Gems, **Rare (1.5%):** *Moon-Eater Greatsword* + *Cosmic Eclipse Aura* |

---

## 4. Easter Eggs, Secret Weapons & Hidden Boss Triggers

Build mystery into the world so players talk about discoveries in the Village Plaza chat:

### Secret Bosses & Hidden Events
1. **The Durian Golem *(Secret Farm/Arena Boss)*:**
   * *Trigger:* When harvesting a **Golden Durian** during in-game **Nighttime**, there is a **5% chance** it drops a *Cursed Rotten Durian*. Dropping it into the Central Plaza Wishing Well opens a secret portal to fight the comical **Durian Golem**.
   * *Reward:* **Spiky Durian Mace** (swinging launches 3 thorny durian spikes) + *"Smelly Legend"* nameplate title.
2. **Cracked Secret Walls *(Every Dungeon)*:**
   * Every dungeon instance spawns **1 hidden cracked tile** with a faint pixel shimmer. Hitting it 3 times breaks open a hidden chamber containing either a **Relic Chest** (free Gold + rare dye) or the **Wandering Shadow Merchant** selling 1 discounted mystery item.

### Secret & Condition-Locked Weapons (Cannot Be Bought!)
* **The Golden Frying Pan *(No-Hit Easter Egg)*:** Defeat *King Frog (T1)* without taking a single point of damage → unlocks a secret melee weapon with a loud metallic **"BONK!"** sound and 40% Critical Hit chance.
* **Krama of Shadows *(Secret Evolution)*:** Buy the cheapest 100-Coin starter *Village Krama* (scarf), wear it while surviving Phase 2 of *Rahu* → it permanently transforms into the mythic **Shadow Krama** (+10% Dodge + drifting purple mist trail).
* **Bamboo Wind Katana *(Explorer Secret)*:** Harvest 100 total *Spirit Bamboo* crops → unlocks a hidden scroll buried in your farm soil teaching the recipe for a dash-striking katana.
* **Riverside Secret *(Social Easter Egg)*:** Sit on the far-right Riverside Park Bench with a friend for 60 continuous seconds while typing `សួស្តីភូមិខ្ញុំ` → spawns a swarm of glowing fireflies and permanently gifts both players the **Firefly Lantern Pet**.

---

## 5. Clear Ecosystem & Balanced Money Flow

To stop inflation from ruining an online MMO, every **Coin Faucet** (money entering the game) must be balanced by strong **Coin Sinks** (money leaving the game).

### The 3-Currency Structure
| Currency | How Players Get It | What It Buys | Tradeable? |
| :--- | :--- | :--- | :--- |
| **Coins** *(Soft)* | Farming, Fishing, Daily Quizzes, Selling Boss Trash, Market Sales | Seeds, Saplings, Livestock, Street Snacks, Farm Land Expansion, Gear Crafting/Upgrades, Coin Lucky Wheel | Yes (via Player Market with 5% tax) |
| **Gold** *(Rare Earned)* | First-Time Boss Clears, Achievements, Weekly `TOP TEN`, Rare Secret Chests | Elite Cosmetics, Special Pets, Gold Lucky Wheel, Dungeon Keys | No (Account-Bound) |
| **Diamonds** *(Real Money IAP)* | Purchased with Real Money (Card / KHQR / PayWay / Stripe) | Premium Outfits, Animated Wings, Auto-Loot Pets, Mounts, Bag/Preset Slots, Monthly Village Pass | No (Prevents Gold-Seller Bots) |

### Visual Money Flow Loop (Player-Driven Economy)
```text
 [FAUCETS: Money In]                [PLAYER EXCHANGE]                [SINKS: Money Out]
 ───────────────────                ─────────────────                ──────────────────
 • Crops & Trees   ──► Cook Raid Food ──► Sell on Village Market ──► • 5% Market Tax
 • Fishing & Quiz                         (Farmers supply Raiders)   • Seeds & Fertilizer
 • Dungeon Mobs    ──► Boss Materials ──► Craft Weapons / Clothes ──► • Crafting & +1 to +10 Upgrade Fees
                                                                     • Unlocking Farm Plots (5k -> 25k -> 100k)
                                                                     • House Furniture & Coin Lucky Wheel
```

* **Why this balances naturally:** Pure **Farmers** earn steady Coins and cook high-tier **Golden Durian Feasts**. Pure **Dungeon Raiders** need those feasts to survive *Garuda* and *Rahu*, so raiders buy snacks from farmers using Coins earned from dungeon runs—keeping both playstyles valuable and connected.
* **Upgrade Sink (+1 to +10 Gear Forging):** Upgrading a weapon from `+1` to `+10` at the Blacksmith costs escalating Coins + Boss Shards. Higher levels have a chance to stay at the current level (never destroy the player's hard-earned weapon—just consume the Coins and Shards so it feels fair while draining excess Coins from the economy).

---

## 6. Real-Money Store (IAP Strategy — Profitable & Fair)

Players love supporting indie MMOs when purchases feel **prestigious, cute, or convenient**—never **Pay-to-Win**.

### What Real Money (`Diamonds`) Buys
1. **Prestige Cosmetics & Seasonal Fashion *(Main Revenue Driver)*:**
   * Limited-time cultural & fantasy collections: *Khmer New Year Royal Set*, *Water Festival Boat Captain*, *Cyber-Apsara Suit*, *Angel/Demon Animated Wings*, custom colored **Chat Bubble Skins**, and glowing **Weapon Skins** (cosmetic overlay only—uses stats of your real boss weapon).
2. **Quality-of-Life (QoL) Pets & Village Mounts:**
   * **Auto-Loot Pet** (e.g., *Lucky White Kitten* or *Baby Elephant*): Automatically picks up dropped coins/ores in dungeons. Saves time without adding combat damage.
   * **Plaza Mounts:** Mini Tuk-Tuk, Floating Lotus Cloud, or Skateboard (+40% movement speed inside Village/Plaza only; disabled in Dungeon combat).
3. **Account Convenience Upgrades:**
   * Extra Inventory Bag Rows (+12 slots).
   * Extra Outfit Preset Slots (swap between "Farming Look" and "Boss Raid Look" in 1 tap).
   * **Auto-Water Sprinkler Blueprint** (also craftable late-game with T4 Boss Shards, or unlockable early with Diamonds).
4. **Monthly "Village Pass" ($2.99 – $4.99 / month):**
   * Instant 300 Diamonds + 20 Diamonds daily login.
   * +15% Farm XP & +1 extra daily Coin Lucky Wheel spin.
   * Exclusive monthly animated Hat/Pet + golden VIP name badge in Plaza chat.
5. **Royal Lucky Wheel (Transparent Pity System):**
   * Uses Diamonds or free earned Gold Tickets. Displays exact drop rates and guarantees the featured Mythic Cosmetic within **50 spins**.

*Web Payment Tip for `www.bluexacedamy.space`:* Because the game runs in the browser, it avoids the 30% Apple/Google app store cut. Integrate **Stripe** (international cards) + **ABA PayWay / KHQR** (for local Cambodian players) directly on the backend server.
