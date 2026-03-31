// Stonekeep - Military System
'use strict';

const Military = {
    recruit(troopType) {
        const def = TROOPS[troopType];
        if (!def) return false;

        // Check barracks exists
        const barracks = World.getBuildingsOfType('barracks');
        if (barracks.length === 0) return false;

        // Check gold cost
        if (!Resources.canAfford(def.cost)) return false;

        // Check weapon/armor requirements
        for (const req in def.requires) {
            if (Resources.get(req) < def.requires[req]) return false;
        }

        // Check available peasant
        if (def.consumesPeasant) {
            const idlePeasant = World.npcs.find(
                n => n.type === 'peasant' && n.state === NPC.STATE.IDLE && !n.assignedBuilding
            );
            if (!idlePeasant) return false;

            // Consume resources
            Resources.spend(def.cost);
            for (const req in def.requires) {
                Resources.remove(req, def.requires[req]);
            }

            // Convert peasant to troop
            const b = barracks[0];
            World.npcs.splice(World.npcs.indexOf(idlePeasant), 1);
            World.idlePeasants--;

            const troop = NPC.spawnTroop(troopType, b.x, b.y + BUILDINGS.barracks.height);
            if (troop) {
                EventLog.add('info', 'Troop recruited: ' + def.name + ' (' + troop.name + ').', troop.x, troop.y);
            }
            return true;
        }

        return false;
    },

    // Issue a move order to a troop unit
    orderMove(unit, tx, ty) {
        // Check if target is walkable (either ground or wall-walkable for troops)
        const targetTile = World.getTile(tx, ty);
        const targetBid = targetTile ? (World.buildingMap[ty] ? World.buildingMap[ty][tx] : null) : null;
        let targetIsWallWalkable = false;
        if (targetBid !== null) {
            const b = World.buildings.find(b => b.id === targetBid);
            if (b) {
                const def = BUILDINGS[b.type];
                targetIsWallWalkable = !!def.wallWalkable;
            }
        }

        if (!World.isWalkable(tx, ty) && !targetIsWallWalkable) {
            // Try adjacent walkable tile
            const neighbors = Utils.getNeighbors4(tx, ty);
            for (const n of neighbors) {
                if (World.isWalkable(n.x, n.y)) {
                    tx = n.x;
                    ty = n.y;
                    break;
                }
            }
        }

        const fromX = Math.floor(unit.x);
        const fromY = Math.floor(unit.y);
        const path = Pathfinding.findPath(fromX, fromY, tx, ty, { allowWall: true });
        if (path && path.length > 1) {
            unit.path = path;
            unit.pathIndex = 1;
            unit.state = NPC.STATE.WALK_TO_WORK;
            unit._arrivalState = NPC.STATE.IDLE;
            unit.moveProgress = 0;
            unit.walkFrom = { x: fromX, y: fromY };
            unit.walkTo = { x: tx, y: ty };
            unit.walkPurpose = 'moving to position';
            // Update guard position for patrol behavior
            unit._guardX = tx;
            unit._guardY = ty;
        }
    },

    getTroopCounts() {
        const counts = {};
        for (const key in TROOPS) {
            counts[key] = World.npcs.filter(n => n.type === key).length;
        }
        return counts;
    },

    // Get height-based damage bonus for a ranged unit
    getHeightBonus(unit) {
        if (!unit.ranged) return 1.0;
        const x = Math.floor(unit.x), y = Math.floor(unit.y);
        const bid = World.buildingMap[y] && World.buildingMap[y][x];
        if (bid === null || bid === undefined) return 1.0; // ground level
        const b = World.buildings.find(b => b.id === bid);
        if (!b) return 1.0;
        const def = BUILDINGS[b.type];
        if (def.isTower) return 1.5;   // +50% on tower
        if (def.isWall || def.isStairs) return 1.25; // +25% on wall
        return 1.0;
    },

    // Fear factor troop damage modifier: ±5% per degree
    getFearDamageBonus() {
        return 1.0 + (World.fearFactor * 0.05);
    }
};
