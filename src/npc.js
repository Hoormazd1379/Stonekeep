// Stonekeep - NPC System
'use strict';

const NPC = {
    // NPC states
    STATE: {
        IDLE: 'idle',
        WALK_TO_RESOURCE: 'walkToResource',
        GATHER_RESOURCE: 'gatherResource',
        CARRY_RESOURCE: 'carryResource',
        WALK_TO_STOCKPILE: 'walkToStockpile',
        DEPOSIT_RESOURCE: 'depositResource',
        WALK_TO_WORK: 'walkToWork',
        WORKING: 'working',
        WALK_TO_PICKUP: 'walkToPickup',
        PICKUP_RESOURCE: 'pickupResource',
        DELIVER_RESOURCE: 'deliverResource',
        RETURN_TO_WORK: 'returnToWork',
        // Hunter states
        HUNT_WALK_TO_PREY: 'huntWalkToPrey',
        HUNT_SHOOT: 'huntShoot',
        HUNT_WALK_TO_CARCASS: 'huntWalkToCarcass',
        HUNT_PICKUP_CARCASS: 'huntPickupCarcass',
        HUNT_CARRY_CARCASS: 'huntCarryCarcass',
        HUNT_BUTCHER: 'huntButcher',
        HUNT_DELIVER_MEAT: 'huntDeliverMeat',
        // Well worker (firefighter) states
        FIRE_WALK_TO_WELL: 'fireWalkToWell',
        FIRE_FILL_BUCKET: 'fireFillBucket',
        FIRE_WALK_TO_FIRE: 'fireWalkToFire',
        FIRE_EXTINGUISH: 'fireExtinguish',
        // Apothecary healer states
        DISEASE_WALK_TO_CLOUD: 'diseaseWalkToCloud',
        DISEASE_HEAL: 'diseaseHeal',
        // Schedule states (Phase 3.2)
        WALK_HOME: 'walkHome',
        SLEEPING: 'sleeping',
        WALK_TO_EAT: 'walkToEat',
        EATING: 'eating',
        SOCIALIZING: 'socializing',
        FIGHTING: 'fighting',
        WALK_TO_STEAL: 'walkToSteal',
        STEALING: 'stealing',
        DESERTING: 'deserting'
    },

    // Name pools for procedural name generation
    _firstNames: [
        'Aldric', 'Bran', 'Cedric', 'Dunstan', 'Edric', 'Finn', 'Gareth', 'Haldor',
        'Ivar', 'Jorah', 'Kael', 'Leofric', 'Magnus', 'Niles', 'Osric', 'Peran',
        'Quinlan', 'Roderic', 'Sigurd', 'Torvin', 'Ulric', 'Varek', 'Wulfric', 'Yorick',
        'Adela', 'Brenna', 'Calla', 'Dagna', 'Elara', 'Freya', 'Gwen', 'Hilda',
        'Ingrid', 'Jorun', 'Katla', 'Lyra', 'Maren', 'Nessa', 'Olwen', 'Petra',
        'Rhona', 'Sigrid', 'Thora', 'Una', 'Vanya', 'Wren', 'Ylva', 'Zara',
        'Alwin', 'Bjorn', 'Colm', 'Draven', 'Eamon', 'Flint', 'Grimm', 'Hafdan',
        'Idris', 'Jarle', 'Knut', 'Lothar', 'Mace', 'Njord', 'Odin', 'Pike'
    ],
    _surnames: [
        'Stonehammer', 'Ironforge', 'Ashwood', 'Deepwell', 'Frostbeard', 'Goldvein',
        'Hillcrest', 'Thornwall', 'Blackthorn', 'Copperfield', 'Duskholm', 'Elmsworth',
        'Foxglove', 'Greystone', 'Hawkmoor', 'Kettleburn', 'Longbarrow', 'Marshwood',
        'Northcott', 'Oakenshield', 'Pinewood', 'Quartzridge', 'Redhill', 'Silverbrook',
        'Talloak', 'Underhill', 'Whitecliff', 'Briarton', 'Clayborn', 'Dunmore',
        'Emberfall', 'Farrow', 'Greenhollow', 'Hearthstone', 'Ivybridge', 'Joswick'
    ],

    _generateName(id) {
        // Deterministic name from NPC id
        const fi = id % this._firstNames.length;
        const si = Math.floor(id * 7 + 3) % this._surnames.length;
        return this._firstNames[fi] + ' ' + this._surnames[si];
    },

    // Base stats for civilian NPCs (peasants/workers)
    CIVILIAN_HP: 5,
    CIVILIAN_DAMAGE: 1,

    // Hunter NPCs get moderate combat stats
    HUNTER_HP: 8,
    HUNTER_DAMAGE: 3,

    spawnPeasant(x, y) {
        const id = World.createNpcId();
        const npc = {
            id: id,
            name: this._generateName(id),
            type: 'peasant',
            char: '@',
            fg: '#ffffff',
            x: x,
            y: y,
            targetX: x,
            targetY: y,
            path: null,
            pathIndex: 0,
            state: this.STATE.IDLE,
            assignedBuilding: null,
            carrying: null,
            carryAmount: 0,
            gatherTimer: 0,
            workTimer: 0,
            moveProgress: 0,
            hp: this.CIVILIAN_HP,
            maxHp: this.CIVILIAN_HP,
            damage: this.CIVILIAN_DAMAGE,
            // Tracking info for UI display
            walkFrom: null,  // {x, y} origin of current walk
            walkTo: null,    // {x, y} destination of current walk
            walkPurpose: '',  // description of current activity
            idleReason: '',   // reason for being idle (displayed in info panel)
            // Schedule & needs (Phase 3.2/3.3)
            homeBuilding: null,   // building id of assigned home
            schedulePhase: 'work', // 'work', 'free', 'sleep'
            hunger: CONFIG.HUNGER_START,
            fatigue: CONFIG.FATIGUE_START,
            lastAteType: null,     // last food type consumed
            foodTypesEaten: [],    // food types eaten today (for variety)
            lastAteDay: 0,         // day number when food variety was last reset
            _hungerAccum: 0,       // tick accumulator for hunger drain
            _fatigueAccum: 0,      // tick accumulator for fatigue changes
            _starveAccum: 0,       // tick accumulator for starvation damage
            _regenAccum: 0,        // tick accumulator for health regen
            _eatTimer: 0,          // ticks spent eating
            _socialUntil: 0,
            _socialPartnerId: null,
            _socialTone: null,
            _socialCooldownUntil: 0,
            _recentSocialMood: 0,
            _recentSocialMoodUntil: 0,
            _fightTargetId: null,
            _fightUntil: 0,
            _fightId: 0,
            _conflictCooldownUntil: 0,
            _desperateSinceDay: null,
            _desertTarget: null,
            _desertingSinceTick: 0,
            _theftTargetBuildingId: null,
            _theftTargetType: null,
            _theftAmount: 0,
            _theftTimer: 0
        };
        // Assign personality traits (Phase 3.4)
        Personality.assignTraits(npc);
        npc.mood = 50;           // current mood (0-100)
        npc.happiness = 50;      // individual happiness (0-100)
        npc.memories = [];       // memory log (Phase 3.5)
        npc.relationships = {};  // relationship map (Phase 3.6)
        World.npcs.push(npc);
        World.population++;
        World.idlePeasants++;
        // Assign home
        this._assignHome(npc);
        // Initial memory
        Memory.add(npc, 'arrived', Memory.PRIORITY.ROUTINE, npc.name + ' arrived at the settlement.', [], true);
        EventLog.add('positive', npc.name + ' arrived at the settlement.', npc.x, npc.y);
        return npc;
    },

    spawnTroop(type, x, y) {
        const def = TROOPS[type];
        if (!def) return null;
        const id = World.createNpcId();
        const npc = {
            id: id,
            name: this._generateName(id),
            type: type,
            char: def.char,
            fg: def.fg,
            x: x,
            y: y,
            targetX: x,
            targetY: y,
            path: null,
            pathIndex: 0,
            state: this.STATE.IDLE,
            hp: def.hp,
            maxHp: def.hp,
            damage: def.damage,
            ranged: def.ranged || false,
            range: def.range || 1,
            moveProgress: 0,
            walkFrom: null,
            walkTo: null,
            walkPurpose: '',
            // Troop needs (Phase 3.2/3.3)
            hunger: CONFIG.HUNGER_START,
            fatigue: CONFIG.FATIGUE_START,
            _hungerAccum: 0,
            _starveAccum: 0,
            _fatigueAccum: 0,
            _regenAccum: 0,
            isSleepingAtPost: false  // troops sleep at their post when fatigued & safe
        };
        npc.memories = [];       // memory log (Phase 3.5)
        npc.relationships = {};  // relationship map (Phase 3.6)
        World.npcs.push(npc);
        return npc;
    },

    // ── Data-driven social interaction tones ──
    // Adding a new tone = add one entry here
    SOCIAL_TONES: {
        pleasant: {
            relThreshold: 20,    // min average relationship
            moodThreshold: 50,   // min average mood
            relAbove: true,      // relationship must be >= threshold
            moodAbove: true,     // mood must be >= threshold
            baseDeltaMin: 3,     // min relationship change
            baseDeltaMax: 8,     // max relationship change
            negative: false,     // delta is positive
            memoryType: 'pleasant_chat',
            memoryText: 'had a pleasant chat with',
            socialMood: 3,
            priority: 1          // higher priority = checked first
        },
        argument: {
            relThreshold: -15,
            moodThreshold: 45,
            relAbove: false,     // relationship must be <= threshold
            moodAbove: false,    // mood must be <= threshold
            baseDeltaMin: 5,
            baseDeltaMax: 15,
            negative: true,
            memoryType: 'argument',
            memoryText: 'argued with',
            socialMood: -3,
            priority: 0
        },
        neutral: {
            relThreshold: null,  // null = always matches (fallback)
            moodThreshold: null,
            baseDeltaMin: 1,
            baseDeltaMax: 1,
            negative: false,
            memoryType: 'memory_shared',
            memoryText: 'shared stories with',
            socialMood: 1,
            priority: -1
        }
    },

    // Spatial grid for fast NPC lookups
    _GRID_CELL: 16,
    _grid: null,
    _gridW: 0,
    _gridH: 0,

    // Resource reservation maps (Phase 3.7)
    _treeReservations: {},   // key "x,y" -> { npcId, untilTick }
    _animalReservations: {}, // animalId -> { npcId, untilTick }
    _fightSeq: 0,
    _resolvedFightIds: {},

    _rebuildGrid() {
        const cell = this._GRID_CELL;
        const w = Math.ceil(World.width / cell);
        const h = Math.ceil(World.height / cell);
        if (!this._grid || this._gridW !== w || this._gridH !== h) {
            this._gridW = w;
            this._gridH = h;
            this._grid = new Array(w * h);
        }
        for (let i = 0; i < this._grid.length; i++) this._grid[i] = null;
        for (const npc of World.npcs) {
            const gx = Math.min(w - 1, Math.max(0, Math.floor(Math.floor(npc.x) / cell)));
            const gy = Math.min(h - 1, Math.max(0, Math.floor(Math.floor(npc.y) / cell)));
            const idx = gy * w + gx;
            if (!this._grid[idx]) this._grid[idx] = [];
            this._grid[idx].push(npc);
        }
    },

    _queryGrid(x, y, range, filter) {
        const cell = this._GRID_CELL;
        const w = this._gridW;
        const h = this._gridH;
        const minGX = Math.max(0, Math.floor((x - range) / cell));
        const maxGX = Math.min(w - 1, Math.floor((x + range) / cell));
        const minGY = Math.max(0, Math.floor((y - range) / cell));
        const maxGY = Math.min(h - 1, Math.floor((y + range) / cell));
        let best = null;
        let bestDist = range + 1;
        for (let gy = minGY; gy <= maxGY; gy++) {
            for (let gx = minGX; gx <= maxGX; gx++) {
                const bucket = this._grid[gy * w + gx];
                if (!bucket) continue;
                for (const npc of bucket) {
                    if (filter && !filter(npc)) continue;
                    const dist = Math.abs(Math.floor(npc.x) - x) + Math.abs(Math.floor(npc.y) - y);
                    if (dist < bestDist) {
                        bestDist = dist;
                        best = npc;
                    }
                }
            }
        }
        return best;
    },

    _clearExpiredReservations() {
        const now = World.tick;

        for (const [key, r] of Object.entries(this._treeReservations)) {
            const owner = World.npcs.find(n => n.id === r.npcId);
            if (!owner || now > r.untilTick) delete this._treeReservations[key];
        }

        for (const [id, r] of Object.entries(this._animalReservations)) {
            const animalId = parseInt(id, 10);
            const owner = World.npcs.find(n => n.id === r.npcId);
            const animal = Animal._animals.find(a => a.id === animalId && !a.dead);
            if (!owner || !animal || now > r.untilTick) delete this._animalReservations[id];
        }
    },

    _reserveTree(npc, x, y) {
        const key = x + ',' + y;
        this._treeReservations[key] = {
            npcId: npc.id,
            untilTick: World.tick + CONFIG.RESOURCE_RESERVATION_TTL
        };
        npc._reservedTreeKey = key;
    },

    _releaseTreeReservation(npc) {
        if (!npc || !npc._reservedTreeKey) return;
        const r = this._treeReservations[npc._reservedTreeKey];
        if (r && r.npcId === npc.id) delete this._treeReservations[npc._reservedTreeKey];
        npc._reservedTreeKey = null;
    },

    _isTreeReservedByOther(x, y, npcId) {
        const r = this._treeReservations[x + ',' + y];
        return !!(r && r.npcId !== npcId && r.untilTick >= World.tick);
    },

    _reserveAnimal(npc, animalId) {
        this._animalReservations[animalId] = {
            npcId: npc.id,
            untilTick: World.tick + CONFIG.RESOURCE_RESERVATION_TTL
        };
        npc._reservedAnimalId = animalId;
    },

    _releaseAnimalReservation(npc) {
        if (!npc || !npc._reservedAnimalId) return;
        const id = String(npc._reservedAnimalId);
        const r = this._animalReservations[id];
        if (r && r.npcId === npc.id) delete this._animalReservations[id];
        npc._reservedAnimalId = null;
    },

    _isAnimalReservedByOther(animalId, npcId) {
        const r = this._animalReservations[String(animalId)];
        return !!(r && r.npcId !== npcId && r.untilTick >= World.tick);
    },

    update() {
        this._clearExpiredReservations();
        this._rebuildGrid();
        for (const npc of World.npcs) {
            if (npc.isBandit) {
                this._updateBandit(npc);
            } else if (npc.type === 'peasant' || npc.type === 'worker') {
                this._updateWorker(npc);
            } else if (npc.type in TROOPS) {
                this._updateTroop(npc);
            }
        }

        // Winter sickness: small chance each tick for NPCs to fall ill in cold weather
        if (Season.isWinter() && World.tick % 32 === 0) {
            const herbGardenCount = World.buildings.filter(b => b.type === 'herbGarden' && b.workers.length > 0).length;
            const reduction = herbGardenCount * CONFIG.HERB_SICKNESS_REDUCTION;
            const chance = CONFIG.WINTER_SICKNESS_CHANCE * Math.max(0, 1 - reduction);
            if (chance > 0) {
                for (const npc of World.npcs) {
                    if (npc.isBandit || npc.diseased) continue;
                    if (Season.isInFurnaceRange(Math.floor(npc.x), Math.floor(npc.y))) continue;
                    if (Math.random() < chance) {
                        npc.diseased = true;
                        npc._diseaseStartTick = World.tick;
                        Animations.add(npc.x, npc.y, 'disease', null, { npcId: npc.id });
                        Memory.add(npc, 'got_sick', Memory.PRIORITY.DISEASE, npc.name + ' fell ill from the winter cold.', [], true);
                    }
                }
            }
        }

        // Phase 3.7: social interactions and routine sightings during free time
        this._tryStartSocialMeetings();
        this._tryStartCivilianConflicts();
        if (World.tick % CONFIG.SOCIAL_SIGHTING_INTERVAL === 0) {
            this._recordRoutineSightings();
        }

        // Update idle peasant count
        World.idlePeasants = World.npcs.filter(
            n => (n.type === 'peasant') && n.state === this.STATE.IDLE && !n.assignedBuilding
        ).length;

        // Auto-assign idle peasants to understaffed buildings every 10 ticks
        if (World.tick % 10 === 0 && World.idlePeasants > 0) {
            this._autoAssignWorkers();
        }
    },

    // ── NPC Damage & Death ──

    damageNpc(npcId, amount, source) {
        const npc = World.npcs.find(n => n.id === npcId);
        if (!npc) return false;

        if (source) npc._lastDamageSource = source;
        npc.hp -= amount;
        if (npc.hp <= 0) {
            this.killNpc(npc);
            return true; // died
        }
        return false; // still alive
    },

    _removeNpcFromWorld(npc) {
        const idx = World.npcs.indexOf(npc);
        if (idx === -1) return;

        this._releaseTreeReservation(npc);
        this._releaseAnimalReservation(npc);

        if (npc.assignedBuilding) {
            const building = World.buildings.find(b => b.id === npc.assignedBuilding);
            if (building) {
                const workerIdx = building.workers.indexOf(npc.id);
                if (workerIdx !== -1) building.workers.splice(workerIdx, 1);
            }
        }

        const selIdx = World.selectedUnits.indexOf(npc.id);
        if (selIdx !== -1) World.selectedUnits.splice(selIdx, 1);

        if (!npc.isBandit) {
            if (npc.type === 'peasant' || npc.type === 'worker') {
                World.population--;
                if (npc.type === 'peasant' && npc.state === this.STATE.IDLE && !npc.assignedBuilding) {
                    World.idlePeasants--;
                }
            }
        }

        World.npcs.splice(idx, 1);
    },

    killNpc(npc) {
        if (World.npcs.indexOf(npc) === -1) return;

        // Death skull animation
        Animations.add(npc.x, npc.y, 'skull');
        Animations.removeByNpc(npc.id);

        // Memory: witnesses remember the death
        if (!npc.isBandit) {
            // Build death message with cause and occupation
            let occupation = 'Idle';
            if (npc.type in TROOPS) {
                occupation = TROOPS[npc.type].name;
            } else if (npc.assignedBuilding) {
                const b = World.buildings.find(b => b.id === npc.assignedBuilding);
                if (b) occupation = BUILDINGS[b.type].name + ' worker';
            }
            const cause = npc._lastDamageSource || 'unknown causes';
            const deathMsg = npc.name + ' (' + occupation + ') died from ' + cause + '.';
            Memory.addToWitnesses(npc.x, npc.y, 'npc_died', Memory.PRIORITY.DEATH, deathMsg, [npc.id]);
            EventLog.add('danger', deathMsg, npc.x, npc.y);
        } else {
            Memory.addToWitnesses(npc.x, npc.y, 'bandit_killed', Memory.PRIORITY.COMBAT, 'A bandit was slain.', [npc.id]);
            EventLog.add('info', 'A bandit was slain.', npc.x, npc.y);
        }
        this._removeNpcFromWorld(npc);
    },

    _autoAssignWorkers() {
        for (const building of World.buildings) {
            if (!building.active) continue;
            const def = BUILDINGS[building.type];
            if (!def.workers || def.workers <= 0) continue;
            if (building.workers.length >= def.workers) continue;
            // This building needs workers
            this.assignWorkersToBuilding(building);
            if (World.idlePeasants <= 0) break;
        }
    },

    // ── Schedule & Needs System (Phase 3.2/3.3) ──

    _getSchedulePhase() {
        const h = Time.hour;
        if (h >= CONFIG.SCHEDULE_WORK_START && h < CONFIG.SCHEDULE_WORK_END) return 'work';
        if (h >= CONFIG.SCHEDULE_FREE_START && h < CONFIG.SCHEDULE_FREE_END) return 'free';
        return 'sleep'; // 22:00-6:00 (wraps around midnight)
    },

    // Get effective work start/end for a specific building
    _getBuildingWorkHours(building) {
        const start = building.workHoursStart !== undefined ? building.workHoursStart : CONFIG.SCHEDULE_WORK_START;
        const hours = building.workHoursDuration !== undefined ? building.workHoursDuration : CONFIG.DEFAULT_WORK_HOURS;
        return { start, end: start + hours };
    },

    // Check if a building's worker is a service worker (works during work+free time)
    _isServiceBuilding(def) {
        return !!(def.isWell || def.isReligious || def.isApothecary || def.isInn);
    },

    // Check if it's currently work time for a specific NPC
    _isWorkTimeForNpc(npc) {
        const phase = this._getSchedulePhase();
        if (phase === 'sleep') return false;
        if (!npc.assignedBuilding) return phase === 'work';

        const building = World.buildings.find(b => b.id === npc.assignedBuilding);
        if (!building) return phase === 'work';
        const def = BUILDINGS[building.type];

        // Service workers work during both work and free time
        if (this._isServiceBuilding(def)) return phase === 'work' || phase === 'free';

        // Regular workers: check building-specific work hours
        if (phase === 'work') {
            const wh = this._getBuildingWorkHours(building);
            const h = Time.hour;
            return h >= wh.start && h < wh.end;
        }
        return false;
    },

    // ── Home Assignment ──

    _assignHome(npc) {
        // Find a housing building with available capacity
        const housingBuildings = World.buildings.filter(b => {
            const d = BUILDINGS[b.type];
            return d && d.housing;
        });

        // Sort by tier (prefer higher tier homes if available)
        housingBuildings.sort((a, b) => {
            const da = BUILDINGS[a.type], db = BUILDINGS[b.type];
            return (db.housingTier || 1) - (da.housingTier || 1);
        });

        for (const hb of housingBuildings) {
            const d = BUILDINGS[hb.type];
            const residents = World.npcs.filter(n => n.homeBuilding === hb.id).length;
            if (residents < d.housing) {
                npc.homeBuilding = hb.id;
                return;
            }
        }
        // No home available - npc remains homeless
        npc.homeBuilding = null;
    },

    // Reassign homes for all NPCs (call when housing built/destroyed)
    reassignAllHomes() {
        // Clear all assignments
        for (const npc of World.npcs) {
            if (npc.isBandit || npc.type in TROOPS) continue;
            npc.homeBuilding = null;
        }
        // Reassign in order
        for (const npc of World.npcs) {
            if (npc.isBandit || npc.type in TROOPS) continue;
            this._assignHome(npc);
        }
    },

    // Get housing tier bonus for fatigue recovery (higher tier = faster recovery)
    _getHousingTierBonus(npc) {
        if (!npc.homeBuilding) return 0.5; // Homeless: half recovery
        const b = World.buildings.find(b => b.id === npc.homeBuilding);
        if (!b) return 0.5;
        const def = BUILDINGS[b.type];
        const tier = def.housingTier || 1;
        // Tier 1 (hovel) = 1.0x, Tier 2 (cottage) = 1.25x, Tier 3 (house) = 1.5x
        return 0.75 + tier * 0.25;
    },

    // ── Hunger System ──

    _updateHunger(npc) {
        // Guard against NaN hunger (can happen from save/load edge cases)
        if (npc.hunger === undefined || npc.hunger === null || isNaN(npc.hunger)) npc.hunger = CONFIG.HUNGER_MAX;
        // Drain hunger over time
        npc._hungerAccum = (npc._hungerAccum || 0) + 1;
        if (npc._hungerAccum >= CONFIG.TICKS_PER_HOUR) {
            npc._hungerAccum = 0;
            npc.hunger = Math.max(0, npc.hunger - CONFIG.HUNGER_DRAIN_PER_HOUR);
        }

        // Starvation damage
        if (npc.hunger <= CONFIG.HUNGER_STARVE_THRESHOLD) {
            npc._starveAccum = (npc._starveAccum || 0) + 1;
            if (npc._starveAccum >= CONFIG.HUNGER_STARVE_INTERVAL) {
                npc._starveAccum = 0;
                npc.hp = Math.max(0, npc.hp - CONFIG.HUNGER_STARVE_DAMAGE);
                // Hunger sweat animation on starvation tick
                if (!Animations.hasNpcAnimation(npc.id, 'hunger')) {
                    Animations.add(npc.x, npc.y, 'hunger', null, { npcId: npc.id });
                }
                if (npc.hp <= 0) {
                    npc._lastDamageSource = 'starvation';
                    this.killNpc(npc);
                }
            }
        }
    },

    // Get hunger-restored amount based on ration level
    _getMealRestore() {
        // Each food unit restores 50 hunger; NPCs eat 2 units per meal = full bar
        return 50;
    },

    // Find the best food to eat (prefers variety)
    _chooseFoodToEat(npc) {
        const foodTypes = ['apples', 'bread', 'cheese', 'meat'];
        // Reset variety tracking each day
        if (npc.lastAteDay !== Time.day) {
            npc.foodTypesEaten = [];
            npc.lastAteDay = Time.day;
        }
        // Prefer food types not yet eaten today (check all storages)
        for (const f of foodTypes) {
            if (!npc.foodTypesEaten.includes(f) && Resources.getTotal(f) > 0) return f;
        }
        // Otherwise eat any available food
        for (const f of foodTypes) {
            if (Resources.getTotal(f) > 0) return f;
        }
        return null;
    },

    // ── Fatigue System ──

    _updateFatigue(npc, isWorking) {
        npc._fatigueAccum = (npc._fatigueAccum || 0) + 1;
        if (npc._fatigueAccum >= CONFIG.TICKS_PER_HOUR) {
            npc._fatigueAccum = 0;
            if (isWorking && npc.assignedBuilding) {
                // Accumulate fatigue during work (modified by personality)
                const building = World.buildings.find(b => b.id === npc.assignedBuilding);
                const bType = building ? building.type : 'default';
                const rate = CONFIG.FATIGUE_RATES[bType] || 1.0;
                const traitMult = Personality.getMultiplier(npc, 'fatigueRateMult');
                npc.fatigue = Math.min(CONFIG.FATIGUE_MAX, npc.fatigue + CONFIG.FATIGUE_WORK_BASE * rate * traitMult);
            }
        }
    },

    _updateSleepRecovery(npc) {
        npc._fatigueAccum = (npc._fatigueAccum || 0) + 1;
        if (npc._fatigueAccum >= CONFIG.TICKS_PER_HOUR) {
            npc._fatigueAccum = 0;
            const tierBonus = this._getHousingTierBonus(npc);
            npc.fatigue = Math.max(0, npc.fatigue - CONFIG.FATIGUE_SLEEP_RECOVERY * tierBonus);

            // Health regen during sleep (if not starving and not diseased)
            if (npc.hunger > CONFIG.HUNGER_STARVE_THRESHOLD && !npc.diseased) {
                npc.hp = Math.min(npc.maxHp, npc.hp + CONFIG.HEALTH_REGEN_PER_HOUR);
            }
        }
    },

    // Get production speed multiplier from fatigue, health, mood, and personality
    _getFatigueEfficiency(npc) {
        let mult = 1.0;
        // High fatigue: 50% speed
        if (npc.fatigue >= CONFIG.FATIGUE_HIGH) mult *= 0.5;
        // Low health: 50% speed
        if (npc.hp / npc.maxHp < CONFIG.LOW_HEALTH_THRESHOLD) mult *= 0.5;
        // Personality work speed modifier
        mult *= Personality.getMultiplier(npc, 'workSpeedMult');
        // Mood work speed modifier
        mult *= Mood.getWorkSpeedMult(npc);
        return mult;
    },

    // ── Worker Update (modified for schedule) ──

    _updateWorker(npc) {
        // Update hunger (always ticks regardless of state)
        this._updateHunger(npc);

        // Update schedule phase
        npc.schedulePhase = this._getSchedulePhase();
        this._updateDesperationTracker(npc);

        if (npc.state === this.STATE.DESERTING) {
            this._handleDeserting(npc);
            return;
        }

        if (npc.state === this.STATE.FIGHTING) {
            this._handleCivilianFight(npc);
            return;
        }

        if (npc.state === this.STATE.WALK_TO_STEAL || npc.state === this.STATE.STEALING) {
            if (npc.state === this.STATE.WALK_TO_STEAL) this._walkAlongPath(npc);
            else this._handleStealing(npc);
            return;
        }

        // Starvation interrupt: if starving and food available, drop everything and eat
        if (npc.hunger <= CONFIG.HUNGER_STARVE_THRESHOLD
            && npc.state !== this.STATE.EATING
            && npc.state !== this.STATE.WALK_TO_EAT) {
            const hasFood = this._chooseFoodToEat(npc);
            if (hasFood) {
                npc.walkPurpose = 'starving - must eat';
                this._goEat(npc);
                return;
            }
        }

        // Flee from nearby bandits (workers don't fight — modified by personality)
        if (!npc._fleeCooldown) npc._fleeCooldown = 0;
        if (npc._fleeCooldown > 0) npc._fleeCooldown--;
        if (npc._fleeCooldown <= 0) {
            const wx = Math.floor(npc.x), wy = Math.floor(npc.y);
            const nearBandit = this._findNearestBandit(wx, wy, 6);
            if (nearBandit) {
                // Brave NPCs may not flee (fleeChance modifier reduces chance)
                const fleeMod = Personality.getModifier(npc, 'fleeChance');
                const baseFlee = 1.0; // default: always flee
                if (Math.random() < Math.max(0, baseFlee + fleeMod)) {
                    // Limit flee memory to once per day to prevent spam
                    if (!npc._fleeMemoryDay || npc._fleeMemoryDay !== Time.day) {
                        npc._fleeMemoryDay = Time.day;
                        Memory.add(npc, 'fled_danger', Memory.PRIORITY.COMBAT, npc.name + ' fled from bandits.', [], true);
                    }
                    // Wake up if sleeping
                    if (npc.state === this.STATE.SLEEPING) {
                        npc.state = this.STATE.IDLE;
                    }
                    const bx = Math.floor(nearBandit.x), by = Math.floor(nearBandit.y);
                    const dx = wx - bx;
                    const dy = wy - by;
                    const fleeX = wx + (dx === 0 ? (Math.random() < 0.5 ? 3 : -3) : Math.sign(dx) * 5);
                    const fleeY = wy + (dy === 0 ? (Math.random() < 0.5 ? 3 : -3) : Math.sign(dy) * 5);
                    npc.walkPurpose = 'fleeing from bandits';
                    npc._fleeCooldown = 10;
                    this._walkTo(npc, Math.round(fleeX), Math.round(fleeY), this.STATE.WALK_TO_WORK, this.STATE.IDLE);
                    return;
                }
            }
        }

        // Determine if NPC is currently in a work state (for fatigue tracking)
        const workStates = [this.STATE.WALK_TO_RESOURCE, this.STATE.GATHER_RESOURCE, this.STATE.WORKING,
            this.STATE.WALK_TO_WORK, this.STATE.WALK_TO_PICKUP, this.STATE.PICKUP_RESOURCE,
            this.STATE.DELIVER_RESOURCE, this.STATE.RETURN_TO_WORK, this.STATE.WALK_TO_STOCKPILE,
            this.STATE.DEPOSIT_RESOURCE, this.STATE.HUNT_WALK_TO_PREY, this.STATE.HUNT_SHOOT,
            this.STATE.HUNT_WALK_TO_CARCASS, this.STATE.HUNT_PICKUP_CARCASS, this.STATE.HUNT_CARRY_CARCASS,
            this.STATE.HUNT_BUTCHER, this.STATE.HUNT_DELIVER_MEAT, this.STATE.FIRE_WALK_TO_WELL,
            this.STATE.FIRE_FILL_BUCKET, this.STATE.FIRE_WALK_TO_FIRE, this.STATE.FIRE_EXTINGUISH,
            this.STATE.DISEASE_WALK_TO_CLOUD, this.STATE.DISEASE_HEAL];
        const isWorking = workStates.includes(npc.state);
        if (isWorking) this._updateFatigue(npc, true);

        switch (npc.state) {
            case this.STATE.IDLE:
                this._idleBehaviorScheduled(npc);
                break;
            case this.STATE.WALK_HOME:
            case this.STATE.WALK_TO_EAT:
                this._walkAlongPath(npc);
                break;
            case this.STATE.SLEEPING:
                this._handleSleeping(npc);
                break;
            case this.STATE.EATING:
                this._handleEating(npc);
                break;
            case this.STATE.SOCIALIZING:
                this._handleSocializing(npc);
                break;
            case this.STATE.FIGHTING:
                this._handleCivilianFight(npc);
                break;
            case this.STATE.WALK_TO_STEAL:
                this._walkAlongPath(npc);
                break;
            case this.STATE.STEALING:
                this._handleStealing(npc);
                break;
            case this.STATE.DESERTING:
                this._handleDeserting(npc);
                break;
            case this.STATE.WALK_TO_RESOURCE:
            case this.STATE.WALK_TO_STOCKPILE:
            case this.STATE.WALK_TO_WORK:
            case this.STATE.WALK_TO_PICKUP:
            case this.STATE.RETURN_TO_WORK:
            case this.STATE.DELIVER_RESOURCE:
            case this.STATE.HUNT_WALK_TO_PREY:
            case this.STATE.HUNT_WALK_TO_CARCASS:
            case this.STATE.HUNT_CARRY_CARCASS:
            case this.STATE.HUNT_DELIVER_MEAT:
            case this.STATE.FIRE_WALK_TO_WELL:
            case this.STATE.FIRE_WALK_TO_FIRE:
            case this.STATE.DISEASE_WALK_TO_CLOUD:
                this._walkAlongPath(npc);
                break;
            case this.STATE.GATHER_RESOURCE:
                this._gatherResource(npc);
                break;
            case this.STATE.DEPOSIT_RESOURCE:
                this._depositResource(npc);
                break;
            case this.STATE.WORKING:
                this._workingAtBuilding(npc);
                break;
            case this.STATE.PICKUP_RESOURCE:
                this._pickupResource(npc);
                break;
            case this.STATE.HUNT_SHOOT:
                this._huntShoot(npc);
                break;
            case this.STATE.HUNT_PICKUP_CARCASS:
                this._huntPickupCarcass(npc);
                break;
            case this.STATE.HUNT_BUTCHER:
                this._huntButcher(npc);
                break;
            case this.STATE.FIRE_FILL_BUCKET:
                this._fireFillBucket(npc);
                break;
            case this.STATE.FIRE_EXTINGUISH:
                this._fireExtinguish(npc);
                break;
            case this.STATE.DISEASE_HEAL:
                this._diseaseHeal(npc);
                break;
        }
    },

    _updateTroop(npc) {
        // Guard against NaN hunger/fatigue
        if (npc.hunger === undefined || npc.hunger === null || isNaN(npc.hunger)) npc.hunger = CONFIG.HUNGER_MAX;
        if (npc.fatigue === undefined || npc.fatigue === null || isNaN(npc.fatigue)) npc.fatigue = 0;
        // ── Troop hunger: food teleportation (consume from granary without walking) ──
        npc._hungerAccum = (npc._hungerAccum || 0) + 1;
        if (npc._hungerAccum >= CONFIG.TICKS_PER_HOUR) {
            npc._hungerAccum = 0;
            npc.hunger = Math.max(0, npc.hunger - CONFIG.HUNGER_DRAIN_PER_HOUR);
        }
        // Auto-eat from nearest granary (main or forward) every TROOP_HUNGER_INTERVAL ticks
        if (npc.hunger < CONFIG.HUNGER_EAT_THRESHOLD && World.tick % CONFIG.TROOP_HUNGER_INTERVAL === 0) {
            for (let i = 0; i < 2; i++) {
                let food = this._chooseFoodToEat(npc);
                if (food) {
                    // Try forward granary near troop first, then main storage
                    const nx = Math.floor(npc.x), ny = Math.floor(npc.y);
                    const nearGranary = Resources.findNearestGranaryWithFood(nx, ny);
                    let consumed = false;
                    if (nearGranary && nearGranary.buildingId) {
                        const bld = World.buildings.find(b => b.id === nearGranary.buildingId);
                        const isForwardGranary = bld && BUILDINGS[bld.type] && BUILDINGS[bld.type].isForwardStorage;
                        if (isForwardGranary && bld.storage) {
                            if ((bld.storage[food] || 0) > 0) {
                                Resources.removeFromBuilding(nearGranary.buildingId, food, 1);
                                consumed = true;
                            } else {
                                // Preferred food not in forward granary; try any available
                                const troopFoodTypes = ['apples', 'bread', 'cheese', 'meat'];
                                for (const f of troopFoodTypes) {
                                    if ((bld.storage[f] || 0) > 0) {
                                        Resources.removeFromBuilding(nearGranary.buildingId, f, 1);
                                        food = f;
                                        consumed = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    if (!consumed) {
                        if (Resources.get(food) > 0) {
                            Resources.remove(food, 1);
                            consumed = true;
                        }
                    }
                    if (consumed) {
                        npc.hunger = Math.min(CONFIG.HUNGER_MAX, npc.hunger + this._getMealRestore());
                        npc.lastAteType = food;
                        if (!npc.foodTypesEaten) npc.foodTypesEaten = [];
                        if (!npc.foodTypesEaten.includes(food)) npc.foodTypesEaten.push(food);
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }
        }
        // Starvation damage
        if (npc.hunger <= CONFIG.HUNGER_STARVE_THRESHOLD) {
            npc._starveAccum = (npc._starveAccum || 0) + 1;
            if (npc._starveAccum >= CONFIG.HUNGER_STARVE_INTERVAL) {
                npc._starveAccum = 0;
                npc._lastDamageSource = 'starvation';
                npc.hp -= CONFIG.HUNGER_STARVE_DAMAGE;
                if (npc.hp <= 0) {
                    npc.hp = 0;
                    this.damageNpc(npc.id, 0, 'starvation'); // trigger death
                    return;
                }
            }
        }

        // ── Troop fatigue: accumulate on patrol, recover when sleeping at post ──
        if (npc.isSleepingAtPost) {
            npc._fatigueAccum = (npc._fatigueAccum || 0) + 1;
            if (npc._fatigueAccum >= CONFIG.TICKS_PER_HOUR) {
                npc._fatigueAccum = 0;
                npc.fatigue = Math.max(0, npc.fatigue - CONFIG.FATIGUE_TROOP_SLEEP_RECOVERY);
                // Health regen during sleep
                if (npc.hunger > CONFIG.HUNGER_STARVE_THRESHOLD && !npc.diseased) {
                    npc.hp = Math.min(npc.maxHp, npc.hp + CONFIG.HEALTH_REGEN_PER_HOUR);
                }
            }
            // Wake conditions: enemies nearby, selected, or ordered
            const nx = Math.floor(npc.x), ny = Math.floor(npc.y);
            const enemyNear = this._findNearestBandit(nx, ny, CONFIG.BANDIT_DETECT_RANGE);
            if (enemyNear || npc._attackTarget || npc._attackMoveTarget || npc.fatigue <= 10) {
                npc.isSleepingAtPost = false;
                npc.state = this.STATE.IDLE;
            }
            return; // Don't do anything else while sleeping
        }

        // Fatigue accumulates while on active duty (1 fatigue per 2 game hours baseline)
        npc._fatigueAccum = (npc._fatigueAccum || 0) + 1;
        if (npc._fatigueAccum >= CONFIG.TICKS_PER_HOUR * 2) {
            npc._fatigueAccum = 0;
            npc.fatigue = Math.min(CONFIG.FATIGUE_MAX, npc.fatigue + 1);
        }

        // If very fatigued and it's sleep time and no enemies nearby → sleep at post
        if (npc.fatigue >= CONFIG.FATIGUE_HIGH && this._getSchedulePhase() === 'sleep') {
            const nx = Math.floor(npc.x), ny = Math.floor(npc.y);
            if (!this._findNearestBandit(nx, ny, CONFIG.BANDIT_DETECT_RANGE)) {
                npc.isSleepingAtPost = true;
                npc.state = this.STATE.SLEEPING;
                npc._fatigueAccum = 0;
                return;
            }
        }

        // Troops walk along paths when given move orders
        if (npc.state === this.STATE.WALK_TO_WORK) {
            // Attack-move: check for enemies within 10 tiles while moving
            if (npc._attackMoveTarget) {
                const nx = Math.floor(npc.x), ny = Math.floor(npc.y);
                const nearby = this._findNearestBandit(nx, ny, 10);
                if (nearby) {
                    npc._attackTarget = nearby.id;
                    npc._attackMoveTarget = null;
                    npc.state = this.STATE.IDLE;
                    return;
                }
            }
            // Melee troops: stop walking if an enemy is adjacent (prevent tile-swap loop)
            if (!npc.ranged) {
                const nx = Math.floor(npc.x), ny = Math.floor(npc.y);
                const adj = this._findNearestBandit(nx, ny, 1);
                if (adj) {
                    npc.path = null;
                    npc.state = this.STATE.IDLE;
                    return;
                }
            }
            this._walkAlongPath(npc);
            return;
        }

        // Idle troops: check for specific attack target first
        if (npc.state === this.STATE.IDLE) {
            const nx = Math.floor(npc.x), ny = Math.floor(npc.y);
            const troopDef = TROOPS[npc.type];
            const isFireThrower = troopDef && troopDef.isFireThrower;

            // Priority 0: ordered attack target (NPC)
            if (npc._attackTarget) {
                const target = World.npcs.find(n => n.id === npc._attackTarget);
                if (!target || target.hp <= 0) {
                    npc._attackTarget = null;
                } else {
                    const tx = Math.floor(target.x), ty = Math.floor(target.y);
                    const dist = Math.abs(tx - nx) + Math.abs(ty - ny);
                    const attackRange = npc.ranged ? npc.range : 1;
                    if (dist <= attackRange) {
                        npc._attackCooldown = (npc._attackCooldown || 0) - 1;
                        if (npc._attackCooldown <= 0) {
                            if (isFireThrower) {
                                this._fireThrowerAttack(npc, tx, ty, target);
                            } else {
                                npc._attackCooldown = 3;
                                const bonus = Military.getHeightBonus(npc) * Military.getFearDamageBonus();
                                const damage = Math.max(1, Math.round(npc.damage * bonus));
                                this.damageNpc(target.id, damage, 'combat');
                                if (npc.ranged) Renderer.addProjectile(npc.x, npc.y, tx, ty, '#FFDD44');
                            }
                        }
                    } else {
                        npc.walkPurpose = 'pursuing target';
                        this._walkTo(npc, tx, ty, this.STATE.WALK_TO_WORK, this.STATE.IDLE, { allowWall: true });
                    }
                    return;
                }
            }

            // Priority 0b: ordered attack target (animal)
            if (npc._attackTargetAnimal) {
                const target = Animal.getLivingAnimals().find(a => a.id === npc._attackTargetAnimal);
                if (!target) {
                    npc._attackTargetAnimal = null;
                } else {
                    const dist = Math.abs(target.x - nx) + Math.abs(target.y - ny);
                    const attackRange = npc.ranged ? npc.range : 1;
                    if (dist <= attackRange) {
                        npc._attackCooldown = (npc._attackCooldown || 0) - 1;
                        if (npc._attackCooldown <= 0) {
                            npc._attackCooldown = 3;
                            Animal.damageAnimal(target.id, npc.damage || 2);
                            if (npc.ranged) Renderer.addProjectile(npc.x, npc.y, target.x, target.y, '#FFDD44');
                        }
                    } else {
                        npc.walkPurpose = 'pursuing animal';
                        this._walkTo(npc, target.x, target.y, this.STATE.WALK_TO_WORK, this.STATE.IDLE, { allowWall: true });
                    }
                    return;
                }
            }

            // Priority 1: engage bandits
            const detectRange = npc.ranged ? npc.range : 12;
            const bandit = this._findNearestBandit(nx, ny, detectRange);
            if (bandit) {
                const bx = Math.floor(bandit.x), by = Math.floor(bandit.y);
                const dist = Math.abs(bx - nx) + Math.abs(by - ny);
                const attackRange = npc.ranged ? npc.range : 1;

                if (dist <= attackRange) {
                    // In range: attack
                    npc._attackCooldown = (npc._attackCooldown || 0) - 1;
                    if (npc._attackCooldown <= 0) {
                        if (isFireThrower) {
                            this._fireThrowerAttack(npc, bx, by, bandit);
                        } else {
                            npc._attackCooldown = 3;
                            const bonus = Military.getHeightBonus(npc) * Military.getFearDamageBonus();
                            const damage = Math.max(1, Math.round(npc.damage * bonus));
                            this.damageNpc(bandit.id, damage, 'combat');
                            if (npc.ranged) Renderer.addProjectile(npc.x, npc.y, bx, by, '#FFDD44');
                        }
                    }
                } else {
                    // Move toward bandit
                    npc.walkPurpose = 'engaging bandit';
                    this._walkTo(npc, bx, by, this.STATE.WALK_TO_WORK, this.STATE.IDLE, { allowWall: true });
                }
                return;
            }

            // Priority 2: engage hostile animals
            const hostileAnimal = Animal.checkNpcEngageHostile(npc);
            if (hostileAnimal) {
                const dist = Math.abs(hostileAnimal.x - nx) + Math.abs(hostileAnimal.y - ny);

                if (dist <= 1 || (npc.ranged && dist <= npc.range)) {
                    npc._attackCooldown = (npc._attackCooldown || 0) - 1;
                    if (npc._attackCooldown <= 0) {
                        if (isFireThrower) {
                            this._fireThrowerAttack(npc, hostileAnimal.x, hostileAnimal.y, null);
                        } else {
                            npc._attackCooldown = 3;
                            Animal.damageAnimal(hostileAnimal.id, npc.damage || 2);
                            if (npc.ranged) Renderer.addProjectile(npc.x, npc.y, hostileAnimal.x, hostileAnimal.y, '#FFDD44');
                        }
                    }
                } else {
                    npc.walkPurpose = 'engaging hostile animal';
                    this._walkTo(npc, hostileAnimal.x, hostileAnimal.y, this.STATE.WALK_TO_WORK, this.STATE.IDLE, { allowWall: true });
                }
                return;
            }

            // No enemies found — clear combat indicators
            npc._attackCooldown = 0;
            npc._buildingAttackCooldown = 0;

            // No enemies: melee troops patrol within 6 tiles of guard position
            if (!npc.ranged && World.tick % 20 === 0) {
                if (!npc._guardX) { npc._guardX = nx; npc._guardY = ny; }
                const pr = 6;
                const px = npc._guardX + Math.floor(Math.random() * (pr * 2 + 1)) - pr;
                const py = npc._guardY + Math.floor(Math.random() * (pr * 2 + 1)) - pr;
                if (Utils.inBounds(px, py, World.width, World.height) && World.isWalkable(px, py)) {
                    npc.walkPurpose = 'patrolling';
                    this._walkTo(npc, px, py, this.STATE.WALK_TO_WORK, this.STATE.IDLE, { allowWall: true });
                }
            }
        }
    },

    // Fire thrower attack: ignite target tile if pitch available, else weak melee
    _fireThrowerAttack(npc, tx, ty, target) {
        if (Resources.get('pitch') >= 1) {
            Resources.remove('pitch', 1);
            npc._attackCooldown = CONFIG.FIRE_THROWER_COOLDOWN;
            Fire.ignite(tx, ty);
            Renderer.addProjectile(npc.x, npc.y, tx, ty, '#FF6600');
        } else if (target) {
            // No pitch — weak melee fallback
            npc._attackCooldown = 3;
            const bonus = Military.getHeightBonus(npc) * Military.getFearDamageBonus();
            const damage = Math.max(1, Math.round(npc.damage * bonus));
            this.damageNpc(target.id, damage, 'combat');
        }
    },

    // ── Bandit AI ──

    _updateBandit(npc) {
        // Walking state
        if (npc.state === this.STATE.WALK_TO_WORK) {
            // Melee bandits: stop walking if a player NPC is adjacent (prevent tile-swap loop)
            if (!npc.ranged) {
                const nx = Math.floor(npc.x), ny = Math.floor(npc.y);
                const adj = this._findNearestPlayerNpc(nx, ny, 1);
                if (adj) {
                    npc.path = null;
                    npc.state = this.STATE.IDLE;
                    return;
                }
            }
            this._walkAlongPath(npc);
            return;
        }

        if (npc.state !== this.STATE.IDLE) return;

        const bx = Math.floor(npc.x), by = Math.floor(npc.y);

        // Check for adjacent player NPCs to attack
        const target = this._findNearestPlayerNpc(bx, by, npc.ranged ? npc.range : CONFIG.BANDIT_DETECT_RANGE);
        if (target) {
            const tx = Math.floor(target.x), ty = Math.floor(target.y);
            const dist = Math.abs(tx - bx) + Math.abs(ty - by);
            const attackRange = npc.ranged ? npc.range : 1;

            if (dist <= attackRange) {
                // In range: attack
                npc._attackCooldown = (npc._attackCooldown || 0) - 1;
                if (npc._attackCooldown <= 0) {
                    npc._attackCooldown = CONFIG.BANDIT_ATTACK_COOLDOWN;
                    this.damageNpc(target.id, npc.damage, 'bandit attack');
                    if (npc.ranged) Renderer.addProjectile(npc.x, npc.y, tx, ty, '#FF4444');
                }
                return;
            } else {
                // Move toward target
                npc.walkPurpose = 'attacking ' + target.name;
                this._walkTo(npc, tx, ty, this.STATE.WALK_TO_WORK, this.STATE.IDLE);
                return;
            }
        }

        // No NPCs nearby — check for adjacent buildings to damage
        const adjBuilding = this._findAdjacentBuilding(bx, by);
        if (adjBuilding) {
            npc._buildingAttackCooldown = (npc._buildingAttackCooldown || 0) - 1;
            if (npc._buildingAttackCooldown <= 0) {
                npc._buildingAttackCooldown = CONFIG.BANDIT_BUILDING_COOLDOWN;
                npc.walkPurpose = 'attacking ' + BUILDINGS[adjBuilding.type].name;
                if (adjBuilding.hp !== undefined) {
                    adjBuilding.hp -= CONFIG.BANDIT_BUILDING_DAMAGE;
                    if (adjBuilding.hp <= 0) {
                        adjBuilding.hp = 0;
                        Fire._destroyBuilding(adjBuilding);
                    }
                }
            }
            return;
        }

        // No NPCs or buildings nearby — clear combat indicators
        npc._attackCooldown = 0;
        npc._buildingAttackCooldown = 0;

        // Pathfind toward keep or random building
        if (!npc._raidTarget || Math.random() < 0.05) {
            if (World.keepPos && Math.random() < 0.7) {
                npc._raidTarget = { x: World.keepPos.x + 1, y: World.keepPos.y + 1 };
            } else if (World.buildings.length > 0) {
                const bld = World.buildings[Math.floor(Math.random() * World.buildings.length)];
                npc._raidTarget = { x: bld.x, y: bld.y };
            }
        }

        if (npc._raidTarget) {
            npc.walkPurpose = 'raiding';
            this._walkTo(npc, npc._raidTarget.x, npc._raidTarget.y, this.STATE.WALK_TO_WORK, this.STATE.IDLE);
        }
    },

    _findNearestBandit(x, y, range) {
        return this._queryGrid(x, y, range, npc => npc.isBandit);
    },

    _findAdjacentBuilding(x, y) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const b = World.getBuildingAt(x + dx, y + dy);
                if (b && b.hp !== undefined && b.hp > 0) return b;
            }
        }
        // Also check tile the bandit is standing on
        const b = World.getBuildingAt(x, y);
        if (b && b.hp !== undefined && b.hp > 0) return b;
        return null;
    },

    _findNearestPlayerNpc(x, y, range) {
        return this._queryGrid(x, y, range, npc => !npc.isBandit);
    },

    // ── Schedule-Aware Idle Behavior ──

    _idleBehaviorScheduled(npc) {
        const phase = npc.schedulePhase;

        if (this._shouldAttemptDesertion(npc)) {
            this._startDesertion(npc);
            return;
        }

        // Exhaustion check: if fatigue at max, must rest regardless of schedule
        if (npc.fatigue >= CONFIG.FATIGUE_EXHAUSTION) {
            if (!npc._exhaustionMemoryDay || npc._exhaustionMemoryDay !== Time.day) {
                npc._exhaustionMemoryDay = Time.day;
                Memory.add(npc, 'exhaustion', Memory.PRIORITY.NOTABLE_WORK, npc.name + ' collapsed from exhaustion.', [], true);
            }
            npc.walkPurpose = 'exhausted - must rest';
            this._goHomeToSleep(npc);
            return;
        }

        // Sleep phase: go home and sleep
        if (phase === 'sleep') {
            this._goHomeToSleep(npc);
            return;
        }

        // Free time phase: eat if hungry, otherwise wander
        if (phase === 'free') {
            if (this._maybeStartTheft(npc)) return;

            // Service workers continue working during free time, but eat if hungry first
            if (this._isWorkTimeForNpc(npc) && npc.assignedBuilding) {
                if (npc.hunger < CONFIG.HUNGER_EAT_THRESHOLD) {
                    this._goEat(npc);
                    return;
                }
                this._idleBehavior(npc);
                return;
            }
            // Hungry? Go eat
            if (npc.hunger < CONFIG.HUNGER_EAT_THRESHOLD) {
                this._goEat(npc);
                return;
            }
            // Free time behavior: wander near home or keep
            this._freeTimeBehavior(npc);
            return;
        }

        // Work phase: check if it's this NPC's work time
        if (this._isWorkTimeForNpc(npc)) {
            this._idleBehavior(npc);
            return;
        }

        // Not work time for this NPC yet (e.g. custom building hours haven't started)
        // Treat like free time
        if (npc.hunger < CONFIG.HUNGER_EAT_THRESHOLD) {
            this._goEat(npc);
            return;
        }
        this._freeTimeBehavior(npc);
    },

    _goHomeToSleep(npc) {
        const home = npc.homeBuilding ? World.buildings.find(b => b.id === npc.homeBuilding) : null;

        if (home) {
            // Check if at home
            if (this._isAtBuilding(npc, home)) {
                npc.state = this.STATE.SLEEPING;
                npc.walkPurpose = 'sleeping';
                npc._fatigueAccum = 0;
                return;
            }
            // Walk home — pass ownBuildingId so home tiles are passable for pathfinding
            npc.walkPurpose = 'going home to sleep';
            this._walkTo(npc, home.x, home.y, this.STATE.WALK_HOME, this.STATE.SLEEPING, { ownBuildingId: home.id });
        } else {
            // Homeless: sleep near keep
            if (World.keepPos) {
                const kx = World.keepPos.x + 1 + Math.floor(Math.random() * 3) - 1;
                const ky = World.keepPos.y + 3;
                const nx = Math.floor(npc.x), ny = Math.floor(npc.y);
                const distToKeep = Math.abs(nx - kx) + Math.abs(ny - ky);
                if (distToKeep <= 3) {
                    npc.state = this.STATE.SLEEPING;
                    npc.walkPurpose = 'sleeping outdoors';
                    npc._fatigueAccum = 0;
                    return;
                }
                npc.walkPurpose = 'looking for a place to sleep';
                this._walkTo(npc, kx, ky, this.STATE.WALK_HOME, this.STATE.SLEEPING);
            } else {
                // No keep? Just sleep in place
                npc.state = this.STATE.SLEEPING;
                npc.walkPurpose = 'sleeping outdoors';
                npc._fatigueAccum = 0;
            }
        }
    },

    _handleSleeping(npc) {
        // Recovery during sleep
        this._updateSleepRecovery(npc);

        // Wake up conditions
        const phase = this._getSchedulePhase();
        if (phase !== 'sleep' && npc.fatigue < CONFIG.FATIGUE_EXHAUSTION) {
            npc.state = this.STATE.IDLE;
            npc.walkPurpose = '';
            return;
        }
    },

    _goEat(npc) {
        // Check if food is available
        const foodType = this._chooseFoodToEat(npc);
        if (!foodType) {
            npc.idleReason = 'hungry - no food available';
            this._freeTimeBehavior(npc);
            return;
        }

        // Find nearest granary or forward granary with food
        const nx = Math.floor(npc.x), ny = Math.floor(npc.y);
        const target = Resources.findNearestGranaryWithFood(nx, ny);
        if (!target) {
            npc.idleReason = 'hungry - no granary';
            this._freeTimeBehavior(npc);
            return;
        }

        const granary = World.buildings.find(b => b.id === target.buildingId);
        if (!granary) {
            npc.idleReason = 'hungry - no granary';
            this._freeTimeBehavior(npc);
            return;
        }

        // Check if at granary
        if (this._isAtBuilding(npc, granary)) {
            npc.state = this.STATE.EATING;
            npc.walkPurpose = 'eating';
            npc._eatTimer = 0;
            npc._eatingFoodType = foodType;
            npc._eatingAtBuildingId = granary.id;
            return;
        }

        // Walk to granary — pass ownBuildingId so granary tiles are passable for pathfinding
        npc.walkPurpose = 'going to eat';
        npc._eatingFoodType = foodType;
        npc._eatingAtBuildingId = granary.id;
        this._walkTo(npc, granary.x, granary.y, this.STATE.WALK_TO_EAT, this.STATE.EATING, { ownBuildingId: granary.id });
    },

    _handleEating(npc) {
        npc._eatTimer = (npc._eatTimer || 0) + 1;
        if (npc._eatTimer >= CONFIG.HUNGER_EAT_TICKS) {
            // Consume up to 2 food units per meal to fill hunger completely
            const unitsToEat = 2;
            const eatBuilding = npc._eatingAtBuildingId ? World.buildings.find(b => b.id === npc._eatingAtBuildingId) : null;
            const isForward = eatBuilding && BUILDINGS[eatBuilding.type] && BUILDINGS[eatBuilding.type].isForwardStorage;
            for (let i = 0; i < unitsToEat; i++) {
                let foodType = npc._eatingFoodType || this._chooseFoodToEat(npc);
                if (!foodType) break;
                let consumed = false;
                if (isForward) {
                    consumed = Resources.removeFromBuilding(eatBuilding.id, foodType, 1);
                    // If preferred type not in this forward granary, try any food it has
                    if (!consumed) {
                        const fwdFoodTypes = ['apples', 'bread', 'cheese', 'meat'];
                        for (const f of fwdFoodTypes) {
                            if (Resources.removeFromBuilding(eatBuilding.id, f, 1)) {
                                foodType = f;
                                consumed = true;
                                break;
                            }
                        }
                    }
                }
                if (!consumed && Resources.get(foodType) > 0) {
                    consumed = Resources.remove(foodType, 1);
                }
                if (consumed) {
                    const restore = this._getMealRestore();
                    npc.hunger = Math.min(CONFIG.HUNGER_MAX, npc.hunger + restore);
                    npc.lastAteType = foodType;
                    if (!npc.foodTypesEaten) npc.foodTypesEaten = [];
                    if (!npc.foodTypesEaten.includes(foodType)) {
                        npc.foodTypesEaten.push(foodType);
                    }
                    // Pick a new food type for second unit (variety)
                    npc._eatingFoodType = this._chooseFoodToEat(npc);
                } else {
                    break;
                }
            }
            npc._eatTimer = 0;
            npc._eatingFoodType = null;
            npc._eatingAtBuildingId = null;
            npc.state = this.STATE.IDLE;
            npc.walkPurpose = '';
        }
    },

    _visitBuilding(npc, building, purpose) {
        if (!building) return false;
        npc.walkPurpose = purpose;
        this._walkTo(npc, building.x, building.y, this.STATE.WALK_TO_WORK, this.STATE.IDLE, { ownBuildingId: building.id });
        return true;
    },

    _findNearestActiveInn(x, y) {
        let best = null;
        let bestDist = Infinity;
        for (const b of World.buildings) {
            if (b.type !== 'inn') continue;
            if (!b.active || !b.workers || b.workers.length === 0) continue;
            const dist = Math.abs(b.x - x) + Math.abs(b.y - y);
            if (dist < bestDist) {
                bestDist = dist;
                best = b;
            }
        }
        return best;
    },

    _findNearestReligiousBuilding(x, y) {
        let best = null;
        let bestDist = Infinity;
        for (const b of World.buildings) {
            const def = BUILDINGS[b.type];
            if (!def || !def.isReligious || !b.active) continue;
            const dist = Math.abs(b.x - x) + Math.abs(b.y - y);
            if (dist < bestDist) {
                bestDist = dist;
                best = b;
            }
        }
        return best;
    },

    _seekNpcToTalk(npc) {
        const nx = Math.floor(npc.x), ny = Math.floor(npc.y);
        const target = this._queryGrid(nx, ny, CONFIG.SOCIAL_SEEK_RADIUS, other => {
            if (!other || other.id === npc.id || other.isBandit) return false;
            if (!(other.type === 'peasant' || other.type === 'worker')) return false;
            if (other.schedulePhase !== 'free') return false;
            if (other.state === this.STATE.SOCIALIZING) return false;
            return true;
        });
        if (!target) return false;
        npc.walkPurpose = 'seeking conversation with ' + target.name;
        this._walkTo(npc, Math.floor(target.x), Math.floor(target.y), this.STATE.WALK_TO_WORK, this.STATE.IDLE);
        return true;
    },

    _freeTimeBehavior(npc) {
        const nx = Math.floor(npc.x), ny = Math.floor(npc.y);

        // High fatigue: rest early at home
        if (npc.fatigue !== undefined && npc.fatigue >= CONFIG.FATIGUE_HIGH && Math.random() < 0.6) {
            this._goHomeToSleep(npc);
            return;
        }

        // Low mood + social personality: seek someone to talk to
        const socialMood = Personality.getModifier(npc, 'socialMoodBonus');
        if ((npc.mood || 50) <= CONFIG.SOCIAL_LOW_MOOD_THRESHOLD && socialMood > 0 && Math.random() < 0.45) {
            if (this._seekNpcToTalk(npc)) return;
        }

        // Pious personalities often visit religious buildings during free time
        const religionSense = Personality.getModifier(npc, 'religionSensitivity');
        if (religionSense > 0 && Math.random() < 0.3) {
            const religious = this._findNearestReligiousBuilding(nx, ny);
            if (religious && this._visitBuilding(npc, religious, 'visiting ' + BUILDINGS[religious.type].name)) return;
        }

        // Inn social hub preference if ale is available (or innkeeper already carrying ale)
        const inn = this._findNearestActiveInn(nx, ny);
        if (inn && Math.random() < 0.55) {
            const aleInStorage = Resources.get('ale') > 0;
            const innkeeperHasAle = aleInStorage || World.npcs.some(n =>
                n.assignedBuilding === inn.id && n.carrying === 'ale');
            if (innkeeperHasAle) {
                if (this._visitBuilding(npc, inn, 'heading to inn')) return;
            }
        }

        // Default: wander near home/keep with occasional exploration
        if (Math.random() < 0.03) {
            let destX;
            let destY;
            const home = npc.homeBuilding ? World.buildings.find(b => b.id === npc.homeBuilding) : null;
            if (home) {
                destX = home.x + Math.floor(Math.random() * 7) - 3;
                destY = home.y + Math.floor(Math.random() * 7) - 3;
            } else if (World.keepPos) {
                destX = World.keepPos.x + 1 + Math.floor(Math.random() * 9) - 4;
                destY = World.keepPos.y + 1 + Math.floor(Math.random() * 9) - 4;
            } else {
                return;
            }

            // Small chance to explore farther during free time
            if (Math.random() < 0.15) {
                destX += Math.floor(Math.random() * 11) - 5;
                destY += Math.floor(Math.random() * 11) - 5;
            }

            if (World.isWalkable(destX, destY)) {
                npc.walkPurpose = 'wandering (free time)';
                npc.path = Pathfinding.findPath(Math.floor(npc.x), Math.floor(npc.y), destX, destY);
                if (npc.path && npc.path.length > 1) {
                    npc.pathIndex = 1;
                    npc.state = this.STATE.WALK_TO_WORK;
                    npc._arrivalState = this.STATE.IDLE;
                    npc.moveProgress = 0;
                    npc.walkFrom = { x: Math.floor(npc.x), y: Math.floor(npc.y) };
                    npc.walkTo = { x: destX, y: destY };
                }
            }
        }
    },

    _startSocialMeeting(a, b) {
        if (!a || !b) return;
        if (a.state === this.STATE.SOCIALIZING || b.state === this.STATE.SOCIALIZING) return;

        const relAB = Relationship.get(a, b.id);
        const relBA = Relationship.get(b, a.id);
        const relAvg = (relAB + relBA) / 2;
        const moodAvg = ((a.mood || 50) + (b.mood || 50)) / 2;

        // Select tone from data-driven table (sorted by priority descending)
        const sorted = Object.entries(this.SOCIAL_TONES).sort((x, y) => y[1].priority - x[1].priority);
        let tone = 'neutral';
        let toneDef = this.SOCIAL_TONES.neutral;
        for (const [key, def] of sorted) {
            if (def.relThreshold === null) { tone = key; toneDef = def; break; }
            const relMatch = def.relAbove ? (relAvg >= def.relThreshold) : (relAvg <= def.relThreshold);
            const moodMatch = def.moodAbove ? (moodAvg >= def.moodThreshold) : (moodAvg <= def.moodThreshold);
            if (relMatch && moodMatch) { tone = key; toneDef = def; break; }
        }

        const range = toneDef.baseDeltaMax - toneDef.baseDeltaMin + 1;
        let baseDelta = toneDef.baseDeltaMin + Math.floor(Math.random() * range);
        if (toneDef.negative) baseDelta = -baseDelta;

        const inn = this._findNearestActiveInn(Math.floor((a.x + b.x) / 2), Math.floor((a.y + b.y) / 2));
        let innBonus = 0;
        if (inn) {
            const distA = Math.abs(Math.floor(a.x) - inn.x) + Math.abs(Math.floor(a.y) - inn.y);
            const distB = Math.abs(Math.floor(b.x) - inn.x) + Math.abs(Math.floor(b.y) - inn.y);
            if (distA <= CONFIG.INN_SOCIAL_RANGE && distB <= CONFIG.INN_SOCIAL_RANGE && Resources.get('ale') >= CONFIG.INN_SOCIAL_ALE_COST) {
                Resources.remove('ale', CONFIG.INN_SOCIAL_ALE_COST);
                innBonus = 2;
            }
        }

        let deltaA = baseDelta + innBonus;
        let deltaB = baseDelta + innBonus;
        deltaA *= Personality.getMultiplier(a, 'relationshipGainRate');
        deltaB *= Personality.getMultiplier(b, 'relationshipGainRate');

        if (deltaA < 0 && Personality.getModifier(a, 'fightChance') > 0) deltaA *= 1.25;
        if (deltaB < 0 && Personality.getModifier(b, 'fightChance') > 0) deltaB *= 1.25;

        const oldAB = Relationship.get(a, b.id);
        const oldBA = Relationship.get(b, a.id);
        Relationship.change(a, b.id, Math.round(deltaA));
        Relationship.change(b, a.id, Math.round(deltaB));
        const newAB = Relationship.get(a, b.id);
        const newBA = Relationship.get(b, a.id);

        const shareCountA = 1 + Math.floor(Math.random() * 3);
        const shareCountB = 1 + Math.floor(Math.random() * 3);
        for (const entry of Memory.selectToShare(a, shareCountA)) {
            Memory.receiveSecondhand(b, entry);
        }
        for (const entry of Memory.selectToShare(b, shareCountB)) {
            Memory.receiveSecondhand(a, entry);
        }

        const toneType = toneDef.memoryType;
        const toneText = toneDef.memoryText;
        Memory.add(a, toneType, Memory.PRIORITY.SOCIAL, a.name + ' ' + toneText + ' ' + b.name + '.', [b.id], true);
        Memory.add(b, toneType, Memory.PRIORITY.SOCIAL, b.name + ' ' + toneText + ' ' + a.name + '.', [a.id], true);

        if (oldAB < 50 && newAB >= 50) {
            Memory.add(a, 'friendship_formed', Memory.PRIORITY.MAJOR_SOCIAL, a.name + ' became close friends with ' + b.name + '.', [b.id], true);
            EventLog.add('positive', a.name + ' and ' + b.name + ' became close friends.', Math.floor((a.x + b.x) / 2), Math.floor((a.y + b.y) / 2));
            Animations.add(a.x, a.y, 'heart', null, { npcId: a.id });
            Animations.add(b.x, b.y, 'heart', null, { npcId: b.id });
        }
        if (oldBA < 50 && newBA >= 50) {
            Memory.add(b, 'friendship_formed', Memory.PRIORITY.MAJOR_SOCIAL, b.name + ' became close friends with ' + a.name + '.', [a.id], true);
        }
        if (oldAB > -10 && newAB <= -10) {
            Memory.add(a, 'rivalry_formed', Memory.PRIORITY.MAJOR_SOCIAL, a.name + ' became rivals with ' + b.name + '.', [b.id], true);
            EventLog.add('caution', a.name + ' and ' + b.name + ' became rivals.', Math.floor((a.x + b.x) / 2), Math.floor((a.y + b.y) / 2));
        }
        if (oldBA > -10 && newBA <= -10) {
            Memory.add(b, 'rivalry_formed', Memory.PRIORITY.MAJOR_SOCIAL, b.name + ' became rivals with ' + a.name + '.', [a.id], true);
        }

        const socialMood = toneDef.socialMood;
        const moodBonus = socialMood + (innBonus > 0 ? CONFIG.INN_SOCIAL_MOOD_BONUS : 0);
        const until = World.tick + CONFIG.TICKS_PER_HOUR;
        a._recentSocialMood = moodBonus;
        b._recentSocialMood = moodBonus;
        a._recentSocialMoodUntil = until;
        b._recentSocialMoodUntil = until;

        const duration = CONFIG.SOCIAL_MEETING_MIN_TICKS + Math.floor(Math.random() * (CONFIG.SOCIAL_MEETING_MAX_TICKS - CONFIG.SOCIAL_MEETING_MIN_TICKS + 1));
        a.state = this.STATE.SOCIALIZING;
        b.state = this.STATE.SOCIALIZING;
        a._socialUntil = World.tick + duration;
        b._socialUntil = World.tick + duration;
        a._socialPartnerId = b.id;
        b._socialPartnerId = a.id;
        a._socialTone = tone;
        b._socialTone = tone;
        a.walkPurpose = 'socializing with ' + b.name;
        b.walkPurpose = 'socializing with ' + a.name;
    },

    _handleSocializing(npc) {
        if (!npc._socialUntil || npc._socialUntil <= World.tick) {
            npc.state = this.STATE.IDLE;
            npc._socialUntil = 0;
            npc._socialTone = null;
            npc._socialPartnerId = null;
            npc._socialCooldownUntil = World.tick + CONFIG.SOCIAL_MEETING_COOLDOWN;
            npc.walkPurpose = '';
            return;
        }

        const partner = World.npcs.find(n => n.id === npc._socialPartnerId);
        if (!partner || partner.isBandit) {
            npc.state = this.STATE.IDLE;
            npc._socialUntil = 0;
            npc._socialTone = null;
            npc._socialPartnerId = null;
            npc._socialCooldownUntil = World.tick + CONFIG.SOCIAL_MEETING_COOLDOWN;
            npc.walkPurpose = '';
        }
    },

    _tryStartSocialMeetings() {
        if (World.tick % 3 !== 0) return;

        for (const npc of World.npcs) {
            if (npc.isBandit) continue;
            if (!(npc.type === 'peasant' || npc.type === 'worker')) continue;
            if (npc.schedulePhase !== 'free') continue;
            if (npc.state !== this.STATE.IDLE) continue;
            if (npc._socialCooldownUntil && npc._socialCooldownUntil > World.tick) continue;

            const nx = Math.floor(npc.x), ny = Math.floor(npc.y);
            const other = this._queryGrid(nx, ny, 2, candidate => {
                if (!candidate || candidate.id === npc.id || candidate.isBandit) return false;
                if (!(candidate.type === 'peasant' || candidate.type === 'worker')) return false;
                if (candidate.schedulePhase !== 'free') return false;
                if (candidate.state !== this.STATE.IDLE) return false;
                if (candidate._socialCooldownUntil && candidate._socialCooldownUntil > World.tick) return false;
                return true;
            });

            if (!other) continue;
            if (Math.random() <= CONFIG.SOCIAL_MEETING_CHANCE) {
                this._startSocialMeeting(npc, other);
            }
        }
    },

    _recordRoutineSightings() {
        for (const npc of World.npcs) {
            if (npc.isBandit) continue;
            if (!(npc.type === 'peasant' || npc.type === 'worker')) continue;
            if (npc.schedulePhase !== 'free') continue;
            if (npc.state === this.STATE.SOCIALIZING) continue;

            const nx = Math.floor(npc.x), ny = Math.floor(npc.y);
            const seen = this._queryGrid(nx, ny, CONFIG.SOCIAL_SIGHTING_RANGE, other => {
                if (!other || other.id === npc.id || other.isBandit) return false;
                return (other.type === 'peasant' || other.type === 'worker');
            });

            if (!seen) continue;
            if (!npc._sightingDayByNpc) npc._sightingDayByNpc = {};
            if (npc._sightingDayByNpc[seen.id] === Time.day) continue;

            npc._sightingDayByNpc[seen.id] = Time.day;
            Memory.add(
                npc,
                'routine_sighting',
                Memory.PRIORITY.ROUTINE_SIGHTING,
                npc.name + ' saw ' + seen.name + ' passing by.',
                [seen.id],
                true
            );
        }
    },

    _isCivilian(npc) {
        return !!(npc && !npc.isBandit && (npc.type === 'peasant' || npc.type === 'worker'));
    },

    _getNearbyWitnesses(x, y, range, excludeIds) {
        const excluded = new Set(excludeIds || []);
        return World.npcs.filter(npc => {
            if (!this._isCivilian(npc)) return false;
            if (excluded.has(npc.id)) return false;
            const dist = Math.abs(Math.floor(npc.x) - x) + Math.abs(Math.floor(npc.y) - y);
            return dist <= range;
        });
    },

    _tryStartCivilianConflicts() {
        if (World.tick % CONFIG.CIVILIAN_FIGHT_CHECK_INTERVAL !== 0) return;

        for (const npc of World.npcs) {
            if (!this._isCivilian(npc)) continue;
            if (npc.state !== this.STATE.IDLE) continue;
            if (npc.schedulePhase === 'sleep') continue;
            if (npc._conflictCooldownUntil && npc._conflictCooldownUntil > World.tick) continue;
            if ((npc.mood || 50) >= 20) continue;

            const nx = Math.floor(npc.x);
            const ny = Math.floor(npc.y);
            const other = this._queryGrid(nx, ny, 1, candidate => {
                if (!this._isCivilian(candidate)) return false;
                if (candidate.id === npc.id) return false;
                if (candidate.state !== this.STATE.IDLE) return false;
                if (candidate.schedulePhase === 'sleep') return false;
                if (candidate._conflictCooldownUntil && candidate._conflictCooldownUntil > World.tick) return false;
                return true;
            });
            if (!other) continue;

            const rel = Relationship.get(npc, other.id);
            const otherRel = Relationship.get(other, npc.id);
            if (rel > -10 && otherRel > -10) continue;

            const moodPressure = Math.max(0, (20 - Math.min(npc.mood || 50, other.mood || 50)) / 20);
            const aggression = Math.max(0, Personality.getModifier(npc, 'fightChance'))
                + Math.max(0, Personality.getModifier(other, 'fightChance'));
            const peacefulness = Math.abs(Math.min(0, Personality.getModifier(npc, 'fightChance')))
                + Math.abs(Math.min(0, Personality.getModifier(other, 'fightChance')));
            const chance = Utils.clamp(
                CONFIG.CIVILIAN_FIGHT_CHANCE + moodPressure * 0.18 + aggression * 0.12 - peacefulness * 0.08,
                0.02,
                0.75
            );
            if (Math.random() < chance) {
                this._startCivilianFight(npc, other);
            }
        }
    },

    _startCivilianFight(a, b) {
        if (!a || !b) return;
        if (a.state === this.STATE.FIGHTING || b.state === this.STATE.FIGHTING) return;

        const fightId = ++this._fightSeq;
        const duration = CONFIG.CIVILIAN_FIGHT_MIN_TICKS
            + Math.floor(Math.random() * (CONFIG.CIVILIAN_FIGHT_MAX_TICKS - CONFIG.CIVILIAN_FIGHT_MIN_TICKS + 1));

        a.state = this.STATE.FIGHTING;
        b.state = this.STATE.FIGHTING;
        a._fightTargetId = b.id;
        b._fightTargetId = a.id;
        a._fightUntil = World.tick + duration;
        b._fightUntil = World.tick + duration;
        a._fightId = fightId;
        b._fightId = fightId;
        a._attackCooldown = 0;
        b._attackCooldown = 0;
        a.walkPurpose = 'fighting with ' + b.name;
        b.walkPurpose = 'fighting with ' + a.name;

        if (!a._fightHistory) a._fightHistory = {};
        if (!b._fightHistory) b._fightHistory = {};
        a._fightHistory[b.id] = (a._fightHistory[b.id] || 0) + 1;
        b._fightHistory[a.id] = (b._fightHistory[a.id] || 0) + 1;

        const description = a.name + ' and ' + b.name + ' got into a fight.';
        EventLog.add('warning', a.name + ' and ' + b.name + ' started a fight.', Math.floor((a.x + b.x) / 2), Math.floor((a.y + b.y) / 2));
        Memory.add(a, 'npc_fight', Memory.PRIORITY.COMBAT, description, [b.id], true);
        Memory.add(b, 'npc_fight', Memory.PRIORITY.COMBAT, description, [a.id], true);
        Memory.addToWitnesses(Math.floor((a.x + b.x) / 2), Math.floor((a.y + b.y) / 2), 'npc_fight', Memory.PRIORITY.COMBAT,
            description, [a.id, b.id], [a.id, b.id]);

        Relationship.change(a, b.id, -CONFIG.CIVILIAN_FIGHT_RELATIONSHIP_PENALTY);
        Relationship.change(b, a.id, -CONFIG.CIVILIAN_FIGHT_RELATIONSHIP_PENALTY);

        if ((a._fightHistory[b.id] || 0) >= 2) {
            Relationship.set(a, b.id, Math.min(Relationship.get(a, b.id), -60));
        }
        if ((b._fightHistory[a.id] || 0) >= 2) {
            Relationship.set(b, a.id, Math.min(Relationship.get(b, a.id), -60));
        }
    },

    _resolveCivilianFight(npc, target) {
        const fightId = npc && npc._fightId;
        if (!fightId || this._resolvedFightIds[fightId]) return;
        this._resolvedFightIds[fightId] = true;

        const aliveNpc = npc && World.npcs.includes(npc) ? npc : null;
        const aliveTarget = target && World.npcs.includes(target) ? target : null;
        let winner = null;
        let loser = null;

        if (aliveNpc && (!aliveTarget || aliveTarget.hp <= 0)) {
            winner = aliveNpc;
            loser = target;
        } else if (aliveTarget && (!aliveNpc || aliveNpc.hp <= 0)) {
            winner = aliveTarget;
            loser = npc;
        } else if (aliveNpc && aliveTarget) {
            const npcRatio = aliveNpc.maxHp > 0 ? aliveNpc.hp / aliveNpc.maxHp : 0;
            const targetRatio = aliveTarget.maxHp > 0 ? aliveTarget.hp / aliveTarget.maxHp : 0;
            if (npcRatio > targetRatio) {
                winner = aliveNpc;
                loser = aliveTarget;
            } else if (targetRatio > npcRatio) {
                winner = aliveTarget;
                loser = aliveNpc;
            }
        }

        if (winner && loser && loser.id !== undefined) {
            const satisfied = Personality.getModifier(winner, 'fightChance') > 0 && Personality.getModifier(winner, 'peaceMoodBonus') <= 0;
            const winnerType = satisfied ? 'won_fight_satisfied' : 'won_fight_guilty';
            const winnerText = satisfied
                ? winner.name + ' felt vindicated after beating ' + loser.name + ' in a fight.'
                : winner.name + ' felt guilty after beating ' + loser.name + ' in a fight.';
            Memory.add(winner, winnerType, Memory.PRIORITY.COMBAT, winnerText, [loser.id], true);
            if (World.npcs.includes(loser)) {
                Memory.add(loser, 'lost_fight', Memory.PRIORITY.COMBAT, loser.name + ' lost a fight with ' + winner.name + '.', [winner.id], true);
            }
            Relationship.change(winner, loser.id, -6);
            if (World.npcs.includes(loser)) Relationship.change(loser, winner.id, -10);
        }

        for (const participant of [aliveNpc, aliveTarget]) {
            if (!participant) continue;
            participant.state = this.STATE.IDLE;
            participant.walkPurpose = '';
            participant._fightTargetId = null;
            participant._fightUntil = 0;
            participant._fightId = 0;
            participant._conflictCooldownUntil = World.tick + CONFIG.CIVILIAN_CONFLICT_COOLDOWN;
        }
    },

    _handleCivilianFight(npc) {
        const target = World.npcs.find(n => n.id === npc._fightTargetId);
        if (!target || npc._fightUntil <= World.tick || Math.abs(Math.floor(npc.x) - Math.floor(target.x)) + Math.abs(Math.floor(npc.y) - Math.floor(target.y)) > 1) {
            this._resolveCivilianFight(npc, target);
            return;
        }

        npc._attackCooldown = (npc._attackCooldown || 0) - 1;
        if (npc._attackCooldown <= 0) {
            npc._attackCooldown = CONFIG.CIVILIAN_FIGHT_DAMAGE_COOLDOWN;
            const aggressionBonus = Personality.getModifier(npc, 'fightChance') > 0 ? 1 : 0;
            const damage = Math.max(1, npc.damage + aggressionBonus);
            this.damageNpc(target.id, damage, 'brawl');
        }
    },

    _pickTheftChoice(npc) {
        const granary = World.buildings.find(b => b.type === 'granary');
        const stockpile = World.buildings.find(b => b.type === 'stockpile');
        const foodTypes = ['apples', 'bread', 'cheese', 'meat'].filter(type => Resources.get(type) > 0);
        const stockpileTypes = ['ale', 'wood', 'stone', 'iron', 'pitch', 'hops', 'wheat', 'flour']
            .filter(type => Resources.get(type) > 0);

        const wantsFood = npc.hunger < CONFIG.HUNGER_EAT_THRESHOLD && foodTypes.length > 0 && granary;
        if (wantsFood) {
            return {
                building: granary,
                type: foodTypes[Math.floor(Math.random() * foodTypes.length)],
                amount: Math.min(CONFIG.THEFT_MAX_AMOUNT, Math.max(CONFIG.THEFT_MIN_AMOUNT, 1 + Math.floor(Math.random() * 2)))
            };
        }

        if (stockpile && stockpileTypes.length > 0) {
            return {
                building: stockpile,
                type: stockpileTypes[Math.floor(Math.random() * stockpileTypes.length)],
                amount: Math.min(CONFIG.THEFT_MAX_AMOUNT, Math.max(CONFIG.THEFT_MIN_AMOUNT, 1 + Math.floor(Math.random() * 3)))
            };
        }

        if (granary && foodTypes.length > 0) {
            return {
                building: granary,
                type: foodTypes[Math.floor(Math.random() * foodTypes.length)],
                amount: CONFIG.THEFT_MIN_AMOUNT
            };
        }

        return null;
    },

    _maybeStartTheft(npc) {
        if (World.tick % CONFIG.THEFT_CHECK_INTERVAL !== 0) return false;
        if ((npc.mood || 50) > 9) return false;
        if (Personality.getModifier(npc, 'theftChance') <= 0) return false;
        if (npc.state !== this.STATE.IDLE) return false;

        const chance = Utils.clamp(
            CONFIG.THEFT_BASE_CHANCE + Personality.getModifier(npc, 'theftChance') * 0.5,
            0.03,
            0.35
        );
        if (Math.random() >= chance) return false;

        const theft = this._pickTheftChoice(npc);
        if (!theft) return false;

        npc._theftTargetBuildingId = theft.building.id;
        npc._theftTargetType = theft.type;
        npc._theftAmount = theft.amount;
        npc._theftTimer = 0;
        npc.walkPurpose = 'sneaking to steal ' + theft.type;

        if (this._isAtBuilding(npc, theft.building)) {
            npc.state = this.STATE.STEALING;
            Animations.add(npc.x, npc.y, 'sweat', null, { npcId: npc.id });
            return true;
        }

        this._walkTo(npc, theft.building.x, theft.building.y, this.STATE.WALK_TO_STEAL, this.STATE.STEALING, { ownBuildingId: theft.building.id });
        return true;
    },

    _handleStealing(npc) {
        const building = World.buildings.find(b => b.id === npc._theftTargetBuildingId);
        if (!building || !npc._theftTargetType) {
            npc.state = this.STATE.IDLE;
            npc.walkPurpose = '';
            return;
        }

        npc._theftTimer = (npc._theftTimer || 0) + 1;
        if (npc._theftTimer < CONFIG.THEFT_DURATION_TICKS) return;

        const amount = Math.min(npc._theftAmount || 0, Resources.get(npc._theftTargetType));
        if (amount <= 0 || !Resources.remove(npc._theftTargetType, amount)) {
            npc.state = this.STATE.IDLE;
            npc.walkPurpose = '';
            npc._theftTimer = 0;
            return;
        }

        const isFood = STORAGE_TYPES.granary.includes(npc._theftTargetType);
        if (isFood) {
            npc.hunger = Math.min(CONFIG.HUNGER_MAX, npc.hunger + (this._getMealRestore() * amount));
        }

        EventLog.add('caution', npc.name + ' stole ' + amount + ' ' + npc._theftTargetType + '.', building.x, building.y);

        Memory.add(npc, 'stole_resource', Memory.PRIORITY.CRIME,
            npc.name + ' stole ' + amount + ' ' + npc._theftTargetType + ' from the ' + BUILDINGS[building.type].name + '.', [], true);

        const witnesses = this._getNearbyWitnesses(building.x, building.y, CONFIG.THEFT_WITNESS_RANGE, [npc.id]);
        if (witnesses.length > 0) {
            Memory.add(npc, 'caught_stealing', Memory.PRIORITY.CRIME,
                npc.name + ' was caught stealing ' + npc._theftTargetType + '.', witnesses.map(w => w.id), true);
            for (const witness of witnesses) {
                Memory.add(witness, 'theft_witnessed', Memory.PRIORITY.CRIME,
                    witness.name + ' saw ' + npc.name + ' stealing ' + npc._theftTargetType + '.', [npc.id], true);
                Relationship.change(witness, npc.id, -10);
                Relationship.change(npc, witness.id, -4);
            }
        }

        npc.state = this.STATE.IDLE;
        npc.walkPurpose = '';
        npc._theftTimer = 0;
        npc._theftTargetBuildingId = null;
        npc._theftTargetType = null;
        npc._theftAmount = 0;
    },

    _updateDesperationTracker(npc) {
        if ((npc.mood || 50) < 10) {
            if (npc._desperateSinceDay === null || npc._desperateSinceDay === undefined) {
                npc._desperateSinceDay = Time.day;
            }
        } else if ((npc.mood || 50) >= 20) {
            npc._desperateSinceDay = null;
        }
    },

    _shouldAttemptDesertion(npc) {
        if ((npc.mood || 50) >= 10) return false;
        if (npc._desperateSinceDay === null || npc._desperateSinceDay === undefined) return false;
        if ((Time.day - npc._desperateSinceDay) < CONFIG.DESERTION_MIN_DESPERATE_DAYS) return false;
        if (npc.state !== this.STATE.IDLE) return false;
        if (World.tick - (npc._lastDesertionCheckTick || 0) < CONFIG.DESERTION_CHECK_INTERVAL) return false;

        npc._lastDesertionCheckTick = World.tick;
        const chance = Utils.clamp(
            CONFIG.DESERTION_BASE_CHANCE + Personality.getModifier(npc, 'fleeChance') * 0.05,
            0.01,
            0.12
        );
        return Math.random() < chance;
    },

    _computeDesertionTarget(npc) {
        const nx = Math.floor(npc.x);
        const ny = Math.floor(npc.y);
        const edgeTargets = [
            { x: 1, y: ny },
            { x: World.width - 2, y: ny },
            { x: nx, y: 1 },
            { x: nx, y: World.height - 2 }
        ];
        let bestEdge = edgeTargets[0];
        let bestEdgeDist = Infinity;
        for (const target of edgeTargets) {
            const dist = Utils.manhattan(nx, ny, target.x, target.y);
            if (dist < bestEdgeDist) {
                bestEdgeDist = dist;
                bestEdge = target;
            }
        }

        if (!World.keepPos) return bestEdge;

        const dx = Math.sign(nx - (World.keepPos.x + 1)) || (Math.random() < 0.5 ? -1 : 1);
        const dy = Math.sign(ny - (World.keepPos.y + 1)) || (Math.random() < 0.5 ? -1 : 1);
        const farPoint = {
            x: Utils.clamp((World.keepPos.x + 1) + dx * CONFIG.DESERTION_DISTANCE_FROM_KEEP, 1, World.width - 2),
            y: Utils.clamp((World.keepPos.y + 1) + dy * CONFIG.DESERTION_DISTANCE_FROM_KEEP, 1, World.height - 2)
        };

        const farPointDist = Utils.manhattan(nx, ny, farPoint.x, farPoint.y);
        return farPointDist < bestEdgeDist ? farPoint : bestEdge;
    },

    _startDesertion(npc) {
        const target = this._computeDesertionTarget(npc);
        if (!target) return;

        if (npc.assignedBuilding) {
            const building = World.buildings.find(b => b.id === npc.assignedBuilding);
            if (building) {
                const workerIdx = building.workers.indexOf(npc.id);
                if (workerIdx !== -1) building.workers.splice(workerIdx, 1);
            }
            npc.assignedBuilding = null;
            npc.type = 'peasant';
            npc.fg = '#ffffff';
        }

        npc._desertTarget = target;
        npc._desertingSinceTick = World.tick;
        npc.state = this.STATE.DESERTING;
        npc.walkPurpose = 'deserting the settlement';
        Animations.add(npc.x, npc.y, 'exclaim', null, { npcId: npc.id });
        EventLog.add('warning', npc.name + ' is deserting the settlement.', npc.x, npc.y);

        Memory.add(npc, 'deserted_settlement', Memory.PRIORITY.UPHEAVAL, npc.name + ' decided to abandon the settlement.', [], true);
        Memory.addToWitnesses(npc.x, npc.y, 'saw_desertion', Memory.PRIORITY.UPHEAVAL,
            npc.name + ' is leaving the settlement.', [npc.id], [npc.id]);

        this._walkTo(npc, target.x, target.y, this.STATE.DESERTING, this.STATE.DESERTING);
    },

    _handleDeserting(npc) {
        if (!npc._desertTarget) {
            npc._desertTarget = this._computeDesertionTarget(npc);
            if (!npc._desertTarget) return;
            this._walkTo(npc, npc._desertTarget.x, npc._desertTarget.y, this.STATE.DESERTING, this.STATE.DESERTING);
        }

        if (npc.path && npc.path.length > 1) {
            this._walkAlongPath(npc);
        }

        const nx = Math.floor(npc.x);
        const ny = Math.floor(npc.y);
        const nearEdge = nx <= 1 || ny <= 1 || nx >= World.width - 2 || ny >= World.height - 2;
        const targetReached = npc._desertTarget && Utils.manhattan(nx, ny, npc._desertTarget.x, npc._desertTarget.y) <= 2;
        const farFromKeep = World.keepPos
            ? Utils.manhattan(nx, ny, World.keepPos.x + 1, World.keepPos.y + 1) >= CONFIG.DESERTION_DISTANCE_FROM_KEEP
            : false;

        if (nearEdge || targetReached || farFromKeep) {
            this._removeNpcFromWorld(npc);
        }
    },

    _idleBehavior(npc) {
        if (!npc.assignedBuilding) {
            // Idle peasant: wander near keep
            if (World.keepPos && Math.random() < 0.02) {
                const kx = World.keepPos.x + 1 + Math.floor(Math.random() * 5) - 2;
                const ky = World.keepPos.y + 1 + Math.floor(Math.random() * 5) - 2;
                if (World.isWalkable(kx, ky)) {
                    npc.walkPurpose = 'wandering near keep';
                    npc.path = Pathfinding.findPath(
                        Math.floor(npc.x), Math.floor(npc.y), kx, ky
                    );
                    if (npc.path && npc.path.length > 1) {
                        npc.pathIndex = 1;
                        npc.state = this.STATE.WALK_TO_WORK;
                        npc._arrivalState = this.STATE.IDLE;
                        npc.moveProgress = 0;
                        npc.walkFrom = { x: Math.floor(npc.x), y: Math.floor(npc.y) };
                        npc.walkTo = { x: kx, y: ky };
                    }
                }
            }
            return;
        }

        const building = World.buildings.find(b => b.id === npc.assignedBuilding);
        if (!building) {
            npc.assignedBuilding = null;
            return;
        }

        const def = BUILDINGS[building.type];
        npc.idleReason = ''; // Clear idle reason when starting work

        // Resource gatherer (woodcutter, quarry, iron mine, pitch rig)
        if (def.gathers) {
            this._startGathering(npc, building, def);
            return;
        }

        // Hunter building: track → shoot → carry carcass → butcher → deliver meat
        if (def.isHunter) {
            this._startHunterCycle(npc, building, def);
            return;
        }

        // Religious building (chapel, church, cathedral): priest patrols and blesses
        if (def.isReligious) {
            this._startPriestCycle(npc, building, def);
            return;
        }

        // Well building: firefighter cycle
        if (def.isWell) {
            this._startFirefighterCycle(npc, building, def);
            return;
        }

        // Apothecary building: healer cycle
        if (def.isApothecary) {
            this._startHealerCycle(npc, building, def);
            return;
        }

        // Forward storage building: hauler cycle (balance resources between main and forward)
        if (def.isForwardStorage) {
            this._startHaulerCycle(npc, building, def);
            return;
        }

        // Cookhouse building: custom dual-input cycle
        if (def.isCookhouse) {
            this._startCookhouseCycle(npc, building, def);
            return;
        }

        // Producer building (farm, orchard, dairy): walk to building and work
        if (def.produces && !def.consumes) {
            // Farms and herb gardens halt in winter
            if ((def.requiresFertile || def.isHerbGarden) && !Season.isFarmingSeason()) {
                npc.state = this.STATE.IDLE;
                npc.idleReason = 'winter – fields frozen';
                return;
            }
            this._startProducerCycle(npc, building, def);
            return;
        }

        // Processor building (windmill, bakery, fletcher, etc.): fetch input → process → deliver
        if (def.produces && def.consumes) {
            this._startProcessorCycle(npc, building, def);
            return;
        }

        // Consumer building (inn): fetch input → consume (no output)
        if (def.consumes && !def.produces) {
            this._startProcessorCycle(npc, building, def);
            return;
        }
    },

    // ── Producer worker cycle ──
    // Walk to building → produce → carry product to storage → return
    _startProducerCycle(npc, building, def) {
        const bx = building.x, by = building.y;
        const nx = Math.floor(npc.x), ny = Math.floor(npc.y);

        // Check if worker is at building
        if (this._isAtBuilding(npc, building)) {
            npc.state = this.STATE.WORKING;
            npc.walkPurpose = 'producing ' + def.produces;
            return;
        }

        // Walk to building
        npc.walkPurpose = 'walking to ' + def.name;
        this._walkTo(npc, bx, by, this.STATE.WALK_TO_WORK, this.STATE.WORKING, { ownBuildingId: building.id });
    },

    // ── Processor worker cycle ──
    // Fetch input from storage → carry to building → process → carry product to storage → return
    _startProcessorCycle(npc, building, def) {
        // If already carrying the input resource, go to building to process
        if (npc.carrying === def.consumes) {
            if (this._isAtBuilding(npc, building)) {
                npc.state = this.STATE.WORKING;
                npc.walkPurpose = def.produces
                    ? 'processing ' + def.consumes + ' into ' + def.produces
                    : 'serving ' + def.consumes;
                return;
            }
            npc.walkPurpose = 'carrying ' + def.consumes + ' to ' + def.name;
            this._walkTo(npc, building.x, building.y, this.STATE.RETURN_TO_WORK, this.STATE.WORKING, { ownBuildingId: building.id });
            return;
        }

        // Need to fetch input: check if any input is available (main + forward storages)
        if (Resources.getTotal(def.consumes) <= 0) {
            // No input available, wait at building
            if (!this._isAtBuilding(npc, building)) {
                npc.walkPurpose = 'walking to ' + def.name + ' (waiting for ' + def.consumes + ')';
                this._walkTo(npc, building.x, building.y, this.STATE.WALK_TO_WORK, this.STATE.IDLE, { ownBuildingId: building.id });
            }
            return;
        }

        // Walk to appropriate storage to pick up input
        const storage = this._findStorageFor(def.consumes, Math.floor(npc.x), Math.floor(npc.y));

        if (!storage) return;

        npc._pickupType = def.consumes;
        npc._pickupBuildingId = storage.buildingId;
        npc.walkPurpose = 'fetching ' + def.consumes + ' from storage';
        this._walkTo(npc, storage.x, storage.y, this.STATE.WALK_TO_PICKUP, this.STATE.PICKUP_RESOURCE);
    },

    // ── Cookhouse worker cycle ──
    // Pick 2 different raw ingredients → fetch first → fetch second → cook at building → deliver meals
    _startCookhouseCycle(npc, building, def) {
        // If carrying meals, deliver to granary
        if (npc.carrying && !COOKHOUSE_INPUTS.includes(npc.carrying)) {
            const storage = this._findStorageFor(npc.carrying, Math.floor(npc.x), Math.floor(npc.y));
            if (storage) {
                npc._depositBuildingId = storage.buildingId;
                npc.walkPurpose = 'delivering ' + npc.carrying + ' to granary';
                this._walkTo(npc, storage.x, storage.y, this.STATE.DELIVER_RESOURCE, this.STATE.DEPOSIT_RESOURCE);
            } else {
                npc.idleReason = 'no granary available';
                npc.state = this.STATE.IDLE;
            }
            return;
        }

        // If carrying second ingredient, go to cookhouse to work
        if (npc.carrying && npc._cookhouseIngredient1) {
            if (this._isAtBuilding(npc, building)) {
                npc.state = this.STATE.WORKING;
                npc.walkPurpose = 'cooking ' + npc._cookhouseIngredient1 + ' + ' + npc.carrying;
                return;
            }
            npc.walkPurpose = 'carrying ingredients to ' + def.name;
            this._walkTo(npc, building.x, building.y, this.STATE.RETURN_TO_WORK, this.STATE.WORKING, { ownBuildingId: building.id });
            return;
        }

        // If carrying first ingredient, need to fetch second
        if (npc.carrying && !npc._cookhouseIngredient1) {
            npc._cookhouseIngredient1 = npc.carrying;
            // Find a second different ingredient
            const secondIngredient = COOKHOUSE_INPUTS.find(r => r !== npc._cookhouseIngredient1 && Resources.getTotal(r) > 0);
            if (!secondIngredient) {
                // Only one ingredient type available — wait
                npc._cookhouseIngredient1 = null;
                npc.carrying = null;
                npc.carryAmount = 0;
                npc.idleReason = 'need 2 different ingredients';
                npc.state = this.STATE.IDLE;
                return;
            }
            const storage2 = this._findStorageFor(secondIngredient, Math.floor(npc.x), Math.floor(npc.y));
            if (!storage2) {
                npc._cookhouseIngredient1 = null;
                npc.carrying = null;
                npc.carryAmount = 0;
                npc.state = this.STATE.IDLE;
                return;
            }
            npc._pickupType = secondIngredient;
            npc._pickupBuildingId = storage2.buildingId;
            npc.walkPurpose = 'fetching ' + secondIngredient + ' from storage';
            this._walkTo(npc, storage2.x, storage2.y, this.STATE.WALK_TO_PICKUP, this.STATE.PICKUP_RESOURCE);
            return;
        }

        // Need to pick up first ingredient: find 2 available different types
        const available = COOKHOUSE_INPUTS.filter(r => Resources.getTotal(r) > 0);
        if (available.length < 2) {
            if (!this._isAtBuilding(npc, building)) {
                npc.walkPurpose = 'walking to ' + def.name + ' (waiting for ingredients)';
                this._walkTo(npc, building.x, building.y, this.STATE.WALK_TO_WORK, this.STATE.IDLE, { ownBuildingId: building.id });
            } else {
                npc.idleReason = 'need 2 different ingredients';
            }
            return;
        }

        // Pick first ingredient (random from available)
        const first = available[Math.floor(Math.random() * available.length)];
        const storage = this._findStorageFor(first, Math.floor(npc.x), Math.floor(npc.y));
        if (!storage) return;

        npc._cookhouseIngredient1 = null;
        npc._pickupType = first;
        npc._pickupBuildingId = storage.buildingId;
        npc.walkPurpose = 'fetching ' + first + ' from storage';
        this._walkTo(npc, storage.x, storage.y, this.STATE.WALK_TO_PICKUP, this.STATE.PICKUP_RESOURCE);
    },

    // ── Hauler worker cycle (Forward Stockpile / Forward Granary) ──
    // Haul goods from main storage to forward storage and vice versa to balance supply
    _startHaulerCycle(npc, building, def) {
        const nx = Math.floor(npc.x), ny = Math.floor(npc.y);

        // If already carrying something, deliver it
        if (npc.carrying) {
            if (npc._haulerDeliverTo === 'forward') {
                // Deliver to forward storage building
                if (this._isAtBuilding(npc, building)) {
                    Resources.addToBuilding(building.id, npc.carrying, npc.carryAmount || 1);
                    npc.carrying = null;
                    npc.carryAmount = 0;
                    npc.walkPurpose = '';
                    // Check for return cargo to take to main
                    if (this._haulerFindReturnCargo(npc, building, def)) {
                        return;
                    }
                    npc.state = this.STATE.IDLE;
                    return;
                }
                npc.walkPurpose = 'hauling ' + npc.carrying + ' to ' + def.name;
                this._walkTo(npc, building.x, building.y, this.STATE.WALK_TO_WORK, this.STATE.WORKING, { ownBuildingId: building.id });
                return;
            } else {
                // Deliver to main storage
                const mainStorage = def.forwardOf === 'granary'
                    ? Resources.findNearestGranary(nx, ny)
                    : Resources.findNearestStockpile(nx, ny);
                if (mainStorage) {
                    // Filter: find a MAIN storage (not forward)
                    const mainBuildings = World.getBuildingsOfType(def.forwardOf);
                    const mainTile = this._findNearestBuildingTileFrom(mainBuildings, nx, ny);
                    if (mainTile) {
                        npc._depositBuildingId = mainTile.buildingId;
                        npc.walkPurpose = 'hauling ' + npc.carrying + ' to main ' + def.forwardOf;
                        this._walkTo(npc, mainTile.x, mainTile.y, this.STATE.DELIVER_RESOURCE, this.STATE.DEPOSIT_RESOURCE);
                        return;
                    }
                }
                // No main storage found — just drop at building
                Resources.addToBuilding(building.id, npc.carrying, npc.carryAmount || 1);
                npc.carrying = null;
                npc.carryAmount = 0;
                // Check for return cargo
                if (this._haulerFindReturnCargo(npc, building, def)) {
                    return;
                }
                npc.state = this.STATE.IDLE;
                return;
            }
        }

        if (!building.storage) building.storage = {};

        if (def.forwardOf === 'granary') {
            // Forward Granary: haul food from main to forward
            const foodTypes = ['apples', 'bread', 'cheese', 'meat'];
            // Check what's low in the forward storage
            for (const food of foodTypes) {
                const mainAmt = Resources.get(food);
                const fwdAmt = building.storage[food] || 0;
                // Haul from main to forward if main has surplus and forward is low
                if (mainAmt > 5 && fwdAmt < 10) {
                    const haulerAmount = Math.min(CONFIG.HAULER_CARRY_CAPACITY, mainAmt - 5, 10 - fwdAmt);
                    npc._haulerDeliverTo = 'forward';
                    npc._pickupType = food;
                    npc.carrying = null;
                    npc.carryAmount = haulerAmount;
                    // Find main granary to pick up from
                    const mainGranaries = World.getBuildingsOfType('granary');
                    const mainTile = this._findNearestBuildingTileFrom(mainGranaries, nx, ny);
                    if (mainTile) {
                        npc._pickupBuildingId = mainTile.buildingId;
                        npc.walkPurpose = 'fetching ' + haulerAmount + ' ' + food + ' from main granary';
                        this._walkTo(npc, mainTile.x, mainTile.y, this.STATE.WALK_TO_PICKUP, this.STATE.PICKUP_RESOURCE);
                        return;
                    }
                }
                // Haul from forward to main if forward has surplus and main is low
                if (fwdAmt > 15 && mainAmt < 5) {
                    const haulerAmount = Math.min(CONFIG.HAULER_CARRY_CAPACITY, fwdAmt - 15);
                    npc._haulerDeliverTo = 'main';
                    if (Resources.removeFromBuilding(building.id, food, haulerAmount)) {
                        npc.carrying = food;
                        npc.carryAmount = haulerAmount;
                        const mainGranaries = World.getBuildingsOfType('granary');
                        const mainTile = this._findNearestBuildingTileFrom(mainGranaries, nx, ny);
                        if (mainTile) {
                            npc._depositBuildingId = mainTile.buildingId;
                            npc.walkPurpose = 'hauling ' + haulerAmount + ' ' + food + ' to main granary';
                            this._walkTo(npc, mainTile.x, mainTile.y, this.STATE.DELIVER_RESOURCE, this.STATE.DEPOSIT_RESOURCE);
                            return;
                        }
                    }
                }
            }
        } else {
            // Forward Stockpile: haul key resources from main to forward
            const keyResources = ['wood', 'stone', 'iron', 'pitch'];
            for (const res of keyResources) {
                const mainAmt = Resources.get(res);
                const fwdAmt = building.storage[res] || 0;
                // Haul from main to forward if main has surplus and forward is low
                if (mainAmt > 10 && fwdAmt < 15) {
                    const haulerAmount = Math.min(CONFIG.HAULER_CARRY_CAPACITY, mainAmt - 10, 15 - fwdAmt);
                    npc._haulerDeliverTo = 'forward';
                    npc._pickupType = res;
                    npc.carrying = null;
                    npc.carryAmount = haulerAmount;
                    const mainStockpiles = World.getBuildingsOfType('stockpile');
                    const mainTile = this._findNearestBuildingTileFrom(mainStockpiles, nx, ny);
                    if (mainTile) {
                        npc._pickupBuildingId = mainTile.buildingId;
                        npc.walkPurpose = 'fetching ' + haulerAmount + ' ' + res + ' from main stockpile';
                        this._walkTo(npc, mainTile.x, mainTile.y, this.STATE.WALK_TO_PICKUP, this.STATE.PICKUP_RESOURCE);
                        return;
                    }
                }
                // Haul from forward to main if forward has surplus
                if (fwdAmt > 25 && mainAmt < 10) {
                    const haulerAmount = Math.min(CONFIG.HAULER_CARRY_CAPACITY, fwdAmt - 25);
                    npc._haulerDeliverTo = 'main';
                    if (Resources.removeFromBuilding(building.id, res, haulerAmount)) {
                        npc.carrying = res;
                        npc.carryAmount = haulerAmount;
                        const mainStockpiles = World.getBuildingsOfType('stockpile');
                        const mainTile = this._findNearestBuildingTileFrom(mainStockpiles, nx, ny);
                        if (mainTile) {
                            npc._depositBuildingId = mainTile.buildingId;
                            npc.walkPurpose = 'hauling ' + haulerAmount + ' ' + res + ' to main stockpile';
                            this._walkTo(npc, mainTile.x, mainTile.y, this.STATE.DELIVER_RESOURCE, this.STATE.DEPOSIT_RESOURCE);
                            return;
                        }
                    }
                }
            }
        }

        // Nothing to haul — idle at building
        if (!this._isAtBuilding(npc, building)) {
            npc.walkPurpose = 'returning to ' + def.name;
            this._walkTo(npc, building.x, building.y, this.STATE.WALK_TO_WORK, this.STATE.IDLE, { ownBuildingId: building.id });
        } else {
            npc.idleReason = 'forward storage balanced';
        }
    },

    // Hauler return-trip: after depositing at a storage, pick up cargo for the return journey
    // building = the forward storage building (npc.assignedBuilding)
    // Returns true if return cargo was found and hauler is now walking with it
    _haulerFindReturnCargo(npc, building, def) {
        if (!building.storage) building.storage = {};
        const nx = Math.floor(npc.x), ny = Math.floor(npc.y);
        const resourceList = def.forwardOf === 'granary'
            ? ['apples', 'bread', 'cheese', 'meat']
            : ['wood', 'stone', 'iron', 'pitch'];

        const isGranary = def.forwardOf === 'granary';
        const mainSurplusThreshold = isGranary ? 5 : 10;
        const fwdNeedThreshold = isGranary ? 10 : 15;
        const fwdSurplusThreshold = isGranary ? 15 : 25;
        const mainNeedThreshold = isGranary ? 5 : 10;

        const isAtForward = this._isAtBuilding(npc, building);

        if (isAtForward) {
            // At forward building → check for forward→main cargo
            for (const res of resourceList) {
                const fwdAmt = building.storage[res] || 0;
                const mainAmt = Resources.get(res);
                if (fwdAmt > fwdSurplusThreshold && mainAmt < mainNeedThreshold) {
                    const haulerAmount = Math.min(CONFIG.HAULER_CARRY_CAPACITY, fwdAmt - fwdSurplusThreshold);
                    if (haulerAmount > 0 && Resources.removeFromBuilding(building.id, res, haulerAmount)) {
                        npc.carrying = res;
                        npc.carryAmount = haulerAmount;
                        npc._haulerDeliverTo = 'main';
                        const mainBuildings = World.getBuildingsOfType(def.forwardOf);
                        const mainTile = this._findNearestBuildingTileFrom(mainBuildings, nx, ny);
                        if (mainTile) {
                            npc._depositBuildingId = mainTile.buildingId;
                            npc.walkPurpose = 'hauling ' + haulerAmount + ' ' + res + ' to main ' + def.forwardOf;
                            this._walkTo(npc, mainTile.x, mainTile.y, this.STATE.DELIVER_RESOURCE, this.STATE.DEPOSIT_RESOURCE);
                            return true;
                        }
                        // No main storage found — put resources back
                        Resources.addToBuilding(building.id, res, haulerAmount);
                        npc.carrying = null;
                        npc.carryAmount = 0;
                    }
                }
            }
        } else {
            // At main storage → check for main→forward cargo
            for (const res of resourceList) {
                const mainAmt = Resources.get(res);
                const fwdAmt = building.storage[res] || 0;
                if (mainAmt > mainSurplusThreshold && fwdAmt < fwdNeedThreshold) {
                    const haulerAmount = Math.min(CONFIG.HAULER_CARRY_CAPACITY, mainAmt - mainSurplusThreshold, fwdNeedThreshold - fwdAmt);
                    if (haulerAmount > 0 && Resources.remove(res, haulerAmount)) {
                        npc.carrying = res;
                        npc.carryAmount = haulerAmount;
                        npc._haulerDeliverTo = 'forward';
                        npc.walkPurpose = 'hauling ' + haulerAmount + ' ' + res + ' to ' + def.name;
                        this._walkTo(npc, building.x, building.y, this.STATE.WALK_TO_WORK, this.STATE.WORKING, { ownBuildingId: building.id });
                        return true;
                    }
                }
            }
        }
        return false;
    },

    // Helper: find nearest walkable tile near main buildings (not forward)
    _findNearestBuildingTileFrom(buildings, fromX, fromY) {
        if (buildings.length === 0) return null;
        let best = null, bestDist = Infinity;
        for (const b of buildings) {
            const bDef = BUILDINGS[b.type];
            for (let dy = -1; dy <= bDef.height; dy++) {
                for (let dx = -1; dx <= bDef.width; dx++) {
                    const tx = b.x + dx;
                    const ty = b.y + dy;
                    if (World.isWalkable(tx, ty)) {
                        const d = Utils.manhattan(fromX, fromY, tx, ty);
                        if (d < bestDist) {
                            bestDist = d;
                            best = { x: tx, y: ty, buildingId: b.id };
                        }
                    }
                }
            }
        }
        return best;
    },

    // ── Priest worker cycle ──
    // Walk to random patrol point near building → bless nearby NPCs → return → repeat
    _startPriestCycle(npc, building, def) {
        const bx = building.x, by = building.y;
        const radius = def.blessingRadius || 10;

        // Pick a random walkable tile within blessing radius
        let attempts = 15;
        while (attempts-- > 0) {
            const dx = Math.floor(Math.random() * (radius * 2 + 1)) - radius;
            const dy = Math.floor(Math.random() * (radius * 2 + 1)) - radius;
            const tx = bx + dx, ty = by + dy;
            if (tx >= 0 && ty >= 0 && tx < World.width && ty < World.height && World.isWalkable(tx, ty)) {
                npc.walkPurpose = 'blessing the people';
                npc._blessTimer = 0;
                this._walkTo(npc, tx, ty, this.STATE.WALK_TO_WORK, this.STATE.WORKING);
                return;
            }
        }
        // Fallback: stay at building
        if (!this._isAtBuilding(npc, building)) {
            npc.walkPurpose = 'returning to ' + def.name;
            this._walkTo(npc, bx, by, this.STATE.WALK_TO_WORK, this.STATE.WORKING, { ownBuildingId: building.id });
        }
    },

    // ── Well worker (firefighter) cycle ──
    // Idle at well → fire detected → walk to well → fill bucket → walk to fire → extinguish → repeat
    _startFirefighterCycle(npc, building, def) {
        const nx = Math.floor(npc.x), ny = Math.floor(npc.y);

        // Check if there are any extinguishable fires
        const fire = Fire.findNearestFire(nx, ny, true); // exclude pitch ditch fires
        const burningNpc = Fire.findNearestBurningNpc(nx, ny);
        if (!fire && !burningNpc) {
            // No fires and no burning NPCs — idle at well
            if (!this._isAtBuilding(npc, building)) {
                npc.walkPurpose = 'returning to well';
                this._walkTo(npc, building.x, building.y, this.STATE.WALK_TO_WORK, this.STATE.IDLE, { ownBuildingId: building.id });
            }
            npc.idleReason = 'no fires to fight';
            return;
        }

        // Determine closest target: tile fire or burning NPC
        const fireDist = fire ? Utils.manhattan(nx, ny, fire.x, fire.y) : Infinity;
        const npcDist = burningNpc ? Utils.manhattan(nx, ny, Math.floor(burningNpc.x), Math.floor(burningNpc.y)) : Infinity;

        // If already carrying water, go to the nearest target
        if (npc._hasWater) {
            if (burningNpc && npcDist <= fireDist) {
                // Prioritize burning NPC if closer
                npc.walkPurpose = 'heading to burning villager';
                npc._fireTargetNpc = burningNpc.id;
                npc._fireTargetX = Math.floor(burningNpc.x);
                npc._fireTargetY = Math.floor(burningNpc.y);
            } else if (fire) {
                npc.walkPurpose = 'heading to fire';
                npc._fireTargetNpc = null;
                npc._fireTargetX = fire.x;
                npc._fireTargetY = fire.y;
            }
            this._walkTo(npc, npc._fireTargetX, npc._fireTargetY, this.STATE.FIRE_WALK_TO_FIRE, this.STATE.FIRE_EXTINGUISH);
            return;
        }

        // Need to fill bucket at well first
        if (this._isAtBuilding(npc, building)) {
            // Already at well — start filling
            npc.state = this.STATE.FIRE_FILL_BUCKET;
            npc.walkPurpose = 'filling water bucket';
            npc._fillTimer = 0;
        } else {
            // Walk to well
            npc.walkPurpose = 'walking to well for water';
            this._walkTo(npc, building.x, building.y, this.STATE.FIRE_WALK_TO_WELL, this.STATE.FIRE_FILL_BUCKET, { ownBuildingId: building.id });
        }
    },

    _fireFillBucket(npc) {
        npc._fillTimer = (npc._fillTimer || 0) + 1;
        if (npc._fillTimer >= 4) {
            npc._fillTimer = 0;
            npc._hasWater = true;
            // Now find a fire to extinguish
            npc.state = this.STATE.IDLE;
        }
    },

    _fireExtinguish(npc) {
        const fx = npc._fireTargetX;
        const fy = npc._fireTargetY;

        // Check if targeting a burning NPC
        if (npc._fireTargetNpc) {
            const target = World.npcs.find(n => n.id === npc._fireTargetNpc);
            if (!target || !target.onFire) {
                // NPC already extinguished or dead
                npc._hasWater = false;
                npc._fireTargetNpc = null;
                npc.state = this.STATE.IDLE;
                return;
            }
            npc.walkPurpose = 'extinguishing burning villager';
            npc._extinguishTimer = (npc._extinguishTimer || 0) + 1;
            if (npc._extinguishTimer >= 3) {
                npc._extinguishTimer = 0;
                Fire.extinguishNpc(target);
                npc._hasWater = false;
                npc._fireTargetNpc = null;
                npc.state = this.STATE.IDLE;
            }
            return;
        }

        // Check if the fire is still burning at the target
        if (!Fire.isOnFire(fx, fy)) {
            // Fire already out — go find another or return
            npc._hasWater = false;
            npc.state = this.STATE.IDLE;
            return;
        }

        npc.walkPurpose = 'extinguishing fire';
        npc._extinguishTimer = (npc._extinguishTimer || 0) + 1;
        if (npc._extinguishTimer >= 3) {
            npc._extinguishTimer = 0;
            Fire.extinguish(fx, fy);
            npc._hasWater = false;
            // Go back to idle to refill and find next fire
            npc.state = this.STATE.IDLE;
        }
    },

    // ── Apothecary Healer Cycle ──

    _startHealerCycle(npc, building, def) {
        const nx = Math.floor(npc.x), ny = Math.floor(npc.y);

        // Apothecary workers are immune to disease
        if (npc.diseased) {
            npc.diseased = false;
            npc._diseaseRecovery = 0;
            npc._diseaseStartTick = undefined;
        }

        // Check for diseased NPCs to heal directly
        let nearestSick = null;
        let sickDist = Infinity;
        for (const other of World.npcs) {
            if (other === npc || !other.diseased || other.isBandit) continue;
            const dist = Utils.manhattan(nx, ny, Math.floor(other.x), Math.floor(other.y));
            if (dist < sickDist) {
                sickDist = dist;
                nearestSick = other;
            }
        }

        // Check if there are any disease clouds to heal
        const cloud = Events.findNearestDisease(nx, ny);
        const cloudDist = cloud ? Utils.manhattan(nx, ny, cloud.x, cloud.y) : Infinity;

        if (!cloud && !nearestSick) {
            // No disease — idle at apothecary
            if (!this._isAtBuilding(npc, building)) {
                npc.walkPurpose = 'returning to apothecary';
                this._walkTo(npc, building.x, building.y, this.STATE.WALK_TO_WORK, this.STATE.IDLE, { ownBuildingId: building.id });
            }
            npc.idleReason = 'no disease to heal';
            return;
        }

        // Prioritize sick NPCs if closer than disease cloud
        if (nearestSick && sickDist <= cloudDist) {
            npc.walkPurpose = 'heading to sick villager';
            npc._healTargetNpc = nearestSick.id;
            this._walkTo(npc, Math.floor(nearestSick.x), Math.floor(nearestSick.y), this.STATE.DISEASE_WALK_TO_CLOUD, this.STATE.DISEASE_HEAL);
            return;
        }

        // Walk to disease cloud
        npc.walkPurpose = 'heading to disease cloud';
        npc._healTargetNpc = null;
        npc._diseaseTargetX = cloud.x;
        npc._diseaseTargetY = cloud.y;
        this._walkTo(npc, cloud.x, cloud.y, this.STATE.DISEASE_WALK_TO_CLOUD, this.STATE.DISEASE_HEAL);
    },

    _diseaseHeal(npc) {
        // Check if healing a specific NPC
        if (npc._healTargetNpc) {
            const target = World.npcs.find(n => n.id === npc._healTargetNpc);
            if (!target || !target.diseased) {
                npc._healTargetNpc = null;
                npc.state = this.STATE.IDLE;
                return;
            }
            npc.walkPurpose = 'curing sick villager';
            npc._healTimer = (npc._healTimer || 0) + 1;
            if (npc._healTimer >= CONFIG.DISEASE_HEAL_TICKS) {
                npc._healTimer = 0;
                target.diseased = false;
                target._diseaseRecovery = 0;
                target._diseaseStartTick = undefined;
                npc._healTargetNpc = null;
                npc.state = this.STATE.IDLE;
            }
            return;
        }

        const dx = npc._diseaseTargetX;
        const dy = npc._diseaseTargetY;

        // Check if disease cloud still exists at target
        if (!Events.isDiseased(dx, dy)) {
            // Already gone — find another
            npc.state = this.STATE.IDLE;
            return;
        }

        npc.walkPurpose = 'removing disease cloud';
        npc._healTimer = (npc._healTimer || 0) + 1;
        if (npc._healTimer >= CONFIG.DISEASE_HEAL_TICKS) {
            npc._healTimer = 0;
            Events.removeDiseaseCloud(dx, dy);
            // Go back to idle to find next disease cloud
            npc.state = this.STATE.IDLE;
        }
    },

    // Building-type to tool animation chars/color mapping
    _WORK_TOOLS: {
        woodcutter:  { chars: ['/', '\\', '/'], color: '#aa8855' },  // axe
        quarry:      { chars: ['T', '|', 'T'], color: '#999999' },   // pickaxe
        iron_mine:   { chars: ['T', '|', 'T'], color: '#aaaacc' },   // pickaxe
        pitch_rig:   { chars: ['|', '/', '|'], color: '#665533' },   // drilling
        farm:        { chars: ['J', '/', 'J'], color: '#88aa44' },   // sickle
        wheat_farm:  { chars: ['J', '/', 'J'], color: '#ccaa33' },   // sickle
        hops_farm:   { chars: ['J', '/', 'J'], color: '#66aa44' },   // sickle
        orchard:     { chars: ['(', ')', '('], color: '#66aa66' },   // picking
        windmill:    { chars: ['%', 'o', '%'], color: '#ccbb88' },   // grinding
        bakery:      { chars: ['~', 'o', '~'], color: '#cc9944' },   // kneading
        dairy:       { chars: ['u', 'U', 'u'], color: '#ccccaa' },   // churning
        brewery:     { chars: ['u', 'U', 'u'], color: '#aa8833' },   // brewing
        blacksmith:  { chars: ['T', '*', 'T'], color: '#ff8844' },   // hammer
        fletcher:    { chars: ['-', '>', '-'], color: '#aa9966' },   // arrow crafting
        poleturner:  { chars: ['|', '/', '|'], color: '#aa8855' },   // lathe
        armorer:     { chars: ['T', 'O', 'T'], color: '#8888aa' },   // forging
        inn:         { chars: ['u', 'U', 'u'], color: '#ccaa55' },   // serving
        hunter:      { chars: ['-', '>', '-'], color: '#aa7744' },   // bow
        apothecary:  { chars: ['o', '+', 'o'], color: '#44cc88' },   // mixing
        herbGarden:  { chars: ['J', '/', 'J'], color: '#55aa55' },   // gardening
        cookhouse:   { chars: ['~', 'o', '~'], color: '#cc8844' },   // cooking
        smokehouse:  { chars: ['~', '~', '~'], color: '#aa7744' },   // smoking
    },

    // Worker is in WORKING state at a building — handle production ticks
    _workingAtBuilding(npc) {
        if (!npc.assignedBuilding) {
            npc.idleReason = 'no assigned building';
            npc.state = this.STATE.IDLE;
            return;
        }

        const building = World.buildings.find(b => b.id === npc.assignedBuilding);
        if (!building || !building.active) {
            npc.idleReason = 'building inactive';
            npc.state = this.STATE.IDLE;
            return;
        }

        const def = BUILDINGS[building.type];

        // Forward storage: hauler delivering to building → deposit and check return cargo
        if (def.isForwardStorage && npc.carrying && npc._haulerDeliverTo === 'forward') {
            Resources.addToBuilding(building.id, npc.carrying, npc.carryAmount || 1);
            npc.carrying = null;
            npc.carryAmount = 0;
            npc._haulerDeliverTo = null;
            npc.walkPurpose = '';
            // Check for return cargo to take to main instead of walking back empty
            if (this._haulerFindReturnCargo(npc, building, def)) {
                return;
            }
            npc.state = this.STATE.IDLE;
            return;
        }

        // Periodic tool animation while working
        if (World.tick % 8 === 0) {
            const toolDef = this._WORK_TOOLS[building.type];
            if (toolDef) {
                Animations.add(npc.x, npc.y, 'tool', 4, { npcId: npc.id, chars: toolDef.chars, color: toolDef.color });
            }
        }

        // Gatherer processing at hut (e.g., woodcutter processing logs into wood)
        if (def.gathers && def.processTicks && npc.carrying === def.gathers) {
            npc.walkPurpose = 'processing ' + npc.carrying + ' at ' + def.name;
            building.production = (building.production || 0) + World.fearEfficiency * this._getFatigueEfficiency(npc);

            if (building.production >= def.processTicks) {
                building.production = 0;

                // Deliver processed resource to stockpile
                const storage = this._findStorageFor(npc.carrying, Math.floor(npc.x), Math.floor(npc.y));
                if (storage) {
                    npc._depositBuildingId = storage.buildingId;
                    npc.walkPurpose = 'delivering ' + npc.carrying + ' to stockpile';
                    this._walkTo(npc, storage.x, storage.y,
                        this.STATE.DELIVER_RESOURCE, this.STATE.DEPOSIT_RESOURCE);
                } else {
                    npc.state = this.STATE.IDLE;
                }
            }
            return;
        }

        // Religious building: priest blesses nearby civilian NPCs
        if (def.isReligious) {
            npc.walkPurpose = 'blessing the people';
            npc._blessTimer = (npc._blessTimer || 0) + 1;

            // Music animation while blessing
            if (npc._blessTimer === 1) {
                Animations.add(npc.x, npc.y, 'music', 8, { npcId: npc.id });
            }

            // Bless nearby civilian NPCs within 3 tiles
            const nx = Math.floor(npc.x), ny = Math.floor(npc.y);
            for (const n of World.npcs) {
                if (n === npc) continue;
                if (n.type !== 'peasant') continue;
                const dist = Utils.manhattan(Math.floor(n.x), Math.floor(n.y), nx, ny);
                if (dist <= 3) {
                    const wasBlessed = n.blessedUntil && n.blessedUntil > World.tick;
                    n.blessedUntil = World.tick + 200;
                    // Add blessing memory only when newly blessed (not re-blessed)
                    if (!wasBlessed) {
                        Memory.add(n, 'blessed', Memory.PRIORITY.SOCIAL,
                            n.name + ' was blessed by ' + npc.name + '.',
                            [npc.id], true);
                        Memory.addToWitnesses(nx, ny, 'blessed', Memory.PRIORITY.SOCIAL,
                            n.name + ' was blessed by ' + npc.name + '.',
                            [n.id, npc.id], [n.id]);
                    }
                }
            }

            // After 8 ticks of blessing at patrol point, go patrol again
            if (npc._blessTimer >= 8) {
                npc._blessTimer = 0;
                npc.state = this.STATE.IDLE;
            }
            return;
        }

        // Cookhouse: combine 2 ingredients into prepared meals
        if (def.isCookhouse) {
            if (!npc.carrying || !npc._cookhouseIngredient1) {
                npc.idleReason = 'need ingredients';
                npc._cookhouseIngredient1 = null;
                npc.carrying = null;
                npc.carryAmount = 0;
                npc.state = this.STATE.IDLE;
                return;
            }
            npc.walkPurpose = 'cooking ' + npc._cookhouseIngredient1 + ' + ' + npc.carrying;
            building.production = (building.production || 0) + World.fearEfficiency * this._getFatigueEfficiency(npc);
            if (building.production >= def.produceTicks) {
                building.production = 0;
                const key = [npc._cookhouseIngredient1, npc.carrying].sort().join(',');
                const meal = COOKHOUSE_RECIPES[key] || 'meatStew';
                npc.carrying = meal;
                npc.carryAmount = def.produceAmount || 4;
                npc._cookhouseIngredient1 = null;
                Animations.add(npc.x, npc.y, 'sparkle', null, { npcId: npc.id });
                const storage = this._findStorageFor(meal, Math.floor(npc.x), Math.floor(npc.y));
                if (storage) {
                    npc._depositBuildingId = storage.buildingId;
                    npc.walkPurpose = 'delivering ' + meal + ' to granary';
                    this._walkTo(npc, storage.x, storage.y, this.STATE.DELIVER_RESOURCE, this.STATE.DEPOSIT_RESOURCE);
                } else {
                    npc.idleReason = 'no storage available';
                    npc.state = this.STATE.IDLE;
                }
            }
            return;
        }

        if (!def.produces) {
            // Inn: serve ale to nearby visitors, then fetch more
            if (def.isInn && def.consumes && npc.carrying === def.consumes) {
                // Find a non-worker NPC visitor near the inn
                const innX = Math.floor(building.x), innY = Math.floor(building.y);
                const customer = World.npcs.find(n => {
                    if (n === npc || n.isBandit) return false;
                    if (n.assignedBuilding === building.id) return false;
                    if (n.type in TROOPS) return false;
                    const dist = Math.abs(Math.floor(n.x) - innX) + Math.abs(Math.floor(n.y) - innY);
                    return dist <= 3;
                });

                if (customer) {
                    npc.walkPurpose = 'serving ale to ' + (customer.name || 'visitor');
                    building.production = (building.production || 0) + 1;
                    if (building.production >= def.consumeTicks) {
                        building.production = 0;
                        npc.carrying = null;
                        npc.carryAmount = 0;
                        building.aleServed = (building.aleServed || 0) + 1;
                        // Customer benefits: mood bonus + memory
                        customer.mood = Math.min(CONFIG.MOOD_MAX, (customer.mood || CONFIG.MOOD_DEFAULT) + 3);
                        Memory.add(customer, 'drank_ale', Memory.PRIORITY.SOCIAL, customer.name + ' enjoyed ale at the inn.', [npc.id]);
                        Animations.add(customer.x, customer.y, 'music', 8, { npcId: customer.id });
                        // Go fetch more ale
                        npc.idleReason = 'fetching ale';
                        npc.state = this.STATE.IDLE;
                    }
                } else {
                    npc.walkPurpose = 'waiting for customers';
                }
                return;
            }
            // Not a producing building, just stay
            return;
        }

        // Processor: must have input resource to start working
        if (def.consumes && npc.carrying !== def.consumes) {
            // Need to go fetch input
            npc.idleReason = 'fetching ' + def.consumes;
            npc.state = this.STATE.IDLE;
            return;
        }

        // Tick production (scaled by fear factor and fatigue efficiency)
        building.production = (building.production || 0) + World.fearEfficiency * this._getFatigueEfficiency(npc);

        if (building.production >= def.produceTicks) {
            building.production = 0;

            // For processors, consume the carried input
            if (def.consumes) {
                npc.carrying = null;
                npc.carryAmount = 0;
            }

            // Worker picks up the product
            npc.carrying = def.produces;
            npc.carryAmount = def.produceAmount || 1;

            // Production sparkle animation
            Animations.add(npc.x, npc.y, 'sparkle', null, { npcId: npc.id });

            // Determine storage destination
            const storage = this._findStorageFor(def.produces, Math.floor(npc.x), Math.floor(npc.y));

            if (storage) {
                npc._depositBuildingId = storage.buildingId;
                npc.walkPurpose = 'delivering ' + def.produces + ' to storage';
                this._walkTo(npc, storage.x, storage.y, this.STATE.DELIVER_RESOURCE, this.STATE.DEPOSIT_RESOURCE);
            } else {
                npc.idleReason = 'no storage available';
                npc.state = this.STATE.IDLE;
            }
        }
    },

    // ── Hunter worker cycle ──
    // Find deer → walk to shooting range → shoot → walk to carcass → carry to post → butcher → deliver meat

    _startHunterCycle(npc, building, def) {
        const nx = Math.floor(npc.x), ny = Math.floor(npc.y);

        // If carrying meat, deliver to granary
        if (npc.carrying === 'meat') {
            this._releaseAnimalReservation(npc);
            const storage = this._findStorageFor('meat', nx, ny);
            if (storage) {
                npc._depositBuildingId = storage.buildingId;
                npc.walkPurpose = 'delivering meat to granary';
                this._walkTo(npc, storage.x, storage.y, this.STATE.HUNT_DELIVER_MEAT, this.STATE.DEPOSIT_RESOURCE);
            } else {
                npc.idleReason = 'no granary available';
            }
            return;
        }

        // If carrying carcass, go to building to butcher
        if (npc.carrying === 'carcass') {
            this._releaseAnimalReservation(npc);
            if (this._isAtBuilding(npc, building)) {
                npc.state = this.STATE.HUNT_BUTCHER;
                npc.workTimer = 0;
                npc.walkPurpose = 'butchering carcass';
                return;
            }
            npc.walkPurpose = 'carrying carcass to ' + def.name;
            this._walkTo(npc, building.x, building.y, this.STATE.HUNT_CARRY_CARCASS, this.STATE.HUNT_BUTCHER, { ownBuildingId: building.id });
            npc.workTimer = 0;
            return;
        }

        // Check for existing carcasses to pick up
        const carcass = Animal.findNearestCarcass(nx, ny);
        if (carcass) {
            this._releaseAnimalReservation(npc);
            npc._huntTarget = null;
            npc._carcassTarget = carcass.id;
            npc.walkPurpose = 'walking to carcass';
            this._walkTo(npc, carcass.x, carcass.y, this.STATE.HUNT_WALK_TO_CARCASS, this.STATE.HUNT_PICKUP_CARCASS);
            return;
        }

        // Find a passive animal to hunt
        const prey = Animal.findNearestAnimal(def.hunts || 'any_passive', nx, ny, a => {
            return !this._isAnimalReservedByOther(a.id, npc.id);
        });
        if (!prey) {
            this._releaseAnimalReservation(npc);
            npc.idleReason = 'no game to hunt';
            return;
        }

        npc._huntTarget = prey.id;
        this._reserveAnimal(npc, prey.id);
        const preyName = (Animal.TYPES[prey.type] && Animal.TYPES[prey.type].name) || prey.type;
        npc.walkPurpose = 'tracking ' + preyName;
        // Walk toward the deer (will re-evaluate when close enough)
        this._walkTo(npc, prey.x, prey.y, this.STATE.HUNT_WALK_TO_PREY, this.STATE.HUNT_SHOOT);
    },

    _huntShoot(npc) {
        const building = World.buildings.find(b => b.id === npc.assignedBuilding);
        if (!building) { npc.state = this.STATE.IDLE; return; }
        const def = BUILDINGS[building.type];
        const range = def.huntRange || 6;
        const nx = Math.floor(npc.x), ny = Math.floor(npc.y);

        // Find the target animal
        const prey = Animal._animals.find(a => a.id === npc._huntTarget && !a.dead);
        if (!prey) {
            // Target gone, go back to idle to find new one
            this._releaseAnimalReservation(npc);
            npc._huntTarget = null;
            npc.state = this.STATE.IDLE;
            return;
        }

        const dist = Math.abs(prey.x - nx) + Math.abs(prey.y - ny);

        if (dist <= range) {
            // In range: shoot and kill
            const shootName = (Animal.TYPES[prey.type] && Animal.TYPES[prey.type].name) || prey.type;
            npc.walkPurpose = 'shooting ' + shootName;
            const killed = Animal.damageAnimal(prey.id, prey.hp); // instant kill for simplicity
            if (killed) {
                // Deer is dead, go pick up carcass
                this._releaseAnimalReservation(npc);
                npc._huntTarget = null;
                const carcass = Animal._carcasses.find(c => c.id === prey.id);
                if (carcass) {
                    npc._carcassTarget = carcass.id;
                    npc.walkPurpose = 'walking to carcass';
                    this._walkTo(npc, carcass.x, carcass.y, this.STATE.HUNT_WALK_TO_CARCASS, this.STATE.HUNT_PICKUP_CARCASS);
                } else {
                    npc.state = this.STATE.IDLE;
                }
            }
        } else {
            // Too far, walk closer
            const trackName = (Animal.TYPES[prey.type] && Animal.TYPES[prey.type].name) || prey.type;
            npc.walkPurpose = 'tracking ' + trackName;
            this._walkTo(npc, prey.x, prey.y, this.STATE.HUNT_WALK_TO_PREY, this.STATE.HUNT_SHOOT);
        }
    },

    _huntButcher(npc) {
        const building = World.buildings.find(b => b.id === npc.assignedBuilding);
        if (!building) { npc.state = this.STATE.IDLE; return; }
        const def = BUILDINGS[building.type];

        npc.walkPurpose = 'butchering carcass';
        npc.workTimer = (npc.workTimer || 0) + 1;

        if (npc.workTimer >= (def.butcherTicks || 12)) {
            npc.workTimer = 0;
            // Convert carcass to meat
            npc.carrying = 'meat';
            npc.carryAmount = def.produceAmount || 5;

            // Deliver to granary
            const nx = Math.floor(npc.x), ny = Math.floor(npc.y);
            const storage = this._findStorageFor('meat', nx, ny);
            if (storage) {
                npc._depositBuildingId = storage.buildingId;
                npc.walkPurpose = 'delivering meat to granary';
                this._walkTo(npc, storage.x, storage.y, this.STATE.HUNT_DELIVER_MEAT, this.STATE.DEPOSIT_RESOURCE);
            } else {
                npc.idleReason = 'no granary available';
                npc.state = this.STATE.IDLE;
            }
        }
    },

    _huntPickupCarcass(npc) {
        // Pick up the carcass at current position
        const carcass = Animal.removeCarcass(npc._carcassTarget);
        if (carcass) {
            this._releaseAnimalReservation(npc);
            npc.carrying = 'carcass';
            npc.carryAmount = 1;
            npc._carcassTarget = null;
            // Carry carcass back to hunter's post
            npc.state = this.STATE.IDLE; // will trigger _startHunterCycle which handles carrying carcass
        } else {
            // Carcass already picked up by someone else
            this._releaseAnimalReservation(npc);
            npc._carcassTarget = null;
            npc.state = this.STATE.IDLE;
        }
    },

    _isAtBuilding(npc, building) {
        const nx = Math.floor(npc.x), ny = Math.floor(npc.y);
        const def = BUILDINGS[building.type];
        for (let dy = 0; dy < def.height; dy++) {
            for (let dx = 0; dx < def.width; dx++) {
                if (nx === building.x + dx && ny === building.y + dy) return true;
            }
        }
        return false;
    },

    _startGathering(npc, building, def) {
        // Find nearest resource tile of the right type
        const terrainType = TERRAIN_BY_ID[def.gathersFrom];
        if (!terrainType) return;

        // Tree gatherers reserve a specific tree and choose a reachable adjacent tile
        if (def.gathersFrom === 'tree') {
            const nx = Math.floor(npc.x), ny = Math.floor(npc.y);
            const walkSpot = Pathfinding.findNearest(nx, ny, (x, y) => {
                if (!World.isWalkable(x, y)) return false;
                return !!this._findReservableAdjacentResourceTile(x, y, def, npc);
            }, undefined);

            if (!walkSpot) {
                npc.idleReason = 'no reachable tree source';
                return;
            }

            const targetTree = this._findReservableAdjacentResourceTile(walkSpot.x, walkSpot.y, def, npc);
            if (!targetTree) {
                npc.idleReason = 'tree source already reserved';
                return;
            }

            this._reserveTree(npc, targetTree.x, targetTree.y);
            npc._gatherTarget = targetTree;
            npc._gatherType = def.gathers;
            npc.walkPurpose = 'walking to ' + def.gathers + ' source';
            this._walkTo(npc, walkSpot.x, walkSpot.y, this.STATE.WALK_TO_RESOURCE, this.STATE.GATHER_RESOURCE);
            return;
        }

        // For deposit buildings (placeOnDeposit), restrict gathering to own building footprint
        if (def.placeOnDeposit) {
            const bDef = BUILDINGS[building.type];
            let bestTile = null;
            let bestDist = Infinity;
            for (let dy = 0; dy < bDef.height; dy++) {
                for (let dx = 0; dx < bDef.width; dx++) {
                    const tx = building.x + dx;
                    const ty = building.y + dy;
                    const tile = World.getTile(tx, ty);
                    if (!tile || tile.resourceAmount <= 0) continue;
                    if (tile.terrain.resource !== def.gathersFrom) continue;
                    const d = Utils.manhattan(Math.floor(npc.x), Math.floor(npc.y), tx, ty);
                    if (d < bestDist) {
                        bestDist = d;
                        bestTile = { x: tx, y: ty };
                    }
                }
            }

            if (!bestTile) {
                npc.idleReason = 'deposit depleted';
                return;
            }

            npc._gatherTarget = bestTile;
            npc._gatherType = def.gathers;
            npc.walkPurpose = 'walking to ' + def.gathers + ' source';

            // Walk directly to the resource tile inside the building footprint
            this._walkTo(npc, bestTile.x, bestTile.y, this.STATE.WALK_TO_RESOURCE, this.STATE.GATHER_RESOURCE, { ownBuildingId: building.id });
            return;
        }

        const source = Pathfinding.findNearest(
            Math.floor(npc.x), Math.floor(npc.y),
            (x, y) => {
                const tile = World.getTile(x, y);
                if (!tile || tile.resourceAmount <= 0) return false;
                // For tree gatherers, match any tree terrain variant
                if (def.gathersFrom === 'tree') return tile.terrain.isTree === true;
                return tile.terrain.id === def.gathersFrom;
            },
            undefined
        );

        if (!source) {
            npc.idleReason = 'no ' + def.gathers + ' nearby';
            return;
        }

        npc._gatherTarget = source;
        npc._gatherType = def.gathers;
        npc.walkPurpose = 'walking to ' + def.gathers + ' source';

        // Find walkable tile adjacent to the resource
        const adjacent = this._findAdjacentWalkable(source.x, source.y);
        if (!adjacent) return;

        this._walkTo(npc, adjacent.x, adjacent.y, this.STATE.WALK_TO_RESOURCE, this.STATE.GATHER_RESOURCE);
    },

    _findReservableAdjacentResourceTile(x, y, def, npc) {
        const candidates = Utils.getNeighbors4(x, y);
        candidates.push({ x, y });

        for (const p of candidates) {
            const tile = World.getTile(p.x, p.y);
            if (!tile || tile.resourceAmount <= 0) continue;
            const isMatch = def.gathersFrom === 'tree'
                ? tile.terrain.isTree === true
                : tile.terrain.id === def.gathersFrom;
            if (!isMatch) continue;
            if (def.gathersFrom === 'tree' && this._isTreeReservedByOther(p.x, p.y, npc.id)) continue;
            return { x: p.x, y: p.y };
        }

        return null;
    },

    _findAdjacentWalkable(x, y) {
        const neighbors = Utils.getNeighbors4(x, y);
        for (const n of neighbors) {
            if (World.isWalkable(n.x, n.y)) return n;
        }
        // If the tile itself is walkable (like trees), return it
        if (Utils.inBounds(x, y, World.width, World.height)) {
            const t = World.getTile(x, y);
            if (t && t.terrain.walkable) return { x, y };
        }
        return null;
    },

    _gatherResource(npc) {
        npc.walkPurpose = 'gathering ' + (npc._gatherType || 'resource');
        npc.gatherTimer++;

        // Tool animation while gathering
        if (npc.gatherTimer % 8 === 0 && npc.assignedBuilding) {
            const building = World.buildings.find(b => b.id === npc.assignedBuilding);
            if (building) {
                const toolDef = this._WORK_TOOLS[building.type];
                if (toolDef) {
                    Animations.add(npc.x, npc.y, 'tool', 4, { npcId: npc.id, chars: toolDef.chars, color: toolDef.color });
                }
            }
        }

        if (npc.gatherTimer >= CONFIG.GATHER_TICKS) {
            npc.gatherTimer = 0;

            // Take resource from tile
            const target = npc._gatherTarget;
            if (target) {
                const tile = World.getTile(target.x, target.y);
                if (tile && tile.resourceAmount > 0) {
                    tile.resourceAmount--;
                    npc.carrying = npc._gatherType;
                    npc.carryAmount = 1;
                    if (npc._reservedTreeKey) this._releaseTreeReservation(npc);

                    // If tree is depleted, convert to base terrain type
                    if (tile.resourceAmount <= 0 && tile.terrain.isTree) {
                        const baseTerrain = TERRAIN[tile.terrain.baseTerrain] || TERRAIN.DESERT;
                        tile.terrain = baseTerrain;
                    }

                    // If deposit is depleted, convert to base terrain type
                    if (tile.resourceAmount <= 0 && tile.terrain.baseTerrain && !tile.terrain.isTree) {
                        const baseTerrain = TERRAIN[tile.terrain.baseTerrain] || TERRAIN.DESERT;
                        tile.terrain = baseTerrain;
                    }

                    // Check if building requires processing at hut first
                    const building = World.buildings.find(b => b.id === npc.assignedBuilding);
                    const def = building ? BUILDINGS[building.type] : null;

                    if (building && def && def.processTicks) {
                        // Return to hut to process raw material
                        npc.walkPurpose = 'carrying raw ' + npc.carrying + ' to ' + def.name;
                        this._walkTo(npc, building.x, building.y,
                            this.STATE.RETURN_TO_WORK, this.STATE.WORKING, { ownBuildingId: building.id });
                    } else {
                        // Walk directly to stockpile
                        const stockpile = Resources.findNearestStockpile(
                            Math.floor(npc.x), Math.floor(npc.y)
                        );
                        if (stockpile) {
                            npc._depositBuildingId = stockpile.buildingId;
                            npc.walkPurpose = 'carrying ' + npc.carrying + ' to stockpile';
                            this._walkTo(npc, stockpile.x, stockpile.y,
                                this.STATE.WALK_TO_STOCKPILE, this.STATE.DEPOSIT_RESOURCE);
                        } else {
                            npc.idleReason = 'no stockpile found';
                            npc.state = this.STATE.IDLE;
                        }
                    }
                } else {
                    if (npc._reservedTreeKey) this._releaseTreeReservation(npc);
                    npc.idleReason = 'resource depleted';
                    npc.state = this.STATE.IDLE;
                }
            } else {
                if (npc._reservedTreeKey) this._releaseTreeReservation(npc);
                npc.idleReason = 'no gather target';
                npc.state = this.STATE.IDLE;
            }
        }
    },

    _depositResource(npc) {
        this._releaseTreeReservation(npc);
        this._releaseAnimalReservation(npc);
        if (npc.carrying) {
            npc.walkPurpose = 'depositing ' + npc.carrying;
            // Determine target building: prefer tracked ID from routing, fall back to positional check
            let targetBuilding = null;
            if (npc._depositBuildingId) {
                targetBuilding = World.buildings.find(b => b.id === npc._depositBuildingId);
            }
            if (!targetBuilding) {
                targetBuilding = Resources.getBuildingForTile(Math.floor(npc.x), Math.floor(npc.y));
            }
            if (targetBuilding && BUILDINGS[targetBuilding.type] && BUILDINGS[targetBuilding.type].isForwardStorage) {
                Resources.addToBuilding(targetBuilding.id, npc.carrying, npc.carryAmount);
            } else {
                Resources.add(npc.carrying, npc.carryAmount);
            }
            npc.carrying = null;
            npc.carryAmount = 0;
        }
        npc._depositBuildingId = null;
        // Hauler return-trip: after depositing at main, check for return cargo
        const fwdBuilding = World.buildings.find(b => b.id === npc.assignedBuilding);
        if (fwdBuilding) {
            const fwdDef = BUILDINGS[fwdBuilding.type];
            if (fwdDef && fwdDef.isForwardStorage) {
                if (this._haulerFindReturnCargo(npc, fwdBuilding, fwdDef)) {
                    return;
                }
            }
        }
        // Return to work (look for more resources)
        npc.walkPurpose = '';
        npc.idleReason = '';
        npc.state = this.STATE.IDLE;
    },

    _pickupResource(npc) {
        const pickupType = npc._pickupType;
        if (pickupType) {
            // Determine target building: prefer tracked ID from routing, fall back to positional check
            let targetBuilding = null;
            if (npc._pickupBuildingId) {
                targetBuilding = World.buildings.find(b => b.id === npc._pickupBuildingId);
            }
            if (!targetBuilding) {
                targetBuilding = Resources.getBuildingForTile(Math.floor(npc.x), Math.floor(npc.y));
            }
            const desiredAmount = npc.carryAmount || 1;
            let picked = false;
            let pickAmount = 0;
            if (targetBuilding && BUILDINGS[targetBuilding.type] && BUILDINGS[targetBuilding.type].isForwardStorage) {
                const available = (targetBuilding.storage && targetBuilding.storage[pickupType]) || 0;
                pickAmount = Math.min(desiredAmount, available);
                if (pickAmount > 0 && Resources.removeFromBuilding(targetBuilding.id, pickupType, pickAmount)) {
                    picked = true;
                }
            }
            if (!picked) {
                const available = Resources.get(pickupType);
                pickAmount = Math.min(desiredAmount, available);
                if (pickAmount > 0) {
                    Resources.remove(pickupType, pickAmount);
                    picked = true;
                }
            }
            npc._pickupBuildingId = null;
            if (picked) {
                npc.carrying = pickupType;
                npc.carryAmount = pickAmount;
                npc.walkPurpose = 'carrying ' + pickAmount + ' ' + pickupType + ' to workplace';

                // Walk back to assigned building
                const building = World.buildings.find(b => b.id === npc.assignedBuilding);
                if (building) {
                    this._walkTo(npc, building.x, building.y, this.STATE.RETURN_TO_WORK, this.STATE.WORKING, { ownBuildingId: building.id });
                } else {
                    npc.idleReason = 'building destroyed';
                    npc.state = this.STATE.IDLE;
                }
            } else {
                // Resource no longer available, go back idle
                npc.walkPurpose = '';
                npc.idleReason = 'waiting for ' + (pickupType || 'resource');
                npc.state = this.STATE.IDLE;
            }
        } else {
            npc.walkPurpose = '';
            npc.idleReason = 'waiting for resource';
            npc.state = this.STATE.IDLE;
        }
    },

    _walkTo(npc, tx, ty, walkState, arrivalState, opts) {
        const fromX = Math.floor(npc.x);
        const fromY = Math.floor(npc.y);
        npc.walkFrom = { x: fromX, y: fromY };
        npc.walkTo = { x: tx, y: ty };

        const pathOpts = opts || {};
        const path = Pathfinding.findPath(fromX, fromY, tx, ty, pathOpts);
        if (path && path.length > 1) {
            npc.path = path;
            npc.pathIndex = 1;
            npc.state = walkState;
            npc._arrivalState = arrivalState;
            npc.moveProgress = 0;
        } else if (path && path.length === 1) {
            // Already there
            npc.state = arrivalState;
        } else {
            // Can't reach — try adjacent tile
            const neighbors = Utils.getNeighbors4(tx, ty);
            for (const n of neighbors) {
                if (!World.isWalkable(n.x, n.y)) continue;
                const altPath = Pathfinding.findPath(fromX, fromY, n.x, n.y);
                if (altPath && altPath.length > 1) {
                    npc.path = altPath;
                    npc.pathIndex = 1;
                    npc.state = walkState;
                    npc._arrivalState = arrivalState;
                    npc.moveProgress = 0;
                    npc.walkTo = { x: n.x, y: n.y };
                    return;
                } else if (altPath && altPath.length === 1) {
                    npc.state = arrivalState;
                    return;
                }
            }
            npc.idleReason = 'no path to destination';
            npc.state = this.STATE.IDLE;
        }
    },

    _walkAlongPath(npc) {
        if (!npc.path || npc.pathIndex >= npc.path.length) {
            npc.state = npc._arrivalState || this.STATE.IDLE;
            npc.path = null;
            return;
        }

        const target = npc.path[npc.pathIndex];

        // Speed boost from road level at current tile
        const tile = World.getTile(Math.floor(npc.x), Math.floor(npc.y));
        const roadBonus = tile ? tile.roadLevel * 0.02 : 0; // +2% speed per road level (max +30% at level 15)
        const troopBonus = (TROOPS[npc.type] && !npc.isBandit) ? CONFIG.TROOP_SPEED_BONUS : 0;
        const seasonPenalty = Season.getSpeedModifier();
        npc.moveProgress += Math.max(0.01, CONFIG.WORKER_SPEED + roadBonus + troopBonus - seasonPenalty);

        if (npc.moveProgress >= 1) {
            npc.x = target.x;
            npc.y = target.y;
            npc.pathIndex++;
            npc.moveProgress = 0;

            // Stamp road on the tile we just arrived at (every 2nd arrival)
            // Bandits and troops don't create roads
            const arrivedTile = World.getTile(target.x, target.y);
            if (arrivedTile && arrivedTile.terrain.walkable && !npc.isBandit && !(npc.type in TROOPS)) {
                arrivedTile._roadStampCount = (arrivedTile._roadStampCount || 0) + 1;
                if (arrivedTile._roadStampCount >= 2) {
                    arrivedTile._roadStampCount = 0;
                    arrivedTile.roadLevel = Math.min(15, arrivedTile.roadLevel + 1);
                }
            }

            if (npc.pathIndex >= npc.path.length) {
                npc.state = npc._arrivalState || this.STATE.IDLE;
                npc.path = null;
            }
        } else {
            // Interpolate position
            const prev = npc.pathIndex > 0 ? npc.path[npc.pathIndex - 1] : { x: npc.x, y: npc.y };
            npc.x = Utils.lerp(prev.x, target.x, npc.moveProgress);
            npc.y = Utils.lerp(prev.y, target.y, npc.moveProgress);
        }
    },

    _findStorageFor(resourceId, fromX, fromY) {
        if (STORAGE_TYPES.granary.includes(resourceId)) {
            return Resources.findNearestGranary(fromX, fromY);
        }
        if (STORAGE_TYPES.armory.includes(resourceId)) {
            // Try armory first; fall back to stockpile if no armory exists
            const armory = Resources.findNearestArmory(fromX, fromY);
            if (armory) return armory;
        }
        return Resources.findNearestStockpile(fromX, fromY);
    },

    assignWorkersToBuilding(building) {
        const def = BUILDINGS[building.type];
        if (!def.workers) return;

        const needed = def.workers - building.workers.length;
        for (let i = 0; i < needed; i++) {
            // Find an idle peasant
            const peasant = World.npcs.find(
                n => n.type === 'peasant' && n.state === this.STATE.IDLE && !n.assignedBuilding
            );
            if (peasant) {
                peasant.assignedBuilding = building.id;
                peasant.type = 'worker';
                Memory.add(peasant, 'assigned_work', Memory.PRIORITY.ROUTINE, peasant.name + ' was assigned to the ' + def.name + '.', [], true);
                EventLog.add('info', peasant.name + ' was assigned to ' + def.name + '.', building.x, building.y);
                // Color worker based on their workplace building
                const bDef = BUILDINGS[building.type];
                peasant.fg = bDef ? bDef.fg : '#aaaaff';
                // Hunter workers get higher combat stats
                if (bDef.isHunter) {
                    peasant.hp = NPC.HUNTER_HP;
                    peasant.maxHp = NPC.HUNTER_HP;
                    peasant.damage = NPC.HUNTER_DAMAGE;
                }
                building.workers.push(peasant.id);
                World.idlePeasants--;
            }
        }
    },

    // Release worker from building (for sleep/demolish)
    releaseWorker(npcId) {
        const npc = World.npcs.find(n => n.id === npcId);
        if (!npc) return;
        this._releaseTreeReservation(npc);
        this._releaseAnimalReservation(npc);
        npc.assignedBuilding = null;
        npc.type = 'peasant';
        npc.fg = '#ffffff';
        npc.state = this.STATE.IDLE;
        npc.idleReason = 'released from work';
        npc.carrying = null;
        npc.carryAmount = 0;
        npc.path = null;
        npc.walkPurpose = '';
        npc.walkFrom = null;
        npc.walkTo = null;
        npc._fightTargetId = null;
        npc._fightUntil = 0;
        npc._fightId = 0;
        npc._theftTargetBuildingId = null;
        npc._theftTargetType = null;
        npc._theftAmount = 0;
        npc._theftTimer = 0;
        // Reset to civilian stats
        npc.hp = this.CIVILIAN_HP;
        npc.maxHp = this.CIVILIAN_HP;
        npc.damage = this.CIVILIAN_DAMAGE;
    },

    // Spawn initial peasants around keep
    spawnStartingPeasants() {
        if (!World.keepPos) return;
        const kx = World.keepPos.x + 1;
        const ky = World.keepPos.y + 3; // Below keep
        for (let i = 0; i < CONFIG.START_PEASANTS; i++) {
            const ox = Math.floor(Math.random() * 5) - 2;
            const oy = Math.floor(Math.random() * 3);
            const sx = kx + ox;
            const sy = ky + oy;
            if (World.isWalkable(sx, sy)) {
                this.spawnPeasant(sx, sy);
            } else {
                this.spawnPeasant(kx, ky);
            }
        }
    }
};
