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
        DISEASE_HEAL: 'diseaseHeal'
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
            idleReason: ''    // reason for being idle (displayed in info panel)
        };
        World.npcs.push(npc);
        World.population++;
        World.idlePeasants++;
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
            walkPurpose: ''
        };
        World.npcs.push(npc);
        return npc;
    },

    // Spatial grid for fast NPC lookups
    _GRID_CELL: 16,
    _grid: null,
    _gridW: 0,
    _gridH: 0,

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

    update() {
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

    damageNpc(npcId, amount) {
        const npc = World.npcs.find(n => n.id === npcId);
        if (!npc) return false;

        npc.hp -= amount;
        if (npc.hp <= 0) {
            this.killNpc(npc);
            return true; // died
        }
        return false; // still alive
    },

    killNpc(npc) {
        const idx = World.npcs.indexOf(npc);
        if (idx === -1) return;

        // Release from building if assigned
        if (npc.assignedBuilding) {
            const building = World.buildings.find(b => b.id === npc.assignedBuilding);
            if (building) {
                const workerIdx = building.workers.indexOf(npc.id);
                if (workerIdx !== -1) building.workers.splice(workerIdx, 1);
            }
        }

        // Deselect if selected
        const selIdx = World.selectedUnits.indexOf(npc.id);
        if (selIdx !== -1) World.selectedUnits.splice(selIdx, 1);

        // Update population counters (bandits don't affect population)
        if (!npc.isBandit) {
            if (npc.type === 'peasant' || npc.type === 'worker') {
                World.population--;
                if (npc.type === 'peasant' && npc.state === this.STATE.IDLE && !npc.assignedBuilding) {
                    World.idlePeasants--;
                }
            }
        }

        // Remove from world
        World.npcs.splice(idx, 1);
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

    _updateWorker(npc) {
        // Flee from nearby bandits (workers don't fight)
        if (!npc._fleeCooldown) npc._fleeCooldown = 0;
        if (npc._fleeCooldown > 0) npc._fleeCooldown--;
        if (npc._fleeCooldown <= 0) {
            const wx = Math.floor(npc.x), wy = Math.floor(npc.y);
            const nearBandit = this._findNearestBandit(wx, wy, 6);
            if (nearBandit) {
                // Run away from the bandit
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

        switch (npc.state) {
            case this.STATE.IDLE:
                this._idleBehavior(npc);
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
                                this.damageNpc(target.id, damage);
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
                            this.damageNpc(bandit.id, damage);
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
            this.damageNpc(target.id, damage);
        }
    },

    // ── Bandit AI ──

    _updateBandit(npc) {
        // Walking state
        if (npc.state === this.STATE.WALK_TO_WORK) {
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
                    this.damageNpc(target.id, npc.damage);
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

        // Producer building (farm, orchard, dairy): walk to building and work
        if (def.produces && !def.consumes) {
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
        this._walkTo(npc, bx, by, this.STATE.WALK_TO_WORK, this.STATE.WORKING);
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
            this._walkTo(npc, building.x, building.y, this.STATE.RETURN_TO_WORK, this.STATE.WORKING);
            return;
        }

        // Need to fetch input: check if any input is available globally
        if (Resources.get(def.consumes) <= 0) {
            // No input available, wait at building
            if (!this._isAtBuilding(npc, building)) {
                npc.walkPurpose = 'walking to ' + def.name + ' (waiting for ' + def.consumes + ')';
                this._walkTo(npc, building.x, building.y, this.STATE.WALK_TO_WORK, this.STATE.IDLE);
            }
            return;
        }

        // Walk to appropriate storage to pick up input
        const storage = this._findStorageFor(def.consumes, Math.floor(npc.x), Math.floor(npc.y));

        if (!storage) return;

        npc._pickupType = def.consumes;
        npc.walkPurpose = 'fetching ' + def.consumes + ' from storage';
        this._walkTo(npc, storage.x, storage.y, this.STATE.WALK_TO_PICKUP, this.STATE.PICKUP_RESOURCE);
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
            this._walkTo(npc, bx, by, this.STATE.WALK_TO_WORK, this.STATE.WORKING);
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
                this._walkTo(npc, building.x, building.y, this.STATE.WALK_TO_WORK, this.STATE.IDLE);
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
            this._walkTo(npc, building.x, building.y, this.STATE.FIRE_WALK_TO_WELL, this.STATE.FIRE_FILL_BUCKET);
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
                this._walkTo(npc, building.x, building.y, this.STATE.WALK_TO_WORK, this.STATE.IDLE);
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

        // Gatherer processing at hut (e.g., woodcutter processing logs into wood)
        if (def.gathers && def.processTicks && npc.carrying === def.gathers) {
            npc.walkPurpose = 'processing ' + npc.carrying + ' at ' + def.name;
            building.production = (building.production || 0) + World.fearEfficiency;

            if (building.production >= def.processTicks) {
                building.production = 0;

                // Deliver processed resource to stockpile
                const storage = this._findStorageFor(npc.carrying, Math.floor(npc.x), Math.floor(npc.y));
                if (storage) {
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

            // Bless nearby civilian NPCs within 3 tiles
            const nx = Math.floor(npc.x), ny = Math.floor(npc.y);
            for (const n of World.npcs) {
                if (n === npc) continue;
                if (n.type !== 'peasant') continue;
                const dist = Utils.manhattan(Math.floor(n.x), Math.floor(n.y), nx, ny);
                if (dist <= 3) {
                    n.blessedUntil = World.tick + 200;
                }
            }

            // After 8 ticks of blessing at patrol point, go patrol again
            if (npc._blessTimer >= 8) {
                npc._blessTimer = 0;
                npc.state = this.STATE.IDLE;
            }
            return;
        }

        if (!def.produces) {
            // Inn: consume ale over time, then fetch more
            if (def.isInn && def.consumes && npc.carrying === def.consumes) {
                npc.walkPurpose = 'serving ale';
                building.production = (building.production || 0) + 1;
                if (building.production >= def.consumeTicks) {
                    building.production = 0;
                    npc.carrying = null;
                    npc.carryAmount = 0;
                    building.aleServed = (building.aleServed || 0) + 1;
                    // Go fetch more ale
                    npc.idleReason = 'fetching ale';
                    npc.state = this.STATE.IDLE;
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

        // Tick production (scaled by fear factor efficiency)
        building.production = (building.production || 0) + World.fearEfficiency;

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

            // Determine storage destination
            const storage = this._findStorageFor(def.produces, Math.floor(npc.x), Math.floor(npc.y));

            if (storage) {
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
            const storage = this._findStorageFor('meat', nx, ny);
            if (storage) {
                npc.walkPurpose = 'delivering meat to granary';
                this._walkTo(npc, storage.x, storage.y, this.STATE.HUNT_DELIVER_MEAT, this.STATE.DEPOSIT_RESOURCE);
            } else {
                npc.idleReason = 'no granary available';
            }
            return;
        }

        // If carrying carcass, go to building to butcher
        if (npc.carrying === 'carcass') {
            if (this._isAtBuilding(npc, building)) {
                npc.state = this.STATE.HUNT_BUTCHER;
                npc.workTimer = 0;
                npc.walkPurpose = 'butchering carcass';
                return;
            }
            npc.walkPurpose = 'carrying carcass to ' + def.name;
            this._walkTo(npc, building.x, building.y, this.STATE.HUNT_CARRY_CARCASS, this.STATE.HUNT_BUTCHER);
            npc.workTimer = 0;
            return;
        }

        // Check for existing carcasses to pick up
        const carcass = Animal.findNearestCarcass(nx, ny);
        if (carcass) {
            npc._huntTarget = null;
            npc._carcassTarget = carcass.id;
            npc.walkPurpose = 'walking to carcass';
            this._walkTo(npc, carcass.x, carcass.y, this.STATE.HUNT_WALK_TO_CARCASS, this.STATE.HUNT_PICKUP_CARCASS);
            return;
        }

        // Find a passive animal to hunt
        const prey = Animal.findNearestAnimal(def.hunts || 'any_passive', nx, ny);
        if (!prey) {
            npc.idleReason = 'no game to hunt';
            return;
        }

        npc._huntTarget = prey.id;
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
            npc.carrying = 'carcass';
            npc.carryAmount = 1;
            npc._carcassTarget = null;
            // Carry carcass back to hunter's post
            npc.state = this.STATE.IDLE; // will trigger _startHunterCycle which handles carrying carcass
        } else {
            // Carcass already picked up by someone else
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
        // Also check adjacent tiles (for non-walkable buildings)
        const neighbors = Utils.getNeighbors4(building.x, building.y);
        for (const n of neighbors) {
            if (nx === n.x && ny === n.y) return true;
        }
        return false;
    },

    _startGathering(npc, building, def) {
        // Find nearest resource tile of the right type
        const terrainType = TERRAIN_BY_ID[def.gathersFrom];
        if (!terrainType) return;

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
                        const walkOpts = def.placeOnDeposit ? { ownBuildingId: building.id } : {};
                        this._walkTo(npc, building.x, building.y,
                            this.STATE.RETURN_TO_WORK, this.STATE.WORKING, walkOpts);
                    } else {
                        // Walk directly to stockpile
                        const stockpile = Resources.findNearestStockpile(
                            Math.floor(npc.x), Math.floor(npc.y)
                        );
                        if (stockpile) {
                            npc.walkPurpose = 'carrying ' + npc.carrying + ' to stockpile';
                            this._walkTo(npc, stockpile.x, stockpile.y,
                                this.STATE.WALK_TO_STOCKPILE, this.STATE.DEPOSIT_RESOURCE);
                        } else {
                            npc.idleReason = 'no stockpile found';
                            npc.state = this.STATE.IDLE;
                        }
                    }
                } else {
                    npc.idleReason = 'resource depleted';
                    npc.state = this.STATE.IDLE;
                }
            } else {
                npc.idleReason = 'no gather target';
                npc.state = this.STATE.IDLE;
            }
        }
    },

    _depositResource(npc) {
        if (npc.carrying) {
            npc.walkPurpose = 'depositing ' + npc.carrying;
            Resources.add(npc.carrying, npc.carryAmount);
            npc.carrying = null;
            npc.carryAmount = 0;
        }
        // Return to work (look for more resources)
        npc.walkPurpose = '';
        npc.idleReason = '';
        npc.state = this.STATE.IDLE;
    },

    _pickupResource(npc) {
        const pickupType = npc._pickupType;
        if (pickupType && Resources.get(pickupType) > 0) {
            Resources.remove(pickupType, 1);
            npc.carrying = pickupType;
            npc.carryAmount = 1;
            npc.walkPurpose = 'carrying ' + pickupType + ' to workplace';

            // Walk back to assigned building
            const building = World.buildings.find(b => b.id === npc.assignedBuilding);
            if (building) {
                this._walkTo(npc, building.x, building.y, this.STATE.RETURN_TO_WORK, this.STATE.WORKING);
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
        npc.moveProgress += CONFIG.WORKER_SPEED + roadBonus;

        if (npc.moveProgress >= 1) {
            npc.x = target.x;
            npc.y = target.y;
            npc.pathIndex++;
            npc.moveProgress = 0;

            // Stamp road on the tile we just arrived at (every 2nd arrival)
            const arrivedTile = World.getTile(target.x, target.y);
            if (arrivedTile && arrivedTile.terrain.walkable) {
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
