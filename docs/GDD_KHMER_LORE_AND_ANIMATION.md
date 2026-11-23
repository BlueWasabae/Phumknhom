# ភូមិខ្ញុំ (Phum Khnhom) — Khmer Classes, 28-Boss Mythology & Combat Animation Bible

## Cultural Design Rule
* **True Corrupt Bosses:** Folklore ghosts and Reamker demons (*Arp, Krahang, Pret, Preay, Yeak, Krong Reap, Rahu*) are corrupt forces threatening the village.
* **Ancient Sacred Trials:** Revered Khmer figures (*Neak Reach, Krut, Moni Mekhala, Sovann Maccha, Preah Agni*) are framed respectfully as **Sacred Trials** testing whether the hero is worthy of their blessing and relic.

---

## 1. Five Distinct Khmer Playable Classes (Combat Styles & Animations)

Each build embodies a distinct Khmer fighting art—with unique idle stances, weapon trails, movement feel, and Dungeon animations (while maintaining chibi proportions in the Village):

| Class (Khmer Name) | Signature Khmer Weapons | Playstyle & Unique Mechanic | Distinct Combat & Movement Animations |
| :--- | :--- | :--- | :--- |
| **1. អ្នកចម្បាំងល្បុក្កតោ** *(Lbokator Warrior — Melee)* | **Phkak** *(ផ្គាក់ — curved battle pole-axe)*, **Ampeh Plork** *(អំបោះភ្លុក — ivory rope gauntlets)*, **Lompang** *(លំពែង — spear)*, Wooden Arm Shield | **Animal-Stance Combos:** Chaining hits shifts through 3 stances (*Lion* = heavy knockback, *Crocodile* = armor pierce, *Hanuman* = aerial knee strike). | **Idle:** Low martial arts guard with breathing bounce. **3-Hit Combo:** Horizontal slash → spinning **flying elbow/knee strike** (Angkor Wat carving pose) → overhead *Phkak* ground slam with dust burst. **Dash:** Forward shoulder-roll leaving golden dust sparks. |
| **2. ព្រានធ្នូទេព** *(Divine Archer — Ranged)* | **Thnu** *(ធ្នូ — Reamker longbow)*, **Snar** *(ស្នា — traditional Khmer crossbow)*, Bamboo Blowpipe | **Elemental Quiver:** Swap arrows mid-fight (*Chili Fire*, *Lotus Piercing*, *Thunder Bolt*). Charging shots fires splitting arcs like Preah Ream's divine arrows. | **Idle:** Bow tilted slightly downward; feathers sway. **Attack:** Smooth drawstring pull with glowing arrowhead glint; slight backward recoil hop when firing mid-air. **Dash:** Acrobatic **backflip** that fires 1 quick arrow mid-air. |
| **3. គ្រូមន្តអាគម** *(Achar / Eisei Mystic — Magic)* | **Sastra Sleuk Rith** *(សាស្ត្រាស្លឹករឹត — sacred palm-leaf tome)*, Lotus Staff, Floating **Yant** *(យ័ន្ត)* Seals | **Yant Sigil Weaving:** Casting spells leaves glowing geometric Khmer *Yant* runes floating in the air; detonating 3 runes triggers a massive sacred beam. | **Idle:** Floats 4 pixels above ground with slowly rotating golden *Yant* ring behind back. **Attack:** Palms open outward (classical mudra gesture) as floating palm-leaf pages orbit and shoot glowing orbs. **Dash:** Blink-teleport dissolving into golden lotus petals. |
| **4. អ្នកកាន់បារមី** *(Barami Spirit Tamer — Summoner)* | **Krama Whip** *(ក្រមា)*, Sacred Brass Bell, Ancestral Incense Censer | **Spirit Pact:** Crack your *Krama* to mark a boss; summoned Khmer spirits (**Mini-Naga**, **Hanuman Monkey Wisp**, **Baby Reachisey**, **Firefly Lantern**) focus-fire the marked spot. | **Idle:** Glowing incense smoke trails upward from weapon; tiny spirits bob in a figure-8 around your head. **Attack:** Wide snapping wave of the checkered *Krama* cloth with a crisp silk-trail ribbon VFX. **Dash:** Briefly merges into a spirit silhouette passing through projectiles. |
| **5. អ្នកប្រមាញ់ស្រមោល** *(Shadow Hunter — Rogue / Stealth)* | **Kambet Bantoh** *(កាំបិតបន្ទោះ — twin curved knives)*, **Trabiet** *(ត្របៀត — Bokator nunchaku)*, Bamboo Smoke Bombs | **Stealth Strike Bar:** Pausing attacks lets you fade into dark village-night mist; next throw unleashes an explosive **Shadow Strike** with guaranteed bleed/crit. | **Idle:** Crouched agile stance; body fades to 45% translucent purple mist when Stealth is full. **Attack:** Rapid crisscross twin-blade flashes or spinning *Trabiet* boomerang arc. **Dash:** Instant smoke-puff vanish leaving an afterimage decoy for 0.4s. |

---

## 2. All 28 Khmer Bosses — Names, Silhouettes, Rigs & Combat Styles

### Act I: ការភ្ញាក់ដឹងខ្លួននៃភូមិ *(Village Awakening | Lv. 1–25)*

| # | Khmer Boss Name | Myth / Folklore Origin | Rig & Unique Fighting Style | Signature Visual Animation |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **ស្តេចកង្កែបភក់** *(Sdech Kongkaeb Phok)* | Muddy Rice-Field Frog King | `QuadrupedHopperRig` — **Hopper / Grappler:** Bounces across platforms, lashes sticky tongue to pull players, spawns bouncing tadpoles. | Inflates throat pouch bright red for 0.8s before launching a giant belly-flop shockwave. |
| **2** | **អាបព្រៃជ្រៅ** *(Arp Prey Chrov)* | *Arp (អាប)* — Floating head ghost with glowing entrails | `FloaterRig` — **Floating Swooper (Dark Arena):** Hunts in pitch-dark bamboo woods; its **glowing organs act as the only light source** before darting in figure-8s. | Pulsing neon-green/red bioluminescent trail; head laughs and spins rapidly before a high-speed dash. |
| **3** | **ក្រហាំងយប់ជ្រៅ** *(Krahang Yup Chrov)* | *Krahang (ក្រហាំង)* — Male ghost flying with winnowing baskets & rice pestle | `FloaterRig` — **Aerial Dive-Bomber:** Flies above platforms flapping woven bamboo baskets (*Chong-er*), slamming down with a giant wooden pestle (*Angre*). | Flaps bamboo wings creating downward wind gusts, flips upside-down, and meteor-slams the floor. |
| **4** | **ខ្មោចព្រាយព្រៃ** *(Khmouch Preay Prey)* | *Preay (ព្រាយ)* — Wild vengeful forest spirit | `HumanoidRig` — **Area Denial / Screamer:** Phases through platforms, lashes whipping black hair across lanes, and roots the ground with banyan vines. | Hair stretches into 6 jagged shadow tendrils; white sonic rings expand from a shriek telegraph. |
| **5** | **យក្សថ្មប្រាសាទ** *(Yeak Thmor Prasat)* | Temple Stone *Yaksha (យក្ស)* guardian | `HumanoidRig` — **Heavy Juggernaut:** Slow, massive sandstone giant swinging a stone war club (*Dambong*) that shatters temporary platforms and drops ceiling rubble. | Moss and dust crumble off shoulders; club glows fiery orange before smashing the ground. |
| **6** | **ក្រពើអភិទន្លេ** *(Krapeu Aphi Tonle)* | *Chao Aphi* — Legendary giant Mekong crocodile | `QuadrupedHopperRig` — **Submerging Ambush Boss:** Arena is half-flooded; dives underwater leaving bubbling ripples, then erupts vertically with massive snapping jaws. | Glowing amber eyes appear beneath the water surface 1.0s before an explosive breach. |
| **7** | **ប្រេតអត់ឃ្លាន** *(Pret Ot Khlean)* | *Pret (ប្រេត)* — Towering hungry ghost with needle-thin throat | `HumanoidRig` — **Vacuum / Gravity Controller:** Towering lanky silhouette that inhales air to pull players toward its maw while raining cursed soul-fire. | Jaw unhinges dramatically with swirling gray wind suction lines pulling debris inward. |
| **8** | **សត្វមករទ្វារប្រាសាទ** *(Sat Makara Tvear Prasat)* | *Makara (មករ)* — Crocodile-elephant-peacock temple beast | `QuadrupedHopperRig` — **Monster-Disgorger:** Opens gigantic jaws to **spit out mini stone lions, fire orbs, and rolling boulders**. | Trunk curls upward, jaws lock wide open, and glowing stone minions launch out like a cannon. |
| **9** | **ស្តេចយក្សទ្វារភ្លើង — មហាកុម្ភៈ** *(Act I Gatekeeper: Maha Kumpak)* | Inspired by *Kumpakarn (កុម្ភការណ៍)* awakening in the magma vault | `HumanoidRig` — **Advancing Wall / Flood Boss:** Sweeps across a long obsidian bridge with the cursed *Mokasak* spear and rising magma waves. | Eyes snap open in fiery cracks; drags giant spear leaving a continuous trail of molten sparks. |

---

### Act II: ការបែកបាក់នៃត្រាបុរាណ *(The Shattered Seal — Hardmode | Lv. 26–60)*

| # | Khmer Boss Name | Myth / Folklore Origin | Rig & Unique Fighting Style | Signature Visual Animation |
| :---: | :--- | :--- | :--- | :--- |
| **10** | **សិង្ហថ្មទឹកកក** *(Singha Thmor Teuk Kok)* | Angkorian Temple Lion (*Singha*) infused with winter mist | `QuadrupedHopperRig` — **Agile Quadruped Pouncer:** Leaps between high ledges, firing freezing claw waves and crystallizing platforms into slippery ice. | Crouches low with glowing frost mane flaring outward before a lightning-fast pounce. |
| **11** | **រាជសីហ៍ដែកបុរាណ** *(Reachisey Daek Boran)* | Clockwork *Reachisey (រាជសីហ៍)* — Lion-head, dragon-scaled royal beast | `QuadrupedHopperRig` — **Armored Mech-Beast:** Dragon-scale armor plates block front damage (dash behind or break dorsal vents) + sonic trunk blasts. | Scales unfold like brass vents venting steam; fires a sweeping golden furnace beam. |
| **12** | **រាមឥសូ និង មណីមេខលា** *(Ream Eyso & Moni Mekhala)* | Iconic Khmer Legend of **Thunder & Lightning** *(Dual Trial)* | `HumanoidRig` + `FloaterRig` — **Signature Dual Boss:** *Ream Eyso* throws his spinning **Diamond Axe** (thunder shockwaves); *Moni Mekhala* dances in the sky tossing her **Crystal Ball** (blinding lightning flashes). | Authentic **Robam classical dance arcs** for Mekhala; booming screen-shake + purple thunderbolts for Ream Eyso. |
| **13** | **កិន្នរ និង កិន្នរីភ្លើង** *(Kinnara & Kinnari Phleung)* | Celestial half-bird musicians (*Kinnari*) | `FloaterRig` — **Rhythmic Bullet-Hell Duo:** Play ghostly *Pinpeat* notes spawning visible musical-note projectile waves moving to a steady beat. | Synchronized figure-8 wing glides dropping glowing lotus feathers that detonate on the musical beat. |
| **14** | **ព្រាយក្រឡាភ្លើង** *(Preay Krola Phleung)* | *Preay Krola Phleung* — Feared Khmer fire spirit | `HumanoidRig` — **Teleporter / Clone Assassin:** Blinks behind players leaving burning ember rings, then splits into 3 identical silhouettes (only the real one casts a shadow). | Snaps into floating blue-orange flames and reforms directly behind the player's last jump. |
| **15** | **សុវណ្ណមច្ឆា និង នាគសមុទ្រ** *(Sovann Maccha & Neak Samot)* | *Reamker* Golden Mermaid Princess *(Sacred Trial)* | `FloaterRig` + `MultiSegmentWormRig` — **Underwater Low-Gravity Fight:** Slow buoyant jumps; Maccha commands swirling vortex currents and golden fish shields while a sea serpent patrols below. | Flowing golden tail ribbons create sparkling bubble currents that physically push players across the screen. |
| **16** | **គជសីហ៍ដួងផ្កាយ** *(Kochasith Duong Phkay)* | *Kochasith (គជសីហ៍)* — Winged lion with elephant head | `QuadrupedHopperRig` — **Gravity-Charge Titan:** Calls down starlight meteorites that flip arena gravity briefly, then charges full-screen with glowing ivory tusks. | Wings spread wide in an astral halo; tusks ignite like twin lances before a screen-wide stampede. |
| **17** | **នាគរាជ ៧ ក្បាល** *(Neak Reach Prampil Kbal)* | Seven-Headed Royal *Naga (នាគរាជ)* *(Sacred Trial)* | `MultiSegmentWormRig` — **Colossal Multi-Segment Worm + Fan Beams:** Weaves through background and foreground; all 7 cobra hoods fan open to fire synchronized laser fans. | Smooth sinusoidal segment animation; hoods rattle and flare sequentially from Head #1 to Head #7. |
| **18** | **គ្រុឌមាសវេហា** *(Krut Meas Veha)* | *Krut (គ្រុឌ / Garuda)* — Golden King of Birds *(Sacred Trial)* | `FloaterRig` — **High-Speed Sky Acrobat:** Generates strong directional wind pushing players off cloud platforms while diving in sharp golden V-slashes. | Dramatic wing-fold dive leaving golden afterimages, followed by a shockwave feather explosion. |
| **19** | **រាហូ លេបព្រះចន្ទ** *(Act II Gatekeeper: Rahu Leb Preah Chan)* | *Rahu (រាហូ)* — Cosmic demon who devours the Sun & Moon | `FloaterRig` — **Eclipse Darkness & Giant Mouth Laser:** Disembodied cosmic torso & glowing claws; plunges arena into a **Blood Eclipse** while firing a massive sweeping lunar beam. | Moon slowly slides behind Rahu's silhouetted hands; arena shifts deep crimson before his eyes flash white. |

---

### Act III: មហាកល្បនៃទេវកថា *(Mythic Trials of the Ancient Gods | Lv. 61–100)*

| # | Khmer Boss Name | Myth / Folklore Origin | Rig & Unique Fighting Style | Signature Visual Animation |
| :---: | :--- | :--- | :--- | :--- |
| **20** | **ឥន្ទ្រជិត ព្រះអង្គម្ចាស់មាយា** *(Indrajit — Prince of Illusions)* | *Indrajit* (Son of Krong Reap in *Reamker*) | `HumanoidRig` — **Stealth Cloud Illusionist:** Hides inside thunderclouds turning invisible; fires **Neakabas (Serpent Arrows)** turning into homing snakes on impact. | Disappears into swirling storm-mist; golden bow briefly gleams inside clouds right before volley fires. |
| **21** | **ព្រះអគ្គី អណ្តាតភ្លើងស័ក្តិសិទ្ធិ** *(Preah Agni — Sacred Flame Trial)* | *Preah Agni (ព្រះអគ្គី)* — God of Sacred Fire | `FloaterRig` — **Bullet-Hell Chariot:** Rides a blazing ram-drawn fire chariot leaving burning floor walls and spiral solar flares (high Focus-gauge skill check). | Blazing golden aura ring rotates behind him; arena borders ignite into shrinking flame walls. |
| **22** | **អ្នកយាមទី១៖ វាយុព្យុះ** *(Sentinel I: Vayu Pyuh — Storm Weaver)* | Ancient Wind Serpent Sentinel | `MultiSegmentWormRig` — **Armored Tail-Weakpoint Worm:** Invulnerable armored body—only its glowing tail tip takes damage until Phase 2 shatters its armor into hyper-speed dashes. | Crackling cyan lightning arcs down every body segment; armor plates burst outward at 50% HP. |
| **23** | **អ្នកយាមទី២៖ អន្លង់ងងឹត** *(Sentinel II: Anlong Ngongit — Void Maw)* | Cosmic Chasm Sentinel | `FloaterRig` — **Orbital Bullet-Hell Core:** Central rift orb surrounded by orbiting dark energy spheres you must break to expose the core while dodging inward-pulling voids. | Swirling black-and-violet Angkorian *Yant* vortex warping nearby pixels. |
| **24** | **អ្នកយាមទី៣៖ ទូតស្រមោល** *(Sentinel III: Tout Sramol — Shadow Envoy)* | Nether Messenger of Langka | `HumanoidRig` — **Hyper-Dash Duelist:** Humanoid size moving with blazing sword-beams, parries, and rapid shadow-clones. | Crisp silhouette dashes with glowing red eye-trails; raises blade in a stance that counters spam-attacks. |
| **25** | **អារក្សប្រាសាទបាក់បែក** *(Arak Prasat Bak Baek)* | *Arak (អារក្ស)* — Ancient vengeful ruin spirit | `FloaterRig` — **Tethered Haunting Core:** Chains itself to dungeon walls using spectral hooks, slingshotting violently across the chamber while spawning crying ghost lanterns. | Spectral chains visibly snap onto stone walls and pull taut before slingshot launches. |
| **26** | **នាគចក្រវាឡ អនន្ត** *(Neak Chakkaval Anan — Cosmic Naga)* | Infinite Astral Space Naga | `MultiSegmentWormRig` — **Portal-Tearing Cosmic Worm:** Tears glowing **space rifts** across the sky, lunging out of portals while drawing full-screen laser grid corridors. | Bright magenta laser-grid preview lines flash for 0.9s before snapping into blinding cosmic beams. |
| **27** | **ព្រះកាល — អ្នកលេបពេលវេលា** *(Preah Kala — Devourer of Time)* | *Kala / Kirtimukha (ព្រះកាល)* carved above Angkor lintels | `FloaterRig` — **Time-Manipulation Boss:** Spawns **Slow-Time Bubbles** (freezing projectiles mid-air before releasing them all at once) and **Rewind Phases**. | Giant floating fanged Angkor mask with orbiting clockwork rings and floating sandstone hands. |
| **28** | **ក្រុងរាពណ៍ ទសមុខ មហាកល្ប** *(Final Boss: Krong Reap — Ten-Faced Mythic Sovereign)* | *Krong Reap (ក្រុងរាពណ៍)* — 10-Headed, 20-Armed Demon King of Langka | `HumanoidRig` (Multi-Phase) — **Ultimate 4-Phase Spectacle:** Starts in Lakhon Khol stance; every 25% HP, more of his **10 crowned heads & 20 golden arms** unfurl, rotating Bow, Club, Trident, Fire Chakra, and Spear in a Mythic bullet-hell finale. | **P1:** Lakhon Khol footwork. **P2:** 10 heads stack in a golden pyramid. **P3:** 20 arms fan out like an Angkor bas-relief. **P4 (<15%):** Desperate eclipse duel with *Pinpeat* + rock theme. |

### 3 Secret Folklore Superbosses (Easter Eggs)
* **#29 យក្សធូរេនបណ្តាសា *(Yeak Turen Bandasa — Cursed Durian Golem)*:** Triggered by harvesting a Nighttime Golden Durian → tosses exploding spiky durian shells and green stink clouds.
* **#30 ខ្មោចប្រមូលពន្ធ *(Khmouch Pramoul Pon — Shadow Tax Collector)*:** Ambushes players carrying 1,000,000+ unbanked Coins in Blighted Marsh → throws giant spinning gold coins and steals temporary coin pouches you must pick back up before he vanishes.
* **#31 នាគបាតសមុទ្របុរាណ *(Neak Bat Samot Boran — Primordial Abyssal Wyrm)*:** Awakens only if a player uses a Teleportation Rod inside the deepest Sapphire Trench.

---

## 3. Combat Feel & 2D Animation Rules

### The 4-Stage Boss Telegraph Rule (Fairness First)
Every boss attack passes through 4 clear visual states for PC & mobile readability:
1. **Anticipation / Wind-Up (`0.4s – 0.9s`):** Boss pauses, flashes a color cue (`Yellow` = Dash, `Red` = Slam/AOE, `Purple` = Laser, `Green` = Poison), and draws a faint ground/line warning marker.
2. **Active Strike (`0.2s – 0.6s`):** Fast, snappy animation with a distinct weapon smear/arc and hitbox.
3. **Impact Juice:** `40ms` hit-stop freeze on heavy hits, subtle camera shake, white flash tint on the struck sprite, and floating crit numbers.
4. **Recovery Window (`0.6s – 1.2s`):** Boss pants, resets stance, or lowers guard—giving melee *Lbokator* players a clear opening.

### Silhouette & Color Contrast
* Keep dungeon backgrounds slightly desaturated (dark moss stone, deep indigo night, muted sandstone) so **bright player attacks (gold/cyan)** and **bright boss projectiles (crimson/neon green/violet)** stand out clearly on phone screens.

### 4 Reusable Phaser 3 Boss Rigs (Solo-Dev Pipeline)
1. **`HumanoidRig`** *(idle, walk, windup, strike, dash, phase-roar)* → *Yeak Thmor, Krong Reap, Indrajit, Ream Eyso, Preay, Tout Sramol*.
2. **`FloaterRig`** *(hover bob, tilt-dash, spin-charge, projectile-cast)* → *Arp, Krahang, Moni Mekhala, Kinnari, Krut, Preah Kala, Rahu, Preah Agni*.
3. **`QuadrupedHopperRig`** *(crouch, leap arc, slam, roar)* → *King Frog, Singha, Reachisey, Kochasith, Makara, Giant Crocodile*.
4. **`MultiSegmentWormRig`** *(head follows spline/target; body segments trail dynamically)* → *Neak Reach 7-Headed, Storm Weaver, Cosmic Naga, Abyssal Wyrm*.
