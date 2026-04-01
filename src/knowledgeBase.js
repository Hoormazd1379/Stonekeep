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
<tr><td>Speed controls</td><td>1-4 keys / ribbon buttons</td></tr>
<tr><td>Pause</td><td>1 key / || button</td></tr>
</table>
<p class="kb-tip">Tip: The TPS display (top bar) shows actual game ticks per second. Higher speed settings increase TPS — at max speed, the game runs 16× faster!</p>

<h4>Map</h4>
<p>The world is a vast procedurally generated desert with oases, cliffs, and mineral deposits. The map generates infinitely as you explore — new terrain, resources, and features appear as your NPCs discover new areas.</p>

<h4>Day/Night Cycle</h4>
<p>Time passes in Stonekeep — a full day/night cycle takes about 4 minutes at normal speed. Watch the clock below the minimap. Night brings reduced visibility, increased danger from bandits and lions, but sleeping deer are easier to hunt. See the <b>Time &amp; Day/Night</b> section for details.</p>
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
<tr><td>Herbs</td><td>Herb Garden</td><td>Granary</td></tr>
<tr><td>Jerky</td><td>Smokehouse (from meat)</td><td>Granary</td></tr>
</table>
<p class="kb-tip">Tip: Having multiple food types gives a Food Variety happiness bonus (+1 per type above 1, max +3).</p>

<h4>Prepared Meals (Cookhouse)</h4>
<p>The Cookhouse takes 2 different raw ingredients and produces 4 prepared meals. The recipe depends on the combination:</p>
<table>
<tr><th>Ingredients</th><th>Meal</th></tr>
<tr><td>Bread + Meat</td><td>Meat Pie</td></tr>
<tr><td>Bread + Herbs</td><td>Herb Bread</td></tr>
<tr><td>Apples + Cheese</td><td>Apple Cheese</td></tr>
<tr><td>Cheese + Meat</td><td>Meat Stew</td></tr>
<tr><td>Herbs + Meat</td><td>Spiced Meat</td></tr>
<tr><td>Apples + Herbs</td><td>Herb Salad</td></tr>
<tr><td>Apples + Bread</td><td>Fruit Pie</td></tr>
<tr><td>Bread + Cheese</td><td>Cheese Bread</td></tr>
<tr><td>Apples + Meat</td><td>Apple Strudel</td></tr>
<tr><td>Cheese + Herbs</td><td>Herb Cheese</td></tr>
</table>
<p class="kb-tip">Tip: Prepared meals each count as a separate food type for variety bonuses!</p>

<h4>Production Chains</h4>
<p><b>Bread:</b> Wheat Farm → Windmill (wheat → flour ×2) → Bakery (flour → bread ×2)</p>
<p><b>Ale:</b> Hops Farm → Brewery (hops → ale) → Inn (serves ale for happiness)</p>
<p><b>Jerky:</b> Hunter's Post (meat) → Smokehouse (meat → jerky ×2)</p>
<p><b>Prepared Meals:</b> Any 2 raw foods → Cookhouse → 4 prepared meals</p>
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
<tr><td>Granary</td><td>Apples, Bread, Cheese, Meat, Herbs, Jerky, Prepared Meals</td><td>200</td></tr>
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
<tr><th>Building</th><th>Cost</th><th>Capacity</th><th>Tier</th></tr>
<tr><td>Hovel</td><td>6 wood</td><td>8 peasants</td><td>Basic (Tier 1)</td></tr>
<tr><td>Cottage</td><td>12 wood, 5 stone</td><td>6 peasants</td><td>Comfortable (Tier 2)</td></tr>
<tr><td>House</td><td>20 wood, 10 stone, 5 iron</td><td>4 peasants</td><td>Quality (Tier 3)</td></tr>
</table>
<p>Higher tier housing provides better fatigue recovery during sleep. NPCs are automatically assigned to the best available housing. Homeless NPCs suffer a mood penalty and slower recovery.</p>

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
<tr><td>Herb Garden</td><td>3×3</td><td>10 wood, 50g</td><td>1</td><td>Herbs</td><td>Fertile land</td></tr>
<tr><td>Cookhouse</td><td>2×2</td><td>15 wood, 5 stone, 75g</td><td>1</td><td>Meals ×4</td><td>2 different foods</td></tr>
<tr><td>Smokehouse</td><td>2×2</td><td>15 wood, 50g</td><td>1</td><td>Jerky ×2</td><td>Meat</td></tr>
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
<tr><td>Apothecary</td><td>10 wood, 100g</td><td>Healer prioritizes sick NPCs, also clears disease clouds (curing nearby NPCs). 20% resistance each (max 60%).</td></tr>
<tr><td>Inn</td><td>20 wood, 100g</td><td>Serves ale for happiness boost.</td></tr>
</table>

<h4>Economy</h4>
<table>
<tr><th>Building</th><th>Cost</th><th>Notes</th></tr>
<tr><td>Bazaar</td><td>10 wood, 50g</td><td>Buy/sell resources. Dynamic pricing. Unique.</td></tr>
</table>
<p><b>Bazaar Pricing:</b> Prices adjust based on your current stock. Low stock = cheap prices (×0.6), high stock = expensive (×1.5). Buying drives prices up, selling drives them down. Trades 5 units per transaction.</p>
<p><b>Auto-Trade:</b> Set a minimum and maximum amount for any resource. If your stock drops below the minimum, the bazaar automatically buys 5 units per hour until the minimum is reached (or you run out of gold). If stock exceeds the maximum, surplus is sold 5 units per hour until it falls back to the maximum.</p>

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

<h4>Frontier</h4>
<table>
<tr><th>Building</th><th>Cost</th><th>Notes</th></tr>
<tr><td>Watchtower</td><td>20 wood, 15 stone</td><td>2×2. Vision radius 30. Auto-fires at enemies (range 16, 1.5× height bonus).</td></tr>
<tr><td>Guard Post</td><td>10 wood, 5 stone</td><td>1×1. Vision radius 15. Auto-fires at enemies (range 8). Flammable.</td></tr>
<tr><td>Forward Stockpile</td><td>15 wood, 5 stone</td><td>2×2. 2 hauler workers (carry up to 5 units per trip). Local resource storage near frontier.</td></tr>
<tr><td>Forward Granary</td><td>15 wood</td><td>2×2. 2 hauler workers (carry up to 5 units per trip). Local food storage near frontier.</td></tr>
</table>
<p><b>Frontier Logistics:</b> Forward Stockpiles and Forward Granaries maintain their own local inventory. Production workers deposit directly into the nearest forward storage when it is closer than the main stockpile or granary. Processors and other workers pick up resources from the nearest storage that has them. Hungry NPCs and troops eat from the nearest granary (main or forward) with food available. Hauler workers continuously balance each resource type separately between main and forward storages, carrying up to 5 units per trip. Haulers pick up return cargo at the destination instead of walking back empty, creating efficient round-trip supply runs. If a forward storage is destroyed, ALL stored supplies are lost.</p>
<p><b>Defensive Buildings:</b> The Keep, Watchtowers, and Guard Posts automatically fire at nearby bandits and hostile animals. Watchtowers benefit from a 1.5× height damage bonus. Event alerts appear when frontier defenses engage enemies.</p>

<h4>Fear Factor Buildings</h4>
<p><b>Good Things</b> (Fear −1 each): Gardens (10 wood), Maypole (10 wood), Statue (10 stone), Shrine (10 stone + 100g)</p>
<p><b>Bad Things</b> (Fear +1 each): Gallows (5 wood), Stocks (5 wood), Dungeon (10 stone), Gibbet (5 wood + 5 iron)</p>

<h4>Survival</h4>
<table>
<tr><th>Building</th><th>Size</th><th>Cost</th><th>Notes</th></tr>
<tr><td>Heating Furnace</td><td>2×2</td><td>15 stone, 5 iron, 100g</td><td>Auto-consumes pitch in winter. Warms a 16-tile radius. Prevents winter sickness for nearby NPCs. Melts snow visually in its radius when active. No workers needed.</td></tr>
</table>`;
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
<p>Raid size: 3 base + 1 per 15 population (max 12).</p>

<h4>Building Auto-Fire</h4>
<p>The <b>Keep</b>, <b>Watchtowers</b>, and <b>Guard Posts</b> automatically fire at bandits and hostile animals within range. Watchtowers and the Keep have range 16; Guard Posts have range 8. Damage is enhanced by the fear factor bonus. Watchtowers get a 1.5× height bonus to damage.</p>`;
            }
        },

        happiness: {
            title: 'Happiness',
            content() {
                return `
<h3>Popularity &amp; Happiness</h3>
<p>Castle happiness is the <b>arithmetic average</b> of all individual NPC happiness values. When castle happiness ≥ 50, new peasants arrive. Below 25, idle peasants leave.</p>

<h4>Individual NPC Happiness</h4>
<p>Each peasant NPC has their own happiness score (0-100), computed from:</p>
<ul>
<li><b>Mood</b> (60% weight) — their personal emotional state from hunger, fatigue, health, housing, taxes, personality, and combat</li>
<li><b>Global factors</b> (40% weight) — food supply, food variety, ale coverage, fear, disease</li>
<li><b>Personal modifiers</b> — housing tier bonus, tax sensitivity (personality trait), religion blessing, hunger/health state</li>
</ul>
<p>View any NPC's happiness, mood, and personality traits via the NPC Details modal (click their name in a building or tile info panel).</p>

<h4>Global Happiness Factors</h4>
<table>
<tr><th>Factor</th><th>Range</th><th>How</th></tr>
<tr><td>Food Supply</td><td>−8 to +8</td><td>Based on food stock vs population. Ration level adjusts (+4 extra, +8 double, −4 half).</td></tr>
<tr><td>Food Variety</td><td>0 to +3</td><td>+1 per food type above 1 (apples, bread, cheese, meat).</td></tr>
<tr><td>Tax</td><td>−20 to +20</td><td>Each tax level costs 4 happiness. Bribe (negative tax) gives happiness.</td></tr>
<tr><td>Religion</td><td>0 to ~13+</td><td>Priest blessing coverage + first-church/cathedral bonuses + wells.</td></tr>
<tr><td>Housing</td><td>−10 to +4</td><td>Based on housing quality tiers and homelessness. Higher tier = more bonus.</td></tr>
<tr><td>Ale</td><td>0 to +8</td><td>Inn coverage (1 inn per 25 pop). Full = +8.</td></tr>
<tr><td>Fear Factor</td><td>−20 to +20</td><td>Good things vs bad things. ±4 happiness per degree.</td></tr>
<tr><td>Disease</td><td>−8 to 0</td><td>Penalty based on % of population infected.</td></tr>
<tr><td>Hunger</td><td>−8 to +3</td><td>Based on how well-fed the population is. Starving NPCs cause severe penalty.</td></tr>
</table>

<h4>Tax System</h4>
<p>Tax rate: −5 to +5. Positive tax collects <b>rate × population</b> gold once per work shift start. Negative tax (bribe) costs gold but boosts happiness.</p>

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
<tr><td>Deer</td><td>3</td><td>10</td><td>Grass, Oasis</td><td>5 meat</td></tr>
<tr><td>Camel</td><td>4</td><td>8</td><td>Desert</td><td>5 meat</td></tr>
</table>
<p>Passive animals flee when player NPCs approach. Hunter's Post workers track, kill, butcher (12 ticks), and return 5 meat per kill.</p>

<h4>Day/Night Animal Behavior</h4>
<p>Animals respond to the time of day based on their nature:</p>
<ul>
<li><b>Deer &amp; Camels</b> (diurnal): Active during dawn, day, and dusk. At night they rest — barely moving, with reduced threat awareness (halved flee detection range).</li>
<li><b>Lions</b> (nocturnal): Most active at dusk, night, and dawn. At night, lions have extended aggro range (14 tiles vs 10 during day) and move 50% faster. Be especially wary of lion attacks after dark!</li>
<li><b>Dogs &amp; Cats</b>: Unaffected by time — companion  animals follow their owners regardless of the hour.</li>
</ul>
<p class="kb-tip">Tip: Night hunting is easier — passive animals are less alert. But watch out for nocturnal lions!</p>

<h4>Hostile Animals</h4>
<table>
<tr><th>Animal</th><th>HP</th><th>DMG</th><th>Herd Size</th><th>Aggro Range</th></tr>
<tr><td>Lion</td><td>15</td><td>4</td><td>3</td><td>10 tiles</td></tr>
</table>
<p>Lions attack NPCs on sight. They spawn 80–180 tiles from buildings. Troops auto-engage hostile animals.</p>

<h4>Companion Animals (Tameable)</h4>
<table>
<tr><th>Animal</th><th>HP</th><th>DMG</th><th>Herd</th><th>Tame Range</th><th>FOW Vision</th><th>Role</th></tr>
<tr><td>Dog</td><td>5</td><td>2</td><td>3</td><td>6 tiles</td><td>8 tiles</td><td>Combat</td></tr>
<tr><td>Cat</td><td>2</td><td>—</td><td>2</td><td>6 tiles</td><td>6 tiles</td><td>Healer</td></tr>
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
<p class="kb-tip">Tip: Tamed animals are valuable scouts and support! Cats near your settlement help manage disease outbreaks.</p>`;
            }
        },

        events: {
            title: 'Events',
            content() {
                return `
<h3>Events &amp; Hazards</h3>

<h4>Random Events</h4>
<p>Negative events are blocked for the first <b>3 full day/night cycles</b>, giving you time to establish your settlement. After that safety window, events begin on the normal schedule (~4000 ticks between rolls, faster with larger population).</p>

<h4>-- Fire Outbreak</h4>
<p>Randomly ignites a flammable building. Build <b>Wells</b> — their workers act as firefighters.</p>
<table>
<tr><th>Property</th><th>Value</th></tr>
<tr><td>Spread chance</td><td>50% every 8 ticks to adjacent tiles</td></tr>
<tr><td>Burn duration</td><td>240 ticks (normal), 600 ticks (pitch ditch)</td></tr>
<tr><td>Building damage</td><td>Every 35 ticks. 8 fire HP before destruction.</td></tr>
<tr><td>NPC ignition</td><td>25% per tick on fire tiles</td></tr>
<tr><td>NPC burn damage</td><td>1 damage every 8 ticks</td></tr>
<tr><td>Self-extinguish</td><td>After 50 ticks off fire tiles</td></tr>
</table>
<p class="kb-tip">Tip: Well workers automatically fight fires. Build wells near flammable clusters!</p>

<h4>-- Bandit Raid</h4>
<p>Requires population ≥ 5. Bandits spawn at discovered territory edges.</p>
<table>
<tr><th>Property</th><th>Value</th></tr>
<tr><td>Raid size</td><td>3 base + 1 per 15 population (max 12)</td></tr>
<tr><td>Composition</td><td>70% melee (HP 12, DMG 3) / 30% archers (HP 8, DMG 2)</td></tr>
<tr><td>Behavior</td><td>Attack buildings, then NPCs. 2 building damage per 6 ticks.</td></tr>
</table>

<h4>-- Disease Plague</h4>
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
<p class="kb-tip">Tip: Apothecary healers prioritize healing sick villagers and also clear disease clouds (curing nearby NPCs in the process). Tamed cats also help — they heal diseased NPCs and clear clouds! When someone falls ill, it appears in the Event Log.</p>

<h4>Event Log Panel</h4>
<p>The <b>Event Log</b> appears on the right sidebar below the minimap, clock, and speed controls ribbon. It records major events as they happen using this format:</p>
<p><code>[Day X, HH:MM] Description [Goto]</code></p>
<ul>
<li><b>Goto:</b> Centers the camera on the event location.</li>
<li><b>Filters:</b> All, Danger, Warning, Caution, Positive, Info.</li>
<li><b>Capacity:</b> Keeps up to 400 entries (oldest entries are removed first).</li>
</ul>

<table>
<tr><th>Category</th><th>Color</th><th>Examples</th></tr>
<tr><td>Danger</td><td style="color:#FF4444">#FF4444</td><td>Deaths, building destruction, bandit raids, NPC sickness (plague cloud/spread)</td></tr>
<tr><td>Warning</td><td style="color:#FF8800">#FF8800</td><td>Fires, disease outbreaks, NPC fights, desertion, winter sickness</td></tr>
<tr><td>Caution</td><td style="color:#DDDD44">#DDDD44</td><td>Theft, rivalry milestones, low-happiness departures</td></tr>
<tr><td>Positive</td><td style="color:#44DD44">#44DD44</td><td>Arrivals, construction completed, friendships, pet taming</td></tr>
<tr><td>Info</td><td style="color:#44DDDD">#44DDDD</td><td>Troop recruitment, worker assignment, bazaar trades</td></tr>
<tr><td>Neutral</td><td style="color:#CCCCCC">#CCCCCC</td><td>General informational events</td></tr>
</table>

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

        time: {
            title: 'Time & Day/Night',
            content() {
                return `
<h3>Time &amp; Day/Night Cycle</h3>
<p>Stonekeep has a full 24-hour day/night cycle. One in-game day takes approximately <b>25.6 minutes</b> at normal speed (3072 game ticks). The game starts at <b>8:00 AM</b> on Day 1.</p>

<h4>Day Phases</h4>
<table>
<tr><th>Phase</th><th>Hours</th><th>Icon</th><th>Lighting</th><th>Vision</th></tr>
<tr><td>Dawn</td><td>5:00 – 7:00</td><td>^</td><td>Blue→Amber→Clear</td><td>12 tiles</td></tr>
<tr><td>Day</td><td>7:00 – 19:00</td><td>*</td><td>Normal (no overlay)</td><td>15 tiles</td></tr>
<tr><td>Dusk</td><td>19:00 – 21:00</td><td>v</td><td>Amber→Blue</td><td>12 tiles</td></tr>
<tr><td>Night</td><td>21:00 – 5:00</td><td>(</td><td>Deep blue tint</td><td>10 tiles</td></tr>
</table>

<h4>Clock UI</h4>
<p>The clock panel sits between the minimap and the speed controls ribbon, showing the current time, phase icon, phase name, and day number.</p>

<h4>Night Effects</h4>
<ul>
<li><b>Reduced vision</b>: NPC fog-of-war radius drops from 15 to 10 tiles at night (12 at dawn/dusk).</li>
<li><b>Bandit raids</b>: Raids are roughly twice as likely to occur at night. Keep your defenses ready!</li>
<li><b>Fire glow</b>: Campfires and torches glow brighter at night and dusk for enhanced visibility.</li>
<li><b>Animal behavior</b>: Deer and camels sleep at night (barely move, harder to scare). Lions become more dangerous (extended aggro range, faster movement).</li>
</ul>
<p class="kb-tip">Tip: Night is dangerous — keep troops on patrol and fires lit near your settlement walls!</p>`;
            }
        },

        seasons: {
            title: 'Seasons & Weather',
            content() {
                return `
<h3>Seasons &amp; Weather</h3>
<p>The world cycles through four seasons: <b>Spring</b>, <b>Summer</b>, <b>Autumn</b>, and <b>Winter</b>. Each season lasts 5 days. The season and current weather are shown in the ribbon below the clock. You can choose the starting season in the New Game menu (defaults to Spring).</p>

<h4>Seasons</h4>
<table>
<tr><th>Season</th><th>Icon</th><th>Effects</th><th>Visual Tint</th></tr>
<tr><td>Spring</td><td>.,</td><td>Farms resume production. Chance of rain.</td><td>Lush greens on grass &amp; trees</td></tr>
<tr><td>Summer</td><td>.::</td><td>Full farming. Risk of heat waves (−10% speed) and dry weather. No storms.</td><td>Warm yellows on grass, hot sand tones</td></tr>
<tr><td>Autumn</td><td>~,</td><td>Last chance to harvest. Fog and storms possible.</td><td>Orange-brown grass, deep orange trees</td></tr>
<tr><td>Winter</td><td>***</td><td>Farms and herb gardens halt entirely. Snow, cold. Sickness risk. Road decay increases.</td><td>Frost-white/blue overlay, icy trees &amp; water. Snow overlay on all terrain, melted near active heating furnaces.</td></tr>
</table>
<p class="kb-tip">Tip: Each terrain type (grass, trees, desert, water, stone) gets its own seasonal tint color, making seasons visually distinct!</p>

<h4>Weather Types</h4>
<table>
<tr><th>Weather</th><th>Seasons</th><th>Effect</th></tr>
<tr><td>Clear</td><td>All</td><td>No special effects.</td></tr>
<tr><td>Rain</td><td>Spring, Autumn</td><td>Road decay ×2.</td></tr>
<tr><td>Storm</td><td>Spring, Autumn, Winter</td><td>Road decay ×2. Visual rain effect.</td></tr>
<tr><td>Snow</td><td>Winter</td><td>Road decay ×3. Walking speed −20%. Visual snowfall.</td></tr>
<tr><td>Cold</td><td>Autumn, Winter</td><td>Walking speed −20%.</td></tr>
<tr><td>Heat</td><td>Summer</td><td>Walking speed −10%.</td></tr>
<tr><td>Dry</td><td>Summer</td><td>No special effects.</td></tr>
<tr><td>Fog</td><td>Spring, Autumn</td><td>Reduced visibility effect.</td></tr>
</table>

<h4>Winter Survival</h4>
<ul>
<li><b>Farm halt:</b> All farms and herb gardens stop producing during winter. Stock up on food during spring–autumn!</li>
<li><b>Winter sickness:</b> NPCs have a small chance to fall ill each tick during winter. This chance is reduced by staffed Herb Gardens and eliminated for NPCs near an active Heating Furnace.</li>
<li><b>Heating Furnace:</b> Auto-consumes 1 pitch every 600 ticks during winter. Warms a 16-tile radius, preventing sickness for nearby NPCs. Visibly melts snow in its radius when active — if it runs out of pitch, snow returns.</li>
<li><b>Jerky:</b> Smokehouse converts meat into 2 jerky — a preserved food that helps maintain food variety through winter.</li>
<li><b>Prepared meals:</b> The Cookhouse combines 2 different raw foods into 4 prepared meals, adding variety.</li>
</ul>
<p class="kb-tip">Tip: Build Smokehouses and Cookhouses before winter to diversify your food supply. Place Heating Furnaces near worker clusters and keep pitch stocked!</p>`;
            }
        },

        terrain: {
            title: 'Terrain',
            content() {
                return `
<h3>Terrain Types</h3>
<table>
<tr><th>Terrain</th><th>Walk</th><th>Build</th><th>Fertile</th><th>Notes</th></tr>
<tr><td>Desert</td><td>Y</td><td>Y</td><td>N</td><td>Default terrain. Not farmable.</td></tr>
<tr><td>Grassland</td><td>Y</td><td>Y</td><td>Y</td><td>Found near oases. Farms allowed.</td></tr>
<tr><td>Oasis</td><td>Y</td><td>Y</td><td>Y</td><td>Fertile ground around water.</td></tr>
<tr><td>Trees</td><td>Y</td><td>N</td><td>—</td><td>Harvestable for wood. 3 variants.</td></tr>
<tr><td>Water</td><td>N</td><td>N</td><td>—</td><td>Impassable. Use Fill to convert.</td></tr>
<tr><td>Cliff</td><td>N</td><td>N</td><td>—</td><td>Impassable rock formations.</td></tr>
<tr><td>Rock</td><td>N</td><td>N</td><td>—</td><td>Impassable boulders.</td></tr>
<tr><td>Stone Deposit</td><td>N</td><td>N</td><td>—</td><td>Place Quarry ON deposit tiles.</td></tr>
<tr><td>Iron Deposit</td><td>N</td><td>N</td><td>—</td><td>Place Iron Mine ON deposit tiles.</td></tr>
<tr><td>Pitch Deposit</td><td>N</td><td>N</td><td>—</td><td>Place Pitch Rig ON deposit tiles.</td></tr>
<tr><td>Pitch Ditch</td><td>N</td><td>N</td><td>—</td><td>Flammable trap terrain.</td></tr>
</table>

<h4>Roads</h4>
<p>Civilian NPCs create roads naturally as they walk. Bandits and troops do not create roads. Higher traffic = higher road level (max 15). Roads provide:</p>
<ul>
<li>+2% movement speed per road level (max +30% at level 15)</li>
<li>Extended Fog of War visibility along traveled paths</li>
<li>Visual indication of frequently used routes</li>
</ul>
<p>Roads decay slowly over time if not maintained by foot traffic.</p>

<h4>Fertile Land</h4>
<p>Farms (Apple Orchard, Wheat Farm, Dairy Farm, Hops Farm) require <b>fertile terrain</b>: Grassland or Oasis tiles. These are found near oases throughout the map.</p>
<p class="kb-tip">Tip: Explore outward from your keep to find oases with fertile land for farming!</p>`;
            }
        },

        npcsPersonality: {
            title: 'Personality & Mood',
            content() {
                return `
<h3>Personality &amp; Mood System</h3>

<h4>Personality Traits</h4>
<p>Each NPC spawns with 2-3 personality traits that affect their behavior and mood. Traits are permanent and determined by the NPC's identity. Opposing traits (e.g. Brave/Cowardly) cannot appear together.</p>
<table>
<tr><th>Trait</th><th>Effect</th></tr>
<tr><td>Brave</td><td>60% less likely to flee bandits, more willing to fight</td></tr>
<tr><td>Cowardly</td><td>40% more likely to flee, avoids conflict</td></tr>
<tr><td>Greedy</td><td>More sensitive to taxes, higher theft chance in future</td></tr>
<tr><td>Generous</td><td>Tolerates taxes better, builds relationships faster</td></tr>
<tr><td>Social</td><td>Mood bonus from being around others</td></tr>
<tr><td>Loner</td><td>Slight mood penalty from social situations</td></tr>
<tr><td>Hardworking</td><td>20% faster work speed, but tires 15% faster</td></tr>
<tr><td>Lazy</td><td>20% slower work speed, but tires 15% slower</td></tr>
<tr><td>Aggressive</td><td>More willing to fight, higher conflict chance</td></tr>
<tr><td>Peaceful</td><td>Avoids conflict, mood bonus during peacetime</td></tr>
<tr><td>Pious</td><td>50% more benefit from religion</td></tr>
<tr><td>Skeptical</td><td>50% less affected by religion</td></tr>
</table>
<p>View an NPC's traits in their Details modal.</p>

<h4>Mood System</h4>
<p>Each NPC has a personal mood value (0-100) computed from their current conditions:</p>
<ul>
<li><b>Hunger:</b> Starving = −20, Hungry = −8, Well-fed = +5</li>
<li><b>Fatigue:</b> Exhausted = −15, Very tired = −8, Rested = +3</li>
<li><b>Health:</b> Low HP = −12, Moderate HP = −5</li>
<li><b>Housing:</b> Homeless = −10, Higher tier homes = bonus</li>
<li><b>Tax:</b> Personal tax burden (modified by personality)</li>
<li><b>Religion:</b> Blessed by priest = +4 (Pious NPCs get more)</li>
<li><b>Disease/Fire:</b> Being diseased or on fire = severe penalty</li>
<li><b>Fear/Ale:</b> Castle-level factors contribute partially</li>
<li><b>Memories:</b> Accumulated memory weight affects mood (positive and negative, up to −20/+10). Bad memories like deaths, fires, and combat now carry heavier penalties.</li>
<li><b>Relationships:</b> Average relationship quality gives up to +/-5</li>
<li><b>Social:</b> Recent pleasant chats or arguments temporarily modify mood</li>
<li><b>Conflict &amp; Crime:</b> Fights, theft, and witnessing desertion add negative memories that can drag mood down further</li>
</ul>

<h4>Mood Thresholds</h4>
<table>
<tr><th>Mood</th><th>Range</th><th>Effect</th></tr>
<tr><td style="color:#44ff44">Joyful</td><td>80-100</td><td>+15% work speed</td></tr>
<tr><td style="color:#88cc44">Content</td><td>60-79</td><td>+5% work speed</td></tr>
<tr><td style="color:#cccc44">Neutral</td><td>40-59</td><td>Normal speed</td></tr>
<tr><td style="color:#cc8844">Unhappy</td><td>20-39</td><td>−10% work speed</td></tr>
<tr><td style="color:#cc4444">Angry</td><td>10-19</td><td>−25% work speed</td></tr>
<tr><td style="color:#ff2222">Desperate</td><td>0-9</td><td>−25% work speed</td></tr>
</table>
<p class="kb-tip">Tip: Keep your NPCs well-fed, well-housed, and well-rested for maximum productivity. A Joyful NPC works 15% faster than normal!</p>`;
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

<h4>Daily Schedule</h4>
<p>All peasants follow a daily schedule based on the in-game clock. The schedule can be adjusted from the Keep's Schedule Management panel:</p>
<table>
<tr><th>Phase</th><th>Default Hours</th><th>Activity</th></tr>
<tr><td>Work</td><td>6:00–15:00</td><td>Workers perform their building's task cycle</td></tr>
<tr><td>Free Time</td><td>15:00–22:00</td><td>NPCs eat, socialize, visit inn/religious sites, wander</td></tr>
<tr><td>Sleep</td><td>22:00–6:00</td><td>NPCs go home to sleep, recovering fatigue and health</td></tr>
</table>
<p><b>Adjustable:</b> Work start, work end, and bedtime can be adjusted from the Keep. Minimum 4 hours of work and 4 hours of sleep are enforced.</p>
<p><b>Service workers</b> (well, religious, apothecary, inn) work during both work and free time phases, only sleeping at night.</p>

<h4>Free-Time Social Behavior</h4>
<p>During free time, civilians pick activities based on current needs and personality. Low-mood social NPCs seek conversation, pious NPCs visit religious buildings, tired NPCs may rest early, and inn visits are strongly preferred (55% chance) when ale is available or the innkeeper is already carrying ale.</p>
<p>When two free-time NPCs are within 2 tiles, they may start a short social meeting (3–6 ticks). They exchange 1–3 memories, adjust relationships (+3..+8 for pleasant chat, -5..-15 for arguments), and receive temporary mood effects.</p>
<p>If both are socializing near an active inn and ale is available, one ale is consumed and they get bonus relationship and mood gains.</p>

<h4>Conflict, Theft, and Desertion</h4>
<p>Very unhappy civilians are no longer always passive. Angry or Desperate NPCs with bad relationships may start fistfights with nearby rivals. Aggressive personalities are more likely to escalate; Peaceful personalities are less likely to do so and may feel guilty after winning.</p>
<p>Desperate NPCs with the Greedy trait may also steal from the granary or stockpile, taking 1–3 units. If they steal food they eat it immediately; otherwise the theft only improves their own outlook while harming community trust if witnessed.</p>
<p>NPCs who remain <b>Desperate</b> for roughly 3 in-game days may desert the settlement entirely, abandoning their work and walking toward the wilderness. Nearby witnesses remember the departure.</p>

<h4>Hunger System</h4>
<p>Each NPC has a personal hunger value (0–100) that drains over time (~4 per hour). During free time, hungry NPCs (below 50) walk to the granary to eat. Each meal consumes <b>2 food units</b> and restores 50 hunger per unit, filling the hunger bar completely (2 x 50 = 100).</p>
<p><b>Starvation override:</b> If an NPC reaches the starving threshold (10 hunger or below), they will immediately stop whatever they are doing — whether working, sleeping, or in free time — and go eat at the granary if food is available.</p>
<p><b>Service workers</b> (well, apothecary, chapel, inn) work during both work and free time, so they eat when hungry during free time before resuming service duties.</p>
<p>NPCs prefer food variety — they'll eat different types each day if available. Below 10 hunger, NPCs take starvation damage (1 HP/hour). Death from starvation is recorded in the event log as 'died from starvation'.</p>

<h4>Fatigue System</h4>
<p>Workers accumulate fatigue during work hours. Different buildings cause different fatigue rates. Heavy labor (quarry, iron mine) tires workers faster than light work (chapel, inn).</p>
<ul>
<li><b>High fatigue (80+):</b> Production speed reduced by 50%</li>
<li><b>Exhaustion (100):</b> Worker stops working and must rest</li>
<li><b>Sleep recovery:</b> ~15 fatigue per hour of sleep, with bonuses from better housing</li>
</ul>
<p>Housing tier affects recovery: Hovel = 1.0×, Cottage = 1.25×, House = 1.5×. Homeless NPCs recover at only 0.5× rate.</p>

<h4>Health Regeneration</h4>
<p>During sleep, NPCs regenerate 1 HP per hour — but only if they are not starving and not diseased. Low health (below 30%) also reduces production speed by 50%.</p>

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

<h4>Troop Needs</h4>
<p>Troops also have hunger and fatigue, but handle them differently:</p>
<ul>
<li><b>Food:</b> Troops "teleport" food — they consume 2 units from the granary without walking there</li>
<li><b>Sleep:</b> Fatigued troops sleep at their post during the night phase (if no enemies nearby)</li>
<li><b>Wake:</b> Sleeping troops wake instantly when enemies appear, when selected, or when given orders</li>
</ul>

<h4>Special Worker Roles</h4>
<table>
<tr><th>Role</th><th>Building</th><th>Behavior</th></tr>
<tr><td>Firefighter</td><td>Well</td><td>Fills bucket → walks to fire → extinguishes. Immune to fire.</td></tr>
<tr><td>Healer</td><td>Apothecary</td><td>Prioritizes sick NPCs over disease clouds. Walks to target → heals (6 ticks). Removing a cloud also cures nearby NPCs.</td></tr>
<tr><td>Priest</td><td>Chapel/Church/Cathedral</td><td>Blesses nearby peasants within radius. Blessed NPCs gain a memory and mood boost; witnesses gain relationship bonus.</td></tr>
<tr><td>Innkeeper</td><td>Inn</td><td>Fetches ale from stockpile, carries to inn, waits for customers (civilians within 3 tiles), serves ale over 20 ticks. Customer gets +3 mood and a memory.</td></tr>
<tr><td>Hunter</td><td>Hunter's Post</td><td>Tracks → shoots → butchers (12 ticks) → delivers 5 meat.</td></tr>
</table>

<h4>Population</h4>
<p>New peasants arrive when happiness ≥ 50 (every 20 ticks, if housing available). Peasants leave when happiness &lt; 25.</p>
<p>Starting: 8 peasants + resources (500 gold, 50 wood, 30 stone, 10 apples, 10 meat).</p>

<h4>NPC Details</h4>
<p>Click any villager and use the <b>Details</b> button in the info panel to see their full status, including name, role, health, hunger, fatigue, <b>personality traits</b>, <b>mood</b>, home, and current activity. Use the <b>View</b> buttons next to their workplace or home to jump the camera to that building. The game pauses while viewing details.</p>
<p>From the details panel you can also open <b>Mood</b> (factor breakdown), <b>Memories</b> (event log), and <b>Relations</b> (relationship list) sub-modals. Troops do not have Mood or Relations buttons.</p>
<p>The <b>Villagers</b> button in the top HUD opens a sortable list of all villagers with key stats, occupation, and quick Info/Focus actions.</p>
<p>When a villager dies, the death message includes their occupation and cause of death (e.g. "John (Quarry worker) died from bandit attack.").</p>
<p>Housing building info panels also list all residents with Focus/Details buttons, similar to how workplaces show their workers.</p>`;
            }
        },
        memory: {
            title: 'NPC Memory',
            content() {
                return `
<h3>NPC Memory System</h3>
<p>Each NPC maintains a personal memory log of events they have witnessed or experienced. Memories affect mood and create a living history for each character.</p>

<h4>How Memories Work</h4>
<p>When something notable happens — a fire, a raid, a death, disease, or even arriving at the settlement — NPCs within <b>8 tiles</b> of the event automatically gain a <b>firsthand memory</b> of it.</p>
<p>Each memory has a <b>priority</b> from 1 (Routine) to 10 (Death). Higher-priority memories last longer and have more impact on mood.</p>

<h4>Memory Aging</h4>
<p>Memories fade over time. A memory from today has full impact; after 3 days it retains about 50%, and after a week only about 15%. This is the <b>recency factor</b>.</p>
<p>The <b>effective priority</b> of a memory is its base priority multiplied by its recency factor. When the memory log exceeds 100 entries, the lowest effective-priority memory is removed.</p>

<h4>Firsthand vs. Secondhand</h4>
<p><b>Firsthand</b> memories are events the NPC witnessed directly. <b>Secondhand</b> memories are heard from others. Secondhand memories have reduced priority and less mood impact (40% of firsthand).</p>

<h4>Mood Impact</h4>
<p>Memories directly influence NPC mood. Negative events (death, fire, disease, exhaustion, theft, fights, desertion) lower mood, while positive events (recovery, being blessed, satisfying victories) raise it. The impact is weighted by recency and whether the memory is firsthand.</p>

<h4>Memory Types</h4>
<table>
<tr><th>Type</th><th>Priority</th><th>Mood Effect</th></tr>
<tr><td>\u2605 Arrived</td><td>Routine (1)</td><td>Slight positive</td></tr>
<tr><td>\u2692 Assigned Work</td><td>Routine (1)</td><td>Slight positive</td></tr>
<tr><td>\u2764 Recovered</td><td>Notable (4)</td><td>Positive</td></tr>
<tr><td>\u2721 Blessed</td><td>Notable (4)</td><td>Positive</td></tr>
<tr><td>\u231B Exhaustion</td><td>Notable (4)</td><td>Negative</td></tr>
<tr><td>\u26A0 Got Sick</td><td>Disease (6)</td><td>Negative</td></tr>
<tr><td>\u26A0 Theft / Caught Stealing</td><td>Crime (7)</td><td>Usually negative</td></tr>
<tr><td>\u21E8 Fled Danger</td><td>Combat (8)</td><td>Negative</td></tr>
<tr><td>\u2694 NPC Fight</td><td>Combat (8)</td><td>Negative or mixed</td></tr>
<tr><td>\u2694 Bandit Raid / Kill</td><td>Combat (8)</td><td>Mixed</td></tr>
<tr><td>\u2737 Fire</td><td>Fire (9)</td><td>Strong negative</td></tr>
<tr><td>\u2620 NPC Died</td><td>Death (10)</td><td>Strong negative</td></tr>
<tr><td>\u21E8 Saw Desertion</td><td>Upheaval (6)</td><td>Negative</td></tr>
</table>

<h4>Viewing Memories</h4>
<p>Open an NPC's details panel and click the <b>Memories</b> button to see their full memory log. Each entry shows an icon, description, day number, whether it's firsthand or secondhand, and its current effective priority.</p>`;
            }
        },
        relationships: {
            title: 'Relationships',
            content() {
                return `
<h3>NPC Relationships</h3>
<p>Each NPC tracks how they feel about other NPCs they have interacted with or heard about. Relationship values range from <b>-100</b> (bitter enemy) to <b>+100</b> (closest friend), starting at 0 (stranger).</p>

<h4>Relationship Tiers</h4>
<table>
<tr><th>Tier</th><th>Range</th><th>Effect</th></tr>
<tr><td style="color:#cc4444">Enemy</td><td>-100 to -50</td><td>NPC actively avoids or conflicts with target</td></tr>
<tr><td style="color:#cc8844">Rival</td><td>-49 to -10</td><td>Tense interactions, arguments more likely</td></tr>
<tr><td style="color:#888">Stranger</td><td>-9 to +9</td><td>Polite but indifferent</td></tr>
<tr><td style="color:#cccc44">Acquaintance</td><td>+10 to +49</td><td>Friendly, willing to share memories</td></tr>
<tr><td style="color:#88cc44">Friend</td><td>+50 to +79</td><td>Seeks out for social time, mood bonus</td></tr>
<tr><td style="color:#44ff44">Close Friend</td><td>+80 to +100</td><td>Strong mood bonus, will defend in fights</td></tr>
</table>

<h4>How Relationships Change</h4>
<ul>
<li><b>Shared work:</b> NPCs at the same building gain +1 relationship per day. Social NPCs gain +1.5.</li>
<li><b>Social meetings:</b> Pleasant chats improve relationships (+3..+8), arguments worsen them (-5..-15).</li>
<li><b>Witnessing events:</b> Seeing positive events (recovery, blessing) involving someone improves opinion. Seeing negative events (death, fire, raids, fights, theft) worsens it.</li>
<li><b>Secondhand memories:</b> Hearing good or bad things about someone changes opinion at 40% of the direct magnitude.</li>
<li><b>Personality:</b> Social NPCs build positive relationships faster. Aggressive NPCs build negative ones faster.</li>
<li><b>Inn bonus:</b> Socializing near an active inn with available ale increases social gains.</li>
<li><b>Repeated fights:</b> Civilians who keep fighting the same rival can rapidly become full enemies.</li>
</ul>

<h4>Mood Impact</h4>
<p>The average quality of an NPC's relationships contributes to their mood: surrounded by friends = up to +5 mood bonus; surrounded by enemies = up to -5 mood penalty.</p>

<h4>Viewing Relationships</h4>
<p>Open an NPC's details panel and click the <b>Relations</b> button to see their relationship list. Each entry shows the other NPC's name, tier, value, and provides Info and Focus buttons.</p>`;
            }
        },
        animations: {
            title: 'Animations',
            content() {
                return `
<h3>Overlay Animation System</h3>
<p>Visual overlays appear above NPCs and buildings to show what is happening in the settlement at a glance. Animations are data-driven — each type has its own character, color, and behavior.</p>

<h4>State Overlays (Persistent)</h4>
<p>These appear automatically when an NPC enters a state and disappear when the state ends:</p>
<table>
<tr><th>Overlay</th><th>Symbol</th><th>Color</th><th>Trigger</th></tr>
<tr><td>Sleep</td><td>z / Z</td><td style="color:#8888FF">#8888FF</td><td>NPC is sleeping (at home or at post)</td></tr>
<tr><td>Speech</td><td>o / O</td><td style="color:#66ccff">#66ccff</td><td>NPC is socializing</td></tr>
<tr><td>Combat</td><td>x / +</td><td style="color:#FF4444">#FF4444</td><td>Troop/bandit attack cooldown active</td></tr>
<tr><td>Anger</td><td># / *</td><td style="color:#ff4444">#ff4444</td><td>Civilian is in a fight</td></tr>
<tr><td>Carry</td><td>^</td><td style="color:#88aa44">#88aa44</td><td>NPC is carrying a resource</td></tr>
</table>

<h4>Triggered Overlays (Timed)</h4>
<p>These appear briefly when an event occurs and fade out automatically:</p>
<table>
<tr><th>Overlay</th><th>Symbol</th><th>Color</th><th>Trigger</th></tr>
<tr><td>Production Sparkle</td><td>+ / *</td><td style="color:#ffdd44">#ffdd44</td><td>Item produced at a building</td></tr>
<tr><td>Heart</td><td>&lt;3</td><td style="color:#ff6688">#ff6688</td><td>Friendship formed</td></tr>
<tr><td>Music</td><td>~ / *</td><td style="color:#cc88ff">#cc88ff</td><td>Priest blessing NPCs</td></tr>
<tr><td>Skull</td><td>d / b</td><td style="color:#cccccc">#cccccc</td><td>NPC death</td></tr>
<tr><td>Hunger</td><td>o</td><td style="color:#cc8844">#cc8844</td><td>NPC taking starvation damage</td></tr>
<tr><td>Sweat</td><td>, / .</td><td style="color:#88ccff">#88ccff</td><td>NPC stealing resources</td></tr>
<tr><td>Exclaim</td><td>!</td><td style="color:#ffcc00">#ffcc00</td><td>NPC deserting the settlement</td></tr>
<tr><td>Disease</td><td>~ / *</td><td style="color:#88CC00">#88CC00</td><td>NPC contracts a disease</td></tr>
<tr><td>Tool</td><td>/ \\ /</td><td style="color:#aaaaaa">#aaaaaa</td><td>Worker using tools at workplace or gathering</td></tr>
<tr><td>Flash</td><td>* / +</td><td style="color:#ffffff">#ffffff</td><td>Major event start (fire, raid, disease outbreak)</td></tr>
<tr><td>Ember</td><td>. / ,</td><td style="color:#FF6600">#FF6600</td><td>Fire spreading to adjacent tiles</td></tr>
<tr><td>Miasma</td><td>~ / .</td><td style="color:#88CC00">#88CC00</td><td>Disease cloud appearing on a tile</td></tr>
</table>

<h4>Visual Effects</h4>
<ul>
<li><b>Float:</b> Some overlays drift upward over time (sleep, heart, sparkle, skull, sweat, music, exclaim).</li>
<li><b>Fade:</b> Timed overlays gradually become transparent in their final 40% of duration.</li>
<li><b>Fog of War:</b> Overlays only appear on currently visible tiles.</li>
<li><b>NPC Following:</b> NPC-attached overlays move with their NPC in real time.</li>
<li><b>Camera Shake:</b> The camera shakes when buildings are destroyed by fire and during large bandit raids (5+ attackers).</li>
</ul>

<h4>Extensibility</h4>
<p>Adding a new animation type requires only a single data entry in the animation registry — no code changes needed.</p>`;
            }
        },

        saveLoad: {
            title: 'Save & Load',
            content() {
                return `
<h3>Save &amp; Load System</h3>

<h4>Save Slots</h4>
<p>The game provides <b>3 manual save slots</b> plus <b>1 automatic save slot</b>. Each slot stores the complete state of the game including all buildings, NPCs, resources, events, and world state.</p>

<h4>Manual Save</h4>
<p>Click the <b>Save</b> button in the top HUD bar (next to Villagers and Knowledge Base buttons). A dialog appears with 3 slots to choose from. Selecting a slot overwrites any previous save in that slot.</p>

<h4>Auto-Save</h4>
<p>The game automatically saves to the auto-save slot periodically during gameplay. This happens silently in the background. If the game crashes or the browser is closed, you can resume from the last auto-save.</p>

<h4>Loading a Game</h4>
<p>From the <b>main menu</b>, click <b>Load Game</b> to see all available save slots. Each slot shows the day number, time of day, population count, and when the save was created. Click <b>Load</b> to restore that save. The Load Game button only appears if saves exist.</p>

<h4>Deleting Saves</h4>
<p>In the Load Game panel, each save slot has a <b>Delete</b> button to permanently remove that save.</p>

<h4>What Gets Saved</h4>
<p>Everything: terrain, buildings, NPCs (with their personalities, memories, relationships, mood), resources, animals, fire state, disease clouds, camera position, time of day, and event scheduler state. When loaded, the game resumes exactly where it left off.</p>

<h4>Compression</h4>
<p>Save data is stored using the browser's <b>IndexedDB</b> database, which provides virtually unlimited storage (many gigabytes) compared to the old localStorage approach. Objects are stored natively — no JSON serialization or compression overhead. Old saves from earlier versions using localStorage are automatically migrated to IndexedDB on first load.</p>

<p class="kb-tip">Tip: Save before risky decisions like large military orders or building near enemy territory. You can always load a previous save if things go wrong!</p>`;
            }
        }
    },

    init() {
        const overlay = document.getElementById('knowledgeBaseOverlay');
        const closeBtn = document.getElementById('kbClose');
        const nav = document.getElementById('kbNav');

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
