// Stonekeep - Game Loop
'use strict';

const Game = {
    lastTick: 0,
    tickAccumulator: 0,
    speed: 1,
    running: false,
    seedDisplay: '',

    startNewGame(mapSize, seed, seedStr, startingSeason) {
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

        // Initialize season system
        Season.init(startingSeason);

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
        Season.update();
        Animations.update();
        SaveLoad.update();

        // Bazaar auto-trade (once per game hour)
        if (World.tick % CONFIG.TICKS_PER_HOUR === 0) {
            this._processAutoTrade();
        }

        // Update vision — NPCs discover tiles within vision radius
        this._updateVision();

        // Building auto-fire — buildings with autoFire shoot enemies (Phase 4.1)
        this._updateBuildingAutoFire();

        // Heating furnace auto-consume pitch in winter
        this._updateHeatingFurnaces();

        // Food consumption is now handled per-NPC via hunger system (Phase 3.3)

        // Road decay — interval modified by weather
        const roadDecayInterval = Math.floor(1200 / Season.getRoadDecayMultiplier());
        if (World.tick % roadDecayInterval === 0) {
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

        // Building vision: watchtowers and guard posts reveal tiles (Phase 4.1)
        for (const building of World.buildings) {
            const bDef = BUILDINGS[building.type];
            if (!bDef || !bDef.visionRadius) continue;
            if (building.active === false) continue;
            const bvr = bDef.visionRadius;
            const bvr2 = bvr * bvr;
            const bcx = building.x + Math.floor(bDef.width / 2);
            const bcy = building.y + Math.floor(bDef.height / 2);
            for (let dy = -bvr; dy <= bvr; dy++) {
                for (let dx = -bvr; dx <= bvr; dx++) {
                    if (dx * dx + dy * dy > bvr2) continue;
                    const tx = bcx + dx;
                    const ty = bcy + dy;
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

    // Building auto-fire: buildings with autoFire property shoot nearby enemies (Phase 4.1)
    _updateBuildingAutoFire() {
        for (const building of World.buildings) {
            const def = BUILDINGS[building.type];
            if (!def || !def.autoFire) continue;
            if (building.active === false) continue;

            // Cooldown per building
            building._autoFireCooldown = (building._autoFireCooldown || 0) - 1;
            if (building._autoFireCooldown > 0) continue;

            const range = def.autoFireRange || 8;
            const damage = def.autoFireDamage || 2;
            // Fire from building center
            const cx = building.x + Math.floor(def.width / 2);
            const cy = building.y + Math.floor(def.height / 2);

            // Find nearest enemy (bandit or hostile animal) within range
            let bestTarget = null;
            let bestDist = range + 1;

            for (const npc of World.npcs) {
                if (!npc.isBandit) continue;
                const dist = Math.abs(Math.floor(npc.x) - cx) + Math.abs(Math.floor(npc.y) - cy);
                if (dist <= range && dist < bestDist) {
                    bestDist = dist;
                    bestTarget = { type: 'npc', entity: npc };
                }
            }

            // Also check hostile animals
            if (typeof Animal !== 'undefined') {
                const hostiles = Animal.getLivingAnimals().filter(a => {
                    const aDef = Animal.TYPES[a.type];
                    return aDef && aDef.hostile;
                });
                for (const animal of hostiles) {
                    const dist = Math.abs(animal.x - cx) + Math.abs(animal.y - cy);
                    if (dist <= range && dist < bestDist) {
                        bestDist = dist;
                        bestTarget = { type: 'animal', entity: animal };
                    }
                }
            }

            if (bestTarget) {
                building._autoFireCooldown = CONFIG.BUILDING_FIRE_COOLDOWN;
                const heightBonus = def.isTower ? 1.5 : 1.0;
                const fearBonus = Military.getFearDamageBonus();
                const finalDamage = Math.max(1, Math.round(damage * heightBonus * fearBonus));

                // Frontier alert: log the first sighting (cooldown-based to avoid spam)
                if (!building._lastAlertTick || World.tick - building._lastAlertTick > 200) {
                    building._lastAlertTick = World.tick;
                    const targetName = bestTarget.type === 'npc' ? 'enemies' : 'hostile wildlife';
                    EventLog.add('danger', def.name + ' engaging ' + targetName + '!', cx, cy);
                }

                if (bestTarget.type === 'npc') {
                    NPC.damageNpc(bestTarget.entity.id, finalDamage, 'building defense');
                    Renderer.addProjectile(cx, cy, bestTarget.entity.x, bestTarget.entity.y, '#FFDD44');
                } else {
                    Animal.damageAnimal(bestTarget.entity.id, finalDamage);
                    Renderer.addProjectile(cx, cy, bestTarget.entity.x, bestTarget.entity.y, '#FFDD44');
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

    _updateHeatingFurnaces() {
        if (!Season.isWinter()) return;
        if (World.tick % CONFIG.HEATING_FURNACE_PITCH_INTERVAL !== 0) return;

        for (const b of World.buildings) {
            if (b.type !== 'heatingFurnace') continue;
            // Try to consume 1 pitch from main stockpile first, then forward stockpiles
            if (Resources.get('pitch') > 0) {
                Resources.remove('pitch', 1);
                b.active = true;
            } else {
                // Try forward stockpiles
                let found = false;
                for (const fb of World.buildings) {
                    if (!fb.active || fb.type !== 'forwardStockpile') continue;
                    if (fb.storage && fb.storage.pitch > 0) {
                        fb.storage.pitch--;
                        found = true;
                        break;
                    }
                }
                b.active = found;
                if (!found) {
                    // No pitch available — furnace goes inactive
                    Events.notify('Heating Furnace ran out of pitch!', '#FF8800');
                }
            }
        }
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
