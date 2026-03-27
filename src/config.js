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
    FIRE_DAMAGE_INTERVAL: 10,   // ticks between fire damage to buildings
    FIRE_BUILDING_HP: 8,        // HP of flammable buildings before fire destroys them

    // Events system
    EVENT_GRACE_PERIOD: 2400,           // No events for first 2400 ticks (~20 min at normal speed)
    EVENT_BASE_INTERVAL: 4000,          // Base ticks between events (~33 min at normal speed)
    EVENT_MIN_INTERVAL: 1200,           // Minimum ticks between events (~10 min at normal speed)
    EVENT_NOTIFICATION_DURATION: 300,   // Ticks to show notification on screen

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
