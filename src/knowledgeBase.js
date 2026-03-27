// Stonekeep - Knowledge Base (In-Game Help / Encyclopedia)
'use strict';

const KnowledgeBase = {
    _savedSpeed: null,

    _sections: {
        overview: {
            title: 'Overview',
            content() {
                return `
<h3>Welcome to Stonekeep</h3>
<p>Stonekeep is a desert fortress builder inspired by Stronghold. Build your castle, grow your population, manage resources, and defend against bandit raids.</p>

<h4>Getting Started</h4>
<p>1. <b>Setup Phase</b> — Place your Keep, Granary, and Stockpile on the map. These are free and define your settlement center.</p>
<p>2. <b>Building</b> — Construct Hovels for housing, farms for food, and workshops for materials. Use the build menu at the bottom-left.</p>
<p>3. <b>Economy</b> — Balance food production, population happiness, and taxes. Happy people attract new peasants; unhappy ones leave.</p>
<p>4. <b>Defense</b> — Build walls, towers, and recruit troops before bandits arrive. Raids grow larger as your population increases.</p>

<h4>Controls</h4>
<table>
<tr><th>Action</th><th>Key/Mouse</th></tr>
<tr><td>Scroll map</td><td>WASD / Arrow keys / Middle-drag</td></tr>
<tr><td>Zoom</td><td>Mouse wheel / +/− buttons</td></tr>
<tr><td>Place building</td><td>Left-click (after selecting from menu)</td></tr>
<tr><td>Cancel placement</td><td>Right-click / Escape</td></tr>
<tr><td>Select tile/unit</td><td>Left-click on map</td></tr>
<tr><td>Speed controls</td><td>1-5 keys / ribbon buttons</td></tr>
<tr><td>Pause</td><td>Space / ⏸ button</td></tr>
</table>
<p class="kb-tip">Tip: The TPS display (top bar) shows actual game ticks per second. Higher speed settings increase TPS — at max speed, the game runs 16× faster!</p>

<h4>Map</h4>
<p>The world is a vast procedurally generated desert with oases, cliffs, and mineral deposits. The map generates infinitely as you explore — new terrain, resources, and features appear as your NPCs discover new areas.</p>
<p class="kb-tip">Tip: Follow roads and oases to find fertile land for farms!</p>`;
            }
        },

        resources: {
            title: 'Resources',
            content() {
                return `
<h3>Resources</h3>

<h4>Primary Resources</h4>
<table>
<tr><th>Resource</th><th>Source</th><th>Storage</th></tr>
<tr><td>Gold</td><td>Taxes, Bazaar trades</td><td>Unlimited</td></tr>
<tr><td>Wood</td><td>Woodcutter's Hut (from trees)</td><td>Stockpile</td></tr>
<tr><td>Stone</td><td>Quarry (from stone deposits)</td><td>Stockpile</td></tr>
<tr><td>Iron</td><td>Iron Mine (from iron deposits)</td><td>Stockpile</td></tr>
<tr><td>Pitch</td><td>Pitch Rig (from pitch deposits)</td><td>Stockpile</td></tr>
</table>

<h4>Food Types</h4>
<table>
<tr><th>Food</th><th>Source</th><th>Storage</th></tr>
<tr><td>Apples</td><td>Apple Orchard</td><td>Granary</td></tr>
<tr><td>Bread</td><td>Bakery (from flour)</td><td>Granary</td></tr>
<tr><td>Cheese</td><td>Dairy Farm</td><td>Granary</td></tr>
<tr><td>Meat</td><td>Hunter's Post (from animals)</td><td>Granary</td></tr>
</table>
<p class="kb-tip">Tip: Having multiple food types gives a Food Variety happiness bonus (+1 per type above 1, max +3).</p>

<h4>Production Chains</h4>
<p><b>Bread:</b> Wheat Farm → Windmill (wheat → flour ×2) → Bakery (flour → bread ×2)</p>
<p><b>Ale:</b> Hops Farm → Brewery (hops → ale) → Inn (serves ale for happiness)</p>
<p><b>Weapons:</b> Wood/Iron → Fletcher/Poleturner/Blacksmith/Armorer → Armory → Barracks</p>

<h4>Intermediate Goods</h4>
<table>
<tr><th>Good</th><th>From</th><th>Used By</th></tr>
<tr><td>Wheat</td><td>Wheat Farm</td><td>Windmill</td></tr>
<tr><td>Flour</td><td>Windmill</td><td>Bakery</td></tr>
<tr><td>Hops</td><td>Hops Farm</td><td>Brewery</td></tr>
<tr><td>Ale</td><td>Brewery</td><td>Inn</td></tr>
<tr><td>Bows</td><td>Fletcher (wood)</td><td>Archer recruitment</td></tr>
<tr><td>Spears</td><td>Poleturner (wood)</td><td>Spearman recruitment</td></tr>
<tr><td>Swords</td><td>Blacksmith (iron)</td><td>Swordsman recruitment</td></tr>
<tr><td>Armor</td><td>Armorer (iron)</td><td>Swordsman recruitment</td></tr>
</table>

<h4>Storage</h4>
<table>
<tr><th>Building</th><th>Stores</th><th>Capacity</th></tr>
<tr><td>Stockpile</td><td>Wood, Stone, Iron, Pitch, Wheat, Flour, Hops, Ale</td><td>500</td></tr>
<tr><td>Granary</td><td>Apples, Bread, Cheese, Meat</td><td>200</td></tr>
<tr><td>Armory</td><td>Bows, Spears, Swords, Armor</td><td>200</td></tr>
</table>`;
            }
        },

        buildings: {
            title: 'Buildings',
            content() {
                return `
<h3>Buildings</h3>

<h4>Castle Core (Setup Phase)</h4>
<table>
<tr><th>Building</th><th>Size</th><th>Notes</th></tr>
<tr><td>Keep</td><td>3×3</td><td>Settlement center. Peasants gather here. Unique.</td></tr>
<tr><td>Granary</td><td>2×2</td><td>Food storage (200 capacity). Unique. Placed during setup.</td></tr>
<tr><td>Stockpile</td><td>3×3</td><td>Resource storage (500 capacity). Walkable. Unique. Placed during setup.</td></tr>
</table>

<h4>Housing</h4>
<table>
<tr><th>Building</th><th>Cost</th><th>Effect</th></tr>
<tr><td>Hovel</td><td>6 wood</td><td>Houses 8 peasants. Flammable.</td></tr>
</table>

<h4>Resource Gathering</h4>
<table>
<tr><th>Building</th><th>Size</th><th>Cost</th><th>Workers</th><th>Gathers</th></tr>
<tr><td>Woodcutter's Hut</td><td>1×1</td><td>3 wood</td><td>1</td><td>Wood from trees</td></tr>
<tr><td>Quarry</td><td>2×2</td><td>10 wood</td><td>3</td><td>Stone (place on deposit)</td></tr>
<tr><td>Iron Mine</td><td>2×2</td><td>20 wood</td><td>2</td><td>Iron (place on deposit)</td></tr>
<tr><td>Pitch Rig</td><td>1×1</td><td>10 wood</td><td>1</td><td>Pitch (place on deposit)</td></tr>
</table>

<h4>Food Production</h4>
<table>
<tr><th>Building</th><th>Size</th><th>Cost</th><th>Workers</th><th>Output</th><th>Requires</th></tr>
<tr><td>Apple Orchard</td><td>4×4</td><td>5 wood</td><td>1</td><td>Apples</td><td>Fertile land</td></tr>
<tr><td>Wheat Farm</td><td>4×4</td><td>5 wood</td><td>1</td><td>Wheat</td><td>Fertile land</td></tr>
<tr><td>Windmill</td><td>2×2</td><td>10 wood</td><td>1</td><td>Flour ×2</td><td>Wheat</td></tr>
<tr><td>Bakery</td><td>1×1</td><td>10 wood</td><td>1</td><td>Bread ×2</td><td>Flour</td></tr>
<tr><td>Dairy Farm</td><td>4×4</td><td>5 wood</td><td>1</td><td>Cheese</td><td>Fertile land</td></tr>
<tr><td>Hunter's Post</td><td>1×1</td><td>5 wood</td><td>1</td><td>Meat ×5</td><td>Nearby animals</td></tr>
<tr><td>Hops Farm</td><td>3×3</td><td>5 wood</td><td>1</td><td>Hops</td><td>Fertile land</td></tr>
<tr><td>Brewery</td><td>2×2</td><td>10 wood</td><td>1</td><td>Ale</td><td>Hops</td></tr>
</table>
<p class="kb-tip">Tip: Fertile land = grassland or oasis tiles. Look for green areas near oases!</p>

<h4>Military Production</h4>
<table>
<tr><th>Building</th><th>Cost</th><th>Workers</th><th>Output</th><th>Input</th></tr>
<tr><td>Fletcher</td><td>10 wood, 50g</td><td>1</td><td>Bows</td><td>Wood</td></tr>
<tr><td>Poleturner</td><td>10 wood, 50g</td><td>1</td><td>Spears</td><td>Wood</td></tr>
<tr><td>Blacksmith</td><td>10 wood, 5 iron, 100g</td><td>1</td><td>Swords</td><td>Iron</td></tr>
<tr><td>Armorer</td><td>10 wood, 5 iron, 100g</td><td>1</td><td>Armor</td><td>Iron</td></tr>
</table>

<h4>Military Buildings</h4>
<table>
<tr><th>Building</th><th>Cost</th><th>Notes</th></tr>
<tr><td>Armory</td><td>5 wood, 10 stone, 50g</td><td>Stores weapons (200 cap). Unique. Required for recruitment.</td></tr>
<tr><td>Barracks</td><td>15 stone, 100g</td><td>Recruits troops. Unique.</td></tr>
</table>

<h4>Happiness Buildings</h4>
<table>
<tr><th>Building</th><th>Cost</th><th>Effect</th></tr>
<tr><td>Chapel</td><td>250g</td><td>1 priest, blesses radius 10</td></tr>
<tr><td>Church</td><td>500g</td><td>2 priests, radius 14, first church +1 base happiness</td></tr>
<tr><td>Cathedral</td><td>1000g</td><td>3 priests, radius 18, first cathedral +2 base happiness</td></tr>
<tr><td>Well</td><td>5 stone</td><td>+2 happiness, worker fights fires</td></tr>
<tr><td>Apothecary</td><td>10 wood, 100g</td><td>Healer clears diseases. 20% resistance each (max 60%).</td></tr>
<tr><td>Inn</td><td>20 wood, 100g</td><td>Serves ale for happiness boost.</td></tr>
</table>

<h4>Economy</h4>
<table>
<tr><th>Building</th><th>Cost</th><th>Notes</th></tr>
<tr><td>Bazaar</td><td>10 wood, 50g</td><td>Buy/sell resources. Dynamic pricing. Unique.</td></tr>
</table>
<p><b>Bazaar Pricing:</b> Prices adjust based on your current stock. Low stock = cheap prices (×0.6), high stock = expensive (×1.5). Buying drives prices up, selling drives them down. Trades 5 units per transaction.</p>

<h4>Defenses</h4>
<table>
<tr><th>Building</th><th>Cost</th><th>Notes</th></tr>
<tr><td>Low Wall</td><td>2 stone</td><td>Blocks movement. Troops walk on top.</td></tr>
<tr><td>High Wall</td><td>4 stone</td><td>Stronger wall. Troops atop.</td></tr>
<tr><td>Tower</td><td>15 stone</td><td>2×2. Height 2. 4 archer slots. +50% ranged damage.</td></tr>
<tr><td>Gatehouse</td><td>8 stone</td><td>Controlled passage. Walkable.</td></tr>
<tr><td>Stairs</td><td>5 stone</td><td>Ground-to-wall transition.</td></tr>
<tr><td>Moat</td><td>1 gold</td><td>Water trench. Blocks movement.</td></tr>
<tr><td>Fill</td><td>1 stone</td><td>Fills water → desert.</td></tr>
<tr><td>Pitch Ditch</td><td>1g + 1 pitch</td><td>Flammable trap. Ignitable.</td></tr>
</table>

<h4>Fear Factor Buildings</h4>
<p><b>Good Things</b> (Fear −1 each): Gardens (10 wood), Maypole (10 wood), Statue (10 stone), Shrine (10 stone + 100g)</p>
<p><b>Bad Things</b> (Fear +1 each): Gallows (5 wood), Stocks (5 wood), Dungeon (10 stone), Gibbet (5 wood + 5 iron)</p>`;
            }
        },

        military: {
            title: 'Military',
            content() {
                return `
<h3>Military</h3>

<h4>Troop Types</h4>
<table>
<tr><th>Unit</th><th>HP</th><th>DMG</th><th>Range</th><th>Cost</th><th>Weapons</th></tr>
<tr><td>Archer</td><td>10</td><td>2</td><td>8</td><td>12g</td><td>1 Bow</td></tr>
<tr><td>Spearman</td><td>20</td><td>4</td><td>Melee</td><td>8g</td><td>1 Spear</td></tr>
<tr><td>Swordsman</td><td>40</td><td>8</td><td>Melee</td><td>20g</td><td>1 Sword + 1 Armor</td></tr>
<tr><td>Fire Thrower</td><td>15</td><td>1</td><td>7</td><td>15g</td><td>1 Pitch</td></tr>
</table>

<h4>Recruitment</h4>
<p>Build a <b>Barracks</b> and an <b>Armory</b>. Weapons must be crafted (Fletcher, Poleturner, Blacksmith, Armorer) and stored in the Armory. Each recruit consumes one idle peasant + gold + weapon(s).</p>

<h4>Height Advantage</h4>
<table>
<tr><th>Position</th><th>Height</th><th>Ranged Bonus</th></tr>
<tr><td>Ground</td><td>0</td><td>×1.0</td></tr>
<tr><td>Wall / Stairs</td><td>1</td><td>×1.25 (+25%)</td></tr>
<tr><td>Tower</td><td>2</td><td>×1.50 (+50%)</td></tr>
</table>
<p class="kb-tip">Tip: Place archers on towers for maximum damage output!</p>

<h4>Troop Behavior</h4>
<p>Troops automatically engage nearby bandits and hostile animals when idle. Priority: ordered target → bandits → hostile animals → patrol.</p>
<p>Melee troops patrol within 6 tiles of their guard position. All troops check for enemies within 10 tiles while moving.</p>

<h4>Fear Factor &amp; Damage</h4>
<p>Each degree of fear gives ±5% troop damage. Fear +5 = +25% damage bonus; fear −5 = −25% penalty.</p>

<h4>Bandits</h4>
<table>
<tr><th>Type</th><th>HP</th><th>DMG</th><th>Range</th><th>%</th></tr>
<tr><td>Melee</td><td>12</td><td>3</td><td>1</td><td>70%</td></tr>
<tr><td>Archer</td><td>8</td><td>2</td><td>6</td><td>30%</td></tr>
</table>
<p>Bandits attack buildings (2 damage per 6 ticks). Building HP = width × height × 10.</p>
<p>Raid size: 3 base + 1 per 15 population (max 12).</p>`;
            }
        },

        happiness: {
            title: 'Happiness',
            content() {
                return `
<h3>Popularity &amp; Happiness</h3>
<p>Base happiness: <b>50</b>. When happiness ≥ 50, new peasants arrive. Below 25, idle peasants leave.</p>

<h4>Happiness Factors</h4>
<table>
<tr><th>Factor</th><th>Range</th><th>How</th></tr>
<tr><td>Food Supply</td><td>−8 to +8</td><td>Based on food stock vs population. Ration level adjusts (+4 extra, +8 double, −4 half).</td></tr>
<tr><td>Food Variety</td><td>0 to +3</td><td>+1 per food type above 1 (apples, bread, cheese, meat).</td></tr>
<tr><td>Tax</td><td>−20 to +20</td><td>Each tax level costs 4 happiness. Bribe (negative tax) gives happiness.</td></tr>
<tr><td>Religion</td><td>0 to ~13+</td><td>Priest blessing coverage + first-church/cathedral bonuses + wells.</td></tr>
<tr><td>Housing</td><td>−6 to +2</td><td>100%+ occupancy: −6. 80%+: −2. Under 80%: +2.</td></tr>
<tr><td>Ale</td><td>0 to +8</td><td>Inn coverage (1 inn per 25 pop). Full = +8.</td></tr>
<tr><td>Fear Factor</td><td>−20 to +20</td><td>Good things vs bad things. ±4 happiness per degree.</td></tr>
<tr><td>Disease</td><td>−8 to 0</td><td>Penalty based on % of population infected.</td></tr>
</table>

<h4>Tax System</h4>
<p>Tax rate: −5 to +5. Positive tax collects <b>rate × population</b> gold every 30 ticks. Negative tax (bribe) costs gold but boosts happiness.</p>

<h4>Fear Factor</h4>
<p>Range: −5 to +5.</p>
<p><b>Good Things</b> (gardens, maypole, statue, shrine): −1 fear each.</p>
<p><b>Bad Things</b> (gallows, stocks, dungeon, gibbet): +1 fear each.</p>
<p>1 building per 16 population per degree. Negative fear: +happiness, −productivity. Positive fear: −happiness, +productivity (up to 150%).</p>
<p class="kb-tip">Tip: For military settlements, use bad things (+fear) for production/damage bonuses. For peaceful growth, use good things.</p>`;
            }
        },

        animals: {
            title: 'Animals',
            content() {
                return `
<h3>Animals</h3>

<h4>Passive Animals (Huntable)</h4>
<table>
<tr><th>Animal</th><th>HP</th><th>Herd Size</th><th>Terrain</th><th>Drops</th></tr>
<tr><td>Deer 🦌</td><td>3</td><td>10</td><td>Grass, Oasis</td><td>5 meat</td></tr>
<tr><td>Camel 🐪</td><td>4</td><td>8</td><td>Desert</td><td>5 meat</td></tr>
</table>
<p>Passive animals flee when player NPCs approach. Hunter's Post workers track, kill, butcher (12 ticks), and return 5 meat per kill.</p>

<h4>Hostile Animals</h4>
<table>
<tr><th>Animal</th><th>HP</th><th>DMG</th><th>Herd Size</th><th>Aggro Range</th></tr>
<tr><td>Lion 🦁</td><td>15</td><td>4</td><td>3</td><td>10 tiles</td></tr>
</table>
<p>Lions attack NPCs on sight. They spawn 80–180 tiles from buildings. Troops auto-engage hostile animals.</p>

<h4>Companion Animals (Tameable)</h4>
<table>
<tr><th>Animal</th><th>HP</th><th>DMG</th><th>Herd</th><th>Tame Range</th><th>FOW Vision</th><th>Role</th></tr>
<tr><td>Dog 🐕</td><td>5</td><td>2</td><td>3</td><td>6 tiles</td><td>8 tiles</td><td>Combat</td></tr>
<tr><td>Cat 🐈</td><td>2</td><td>—</td><td>2</td><td>6 tiles</td><td>6 tiles</td><td>Healer</td></tr>
</table>

<h4>Taming</h4>
<p>Dogs and cats become <b>tamed</b> when they wander within 6 tiles of any NPC or building. Once tamed:</p>
<ul>
<li>They change color (dogs turn <span style="color:#66BBFF">blue</span>, cats turn <span style="color:#88DDAA">green</span>)</li>
<li>They path toward your buildings and NPCs, hanging out in your settlement</li>
<li>They provide <b>Fog of War vision</b> around them (dog: 8, cat: 6 tile radius)</li>
</ul>

<h4>Pet Abilities</h4>
<p><b>Dogs:</b> Attack nearby enemies within 6 tiles (2 damage, 4-tick cooldown).</p>
<p><b>Cats:</b> Heal injured NPCs within 6 tiles (1 HP per 30 ticks). Clear disease clouds (5% per tick). Heal diseased NPCs.</p>
<p class="kb-tip">Tip: Tamed animals are valuable scouts and support! Cats near your settlement help manage disease outbreaks.</p>

<h4>Other Creatures</h4>
<table>
<tr><th>Animal</th><th>HP</th><th>DMG</th><th>Behavior</th></tr>
<tr><td>Scorpion 🦂</td><td>3</td><td>2</td><td>Hostile, desert, herd of 4</td></tr>
<tr><td>Snake 🐍</td><td>2</td><td>1</td><td>Hostile, desert, herd of 3</td></tr>
<tr><td>Vulture</td><td>4</td><td>2</td><td>Hostile, desert, herd of 3</td></tr>
</table>`;
            }
        },

        events: {
            title: 'Events',
            content() {
                return `
<h3>Events &amp; Hazards</h3>

<h4>Random Events</h4>
<p>Events begin after a grace period (~2400 ticks) and occur every ~4000 ticks (faster with larger population).</p>

<h4>🔥 Fire Outbreak</h4>
<p>Randomly ignites a flammable building. Build <b>Wells</b> — their workers act as firefighters.</p>
<table>
<tr><th>Property</th><th>Value</th></tr>
<tr><td>Spread chance</td><td>50% every 8 ticks to adjacent tiles</td></tr>
<tr><td>Burn duration</td><td>240 ticks (normal), 600 ticks (pitch ditch)</td></tr>
<tr><td>Building damage</td><td>Every 10 ticks. 8 fire HP before destruction.</td></tr>
<tr><td>NPC ignition</td><td>25% per tick on fire tiles</td></tr>
<tr><td>NPC burn damage</td><td>1 damage every 8 ticks</td></tr>
<tr><td>Self-extinguish</td><td>After 50 ticks off fire tiles</td></tr>
</table>
<p class="kb-tip">Tip: Well workers automatically fight fires. Build wells near flammable clusters!</p>

<h4>⚔️ Bandit Raid</h4>
<p>Requires population ≥ 5. Bandits spawn at discovered territory edges.</p>
<table>
<tr><th>Property</th><th>Value</th></tr>
<tr><td>Raid size</td><td>3 base + 1 per 15 population (max 12)</td></tr>
<tr><td>Composition</td><td>70% melee (HP 12, DMG 3) / 30% archers (HP 8, DMG 2)</td></tr>
<tr><td>Behavior</td><td>Attack buildings, then NPCs. 2 building damage per 6 ticks.</td></tr>
</table>

<h4>🦠 Disease Plague</h4>
<p>Spawns 4 disease cloud tiles near your settlement.</p>
<table>
<tr><th>Property</th><th>Value</th></tr>
<tr><td>Cloud duration</td><td>400 ticks</td></tr>
<tr><td>Infection chance</td><td>2% per tick (reduced by Apothecary resistance)</td></tr>
<tr><td>NPC damage</td><td>1 damage every 20 ticks</td></tr>
<tr><td>NPC spread</td><td>1% per tick within 2 tiles</td></tr>
<tr><td>Recovery</td><td>60 ticks off disease tiles</td></tr>
<tr><td>Apothecary resistance</td><td>20% each, max 60% (3 apothecaries)</td></tr>
</table>
<p class="kb-tip">Tip: Apothecary healers clear disease clouds. Tamed cats also help — they heal diseased NPCs and clear clouds!</p>

<h4>Happiness Impact of Disease</h4>
<table>
<tr><th>% Infected</th><th>Happiness Penalty</th></tr>
<tr><td>0%</td><td>0</td></tr>
<tr><td>1–25%</td><td>−2</td></tr>
<tr><td>25–50%</td><td>−4</td></tr>
<tr><td>50–75%</td><td>−6</td></tr>
<tr><td>75%+</td><td>−8</td></tr>
</table>`;
            }
        },

        terrain: {
            title: 'Terrain',
            content() {
                return `
<h3>Terrain Types</h3>
<table>
<tr><th>Terrain</th><th>Walk</th><th>Build</th><th>Fertile</th><th>Notes</th></tr>
<tr><td>Desert</td><td>✅</td><td>✅</td><td>❌</td><td>Default terrain. Not farmable.</td></tr>
<tr><td>Grassland</td><td>✅</td><td>✅</td><td>✅</td><td>Found near oases. Farms allowed.</td></tr>
<tr><td>Oasis</td><td>✅</td><td>✅</td><td>✅</td><td>Fertile ground around water.</td></tr>
<tr><td>Trees</td><td>✅</td><td>❌</td><td>—</td><td>Harvestable for wood. 3 variants.</td></tr>
<tr><td>Water</td><td>❌</td><td>❌</td><td>—</td><td>Impassable. Use Fill to convert.</td></tr>
<tr><td>Cliff</td><td>❌</td><td>❌</td><td>—</td><td>Impassable rock formations.</td></tr>
<tr><td>Rock</td><td>❌</td><td>❌</td><td>—</td><td>Impassable boulders.</td></tr>
<tr><td>Stone Deposit</td><td>❌</td><td>❌</td><td>—</td><td>Place Quarry ON deposit tiles.</td></tr>
<tr><td>Iron Deposit</td><td>❌</td><td>❌</td><td>—</td><td>Place Iron Mine ON deposit tiles.</td></tr>
<tr><td>Pitch Deposit</td><td>❌</td><td>❌</td><td>—</td><td>Place Pitch Rig ON deposit tiles.</td></tr>
<tr><td>Pitch Ditch</td><td>❌</td><td>❌</td><td>—</td><td>Flammable trap terrain.</td></tr>
</table>

<h4>Roads</h4>
<p>NPCs create roads naturally as they walk. Higher traffic = higher road level (max 15). Roads provide:</p>
<ul>
<li>Extended Fog of War visibility along traveled paths</li>
<li>Visual indication of frequently used routes</li>
</ul>
<p>Roads decay slowly over time if not maintained by foot traffic.</p>

<h4>Fertile Land</h4>
<p>Farms (Apple Orchard, Wheat Farm, Dairy Farm, Hops Farm) require <b>fertile terrain</b>: Grassland or Oasis tiles. These are found near oases throughout the map.</p>
<p class="kb-tip">Tip: Explore outward from your keep to find oases with fertile land for farming!</p>`;
            }
        },

        npcs: {
            title: 'NPCs & Workers',
            content() {
                return `
<h3>NPCs &amp; Workers</h3>

<h4>NPC Types</h4>
<table>
<tr><th>Type</th><th>HP</th><th>DMG</th><th>Notes</th></tr>
<tr><td>Peasant</td><td>5</td><td>1</td><td>Basic civilian. Auto-assigns to buildings.</td></tr>
<tr><td>Hunter</td><td>8</td><td>3</td><td>Assigned to Hunter's Post. Tracks prey.</td></tr>
<tr><td>Troops</td><td>Varies</td><td>Varies</td><td>See Military section.</td></tr>
</table>

<h4>Worker Behavior</h4>
<p>Idle peasants auto-assign to understaffed buildings every 10 ticks. Workers perform their building's task cycle:</p>
<ol>
<li><b>Walk</b> to resource source (trees, deposits, animals)</li>
<li><b>Gather</b> resource (8 ticks at resource site)</li>
<li><b>Return</b> to building</li>
<li><b>Process</b> resource (building-specific ticks)</li>
<li><b>Deliver</b> to storage (stockpile/granary/armory)</li>
</ol>
<p>Workers flee from bandits within 6 tiles (civilians don't fight).</p>

<h4>Special Worker Roles</h4>
<table>
<tr><th>Role</th><th>Building</th><th>Behavior</th></tr>
<tr><td>Firefighter</td><td>Well</td><td>Fills bucket → walks to fire → extinguishes. Immune to fire.</td></tr>
<tr><td>Healer</td><td>Apothecary</td><td>Walks to disease clouds → removes (6 ticks/tile).</td></tr>
<tr><td>Priest</td><td>Chapel/Church/Cathedral</td><td>Blesses nearby peasants within radius.</td></tr>
<tr><td>Innkeeper</td><td>Inn</td><td>Serves ale to population.</td></tr>
<tr><td>Hunter</td><td>Hunter's Post</td><td>Tracks → shoots → butchers (12 ticks) → delivers 5 meat.</td></tr>
</table>

<h4>Population</h4>
<p>New peasants arrive when happiness ≥ 50 (every 20 ticks, if housing available). Peasants leave when happiness &lt; 25.</p>
<p>Starting: 8 peasants + resources (500 gold, 50 wood, 30 stone, 10 apples, 10 meat).</p>

<h4>NPC Details</h4>
<p>Click any NPC and use the <b>Details</b> button in the info panel to see their full status, including name, role, health, and current activity. The game pauses while viewing details.</p>`;
            }
        }
    },

    init() {
        const overlay = document.getElementById('knowledgeBaseOverlay');
        const closeBtn = document.getElementById('kbClose');
        const helpBtn = document.getElementById('btnHelp');
        const nav = document.getElementById('kbNav');

        helpBtn.addEventListener('click', () => this.open());
        closeBtn.addEventListener('click', () => this.close());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.close();
        });

        // Build nav buttons
        const keys = Object.keys(this._sections);
        for (const key of keys) {
            const btn = document.createElement('button');
            btn.textContent = this._sections[key].title;
            btn.dataset.section = key;
            btn.addEventListener('click', () => this.showSection(key));
            nav.appendChild(btn);
        }
    },

    open() {
        this._savedSpeed = Game._speedIndex;
        Game.setSpeed(0);
        document.getElementById('knowledgeBaseOverlay').classList.add('open');
        // Show first section by default
        const firstKey = Object.keys(this._sections)[0];
        this.showSection(firstKey);
    },

    close() {
        document.getElementById('knowledgeBaseOverlay').classList.remove('open');
        if (this._savedSpeed !== null) {
            Game.setSpeed(this._savedSpeed);
            this._savedSpeed = null;
        }
    },

    showSection(key) {
        const section = this._sections[key];
        if (!section) return;

        document.getElementById('kbContent').innerHTML = section.content();

        // Update active nav button
        document.querySelectorAll('#kbNav button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === key);
        });
    }
};
