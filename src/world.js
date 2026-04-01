// Stonekeep - World State
'use strict';

const World = {
    width: 0,
    height: 0,
    tiles: null,        // 2D array of tile objects
    buildings: [],      // array of placed building instances
    buildingMap: null,   // 2D array: buildingId at each tile (or null)
    npcs: [],
    tick: 0,
    seed: 0,
    gamePhase: 'menu',  // 'menu', 'setup', 'playing'
    setupStep: 0,       // 0=keep, 1=granary, 2=stockpile, 3=done
    gameSpeed: 1,    fowEnabled: true,    // Fog of war toggle (true = enabled, false = disabled)    generatedChunks: null, // Set of "cx,cy" keys for generated chunks

    // Resource stockpiles (global counts)
    resources: {},

    // Population
    population: 0,
    maxPopulation: 0,
    happiness: 50,
    fearFactor: 0,
    fearEfficiency: 1.0,
    idlePeasants: 0,

    // References to key buildings
    keepPos: null,
    granaryPos: null,
    stockpilePos: null,
    rationLevel: 'Normal',
    selectedUnits: [],
    autoTrade: {},  // { resourceId: { min: number, max: number } }

    // Schedule settings (adjustable from Keep)
    scheduleWorkStart: 6,   // Work phase starts at this hour (default 6:00)
    scheduleWorkEnd: 15,    // Work phase ends at this hour (default 15:00)
    scheduleFreeEnd: 22,    // Free time ends at this hour (default 22:00)

    init(width, height, seed) {
        this.width = width;
        this.height = height;
        this.seed = seed;
        this.tick = 0;
        this.buildings = [];
        this.npcs = [];
        this.gamePhase = 'setup';
        this.setupStep = 0;
        this.gameSpeed = 1;
        this.keepPos = null;
        this.granaryPos = null;
        this.stockpilePos = null;
        this.rationLevel = 'Normal';
        this.selectedUnits = [];
        this.autoTrade = {};
        this.scheduleWorkStart = CONFIG.SCHEDULE_WORK_START;
        this.scheduleWorkEnd = CONFIG.SCHEDULE_WORK_END;
        this.scheduleFreeEnd = CONFIG.SCHEDULE_FREE_END;
        this.generatedChunks = new Set();

        // Sparse tile grid — rows/tiles created on demand
        this.tiles = {};
        this.buildingMap = {};

        // Initialize resources
        this.resources = {};
        for (const key in RESOURCE_TYPES) {
            this.resources[key] = 0;
        }
        // Apply starting resources
        for (const key in CONFIG.START_RESOURCES) {
            this.resources[key] = CONFIG.START_RESOURCES[key];
        }

        this.population = 0;
        this.maxPopulation = 0;
        this.happiness = 50;
        this.fearFactor = 0;
        this.fearEfficiency = 1.0;
        this.idlePeasants = 0;
    },

    _ensureTile(x, y) {
        if (!this.tiles[y]) {
            this.tiles[y] = {};
            this.buildingMap[y] = {};
        }
        if (!this.tiles[y][x]) {
            this.tiles[y][x] = {
                terrain: TERRAIN.DESERT,
                height: CONFIG.HEIGHT_GROUND,
                resourceAmount: 0,
                visible: true,
                discovered: false,
                lastSeenTick: -1,
                roadLevel: 0
            };
            this.buildingMap[y][x] = null;
        }
    },

    getTile(x, y) {
        if (!Utils.inBounds(x, y, this.width, this.height)) return null;
        if (!this.tiles[y] || !this.tiles[y][x]) return null;
        return this.tiles[y][x];
    },

    setTerrain(x, y, terrain, resourceAmount) {
        if (!Utils.inBounds(x, y, this.width, this.height)) return;
        this._ensureTile(x, y);
        this.tiles[y][x].terrain = terrain;
        this.tiles[y][x].resourceAmount = resourceAmount || 0;
    },

    getBuildingAt(x, y) {
        if (!Utils.inBounds(x, y, this.width, this.height)) return null;
        if (!this.buildingMap[y]) return null;
        const id = this.buildingMap[y][x];
        if (id === null || id === undefined) return null;
        return this.buildings.find(b => b.id === id) || null;
    },

    isWalkable(x, y) {
        if (!Utils.inBounds(x, y, this.width, this.height)) return false;
        const tile = this.tiles[y] && this.tiles[y][x];
        if (!tile || !tile.terrain.walkable) return false;
        const bid = this.buildingMap[y] && this.buildingMap[y][x];
        if (bid !== null && bid !== undefined) {
            const b = this.buildings.find(b => b.id === bid);
            if (b) {
                const def = BUILDINGS[b.type];
                return def.walkable;
            }
        }
        return true;
    },

    isBuildable(x, y) {
        if (!Utils.inBounds(x, y, this.width, this.height)) return false;
        const tile = this.tiles[y] && this.tiles[y][x];
        if (!tile || !tile.terrain.buildable) return false;
        if (this.buildingMap[y] && this.buildingMap[y][x] !== null && this.buildingMap[y][x] !== undefined) return false;
        return true;
    },

    addBuilding(building) {
        this.buildings.push(building);
        const def = BUILDINGS[building.type];
        for (let dy = 0; dy < def.height; dy++) {
            for (let dx = 0; dx < def.width; dx++) {
                const tx = building.x + dx;
                const ty = building.y + dy;
                if (Utils.inBounds(tx, ty, this.width, this.height)) {
                    this._ensureTile(tx, ty);
                    this.buildingMap[ty][tx] = building.id;
                    if (def.heightLevel) {
                        this.tiles[ty][tx].height = def.heightLevel;
                    }
                }
            }
        }
    },

    removeBuilding(buildingId) {
        const idx = this.buildings.findIndex(b => b.id === buildingId);
        if (idx === -1) return;
        const building = this.buildings[idx];
        const def = BUILDINGS[building.type];
        for (let dy = 0; dy < def.height; dy++) {
            for (let dx = 0; dx < def.width; dx++) {
                const tx = building.x + dx;
                const ty = building.y + dy;
                if (Utils.inBounds(tx, ty, this.width, this.height)) {
                    this._ensureTile(tx, ty);
                    this.buildingMap[ty][tx] = null;
                    this.tiles[ty][tx].height = CONFIG.HEIGHT_GROUND;
                }
            }
        }
        this.buildings.splice(idx, 1);
    },

    getBuildingsOfType(type) {
        return this.buildings.filter(b => b.type === type);
    },

    nextBuildingId: 1,
    createBuildingId() {
        return this.nextBuildingId++;
    },

    nextNpcId: 1,
    createNpcId() {
        return this.nextNpcId++;
    },

    // Chunk management
    isChunkGenerated(cx, cy) {
        return this.generatedChunks.has(cx + ',' + cy);
    },

    markChunkGenerated(cx, cy) {
        this.generatedChunks.add(cx + ',' + cy);
    },

    // Discover a rectangular area centered on (cx, cy) with given half-size
    discoverArea(cx, cy, halfSize) {
        const minX = Math.max(0, cx - halfSize);
        const maxX = Math.min(this.width - 1, cx + halfSize);
        const minY = Math.max(0, cy - halfSize);
        const maxY = Math.min(this.height - 1, cy + halfSize);
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                this._ensureTile(x, y);
                this.tiles[y][x].discovered = true;
                this.tiles[y][x].lastSeenTick = this.tick;
            }
        }
    }
};
