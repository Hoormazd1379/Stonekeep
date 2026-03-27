// Stonekeep - Events System
'use strict';

const Events = {
    _nextEventTick: 0,
    _notifications: [],

    // Disease cloud system
    diseaseClouds: [],   // Array of { x, y, startTick }
    diseaseMap: null,    // 2D boolean array for O(1) lookup

    init() {
        this._nextEventTick = CONFIG.EVENT_GRACE_PERIOD;
        this._notifications = [];
        this.diseaseClouds = [];
        this.diseaseMap = {};
    },

    _isDiseased(x, y) {
        return !!(this.diseaseMap[y] && this.diseaseMap[y][x]);
    },

    _setDisease(x, y, val) {
        if (!this.diseaseMap[y]) this.diseaseMap[y] = {};
        this.diseaseMap[y][x] = val;
    },

    update() {
        if (World.tick >= this._nextEventTick && World.population > 0) {
            this._triggerRandomEvent();
            this._scheduleNextEvent();
        }

        // Update disease clouds — expire old clouds, infect NPCs
        this._updateDisease();
    },

    // Add a notification to display on screen
    notify(text, color) {
        this._notifications.push({
            text: text,
            tick: World.tick,
            color: color || '#FF6600'
        });
    },

    // Get notifications that haven't expired yet
    getActiveNotifications() {
        const cutoff = World.tick - CONFIG.EVENT_NOTIFICATION_DURATION;
        this._notifications = this._notifications.filter(n => n.tick > cutoff);
        return this._notifications;
    },

    _scheduleNextEvent() {
        // Scale interval with population — more people means more frequent events
        const popFactor = Math.max(0.3, 1 - (World.population / 100));
        const base = CONFIG.EVENT_BASE_INTERVAL;
        const interval = Math.max(
            CONFIG.EVENT_MIN_INTERVAL,
            Math.floor(base * popFactor)
        );
        // Add random variance (0 to 50% of interval)
        const variance = Math.floor(Math.random() * interval * 0.5);
        this._nextEventTick = World.tick + interval + variance;
    },

    _triggerRandomEvent() {
        const types = [];

        // Fire event: requires flammable buildings not already on fire
        const flammable = this._getFlammableBuildings();
        if (flammable.length > 0) types.push('fire');

        // Bandit raid: requires minimum population
        if (World.population >= CONFIG.BANDIT_MIN_RAID_POP) types.push('raid');

        // Disease cloud: requires population > 0
        if (World.population > 0) types.push('disease');

        if (types.length === 0) return;

        const type = types[Math.floor(Math.random() * types.length)];
        if (type === 'fire') {
            this._fireEvent(flammable);
        } else if (type === 'raid') {
            this._raidEvent();
        } else {
            this._diseaseEvent();
        }
    },

    _getFlammableBuildings() {
        return World.buildings.filter(b => {
            const def = BUILDINGS[b.type];
            return def.flammable && !Fire.isOnFire(b.x, b.y);
        });
    },

    // ── Fire Breakout Event ──

    _fireEvent(flammable) {
        const target = flammable[Math.floor(Math.random() * flammable.length)];
        const ignited = Fire.ignite(target.x, target.y);
        if (ignited) {
            this.notify('A fire has broken out at the ' + BUILDINGS[target.type].name + '!', '#FF6600');
        }
    },

    // ── Bandit Raid Event ──

    _raidEvent() {
        const count = Math.min(
            CONFIG.BANDIT_MAX_COUNT,
            CONFIG.BANDIT_BASE_COUNT + Math.floor(World.population / CONFIG.BANDIT_POP_SCALE)
        );

        // Find a spawn point at the edge of discovered territory
        const spawn = this._findRaidSpawnPoint();
        if (!spawn) return;

        let spawned = 0;
        for (let i = 0; i < count; i++) {
            const ox = spawn.x + Math.floor(Math.random() * 7) - 3;
            const oy = spawn.y + Math.floor(Math.random() * 7) - 3;
            if (Utils.inBounds(ox, oy, World.width, World.height) && World.isWalkable(ox, oy)) {
                this._spawnBandit(ox, oy);
                spawned++;
            }
        }

        if (spawned > 0) {
            this.notify('Bandits are raiding your settlement!', '#FF0000');
        }
    },

    _findRaidSpawnPoint() {
        // Spawn at edges of discovered area, beyond the player's buildings
        // Find the bounding box of player buildings, then pick a point beyond it
        if (World.buildings.length === 0) return null;

        const center = Math.floor(World.width / 2);
        const attempts = 50;

        for (let i = 0; i < attempts; i++) {
            const side = Math.floor(Math.random() * 4);
            const offset = Math.floor(Math.random() * 80) - 40;
            let x, y;

            // Spawn 40-60 tiles from center in a random direction
            const dist = 40 + Math.floor(Math.random() * 20);

            switch (side) {
                case 0: x = center + offset; y = center - dist; break; // north
                case 1: x = center + offset; y = center + dist; break; // south
                case 2: x = center - dist; y = center + offset; break; // west
                case 3: x = center + dist; y = center + offset; break; // east
            }

            if (!Utils.inBounds(x, y, World.width, World.height)) continue;

            const tile = World.getTile(x, y);
            // Must be discovered and walkable
            if (tile && tile.discovered && tile.terrain.walkable && !World.getBuildingAt(x, y)) {
                return { x: x, y: y };
            }
        }
        return null;
    },

    _spawnBandit(x, y) {
        // 70% melee, 30% archer
        const isArcher = Math.random() < 0.3;
        const id = World.createNpcId();
        const npc = {
            id: id,
            name: 'Bandit',
            type: isArcher ? 'bandit_archer' : 'bandit_melee',
            char: isArcher ? 'b' : 'B',
            fg: '#CC3333',
            x: x,
            y: y,
            targetX: x,
            targetY: y,
            path: null,
            pathIndex: 0,
            state: NPC.STATE.IDLE,
            isBandit: true,
            hp: isArcher ? CONFIG.BANDIT_ARCHER_HP : CONFIG.BANDIT_MELEE_HP,
            maxHp: isArcher ? CONFIG.BANDIT_ARCHER_HP : CONFIG.BANDIT_MELEE_HP,
            damage: isArcher ? CONFIG.BANDIT_ARCHER_DAMAGE : CONFIG.BANDIT_MELEE_DAMAGE,
            ranged: isArcher,
            range: isArcher ? CONFIG.BANDIT_ARCHER_RANGE : 1,
            moveProgress: 0,
            walkFrom: null,
            walkTo: null,
            walkPurpose: 'raiding',
            _attackCooldown: 0,
            _raidTarget: null
        };
        World.npcs.push(npc);
        return npc;
    },

    getBanditCount() {
        let count = 0;
        for (const npc of World.npcs) {
            if (npc.isBandit) count++;
        }
        return count;
    },

    // ── Disease Cloud System ──

    _diseaseEvent() {
        // Spawn disease cloud near populated area
        const spawn = this._findDiseaseSpawnPoint();
        if (!spawn) return;

        let placed = 0;
        const size = CONFIG.DISEASE_CLOUD_SIZE;
        // Place cluster of disease tiles around spawn point
        const candidates = [spawn];
        const tried = new Set();
        tried.add(spawn.x + ',' + spawn.y);

        while (candidates.length > 0 && placed < size) {
            const idx = Math.floor(Math.random() * candidates.length);
            const pt = candidates.splice(idx, 1)[0];

            if (this._addDiseaseCloud(pt.x, pt.y)) {
                placed++;
                // Add neighbors as candidates
                const neighbors = Utils.getNeighbors4(pt.x, pt.y);
                for (const n of neighbors) {
                    const key = n.x + ',' + n.y;
                    if (!tried.has(key)) {
                        tried.add(key);
                        candidates.push(n);
                    }
                }
            }
        }

        if (placed > 0) {
            this.notify('A plague has broken out near your settlement!', '#88CC00');
        }
    },

    _findDiseaseSpawnPoint() {
        // Find a walkable discovered tile near buildings (10-30 tiles from center)
        const center = Math.floor(World.width / 2);
        for (let i = 0; i < 30; i++) {
            const dist = 10 + Math.floor(Math.random() * 20);
            const angle = Math.random() * Math.PI * 2;
            const x = center + Math.round(Math.cos(angle) * dist);
            const y = center + Math.round(Math.sin(angle) * dist);
            if (!Utils.inBounds(x, y, World.width, World.height)) continue;
            const tile = World.getTile(x, y);
            if (tile && tile.discovered && tile.terrain.walkable && !this._isDiseased(x, y) && !World.getBuildingAt(x, y)) {
                return { x: x, y: y };
            }
        }
        return null;
    },

    _addDiseaseCloud(x, y) {
        if (!Utils.inBounds(x, y, World.width, World.height)) return false;
        if (this._isDiseased(x, y)) return false;
        const tile = World.getTile(x, y);
        if (!tile || !tile.terrain.walkable) return false;
        if (World.getBuildingAt(x, y)) return false;

        this.diseaseClouds.push({ x: x, y: y, startTick: World.tick });
        this._setDisease(x, y, true);
        return true;
    },

    removeDiseaseCloud(x, y) {
        if (!Utils.inBounds(x, y, World.width, World.height)) return;
        const idx = this.diseaseClouds.findIndex(d => d.x === x && d.y === y);
        if (idx === -1) return;
        this.diseaseClouds.splice(idx, 1);
        this._setDisease(x, y, false);
    },

    isDiseased(x, y) {
        if (!Utils.inBounds(x, y, World.width, World.height)) return false;
        return this._isDiseased(x, y);
    },

    findNearestDisease(fromX, fromY) {
        let best = null;
        let bestDist = Infinity;
        for (const cloud of this.diseaseClouds) {
            const dist = Utils.manhattan(fromX, fromY, cloud.x, cloud.y);
            if (dist < bestDist) {
                bestDist = dist;
                best = cloud;
            }
        }
        return best;
    },

    getDiseaseResistance() {
        const count = World.getBuildingsOfType('apothecary').filter(b => b.active && b.workers.length > 0).length;
        return Math.min(CONFIG.DISEASE_MAX_RESISTANCE, count * CONFIG.DISEASE_RESISTANCE_PER_APOTHECARY);
    },

    getDiseaseCloudCount() {
        return this.diseaseClouds.length;
    },

    _updateDisease() {
        const hasDiseasedNpcs = World.npcs.some(n => n.diseased);
        if (this.diseaseClouds.length === 0 && !hasDiseasedNpcs) return;

        // Expire old disease clouds
        for (let i = this.diseaseClouds.length - 1; i >= 0; i--) {
            const cloud = this.diseaseClouds[i];
            if (World.tick - cloud.startTick >= CONFIG.DISEASE_CLOUD_DURATION) {
                this._setDisease(cloud.x, cloud.y, false);
                this.diseaseClouds.splice(i, 1);
            }
        }

        // Infect NPCs standing on disease tiles
        const resistance = this.getDiseaseResistance();
        for (const npc of World.npcs) {
            if (npc.isBandit) continue;
            const nx = Math.floor(npc.x), ny = Math.floor(npc.y);
            if (!this.diseaseMap[ny] || !this.diseaseMap[ny][nx]) continue;

            // Chance to infect (reduced by resistance)
            const chance = CONFIG.DISEASE_INFECT_CHANCE * (1 - resistance);
            if (Math.random() < chance) {
                if (!npc.diseased) {
                    npc.diseased = true;
                    npc._diseaseStartTick = World.tick;
                }
            }
        }

        // NPC-to-NPC disease spread
        const spreadRange = CONFIG.DISEASE_NPC_SPREAD_RANGE;
        const spreadChance = CONFIG.DISEASE_NPC_SPREAD_CHANCE * (1 - resistance);
        for (const npc of World.npcs) {
            if (!npc.diseased || npc.isBandit) continue;
            const nx = Math.floor(npc.x), ny = Math.floor(npc.y);
            for (const other of World.npcs) {
                if (other === npc || other.diseased || other.isBandit) continue;
                const ox = Math.floor(other.x), oy = Math.floor(other.y);
                if (Math.abs(nx - ox) <= spreadRange && Math.abs(ny - oy) <= spreadRange) {
                    if (Math.random() < spreadChance) {
                        other.diseased = true;
                        other._diseaseStartTick = World.tick;
                    }
                }
            }
        }

        // Damage infected NPCs
        if (World.tick % CONFIG.DISEASE_DAMAGE_INTERVAL === 0) {
            for (const npc of World.npcs) {
                if (npc.diseased && !npc.isBandit) {
                    NPC.damageNpc(npc.id, CONFIG.DISEASE_DAMAGE);
                }
            }
        }

        // Recovery: diseased NPCs not on a disease tile gradually recover
        for (const npc of World.npcs) {
            if (!npc.diseased || npc.isBandit) continue;
            const nx = Math.floor(npc.x), ny = Math.floor(npc.y);
            if (this.diseaseMap[ny] && this.diseaseMap[ny][nx]) {
                // On disease tile — reset recovery timer
                npc._diseaseRecovery = 0;
            } else {
                // Not on disease tile — tick recovery
                npc._diseaseRecovery = (npc._diseaseRecovery || 0) + 1;
                if (npc._diseaseRecovery >= 60) {
                    npc.diseased = false;
                    npc._diseaseRecovery = 0;
                    npc._diseaseStartTick = undefined;
                }
            }
        }
    }
};
