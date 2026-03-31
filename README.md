```
 _____ _                    _                    
/  ___| |                  | |                   
\ `--.| |_ ___  _ __   ___| | _____  ___ _ __   
 `--. \ __/ _ \| '_ \ / _ \ |/ / _ \/ _ \ '_ \  
/\__/ / || (_) | | | |  __/   <  __/  __/ |_) | 
\____/ \__\___/|_| |_|\___|_|\_\___|\___| .__/  
                                        | |      
                                        |_|      
```

---

<div align="center">

**A desert fortress builder with ASCII soul**

`[ Stronghold Crusader x Dwarf Fortress ]`

### [>>> PLAY IN BROWSER <<<](https://hoormazd1379.github.io/Stonekeep/)

---

`///  HTML5 Canvas  ///  Vanilla JavaScript  ///  Zero Dependencies  ///`

</div>

---

## :: Overview

Stonekeep is a castle-building strategy game set in a procedurally generated desert world. Inspired by **Stronghold Crusader**'s economy and **Dwarf Fortress**'s character depth, every peasant is a living individual with personality traits, memories, moods, relationships, and daily routines, all rendered in classic ASCII.

Build your keep, grow your population, manage complex production chains, and defend against bandit raids. Every character remembers what happened to them, forms friendships and rivalries, and reacts to the world around them.

---

## :: Features

### +++ World Generation
- Procedurally generated infinite desert with oases, grasslands, cliffs, and mineral deposits
- Seeded generation -- share seeds with others for identical maps
- Lazy chunk streaming -- terrain generates on demand as you explore
- Region-based feature placement: resource clusters, water bodies, elevation

### +++ Economy & Production
```
  Wheat Farm --> Windmill --> Bakery --> [Bread]
  Hops Farm  --> Brewery  --> Inn    --> [Happiness]
  Trees      --> Woodcutter           --> [Wood]
  Iron Mine  --> Blacksmith           --> [Swords]
```
- 14 resource types across primary, food, intermediate, weapon, and armor categories
- Multi-step production chains from raw materials to finished goods
- Granary, Stockpile, and Armory storage with capacity limits
- Bazaar auto-trade system with configurable min/max thresholds
- Tax and ration controls for economic balance

### +++ Living Characters
- **Personality Traits** -- Each NPC has unique traits (brave, cowardly, social, reclusive, pious, lazy...) that modify behavior, work speed, combat, and social interactions
- **Mood System** -- 15 data-driven mood factors: hunger, fatigue, housing, taxes, religion, disease, fear, ale, memories, relationships, and more
- **Memories** -- NPCs form firsthand and secondhand memories of events (fires, raids, deaths, conversations) that affect their mood over time
- **Relationships** -- Dynamic relationship values between every pair of NPCs, shaped by social meetings, shared workplaces, and personality compatibility
- **Social Interactions** -- Data-driven tone system: pleasant chats, arguments, story sharing -- each with configurable thresholds and outcomes
- **Daily Schedule** -- Work / free time / sleep cycle tied to the day/night system
- **Hunger & Fatigue** -- Per-NPC vital stats with starvation risk and exhaustion effects
- **Housing Tiers** -- Hovels, Cottages, and Townhouses with quality-of-life bonuses

### +++ Day/Night Cycle
```
  Dawn [05:00] --> Day [07:00] --> Dusk [19:00] --> Night [21:00]
```
- Full 24-hour cycle with ambient lighting shifts
- NPCs follow phase-aware schedules
- Night brings increased danger and reduced visibility
- 128 game ticks per in-game hour

### +++ Military & Defense
- Wall and tower construction with height-based defense bonuses
- Troop types: Archers, Spearmen, Swordsmen, Fire Throwers
- Barracks recruitment from weapon stockpiles
- Bandit raids that scale with population
- Moat and pitch ditch fire traps
- Keep, Watchtower, and Guard Post auto-fire at hostiles (no NPC required)

### +++ Frontier & Outposts
- **Watchtower** — 2×2 tower with 30-tile vision radius and long-range auto-fire
- **Guard Post** — cheap 1×1 outpost with NPC-range vision and auto-fire
- **Forward Stockpile** — remote storage for wood, stone, iron, and other non-food resources
- **Forward Granary** — remote food storage; NPCs eat from the nearest granary
- Distributed storage with separate inventories per building; total resources pooled for spending
- Hauler workers automatically balance goods between forward storages and the main stockpile/granary
- Frontier alerts in the Event Log when hostiles are spotted

### +++ Fire System
- Dynamic fire spread between adjacent buildings
- Pitch ditches as defensive incendiary lines
- Building destruction from sustained fire damage
- NPCs can catch fire and suffer damage

### +++ Events & Crises
- Random event system: bandit raids, disease outbreaks, merchant caravans, wandering animals
- Grace period protecting new settlements
- Event log with category filtering and location tracking
- On-screen notification system

### +++ Companion Animals
- Tamed dogs that guard and attack hostile targets
- Tamed cats that provide passive healing to nearby NPCs
- Wild animal herds: deer, camels, lions
- Hunter's Post for meat production from wildlife

### +++ Save & Load
- 3 manual save slots with metadata display (day, population, timestamp)
- Automatic auto-save every 1200 ticks
- Full state serialization: world, NPCs, buildings, animals, events, time
- IndexedDB storage backend — virtually unlimited save capacity (many GB)
- Automatic migration of older localStorage saves to IndexedDB
- Load from main menu or continue existing games

### +++ Interface
- In-game Knowledge Base encyclopedia with 8+ sections
- Event Log with category filtering (Danger, Warning, Caution, Positive, Info)
- NPC detail modal: memories, mood breakdown, relationships
- Minimap with real-time updates
- Speed controls: Pause / 1x / 2x / 4x / 8x / 16x
- Fog of War toggle

---

## :: Tech Stack

```
+-------------------------------------------------------+
|                                                       |
|  Language ........... JavaScript (ES6+, strict mode)  |
|  Rendering .......... HTML5 Canvas (2D context)       |
|  Style .............. ASCII / Unicode tiles           |
|  Frameworks ......... None -- zero dependencies       |
|  Build Tools ........ None -- no transpilation        |
|  State Management ... Global singletons               |
|  Pathfinding ........ A* with binary min-heap         |
|  Map Generation ..... Seeded procedural (Perlin-ish)  |
|  Persistence ........ IndexedDB                      |
|  Server ............. Any static file server          |
|                                                       |
+-------------------------------------------------------+
```

---

## :: Architecture

```
stonekeep/
+-- index.html              Main document & styles
+-- src/
    +-- config.js           Game constants & tuning
    +-- utils.js            Math, RNG, noise, helpers
    +-- data/
    |   +-- terrain.js      Terrain type definitions
    |   +-- resources.js    Resource type definitions
    |   +-- buildings.js    Building data (cost, production, housing)
    +-- world.js            Central game state
    +-- mapGenerator.js     Procedural world generation
    +-- pathfinding.js      A* pathfinding & BFS search
    +-- renderer.js         Canvas ASCII renderer & minimap
    +-- input.js            Keyboard, mouse, drag selection
    +-- camera.js           Viewport, zoom, follow, shake
    +-- resources.js        Resource add/remove/query API
    +-- buildingPlacement.js  Build validation & setup flow
    +-- production.js       Production & processing logic
    +-- animal.js           Wildlife herds & companions
    +-- fire.js             Fire spread & damage
    +-- personality.js      NPC trait definitions & modifiers
    +-- mood.js             Data-driven mood factor system
    +-- memory.js           NPC memory formation & recall
    +-- relationship.js     Inter-NPC relationship tracking
    +-- npc.js              NPC state machine & AI
    +-- popularity.js       Happiness factors & taxes
    +-- military.js         Troop recruitment
    +-- events.js           Random events & disease
    +-- time.js             Day/night cycle
    +-- eventLog.js         Event log UI & filtering
    +-- animations.js       Overlay visual effects
    +-- saveLoad.js         Save/load serialization
    +-- knowledgeBase.js    In-game encyclopedia
    +-- ui.js               HUD, menus, panels
    +-- game.js             Game loop & tick management
    +-- main.js             Boot sequence
```

---

## :: Controls

```
+---------------------------+------------------------------------+
| Action                    | Input                              |
+---------------------------+------------------------------------+
| Scroll map                | WASD / Arrow keys / Middle-drag    |
| Zoom                      | Mouse wheel / +/- buttons          |
| Place building            | Left-click (with building selected)|
| Cancel placement          | Right-click / Escape               |
| Select tile/unit          | Left-click                         |
| Select multiple units     | Left-drag box selection            |
| Speed: Pause              | 1 key / || button                  |
| Speed: Normal to Max      | 2-5 keys / ribbon buttons          |
| Open Knowledge Base       | ? button (HUD)                     |
+---------------------------+------------------------------------+
```

---

## :: Quick Start

1. Serve the project directory with any static file server:
   ```
   cd stonekeep
   python3 -m http.server 8080
   ```
2. Open `http://localhost:8080` in a modern browser.
3. Click **New Game**, set a seed and map size, and start building.

No installation, no build step, no dependencies. Just files and a browser.

---

## :: License

Copyright (c) 2025 Stonekeep Contributors. All rights reserved.

This software is provided for personal, educational, and non-commercial use only.

You are permitted to:
- Fork, modify, and redistribute this software for non-commercial purposes
- Study the source code and learn from it
- Create derivative works for personal or educational use

You are NOT permitted to:
- Use this software or any derivative works for commercial purposes
- Sell, sublicense, or commercially distribute this software or derivatives
- Include this software in any commercial product or service

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED. IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES, OR
OTHER LIABILITY ARISING FROM THE USE OF THIS SOFTWARE.

For commercial licensing inquiries, contact the repository owner.

---

<div align="center">

```
  *   .   *       .       *   .   *
    .       *   .     *       .    
  *   .  STONEKEEP  .   *   .   *  
    .       *   .     *       .    
  *   .   *       .       *   .   *
```

*Built tile by tile, character by character.*

</div>
