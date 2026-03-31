// Stonekeep - Fire System
'use strict';

const Fire = {
    // Active fires: array of { x, y, startTick, isPitchDitch, spreadCooldown }
    fires: [],

    // Track fire at each tile for O(1) lookup
    fireMap: null,

    init() {
        this.fires = [];
        this.fireMap = {};
    },

    _isOnFire(x, y) {
        return !!(this.fireMap[y] && this.fireMap[y][x]);
    },

    _setFire(x, y, val) {
        if (!this.fireMap[y]) this.fireMap[y] = {};
        this.fireMap[y][x] = val;
    },

    // Start a fire at a specific tile
    ignite(x, y) {
        if (!Utils.inBounds(x, y, World.width, World.height)) return false;
        if (this._isOnFire(x, y)) return false; // already on fire

        const tile = World.getTile(x, y);
        if (!tile) return false;
        const terrain = tile.terrain;
        const building = World.getBuildingAt(x, y);
        const def = building ? BUILDINGS[building.type] : null;

        // Can only ignite flammable terrain or flammable buildings
        const terrainFlammable = terrain.flammable;
        const buildingFlammable = def && def.flammable;

        if (!terrainFlammable && !buildingFlammable) return false;

        const isPitchDitch = terrain.id === 'pitch_ditch';

        this.fires.push({
            x: x,
            y: y,
            startTick: World.tick,
            isPitchDitch: isPitchDitch,
            spreadCooldown: CONFIG.FIRE_SPREAD_INTERVAL // ticks until this fire can spread
        });
        this._setFire(x, y, true);
        return true;
    },

    // Extinguish fire at a specific tile (by well worker)
    extinguish(x, y) {
        if (!Utils.inBounds(x, y, World.width, World.height)) return;
        const idx = this.fires.findIndex(f => f.x === x && f.y === y);
        if (idx === -1) return;
        this.fires.splice(idx, 1);
        this._setFire(x, y, false);
    },

    // Check if a tile is on fire
    isOnFire(x, y) {
        if (!Utils.inBounds(x, y, World.width, World.height)) return false;
        return this._isOnFire(x, y);
    },

    // Find nearest fire tile to a position (for well workers)
    // excludePitchDitch: if true, skip pitch ditch fires (well workers can't extinguish those)
    findNearestFire(fromX, fromY, excludePitchDitch) {
        let best = null;
        let bestDist = Infinity;
        for (const fire of this.fires) {
            if (excludePitchDitch && fire.isPitchDitch) continue;
            const dist = Utils.manhattan(fromX, fromY, fire.x, fire.y);
            if (dist < bestDist) {
                bestDist = dist;
                best = fire;
            }
        }
        return best;
    },

    // Get count of active non-pitch-ditch fires (for well worker assignment)
    getExtinguishableFireCount() {
        let count = 0;
        for (const fire of this.fires) {
            if (!fire.isPitchDitch) count++;
        }
        return count;
    },

    // Main update — called every tick
    update() {
        // Update burning NPCs even if no tile fires
        this._updateBurningNpcs();

        if (this.fires.length === 0) return;

        // Check if NPCs are standing on fire tiles
        this._checkNpcFire();

        const toRemove = [];

        for (let i = this.fires.length - 1; i >= 0; i--) {
            const fire = this.fires[i];
            const age = World.tick - fire.startTick;

            // Pitch ditch fires burn out naturally after extended duration
            if (fire.isPitchDitch && age >= CONFIG.FIRE_PITCH_DURATION) {
                toRemove.push(i);
                continue;
            }

            // Normal fires burn out after standard duration
            if (!fire.isPitchDitch && age >= CONFIG.FIRE_NORMAL_DURATION) {
                toRemove.push(i);
                continue;
            }

            // Building damage: damage building HP over time
            const building = World.getBuildingAt(fire.x, fire.y);
            if (building && building.fireHp !== undefined) {
                if (World.tick % CONFIG.FIRE_DAMAGE_INTERVAL === 0) {
                    building.fireHp--;
                    if (building.fireHp <= 0) {
                        // Building destroyed by fire
                        this._destroyBuilding(building);
                    }
                }
            }

            // Fire spread
            fire.spreadCooldown--;
            if (fire.spreadCooldown <= 0) {
                fire.spreadCooldown = CONFIG.FIRE_SPREAD_INTERVAL;
                this._trySpread(fire);
            }
        }

        // Remove expired fires (iterate in reverse since toRemove is in reverse order)
        for (const idx of toRemove) {
            const fire = this.fires[idx];
            this._setFire(fire.x, fire.y, false);
            this.fires.splice(idx, 1);
        }
    },

    _trySpread(fire) {
        // Only spread with a probability
        if (Math.random() > CONFIG.FIRE_SPREAD_CHANCE) return;

        const neighbors = Utils.getNeighbors4(fire.x, fire.y);
        // Shuffle neighbors and try to spread to up to 2
        for (let i = neighbors.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
        }
        const maxSpread = Math.random() < 0.3 ? 2 : 1;
        let spread = 0;
        for (const target of neighbors) {
            if (spread >= maxSpread) break;
            if (this.ignite(target.x, target.y)) {
                Animations.add(target.x, target.y, 'ember');
                spread++;
            }
        }
    },

    _destroyBuilding(building) {
        const def = BUILDINGS[building.type];

        // Camera shake on building destruction
        if (typeof Camera.shake === 'function') Camera.shake(4, 12);

        // Memory: witnesses remember building destruction
        Memory.addToWitnesses(building.x, building.y, 'building_destroyed', Memory.PRIORITY.FIRE, 'The ' + def.name + ' was destroyed.', []);
        EventLog.add('danger', def.name + ' was destroyed.', building.x, building.y);

        // Release workers before destroying
        if (building.workers) {
            for (const wid of [...building.workers]) {
                NPC.releaseWorker(wid);
            }
        }

        // Granary/Stockpile destruction: lose 50% of stored resources
        if (building.type === 'granary') {
            for (const res of STORAGE_TYPES.granary) {
                const current = Resources.get(res);
                if (current > 0) {
                    const loss = Math.floor(current * 0.5);
                    Resources.remove(res, loss);
                }
            }
        } else if (building.type === 'stockpile') {
            for (const res of STORAGE_TYPES.stockpile) {
                const current = Resources.get(res);
                if (current > 0) {
                    const loss = Math.floor(current * 0.5);
                    Resources.remove(res, loss);
                }
            }
        }

        // Forward storage destruction: lose ALL building inventory
        if (def.isForwardStorage && building.storage) {
            for (const res in building.storage) {
                building.storage[res] = 0;
            }
            EventLog.add('danger', def.name + ' supplies were lost!', building.x, building.y);
        }

        // Reduce max population if housing was destroyed
        if (def.housing) {
            World.maxPopulation -= def.housing;
        }

        World.removeBuilding(building.id);
        NPC.reassignAllHomes();
    },

    // Check if NPC is a well worker (immune to fire)
    _isWellWorker(npc) {
        if (!npc.assignedBuilding) return false;
        const building = World.buildings.find(b => b.id === npc.assignedBuilding);
        if (!building) return false;
        const def = BUILDINGS[building.type];
        return def && def.isWell;
    },

    // Check if NPCs on fire tiles catch fire
    _checkNpcFire() {
        for (const npc of World.npcs) {
            if (npc.onFire) continue; // already burning
            if (this._isWellWorker(npc)) continue; // well workers are immune
            const nx = Math.floor(npc.x), ny = Math.floor(npc.y);
            if (!this.isOnFire(nx, ny)) continue;
            if (Math.random() < CONFIG.NPC_FIRE_CATCH_CHANCE) {
                npc.onFire = true;
                npc._fireTick = World.tick;
                if (npc.memories) {
                    Memory.add(npc, 'caught_fire', Memory.PRIORITY.FIRE, npc.name + ' caught fire!', [], true);
                }
            }
        }
    },

    // Damage burning NPCs and extinguish after duration
    _updateBurningNpcs() {
        for (const npc of World.npcs) {
            if (!npc.onFire) continue;

            // Periodic fire damage
            if (World.tick % CONFIG.NPC_FIRE_DAMAGE_INTERVAL === 0) {
                NPC.damageNpc(npc.id, CONFIG.NPC_FIRE_DAMAGE, 'fire');
            }

            // Burning NPC runs erratically — override walk target
            if (World.tick % 3 === 0) {
                const dx = Math.floor(Math.random() * 5) - 2;
                const dy = Math.floor(Math.random() * 5) - 2;
                const nx = Math.floor(npc.x) + dx;
                const ny = Math.floor(npc.y) + dy;
                if (Utils.inBounds(nx, ny, World.width, World.height)) {
                    const tile = World.getTile(nx, ny);
                    if (tile && tile.terrain && tile.terrain.walkable) {
                        npc.targetX = nx;
                        npc.targetY = ny;
                        npc.path = null;
                        npc.walkPurpose = 'on fire!';
                    }
                }
            }

            // Self-extinguish after duration (if not still on fire tile)
            const nx = Math.floor(npc.x), ny = Math.floor(npc.y);
            if (!this.isOnFire(nx, ny)) {
                if (World.tick - npc._fireTick >= CONFIG.NPC_FIRE_DURATION) {
                    npc.onFire = false;
                    npc._fireTick = undefined;
                }
            } else {
                // Reset timer while still on fire tile
                npc._fireTick = World.tick;
            }
        }
    },

    // Find nearest burning NPC to a position (for well workers)
    findNearestBurningNpc(fromX, fromY) {
        let best = null;
        let bestDist = Infinity;
        for (const npc of World.npcs) {
            if (!npc.onFire) continue;
            const dist = Utils.manhattan(fromX, fromY, Math.floor(npc.x), Math.floor(npc.y));
            if (dist < bestDist) {
                bestDist = dist;
                best = npc;
            }
        }
        return best;
    },

    // Extinguish fire on a specific NPC (by well worker)
    extinguishNpc(npc) {
        npc.onFire = false;
        npc._fireTick = undefined;
    },

    // Get all active fires (for rendering)
    getActiveFires() {
        return this.fires;
    }
};
