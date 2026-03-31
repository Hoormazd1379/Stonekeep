// Stonekeep - Game Loop
'use strict';

const Game = {
    lastTick: 0,
    tickAccumulator: 0,
    speed: 1,
    running: false,
    seedDisplay: '',

    startNewGame(mapSize, seed, seedStr) {
        this.seedDisplay = seedStr;

        const worldSize = CONFIG.WORLD_SIZE;
        const center = Math.floor(worldSize / 2);

        // Initialize world at full world size
        World.init(worldSize, worldSize, seed);

        // Initialize animal system
        Animal.init();

        // Initialize fire system
        Fire.init();

        // Initialize events system
        Events.init();

        // Initialize time system
        Time.init();

        // Initialize popularity/tax system
        Popularity.init();

        // Reset event log for a fresh run
        EventLog.reset();

        // Reset overlay animations
        Animations.reset();

        // Initialize map generator and generate starting area
        MapGenerator.init(seed, worldSize);
        MapGenerator.generateArea(center, center, mapSize);

        // Discover the starting area
        World.discoverArea(center, center, Math.floor(mapSize / 2));

        // Center camera on map center
        Camera.init(center, center);

        // Enter setup phase
        World.gamePhase = 'setup';
        World.setupStep = 0;
        BuildingPlacement.startPlacing('keep');
        UI.showSetupMessage('Place your Keep');

        this.running = true;
        this.speed = 1;
        this.lastTick = performance.now();
    },

    setSpeed(level) {
        this.speed = level;
        World.gameSpeed = CONFIG.SPEEDS[level] || 0;
    },

    update(now) {
        if (!this.running) return;

        // Handle game ticks based on speed
        if (this.speed > 0) {
            const tickRate = CONFIG.BASE_TICK_MS / CONFIG.SPEEDS[this.speed];
            this.tickAccumulator += now - this.lastTick;

            while (this.tickAccumulator >= tickRate) {
                this.tickAccumulator -= tickRate;
                this._gameTick();
            }
        }
        this.lastTick = now;

        // Input and camera update every frame
        Input.update();
        Camera.update();
    },

    _gameTick() {
        if (World.gamePhase !== 'playing') return;
        World.tick++;
        this.tickCount = (this.tickCount || 0) + 1;

        // Update systems
        NPC.update();
        Production.update();
        Popularity.update();
        Animal.update();
        Fire.update();
        Events.update();
        Time.update();
        Animations.update();
        SaveLoad.update();

        // Bazaar auto-trade (once per game hour)
        if (World.tick % CONFIG.TICKS_PER_HOUR === 0) {
            this._processAutoTrade();
        }

        // Update vision — NPCs discover tiles within vision radius
        this._updateVision();

        // Food consumption is now handled per-NPC via hunger system (Phase 3.3)

        // Road decay (every 1200 ticks, reduce road levels by 1)
        if (World.tick % 1200 === 0) {
            this._decayRoads();
        }
    },

    _decayRoads() {
        const cs = CONFIG.CHUNK_SIZE;
        for (const key of World.generatedChunks) {
            const parts = key.split(',');
            const cx = parseInt(parts[0]);
            const cy = parseInt(parts[1]);
            const ox = cx * cs;
            const oy = cy * cs;
            for (let ly = 0; ly < cs; ly++) {
                for (let lx = 0; lx < cs; lx++) {
                    const y = oy + ly;
                    const x = ox + lx;
                    const tile = World.tiles[y] && World.tiles[y][x];
                    if (tile && tile.roadLevel > 0) {
                        tile.roadLevel--;
                    }
                }
            }
        }
    },

    // Food consumption is now per-NPC via hunger/eating system (Phase 3.3)
    // See NPC._updateHunger() and NPC._handleEating()

    onSetupComplete() {
        // Spawn starting peasants
        NPC.spawnStartingPeasants();
        UI.showSetupMessage('Castle established! Build your economy.');
    },

    _updateVision() {
        // When FOW is disabled, mark all generated tiles as visible
        if (!World.fowEnabled) {
            const cs = CONFIG.CHUNK_SIZE;
            for (const key of World.generatedChunks) {
                const parts = key.split(',');
                const cx = parseInt(parts[0]);
                const cy = parseInt(parts[1]);
                const ox = cx * cs;
                const oy = cy * cs;
                for (let ly = 0; ly < cs; ly++) {
                    for (let lx = 0; lx < cs; lx++) {
                        const y = oy + ly;
                        const x = ox + lx;
                        const tile = World.tiles[y] && World.tiles[y][x];
                        if (tile && tile.discovered) {
                            tile.lastSeenTick = World.tick;
                        }
                    }
                }
            }
            // Still discover around NPCs for chunk generation
            const r = CONFIG.VISION_RADIUS;
            for (const npc of World.npcs) {
                const nx = npc.x, ny = npc.y;
                for (let dy = -r; dy <= r; dy++) {
                    for (let dx = -r; dx <= r; dx++) {
                        const tx = nx + dx, ty = ny + dy;
                        if (!Utils.inBounds(tx, ty, World.width, World.height)) continue;
                        World._ensureTile(tx, ty);
                        const tile = World.tiles[ty][tx];
                        if (!tile.discovered) {
                            const chunkX = Math.floor(tx / cs);
                            const chunkY = Math.floor(ty / cs);
                            if (!World.isChunkGenerated(chunkX, chunkY)) {
                                MapGenerator.generateChunk(chunkX, chunkY);
                            }
                            tile.discovered = true;
                            tile.lastSeenTick = World.tick;
                        }
                    }
                }
            }
            return;
        }

        const r = (typeof Time !== 'undefined') ? Time.getVisionRadius() : CONFIG.VISION_RADIUS;
        const r2 = r * r;
        const cs = CONFIG.CHUNK_SIZE;

        for (const npc of World.npcs) {
            const nx = npc.x;
            const ny = npc.y;

            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (dx * dx + dy * dy > r2) continue;
                    const tx = nx + dx;
                    const ty = ny + dy;
                    if (!Utils.inBounds(tx, ty, World.width, World.height)) continue;

                    World._ensureTile(tx, ty);
                    const tile = World.tiles[ty][tx];

                    // Generate chunk on demand if not yet generated
                    if (!tile.discovered) {
                        const chunkX = Math.floor(tx / cs);
                        const chunkY = Math.floor(ty / cs);
                        if (!World.isChunkGenerated(chunkX, chunkY)) {
                            MapGenerator.generateChunk(chunkX, chunkY);
                        }
                        tile.discovered = true;
                    }

                    tile.lastSeenTick = World.tick;
                }
            }
        }

        // Tamed pet vision: tamed cats/dogs reveal tiles around them
        const tamedAnimals = Animal.getTamedAnimals();
        for (const pet of tamedAnimals) {
            const def = Animal.TYPES[pet.type];
            const pr = def.visionRadius || 6;
            const pr2 = pr * pr;
            for (let dy = -pr; dy <= pr; dy++) {
                for (let dx = -pr; dx <= pr; dx++) {
                    if (dx * dx + dy * dy > pr2) continue;
                    const tx = pet.x + dx;
                    const ty = pet.y + dy;
                    if (!Utils.inBounds(tx, ty, World.width, World.height)) continue;
                    World._ensureTile(tx, ty);
                    const tile = World.tiles[ty][tx];
                    if (!tile.discovered) {
                        const chunkX = Math.floor(tx / cs);
                        const chunkY = Math.floor(ty / cs);
                        if (!World.isChunkGenerated(chunkX, chunkY)) {
                            MapGenerator.generateChunk(chunkX, chunkY);
                        }
                        tile.discovered = true;
                    }
                    tile.lastSeenTick = World.tick;
                }
            }
        }

        // Road-based vision: road tiles provide visibility radius = 1 + roadLevel
        // Only check roads within camera viewport + margin for performance
        const camStartX = Math.max(0, Math.floor(Camera.x / CONFIG.TILE_WIDTH) - 2);
        const camStartY = Math.max(0, Math.floor(Camera.y / CONFIG.TILE_HEIGHT) - 2);
        const camEndX = Math.min(World.width, camStartX + Math.ceil(Renderer.width / (CONFIG.TILE_WIDTH * Camera.zoom)) + 4);
        const camEndY = Math.min(World.height, camStartY + Math.ceil(Renderer.height / (CONFIG.TILE_HEIGHT * Camera.zoom)) + 4);

        for (let ry = camStartY; ry < camEndY; ry++) {
            for (let rx = camStartX; rx < camEndX; rx++) {
                const roadTile = World.tiles[ry] && World.tiles[ry][rx];
                if (!roadTile || roadTile.roadLevel <= 0) continue;
                const vr = 1 + roadTile.roadLevel;
                const vr2 = vr * vr;
                for (let dy = -vr; dy <= vr; dy++) {
                    for (let dx = -vr; dx <= vr; dx++) {
                        if (dx * dx + dy * dy > vr2) continue;
                        const tx = rx + dx, ty = ry + dy;
                        if (!Utils.inBounds(tx, ty, World.width, World.height)) continue;
                        const tile = World.tiles[ty] && World.tiles[ty][tx];
                        if (tile && tile.discovered) {
                            tile.lastSeenTick = World.tick;
                        }
                    }
                }
            }
        }
    },

    // Bazaar auto-trade price table (matches UI._addBazaarActions)
    _autoTradePrices: {
        wood: { baseBuy: 8, baseSell: 4 },
        stone: { baseBuy: 12, baseSell: 6 },
        iron: { baseBuy: 20, baseSell: 10 },
        pitch: { baseBuy: 15, baseSell: 7 },
        apples: { baseBuy: 6, baseSell: 3 },
        bread: { baseBuy: 10, baseSell: 5 },
        cheese: { baseBuy: 8, baseSell: 4 },
        meat: { baseBuy: 8, baseSell: 4 },
        bows: { baseBuy: 25, baseSell: 12 },
        spears: { baseBuy: 25, baseSell: 12 },
        swords: { baseBuy: 40, baseSell: 20 },
        armor: { baseBuy: 45, baseSell: 22 }
    },

    _processAutoTrade() {
        // Requires at least one active bazaar
        const bazaars = World.getBuildingsOfType('bazaar');
        if (bazaars.length === 0 || !bazaars.some(b => b.active)) return;

        for (const resId in World.autoTrade) {
            const rule = World.autoTrade[resId];
            if (!rule) continue;
            const prices = this._autoTradePrices[resId];
            if (!prices) continue;

            // Auto-buy: buy in batches of 5 until stock >= min
            if (rule.min !== undefined && rule.min > 0) {
                while (Resources.get(resId) < rule.min) {
                    const stock = Resources.get(resId);
                    const mult = Math.max(0.6, Math.min(1.5, 0.6 + stock / 100));
                    const buyPrice = Math.max(1, Math.round(prices.baseBuy * mult));
                    if (Resources.get('gold') < buyPrice) break;
                    Resources.remove('gold', buyPrice);
                    Resources.add(resId, 5);
                }
            }

            // Auto-sell: sell in batches of 5 until stock <= max
            if (rule.max !== undefined && rule.max !== Infinity && rule.max > 0) {
                while (Resources.get(resId) > rule.max) {
                    const stock = Resources.get(resId);
                    const mult = Math.max(0.6, Math.min(1.5, 0.6 + stock / 100));
                    const sellPrice = Math.max(1, Math.round(prices.baseSell * mult));
                    if (Resources.get(resId) < 5) break;
                    Resources.remove(resId, 5);
                    Resources.add('gold', sellPrice);
                }
            }
        }
    }
};
