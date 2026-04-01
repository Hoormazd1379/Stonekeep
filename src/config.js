// Stonekeep - Configuration
'use strict';

const CONFIG = {
    // Tile rendering
    TILE_WIDTH: 16,
    TILE_HEIGHT: 16,
    FONT_SIZE: 14,
    FONT_FAMILY: 'monospace',

    // Default map
    DEFAULT_MAP_SIZE: 192,

    // Infinite world
    WORLD_SIZE: 8192,
    CHUNK_SIZE: 32,
    VISION_RADIUS: 15,

    // Camera
    SCROLL_SPEED: 8,
    EDGE_SCROLL_MARGIN: 20,
    ZOOM_MIN: 0.5,
    ZOOM_MAX: 3.0,
    ZOOM_STEP: 0.15,

    // Game speed
    BASE_TICK_MS: 500, // ms per game tick at speed 1
    SPEEDS: [0, 1, 2, 4, 8, 16],

    // Starting resources
    START_RESOURCES: {
        gold: 500,
        wood: 50,
        stone: 30,
        iron: 0,
        pitch: 0,
        apples: 10,
        meat: 10
    },

    // Starting peasants spawned after keep placed
    START_PEASANTS: 8,

    // Population
    PEASANTS_PER_HOVEL: 8,
    HAPPINESS_ARRIVAL_THRESHOLD: 50,
    HAPPINESS_LEAVE_THRESHOLD: 25,

    // Worker
    WORKER_SPEED: 1.0,         // tiles per tick (1.0 = 1 tick per tile)
    TROOP_SPEED_BONUS: 0.15,   // extra speed for troops (+15% faster than workers/bandits)
    GATHER_TICKS: 8,           // ticks to gather a resource
    PRODUCE_TICKS: 10,         // ticks to produce an item
    CARRY_CAPACITY: 1,

    // Minimap
    MINIMAP_SIZE: 200,

    // Height model for defense
    HEIGHT_GROUND: 0,
    HEIGHT_WALL: 1,
    HEIGHT_TOWER: 2,

    // Fire system
    FIRE_SPREAD_INTERVAL: 8,    // ticks between spread attempts per fire
    FIRE_SPREAD_CHANCE: 0.5,    // 50% chance to spread each attempt
    FIRE_NORMAL_DURATION: 240,  // ticks until a normal fire burns out
    FIRE_PITCH_DURATION: 600,   // ticks until a pitch ditch fire burns out
    FIRE_DAMAGE_INTERVAL: 35,   // ticks between fire damage to buildings (~3.5x slower than original)
    FIRE_BUILDING_HP: 8,        // HP of flammable buildings before fire destroys them

    // Events system
    EVENT_GRACE_PERIOD: 2400,           // No events for first 2400 ticks (~20 min at normal speed)
    EVENT_SAFE_DAYS: 3,                 // No negative events for the first 3 full day/night cycles
    EVENT_BASE_INTERVAL: 4000,          // Base ticks between events (~33 min at normal speed)
    EVENT_MIN_INTERVAL: 1200,           // Minimum ticks between events (~10 min at normal speed)
    EVENT_NOTIFICATION_DURATION: 300,   // Ticks to show notification on screen
    EVENT_LOG_MAX_ENTRIES: 400,         // Max retained entries in the in-game event log

    // Bandits
    BANDIT_MELEE_HP: 12,
    BANDIT_MELEE_DAMAGE: 3,
    BANDIT_ARCHER_HP: 8,
    BANDIT_ARCHER_DAMAGE: 2,
    BANDIT_ARCHER_RANGE: 6,
    BANDIT_MIN_RAID_POP: 5,     // Minimum population to trigger raids
    BANDIT_BASE_COUNT: 3,       // Base number of bandits per raid
    BANDIT_POP_SCALE: 15,       // Extra bandit per N population
    BANDIT_MAX_COUNT: 12,       // Max bandits per raid
    BANDIT_ATTACK_COOLDOWN: 4,  // Ticks between bandit attacks
    BANDIT_DETECT_RANGE: 8,     // Tiles at which bandits detect player NPCs

    // Disease system
    DISEASE_CLOUD_DURATION: 400,   // Ticks until disease cloud dissipates
    DISEASE_CLOUD_SIZE: 4,         // Tiles per disease cloud cluster
    DISEASE_INFECT_CHANCE: 0.02,   // Per-tick chance to infect NPC on disease tile
    DISEASE_DAMAGE_INTERVAL: 20,   // Ticks between disease HP loss
    DISEASE_DAMAGE: 1,             // HP lost per disease tick
    DISEASE_HEAL_TICKS: 6,         // Ticks for healer to remove one disease tile
    DISEASE_NPC_SPREAD_CHANCE: 0.01,  // Per-tick chance diseased NPC infects nearby NPC
    DISEASE_NPC_SPREAD_RANGE: 2,      // Tiles within which disease spreads NPC-to-NPC
    DISEASE_RESISTANCE_PER_APOTHECARY: 0.2, // 20% resistance per apothecary
    DISEASE_MAX_RESISTANCE: 0.6,   // Max 60% resistance

    // Fire thrower
    FIRE_THROWER_HP: 15,
    FIRE_THROWER_DAMAGE: 1,        // Weak melee fallback damage
    FIRE_THROWER_RANGE: 7,
    FIRE_THROWER_COOLDOWN: 8,      // Ticks between fire throws

    // NPC fire
    NPC_FIRE_CATCH_CHANCE: 0.25,   // Per-tick chance NPC catches fire while on fire tile
    NPC_FIRE_DAMAGE_INTERVAL: 8,   // Ticks between fire damage to burning NPCs
    NPC_FIRE_DAMAGE: 1,            // HP lost per fire tick
    NPC_FIRE_DURATION: 50,         // Ticks an NPC stays on fire after leaving fire tile

    // Building HP
    BUILDING_BASE_HP: 10,          // HP per tile (width * height * base)
    BANDIT_BUILDING_DAMAGE: 2,     // Damage bandits deal to buildings per attack
    BANDIT_BUILDING_COOLDOWN: 6,   // Ticks between bandit attacks on buildings

    // Time system (Phase 3.1)
    TICKS_PER_HOUR: 128,          // Game ticks per in-game hour (full day = 3072 ticks = ~25.6 min at speed 1)
    START_HOUR: 8,                // Starting hour of day (8:00 AM)
    NIGHT_VISION_RADIUS: 10,     // Reduced vision radius at night (vs 15 during day)
    DAWN_VISION_RADIUS: 12,      // Vision radius during dawn/dusk transitions

    // Schedule system (Phase 3.2)
    SCHEDULE_WORK_START: 6,       // Work phase starts at 6:00
    SCHEDULE_WORK_END: 15,        // Work phase ends at 15:00 (9 hours)
    SCHEDULE_FREE_START: 15,      // Free time starts at 15:00
    SCHEDULE_FREE_END: 22,        // Free time ends at 22:00
    SCHEDULE_SLEEP_START: 22,     // Sleep phase starts at 22:00
    SCHEDULE_SLEEP_END: 6,        // Sleep phase ends at 6:00
    DEFAULT_WORK_HOURS: 9,        // Default work hours per building
    MIN_WORK_HOURS: 4,            // Minimum adjustable work hours
    MAX_WORK_HOURS: 12,           // Maximum adjustable work hours

    // Housing tiers (Phase 3.2)
    PEASANTS_PER_COTTAGE: 6,      // Cottage houses 6 peasants
    PEASANTS_PER_HOUSE: 4,        // House houses 4 peasants
    HOMELESS_MOOD_PENALTY: -8,    // Mood penalty for homeless NPCs

    // Hunger system (Phase 3.3)
    HUNGER_MAX: 100,              // Maximum hunger value
    HUNGER_START: 80,             // Starting hunger
    HUNGER_DRAIN_PER_HOUR: 4,     // Hunger loss per game hour (~25 hours to starve from full)
    HUNGER_EAT_THRESHOLD: 50,     // NPC seeks food below this
    HUNGER_STARVE_THRESHOLD: 10,  // Below this: take damage
    HUNGER_WELL_FED: 70,          // Above this: mood bonus
    HUNGER_MEAL_RESTORE: 60,      // Hunger restored per meal (base, modified by ration level)
    HUNGER_STARVE_DAMAGE: 1,      // HP lost per starvation tick
    HUNGER_STARVE_INTERVAL: 128,  // Ticks between starvation damage (1 per game hour)
    HUNGER_EAT_TICKS: 4,          // Ticks to eat a meal at granary
    TROOP_HUNGER_INTERVAL: 256,   // Ticks between troop auto-eat checks (2 game hours)

    // Social interactions (Phase 3.7)
    SOCIAL_MEETING_MIN_TICKS: 3,
    SOCIAL_MEETING_MAX_TICKS: 6,
    SOCIAL_MEETING_CHANCE: 0.18,       // chance when two eligible NPCs are nearby
    SOCIAL_MEETING_COOLDOWN: 60,       // per-NPC cooldown after social interaction
    SOCIAL_SEEK_RADIUS: 8,
    SOCIAL_LOW_MOOD_THRESHOLD: 45,
    SOCIAL_SIGHTING_INTERVAL: 12,
    SOCIAL_SIGHTING_RANGE: 2,
    INN_SOCIAL_RANGE: 4,
    INN_SOCIAL_ALE_COST: 1,
    INN_SOCIAL_MOOD_BONUS: 2,

    // Resource reservation system (Phase 3.7)
    RESOURCE_RESERVATION_TTL: 64,

    // Conflict, crime, and desertion (Phase 3.8)
    CIVILIAN_FIGHT_CHECK_INTERVAL: 5,
    CIVILIAN_FIGHT_CHANCE: 0.14,
    CIVILIAN_FIGHT_MIN_TICKS: 6,
    CIVILIAN_FIGHT_MAX_TICKS: 12,
    CIVILIAN_FIGHT_DAMAGE_COOLDOWN: 4,
    CIVILIAN_FIGHT_RELATIONSHIP_PENALTY: 12,
    CIVILIAN_CONFLICT_COOLDOWN: 96,
    THEFT_CHECK_INTERVAL: 24,
    THEFT_BASE_CHANCE: 0.08,
    THEFT_MIN_AMOUNT: 1,
    THEFT_MAX_AMOUNT: 3,
    THEFT_WITNESS_RANGE: 8,
    THEFT_DURATION_TICKS: 4,
    DESERTION_MIN_DESPERATE_DAYS: 3,
    DESERTION_CHECK_INTERVAL: 128,
    DESERTION_BASE_CHANCE: 0.03,
    DESERTION_DISTANCE_FROM_KEEP: 500,

    // Fatigue system (Phase 3.3)
    FATIGUE_MAX: 100,             // Maximum fatigue value
    FATIGUE_START: 0,             // Starting fatigue
    FATIGUE_WORK_BASE: 0.8,      // Base fatigue gain per game hour of work
    FATIGUE_SLEEP_RECOVERY: 15,   // Fatigue recovered per game hour of sleep
    FATIGUE_HIGH: 80,             // Above this: reduced production speed (50%)
    FATIGUE_EXHAUSTION: 100,      // At 100: stop working, must rest
    FATIGUE_TROOP_SLEEP_RECOVERY: 10, // Troop fatigue recovery per hour sleeping at post

    // Health regen (Phase 3.3)
    HEALTH_REGEN_PER_HOUR: 1,    // HP restored per hour while sleeping (not starving/diseased)
    LOW_HEALTH_THRESHOLD: 0.3,   // Below 30% HP: reduced speed/output

    // Building auto-fire (Phase 4.1)
    BUILDING_FIRE_COOLDOWN: 4,        // Ticks between building projectile shots
    KEEP_FIRE_RANGE: 16,              // Keep shoots at 2× archer range (archer=8)
    WATCHTOWER_FIRE_RANGE: 16,        // Watchtower shoots at 2× archer range
    GUARD_POST_FIRE_RANGE: 8,         // Guard post shoots at archer range
    BUILDING_FIRE_DAMAGE: 2,          // Same damage as one archer
    WATCHTOWER_VISION_RADIUS: 30,     // Large vision radius for watchtowers
    GUARD_POST_VISION_RADIUS: 15,     // Same vision radius as an NPC
    HAULER_CARRY_CAPACITY: 5,         // Max units a hauler can carry per trip

    // Fatigue rates by building type (multiplier on FATIGUE_WORK_BASE)
    FATIGUE_RATES: {
        quarry: 2.0,              // Heavy labor
        ironMine: 1.8,            // Heavy labor
        woodcutter: 1.5,          // Moderate labor
        pitchRig: 1.3,            // Moderate labor
        wheatFarm: 1.0,           // Light labor
        appleOrchard: 0.8,        // Light labor
        dairyFarm: 0.8,           // Light labor
        hopsFarm: 0.9,            // Light labor
        windmill: 1.2,            // Moderate
        bakery: 1.0,              // Moderate
        brewery: 1.0,             // Moderate
        hunterPost: 1.6,          // Active hunting
        fletcher: 1.0,            // Craft
        poleturner: 1.0,          // Craft
        blacksmith: 1.5,          // Heavy craft
        armorer: 1.5,             // Heavy craft
        chapel: 0.5,              // Light
        church: 0.5,              // Light
        cathedral: 0.5,           // Light
        well: 1.2,                // Moderate (firefighting)
        apothecary: 0.8,          // Light
        inn: 0.6,                 // Light
        forwardStockpile: 1.3,    // Moderate (hauling goods)
        forwardGranary: 1.3,      // Moderate (hauling food)
        herbGarden: 0.8,          // Light labor
        cookhouse: 1.0,           // Moderate
        smokehouse: 1.0           // Moderate
    },

    // ── Seasons & Weather ──
    DAYS_PER_SEASON: 5,
    SEASONS: ['spring', 'summer', 'autumn', 'winter'],
    SEASON_NAMES: { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' },
    SEASON_ICONS: { spring: '✿', summer: '☀', autumn: '🍂', winter: '❄' },

    // Weather definitions per season: { type, weight, duration (in hours) }
    WEATHER_TYPES: {
        clear:   { name: 'Clear',      icon: '☼' },
        rain:    { name: 'Rain',       icon: '🌧' },
        storm:   { name: 'Storm',      icon: '⛈' },
        snow:    { name: 'Snow',       icon: '❆' },
        cold:    { name: 'Cold Snap',  icon: '🥶' },
        heat:    { name: 'Heat Wave',  icon: '🔥' },
        dry:     { name: 'Dry Season', icon: '☁' },
        fog:     { name: 'Fog',        icon: '🌫' }
    },
    WEATHER_POOLS: {
        spring: [
            { type: 'clear', weight: 40 },
            { type: 'rain',  weight: 30 },
            { type: 'fog',   weight: 15 },
            { type: 'storm', weight: 15 }
        ],
        summer: [
            { type: 'clear', weight: 35 },
            { type: 'heat',  weight: 30 },
            { type: 'dry',   weight: 20 },
            { type: 'storm', weight: 15 }
        ],
        autumn: [
            { type: 'clear', weight: 30 },
            { type: 'rain',  weight: 30 },
            { type: 'fog',   weight: 20 },
            { type: 'cold',  weight: 20 }
        ],
        winter: [
            { type: 'clear', weight: 20 },
            { type: 'snow',  weight: 35 },
            { type: 'cold',  weight: 30 },
            { type: 'storm', weight: 15 }
        ]
    },
    WEATHER_MIN_DURATION_HOURS: 4,
    WEATHER_MAX_DURATION_HOURS: 16,

    // Season gameplay effects
    WINTER_SICKNESS_CHANCE: 0.0005,     // Per NPC per tick chance of getting sick in winter
    HERB_SICKNESS_REDUCTION: 0.25,       // Each herb garden reduces winter sickness by 25%
    WINTER_SPEED_PENALTY: 0.15,          // 15% slower walking in winter
    HEAT_SPEED_PENALTY: 0.10,            // 10% slower walking in heat waves
    COLD_SPEED_PENALTY: 0.20,            // 20% slower walking in cold snaps
    RAIN_ROAD_DECAY_MULT: 2.0,           // Road decay 2x faster in rain
    SNOW_ROAD_DECAY_MULT: 3.0,           // Road decay 3x faster in snow
    HEATING_FURNACE_RADIUS: 16,          // Warmth radius of heating furnace
    HEATING_FURNACE_PITCH_INTERVAL: 600, // Ticks between pitch consumption (auto)

    // Seasonal terrain color tints (RGBA overlays)
    SEASON_TERRAIN_TINT: {
        spring: { r: 50, g: 120, b: 50, alpha: 0.08 },
        summer: { r: 200, g: 180, b: 50, alpha: 0.06 },
        autumn: { r: 180, g: 100, b: 30, alpha: 0.08 },
        winter: { r: 200, g: 220, b: 255, alpha: 0.12 }
    },

    // Colors
    COLORS: {
        UI_GOLD: '#c8a82e',
        UI_BG: '#000000',
        UI_TEXT: '#cccccc',
        UI_DIM: '#666666',
        CURSOR_VALID: 'rgba(0,255,0,0.3)',
        CURSOR_INVALID: 'rgba(255,0,0,0.3)',
        MINIMAP_CAMERA: '#ffffff',
        GRID_LINE: 'rgba(40,40,40,0.3)'
    }
};
