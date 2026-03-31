// Stonekeep - Animal System (Modular)
'use strict';

const Animal = {
    // Animal definitions (modular: add new animals here)
    TYPES: {
        deer: {
            id: 'deer',
            name: 'Deer',
            char: 'd',
            fg: '#C4A27C',
            hp: 3,
            herdSize: 10,
            maxHerds: 5,
            minSpawnDist: 50,
            maxSpawnDist: 150,
            respawnThreshold: 2,
            behavior: 'passive',
            moveChance: 0.08,
            wanderRadius: 8,
            preferredTerrain: ['grass', 'oasis'], // prefer grasslands/oases
            carcassResource: 'meat',
            carcassAmount: 5,
            visualRange: 12,        // flee detection range
            activePhases: ['dawn', 'day', 'dusk'],  // diurnal — sleep at night
            nightMoveChance: 0.01   // barely move at night
        },
        camel: {
            id: 'camel',
            name: 'Camel',
            char: 'c',
            fg: '#D2A060',
            hp: 4,
            herdSize: 8,
            maxHerds: 4,
            minSpawnDist: 50,
            maxSpawnDist: 150,
            respawnThreshold: 2,
            behavior: 'passive',
            moveChance: 0.06,
            wanderRadius: 10,
            preferredTerrain: ['desert'], // prefer desert tiles
            carcassResource: 'meat',
            carcassAmount: 5,
            visualRange: 14,
            activePhases: ['dawn', 'day', 'dusk'],  // diurnal
            nightMoveChance: 0.01
        },
        lion: {
            id: 'lion',
            name: 'Lion',
            char: 'L',
            fg: '#D4A017',
            hp: 15,
            damage: 4,
            herdSize: 3,
            maxHerds: 3,
            minSpawnDist: 80,
            maxSpawnDist: 180,
            respawnThreshold: 1,
            behavior: 'hostile',
            moveChance: 0.06,
            wanderRadius: 12,
            preferredTerrain: ['desert'],
            aggroRange: 10,           // attack NPCs within this range
            attackCooldown: 4,        // ticks between attacks
            carcassResource: null,    // lions don't drop meat
            carcassAmount: 0,
            visualRange: 0,
            activePhases: ['dusk', 'night', 'dawn'],  // nocturnal — more active at night
            nightAggroRange: 14       // extended aggro range at night
        },
        dog: {
            id: 'dog',
            name: 'Dog',
            char: 'D',
            fg: '#C89664',
            tamedFg: '#66BBFF',
            hp: 5,
            damage: 2,
            herdSize: 3,
            maxHerds: 4,
            minSpawnDist: 20,
            maxSpawnDist: 80,
            respawnThreshold: 2,
            behavior: 'companion',
            moveChance: 0.08,
            wanderRadius: 10,
            preferredTerrain: ['desert', 'grass'],
            aggroRange: 6,            // pet dogs attack enemies within this range
            attackCooldown: 4,
            tameRange: 6,             // become tamed when within this range of an NPC or building
            petRange: 8,              // legacy — used as building detection range for abilities
            visionRadius: 8,          // FOW vision radius when tamed
            carcassResource: null,
            carcassAmount: 0,
            visualRange: 0
        },
        cat: {
            id: 'cat',
            name: 'Cat',
            char: 'C',
            fg: '#D0B080',
            tamedFg: '#88DDAA',
            hp: 2,
            herdSize: 2,
            maxHerds: 4,
            minSpawnDist: 20,
            maxSpawnDist: 80,
            respawnThreshold: 2,
            behavior: 'companion',
            moveChance: 0.07,
            wanderRadius: 8,
            preferredTerrain: ['grass', 'oasis'],
            tameRange: 6,             // become tamed when within this range of an NPC or building
            petRange: 8,              // legacy — used as building detection range for abilities
            healInterval: 30,         // ticks between cat healing
            healAmount: 1,
            diseaseCloudClearChance: 0.05,  // per-tick chance to clear nearby disease cloud
            diseaseCloudRange: 3,     // range to detect disease clouds
            healRange: 3,             // range to heal injured NPCs
            diseaseHealRange: 4,      // range to detect diseased NPCs
            visionRadius: 6,          // FOW vision radius when tamed
            carcassResource: null,
            carcassAmount: 0,
            visualRange: 0
        }
    },

    // Runtime state
    _animals: [],       // all living animals
    _herds: [],         // herd tracking: { id, type, animals: [animalId...] }
    _carcasses: [],     // dead animals awaiting pickup: { x, y, type, resource, amount, id }
    _nextId: 1,
    _nextHerdId: 1,

    init() {
        this._animals = [];
        this._herds = [];
        this._carcasses = [];
        this._nextId = 1;
        this._nextHerdId = 1;
    },

    update() {
        // Move animals (herd wandering)
        this._updateMovement();

        // Update companion pet behavior (cats/dogs)
        this._updateCompanions();

        // Check if we need to spawn more herds
        if (World.tick % 60 === 0) {
            this._checkSpawns();
        }
    },

    // ── Spawning ──

    _checkSpawns() {
        // For each animal type, check herd count
        for (const typeId in this.TYPES) {
            const def = this.TYPES[typeId];
            const activeHerds = this._herds.filter(
                h => h.type === typeId && h.animals.length > 0
            );
            if (activeHerds.length < def.respawnThreshold) {
                // Spawn herds up to max
                const toSpawn = def.maxHerds - activeHerds.length;
                for (let i = 0; i < toSpawn; i++) {
                    this._spawnHerd(typeId);
                }
            }
        }
    },

    _spawnHerd(typeId) {
        const def = this.TYPES[typeId];
        if (!def) return;

        // Find spawn point: distance from buildings, preferring type's terrain
        const spawnPos = this._findHerdSpawnPos(def.minSpawnDist, def.maxSpawnDist, def.preferredTerrain);
        if (!spawnPos) return;

        const herdId = this._nextHerdId++;
        const herd = { id: herdId, type: typeId, animals: [], centerX: spawnPos.x, centerY: spawnPos.y, fleeing: false, fleeFromX: 0, fleeFromY: 0 };

        for (let i = 0; i < def.herdSize; i++) {
            // Scatter within a small radius
            const ox = Math.floor(Math.random() * 7) - 3;
            const oy = Math.floor(Math.random() * 7) - 3;
            const ax = spawnPos.x + ox;
            const ay = spawnPos.y + oy;

            if (!this._isValidAnimalTile(ax, ay)) continue;

            const animal = {
                id: this._nextId++,
                type: typeId,
                herdId: herdId,
                x: ax,
                y: ay,
                hp: def.hp,
                maxHp: def.hp,
                char: def.char,
                fg: def.fg,
                dead: false
            };
            this._animals.push(animal);
            herd.animals.push(animal.id);
        }

        if (herd.animals.length > 0) {
            this._herds.push(herd);
        }
    },

    _findHerdSpawnPos(minDist, maxDist, preferredTerrain) {
        // Get all building positions
        const buildings = World.buildings;
        if (buildings.length === 0) return null;

        let bestPos = null;
        let bestIsPreferred = false;

        // Try random positions, preferring tiles matching terrain preference
        for (let attempt = 0; attempt < 50; attempt++) {
            const rx = Math.floor(Math.random() * World.width);
            const ry = Math.floor(Math.random() * World.height);

            if (!this._isValidAnimalTile(rx, ry)) continue;

            // Check distance to nearest building
            let nearest = Infinity;
            for (const b of buildings) {
                const dist = Math.abs(rx - b.x) + Math.abs(ry - b.y);
                if (dist < nearest) nearest = dist;
            }

            if (nearest < minDist || nearest > maxDist) continue;

            // Check terrain preference
            const tile = World.getTile(rx, ry);
            const isPreferred = preferredTerrain && tile &&
                preferredTerrain.some(t => tile.terrain.id === t || (tile.terrain.baseTerrain === t.toUpperCase()));

            if (isPreferred) {
                return { x: rx, y: ry }; // Immediately accept preferred terrain
            }

            // Keep as fallback if no preferred terrain found yet
            if (!bestPos) {
                bestPos = { x: rx, y: ry };
            }
        }
        return bestPos;
    },

    _isValidAnimalTile(x, y) {
        if (!Utils.inBounds(x, y, World.width, World.height)) return false;
        // Only allow animals in generated chunks
        const cx = Math.floor(x / CONFIG.CHUNK_SIZE);
        const cy = Math.floor(y / CONFIG.CHUNK_SIZE);
        if (!World.isChunkGenerated(cx, cy)) return false;
        const tile = World.getTile(x, y);
        if (!tile || !tile.terrain.walkable) return false;
        if (World.getBuildingAt(x, y)) return false;
        return true;
    },

    // ── Movement ──

    _updateMovement() {
        for (const herd of this._herds) {
            const def = this.TYPES[herd.type];
            if (!def) continue;

            // Clean dead animals from herd
            herd.animals = herd.animals.filter(id => {
                const a = this._animals.find(a => a.id === id);
                return a && !a.dead;
            });

            if (herd.animals.length === 0) continue;

            // Recalculate herd center
            let cx = 0, cy = 0, count = 0;
            for (const id of herd.animals) {
                const a = this._animals.find(a => a.id === id);
                if (a) { cx += a.x; cy += a.y; count++; }
            }
            if (count > 0) {
                herd.centerX = Math.floor(cx / count);
                herd.centerY = Math.floor(cy / count);
            }

            // Handle fleeing for passive herds (not companions — they don't flee)
            if (def.behavior === 'passive' && herd.fleeing) {
                this._updateFleeingHerd(herd, def);
                continue;
            }

            // Handle hostile behavior (lions)
            if (def.behavior === 'hostile') {
                this._updateHostileHerd(herd, def);
                continue;
            }

            // Handle companion behavior (cats/dogs) — wander toward buildings
            if (def.behavior === 'companion') {
                this._updateCompanionHerd(herd, def);
                continue;
            }

            // Normal passive wandering
            // Occasionally shift the herd center (slow drift)
            if (Math.random() < 0.01) {
                herd.centerX += Math.floor(Math.random() * 5) - 2;
                herd.centerY += Math.floor(Math.random() * 5) - 2;
                herd.centerX = Math.max(0, Math.min(World.width - 1, herd.centerX));
                herd.centerY = Math.max(0, Math.min(World.height - 1, herd.centerY));
            }

            // Determine effective move chance based on time of day
            const phase = typeof Time !== 'undefined' ? Time.phase : 'day';
            const isActive = !def.activePhases || def.activePhases.includes(phase);
            const effectiveMoveChance = isActive ? def.moveChance : (def.nightMoveChance ?? def.moveChance);

            // Move individual animals
            for (const id of herd.animals) {
                const a = this._animals.find(a => a.id === id);
                if (!a || a.dead) continue;

                if (Math.random() > effectiveMoveChance) continue;

                // Pick a direction that keeps animal near herd center
                const dx = Math.floor(Math.random() * 3) - 1;
                const dy = Math.floor(Math.random() * 3) - 1;
                let nx = a.x + dx;
                let ny = a.y + dy;

                // Cohesion: if too far from center, bias toward center
                const distFromCenter = Math.abs(nx - herd.centerX) + Math.abs(ny - herd.centerY);
                if (distFromCenter > def.wanderRadius) {
                    nx = a.x + Math.sign(herd.centerX - a.x);
                    ny = a.y + Math.sign(herd.centerY - a.y);
                }

                if (this._isValidAnimalTile(nx, ny)) {
                    a.x = nx;
                    a.y = ny;
                }
            }
        }

        // Clean up empty herds
        this._herds = this._herds.filter(h => h.animals.length > 0);
    },

    // ── Flee Behavior (passive animals) ──

    triggerHerdFlee(animalId) {
        // Find the herd this animal belongs to and trigger flee for entire group
        const animal = this._animals.find(a => a.id === animalId);
        if (!animal) return;
        const herd = this._herds.find(h => h.id === animal.herdId);
        if (!herd) return;
        const def = this.TYPES[herd.type];
        if (!def || def.behavior !== 'passive') return;

        // Find nearest NPC (threat) to the attacked animal
        let threatX = animal.x, threatY = animal.y;
        let closestDist = Infinity;
        for (const npc of World.npcs) {
            const dist = Math.abs(npc.x - animal.x) + Math.abs(npc.y - animal.y);
            if (dist < closestDist) {
                closestDist = dist;
                threatX = Math.floor(npc.x);
                threatY = Math.floor(npc.y);
            }
        }

        herd.fleeing = true;
        herd.fleeFromX = threatX;
        herd.fleeFromY = threatY;
    },

    _updateFleeingHerd(herd, def) {
        let visualRange = def.visualRange || 12;
        // At night, passive animals are less alert — reduced detection range
        if (def.activePhases && typeof Time !== 'undefined' && !def.activePhases.includes(Time.phase)) {
            visualRange = Math.floor(visualRange * 0.5);
        }

        // Check if threat is still visible to any herd member
        let canSeeThreat = false;
        for (const id of herd.animals) {
            const a = this._animals.find(a => a.id === id);
            if (!a || a.dead) continue;

            // Check if any NPC is within visual range
            for (const npc of World.npcs) {
                const dist = Math.abs(npc.x - a.x) + Math.abs(npc.y - a.y);
                if (dist <= visualRange) {
                    canSeeThreat = true;
                    // Update flee-from to closest threat
                    herd.fleeFromX = Math.floor(npc.x);
                    herd.fleeFromY = Math.floor(npc.y);
                    break;
                }
            }
            if (canSeeThreat) break;
        }

        if (!canSeeThreat) {
            // No longer see the threat, stop fleeing
            herd.fleeing = false;
            return;
        }

        // All herd members flee away from threat
        for (const id of herd.animals) {
            const a = this._animals.find(a => a.id === id);
            if (!a || a.dead) continue;

            // Move away from threat (every tick, faster than normal)
            const fleeX = Math.sign(a.x - herd.fleeFromX);
            const fleeY = Math.sign(a.y - herd.fleeFromY);
            // Add some randomness to flee direction
            const nx = a.x + fleeX + (Math.random() < 0.3 ? (Math.floor(Math.random() * 3) - 1) : 0);
            const ny = a.y + fleeY + (Math.random() < 0.3 ? (Math.floor(Math.random() * 3) - 1) : 0);

            if (this._isValidAnimalTile(Math.floor(nx), Math.floor(ny))) {
                a.x = Math.floor(nx);
                a.y = Math.floor(ny);
            }
        }

        // Update herd center to track the fleeing animals
        let cx = 0, cy = 0, count = 0;
        for (const id of herd.animals) {
            const a = this._animals.find(a => a.id === id);
            if (a && !a.dead) { cx += a.x; cy += a.y; count++; }
        }
        if (count > 0) {
            herd.centerX = Math.floor(cx / count);
            herd.centerY = Math.floor(cy / count);
        }
    },

    // ── Hostile Behavior (lions) ──

    _updateHostileHerd(herd, def) {
        const isNight = typeof Time !== 'undefined' && Time.isNight();
        const aggroRange = isNight && def.nightAggroRange ? def.nightAggroRange : (def.aggroRange || 10);

        // Occasionally shift the herd center (slow drift)
        if (Math.random() < 0.01) {
            herd.centerX += Math.floor(Math.random() * 5) - 2;
            herd.centerY += Math.floor(Math.random() * 5) - 2;
            herd.centerX = Math.max(0, Math.min(World.width - 1, herd.centerX));
            herd.centerY = Math.max(0, Math.min(World.height - 1, herd.centerY));
        }

        for (const id of herd.animals) {
            const a = this._animals.find(a => a.id === id);
            if (!a || a.dead) continue;

            // Check for nearby NPCs to attack
            let nearestNpc = null;
            let nearestDist = Infinity;
            for (const npc of World.npcs) {
                const dist = Math.abs(npc.x - a.x) + Math.abs(npc.y - a.y);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestNpc = npc;
                }
            }

            if (nearestNpc && nearestDist <= aggroRange) {
                // Move toward NPC
                const dx = Math.sign(Math.floor(nearestNpc.x) - a.x);
                const dy = Math.sign(Math.floor(nearestNpc.y) - a.y);
                const nx = a.x + dx;
                const ny = a.y + dy;

                if (this._isValidAnimalTile(nx, ny)) {
                    a.x = nx;
                    a.y = ny;
                }

                // Attack if adjacent (distance <= 1)
                if (nearestDist <= 1) {
                    a._attackCooldown = (a._attackCooldown || 0) - 1;
                    if (a._attackCooldown <= 0) {
                        a._attackCooldown = def.attackCooldown || 4;
                        if (!a._lastAttackLogTick || World.tick - a._lastAttackLogTick >= Math.floor(CONFIG.TICKS_PER_HOUR / 2)) {
                            EventLog.add('warning', 'Lion attacked ' + nearestNpc.name + '.', a.x, a.y);
                            a._lastAttackLogTick = World.tick;
                        }
                        const killed = NPC.damageNpc(nearestNpc.id, def.damage || 3, 'wild animal attack');
                        // NPC fights back
                        if (!killed && nearestNpc.damage) {
                            this.damageAnimal(a.id, nearestNpc.damage);
                        }
                    }
                }
            } else {
                // Normal wandering — nocturnal animals move more at night
                const hostileMoveChance = isNight && def.activePhases && def.activePhases.includes('night')
                    ? def.moveChance * 1.5 : def.moveChance;
                if (Math.random() > hostileMoveChance) continue;

                const dx = Math.floor(Math.random() * 3) - 1;
                const dy = Math.floor(Math.random() * 3) - 1;
                let nx = a.x + dx;
                let ny = a.y + dy;

                const distFromCenter = Math.abs(nx - herd.centerX) + Math.abs(ny - herd.centerY);
                if (distFromCenter > def.wanderRadius) {
                    nx = a.x + Math.sign(herd.centerX - a.x);
                    ny = a.y + Math.sign(herd.centerY - a.y);
                }

                if (this._isValidAnimalTile(nx, ny)) {
                    a.x = nx;
                    a.y = ny;
                }
            }
        }
    },

    // ── Companion Behavior (cats/dogs) ──

    _updateCompanionHerd(herd, def) {
        const tameRange = def.tameRange || 6;

        // Check if any herd member should become tamed (near NPC or building)
        for (const id of herd.animals) {
            const a = this._animals.find(a => a.id === id);
            if (!a || a.dead || a.isTamed) continue;

            // Check proximity to player NPCs
            for (const npc of World.npcs) {
                if (npc.isBandit) continue;
                const dist = Math.abs(Math.floor(npc.x) - a.x) + Math.abs(Math.floor(npc.y) - a.y);
                if (dist <= tameRange) {
                    a.isTamed = true;
                    a.fg = def.tamedFg || def.fg;
                    EventLog.add('positive', 'A ' + (def.name || a.type) + ' has been tamed.', a.x, a.y);
                    break;
                }
            }
            if (a.isTamed) continue;

            // Check proximity to player buildings
            for (const b of World.buildings) {
                const dist = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
                if (dist <= tameRange) {
                    a.isTamed = true;
                    a.fg = def.tamedFg || def.fg;
                    EventLog.add('positive', 'A ' + (def.name || a.type) + ' has been tamed.', a.x, a.y);
                    break;
                }
            }
        }

        // Check if any herd member is tamed
        const anyTamed = herd.animals.some(id => {
            const a = this._animals.find(a => a.id === id);
            return a && !a.dead && a.isTamed;
        });

        if (anyTamed && World.buildings.length > 0) {
            // Tamed herds: pick a target building/NPC to hang around
            // Re-pick targets more frequently for active pathfinding
            if (!herd._tamedTarget || Math.random() < 0.05) {
                // Pick a random player building as the hang-out target
                if (Math.random() < 0.7 || World.npcs.length === 0) {
                    const b = World.buildings[Math.floor(Math.random() * World.buildings.length)];
                    herd._tamedTarget = { x: b.x, y: b.y };
                } else {
                    // Pick a random non-bandit NPC
                    const friendlyNpcs = World.npcs.filter(n => !n.isBandit);
                    if (friendlyNpcs.length > 0) {
                        const npc = friendlyNpcs[Math.floor(Math.random() * friendlyNpcs.length)];
                        herd._tamedTarget = { x: Math.floor(npc.x), y: Math.floor(npc.y) };
                    }
                }
            }

            // Move herd center toward target — faster movement for tamed pets
            if (herd._tamedTarget) {
                const tdx = herd._tamedTarget.x - herd.centerX;
                const tdy = herd._tamedTarget.y - herd.centerY;
                const tdist = Math.abs(tdx) + Math.abs(tdy);
                if (tdist > 4) {
                    // Move 2 tiles per tick when far away for faster pathfinding
                    const stepX = Math.sign(tdx) * Math.min(2, Math.abs(tdx));
                    const stepY = Math.sign(tdy) * Math.min(2, Math.abs(tdy));
                    herd.centerX += stepX;
                    herd.centerY += stepY;
                } else if (Math.random() < 0.3) {
                    // Small random drift when near target
                    herd.centerX += Math.floor(Math.random() * 3) - 1;
                    herd.centerY += Math.floor(Math.random() * 3) - 1;
                }
            }
        } else {
            // Untamed: drift herd center toward nearest building more aggressively
            if (Math.random() < 0.15 && World.buildings.length > 0) {
                let nearestBldg = null;
                let nearestDist = Infinity;
                for (const b of World.buildings) {
                    const dist = Math.abs(b.x - herd.centerX) + Math.abs(b.y - herd.centerY);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestBldg = b;
                    }
                }
                if (nearestBldg && nearestDist > tameRange) {
                    herd.centerX += Math.sign(nearestBldg.x - herd.centerX);
                    herd.centerY += Math.sign(nearestBldg.y - herd.centerY);
                } else if (Math.random() < 0.3) {
                    herd.centerX += Math.floor(Math.random() * 3) - 1;
                    herd.centerY += Math.floor(Math.random() * 3) - 1;
                }
            }
        }

        herd.centerX = Math.max(0, Math.min(World.width - 1, herd.centerX));
        herd.centerY = Math.max(0, Math.min(World.height - 1, herd.centerY));

        for (const id of herd.animals) {
            const a = this._animals.find(a => a.id === id);
            if (!a || a.dead) continue;

            if (Math.random() > def.moveChance * (a.isTamed ? 1.5 : 1)) continue;

            // Tamed animals: actively move toward herd center when far
            const distFromCenter = Math.abs(a.x - herd.centerX) + Math.abs(a.y - herd.centerY);
            if (a.isTamed && distFromCenter > def.wanderRadius * 0.5) {
                // Pathfind directly toward center
                let nx = a.x + Math.sign(herd.centerX - a.x);
                let ny = a.y + Math.sign(herd.centerY - a.y);
                if (this._isValidAnimalTile(nx, ny)) {
                    a.x = nx;
                    a.y = ny;
                }
                continue;
            }

            const dx = Math.floor(Math.random() * 3) - 1;
            const dy = Math.floor(Math.random() * 3) - 1;
            let nx = a.x + dx;
            let ny = a.y + dy;

            const newDistFromCenter = Math.abs(nx - herd.centerX) + Math.abs(ny - herd.centerY);
            if (newDistFromCenter > def.wanderRadius) {
                nx = a.x + Math.sign(herd.centerX - a.x);
                ny = a.y + Math.sign(herd.centerY - a.y);
            }

            if (this._isValidAnimalTile(nx, ny)) {
                a.x = nx;
                a.y = ny;
            }
        }
    },

    _updateCompanions() {
        for (const a of this._animals) {
            if (a.dead) continue;
            const def = this.TYPES[a.type];
            if (!def || def.behavior !== 'companion') continue;

            // Use persistent tamed state (set by _updateCompanionHerd)
            a.isPet = a.isTamed || false;

            if (!a.isPet) continue;

            // Pet dog: attack enemies (bandits, lions)
            if (a.type === 'dog') {
                this._petDogAttack(a, def);
            }

            // Pet cat: fight disease and heal NPCs
            if (a.type === 'cat') {
                this._petCatHeal(a, def);
            }
        }
    },

    _petDogAttack(a, def) {
        const aggroRange = def.aggroRange || 6;
        a._attackCooldown = (a._attackCooldown || 0) - 1;

        // Find nearest enemy: bandits or hostile animals
        let target = null;
        let targetType = null; // 'npc' or 'animal'
        let bestDist = aggroRange + 1;

        // Check bandits
        for (const npc of World.npcs) {
            if (!npc.isBandit) continue;
            const dist = Math.abs(Math.floor(npc.x) - a.x) + Math.abs(Math.floor(npc.y) - a.y);
            if (dist < bestDist) {
                bestDist = dist;
                target = npc;
                targetType = 'npc';
            }
        }

        // Check hostile animals (lions)
        for (const other of this._animals) {
            if (other.dead || other.id === a.id) continue;
            const oDef = this.TYPES[other.type];
            if (!oDef || oDef.behavior !== 'hostile') continue;
            const dist = Math.abs(other.x - a.x) + Math.abs(other.y - a.y);
            if (dist < bestDist) {
                bestDist = dist;
                target = other;
                targetType = 'animal';
            }
        }

        if (!target) return;

        // Move toward target
        if (bestDist > 1) {
            const tx = targetType === 'npc' ? Math.floor(target.x) : target.x;
            const ty = targetType === 'npc' ? Math.floor(target.y) : target.y;
            const dx = Math.sign(tx - a.x);
            const dy = Math.sign(ty - a.y);
            const nx = a.x + dx;
            const ny = a.y + dy;
            if (this._isValidAnimalTile(nx, ny)) {
                a.x = nx;
                a.y = ny;
            }
        }

        // Attack if adjacent
        if (bestDist <= 1 && a._attackCooldown <= 0) {
            a._attackCooldown = def.attackCooldown || 4;
            if (targetType === 'npc') {
                NPC.damageNpc(target.id, def.damage || 2, 'pet attack');
            } else {
                this.damageAnimal(target.id, def.damage || 2);
            }
        }
    },

    _petCatHeal(a, def) {
        const healRange = def.healRange || 3;
        const diseaseHealRange = def.diseaseHealRange || 4;
        const diseaseCloudRange = def.diseaseCloudRange || 3;

        // Heal injured NPCs (non-full HP, non-bandit)
        a._healCooldown = (a._healCooldown || 0) - 1;
        if (a._healCooldown <= 0) {
            for (const npc of World.npcs) {
                if (npc.isBandit) continue;
                if (npc.hp >= npc.maxHp) continue;
                const dist = Math.abs(Math.floor(npc.x) - a.x) + Math.abs(Math.floor(npc.y) - a.y);
                if (dist <= healRange) {
                    npc.hp = Math.min(npc.maxHp, npc.hp + (def.healAmount || 1));
                    a._healCooldown = def.healInterval || 30;
                    break;
                }
            }
        }

        // Cure diseased NPCs nearby
        for (const npc of World.npcs) {
            if (npc.isBandit || !npc.diseased) continue;
            const dist = Math.abs(Math.floor(npc.x) - a.x) + Math.abs(Math.floor(npc.y) - a.y);
            if (dist <= diseaseHealRange && Math.random() < 0.02) {
                npc.diseased = false;
            }
        }

        // Clear disease clouds nearby
        const clearChance = def.diseaseCloudClearChance || 0.05;
        for (const cloud of Events.diseaseClouds) {
            const dist = Math.abs(cloud.x - a.x) + Math.abs(cloud.y - a.y);
            if (dist <= diseaseCloudRange && Math.random() < clearChance) {
                Events.removeDiseaseCloud(cloud.x, cloud.y);
                break; // one cloud per tick
            }
        }
    },

    // ── NPC engages hostile animals ──

    checkNpcEngageHostile(npc) {
        // Armed NPCs (troops, hunters) may engage hostile animals unprovoked if close
        const isTroop = npc.type in TROOPS;
        const building = npc.assignedBuilding ? World.buildings.find(b => b.id === npc.assignedBuilding) : null;
        const isHunter = building ? BUILDINGS[building.type].isHunter : false;
        const isArmed = isTroop || isHunter;
        if (!isArmed) return null;

        // Only engage if idle
        if (npc.state !== NPC.STATE.IDLE) return null;

        const nx = Math.floor(npc.x), ny = Math.floor(npc.y);
        const engageRange = isTroop ? 6 : 4;

        for (const a of this._animals) {
            if (a.dead) continue;
            const def = this.TYPES[a.type];
            if (!def || def.behavior !== 'hostile') continue;
            const dist = Math.abs(a.x - nx) + Math.abs(a.y - ny);
            if (dist <= engageRange) {
                return a; // found hostile animal to engage
            }
        }
        return null;
    },

    // ── Damage & Death ──

    damageAnimal(animalId, amount) {
        const animal = this._animals.find(a => a.id === animalId);
        if (!animal || animal.dead) return false;

        animal.hp -= amount;

        // Trigger herd flee for passive animals
        const def = this.TYPES[animal.type];
        if (def && def.behavior === 'passive') {
            this.triggerHerdFlee(animalId);
        }

        if (animal.hp <= 0) {
            this._killAnimal(animal);
            return true; // died
        }
        return false; // still alive
    },

    _killAnimal(animal) {
        animal.dead = true;
        const def = this.TYPES[animal.type];

        // Create carcass at animal's position (only for animals that drop resources)
        if (def.carcassResource) {
            this._carcasses.push({
                id: animal.id,
                x: animal.x,
                y: animal.y,
                type: animal.type,
                resource: def.carcassResource,
                amount: def.carcassAmount
            });
        }
    },

    // Remove a carcass (when hunter picks it up)
    removeCarcass(carcassId) {
        const idx = this._carcasses.findIndex(c => c.id === carcassId);
        if (idx !== -1) {
            const c = this._carcasses.splice(idx, 1)[0];
            return c;
        }
        return null;
    },

    // Find nearest living animal of a type (or any huntable type) from position
    findNearestAnimal(type, fromX, fromY, filterFn) {
        let best = null;
        let bestDist = Infinity;
        for (const a of this._animals) {
            if (a.dead) continue;
            if (filterFn && !filterFn(a)) continue;
            // If type is 'any_passive', match any passive animal
            if (type === 'any_passive') {
                const def = this.TYPES[a.type];
                if (!def || def.behavior !== 'passive') continue;
            } else if (a.type !== type) {
                continue;
            }
            const dist = Math.abs(a.x - fromX) + Math.abs(a.y - fromY);
            if (dist < bestDist) {
                bestDist = dist;
                best = a;
            }
        }
        return best;
    },

    // Find nearest carcass from position
    findNearestCarcass(fromX, fromY) {
        let best = null;
        let bestDist = Infinity;
        for (const c of this._carcasses) {
            const dist = Math.abs(c.x - fromX) + Math.abs(c.y - fromY);
            if (dist < bestDist) {
                bestDist = dist;
                best = c;
            }
        }
        return best;
    },

    // Get all living animals (for rendering)
    getLivingAnimals() {
        return this._animals.filter(a => !a.dead);
    },

    getTamedAnimals() {
        return this._animals.filter(a => !a.dead && a.isTamed);
    },

    // Get all carcasses (for rendering)
    getCarcasses() {
        return this._carcasses;
    }
};
