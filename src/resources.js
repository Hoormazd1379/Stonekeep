// Stonekeep - Resource Manager
'use strict';

const Resources = {
    // Check if player can afford a cost
    canAfford(cost) {
        for (const key in cost) {
            if ((World.resources[key] || 0) < cost[key]) return false;
        }
        return true;
    },

    // Deduct cost from resources
    spend(cost) {
        for (const key in cost) {
            World.resources[key] = (World.resources[key] || 0) - cost[key];
        }
    },

    // Add resources
    add(type, amount) {
        World.resources[type] = (World.resources[type] || 0) + amount;
    },

    // Remove resources (returns true if successful)
    remove(type, amount) {
        if ((World.resources[type] || 0) >= amount) {
            World.resources[type] -= amount;
            return true;
        }
        return false;
    },

    // Get amount of a resource
    get(type) {
        return World.resources[type] || 0;
    },

    // Get total food count
    getTotalFood() {
        return (World.resources.apples || 0) +
               (World.resources.bread || 0) +
               (World.resources.cheese || 0) +
               (World.resources.meat || 0);
    },

    // Get food variety count (how many types of food are available)
    getFoodVariety() {
        let count = 0;
        if (World.resources.apples > 0) count++;
        if (World.resources.bread > 0) count++;
        if (World.resources.cheese > 0) count++;
        if (World.resources.meat > 0) count++;
        return count;
    },

    // Find nearest stockpile tile (walkable area of stockpile building)
    findNearestStockpile(fromX, fromY) {
        const stockpiles = World.getBuildingsOfType('stockpile');
        if (stockpiles.length === 0) return null;
        let best = null, bestDist = Infinity;
        for (const s of stockpiles) {
            const def = BUILDINGS[s.type];
            // Find the nearest walkable edge tile of the stockpile
            for (let dy = -1; dy <= def.height; dy++) {
                for (let dx = -1; dx <= def.width; dx++) {
                    const tx = s.x + dx;
                    const ty = s.y + dy;
                    if (World.isWalkable(tx, ty)) {
                        const d = Utils.manhattan(fromX, fromY, tx, ty);
                        if (d < bestDist) {
                            bestDist = d;
                            best = { x: tx, y: ty };
                        }
                    }
                }
            }
        }
        return best;
    },

    // Find nearest granary tile
    findNearestGranary(fromX, fromY) {
        const granaries = World.getBuildingsOfType('granary');
        if (granaries.length === 0) return null;
        let best = null, bestDist = Infinity;
        for (const g of granaries) {
            const def = BUILDINGS[g.type];
            for (let dy = -1; dy <= def.height; dy++) {
                for (let dx = -1; dx <= def.width; dx++) {
                    const tx = g.x + dx;
                    const ty = g.y + dy;
                    if (World.isWalkable(tx, ty)) {
                        const d = Utils.manhattan(fromX, fromY, tx, ty);
                        if (d < bestDist) {
                            bestDist = d;
                            best = { x: tx, y: ty };
                        }
                    }
                }
            }
        }
        return best;
    },

    // Find nearest armory tile
    findNearestArmory(fromX, fromY) {
        const armories = World.getBuildingsOfType('armory');
        if (armories.length === 0) return null;
        let best = null, bestDist = Infinity;
        for (const a of armories) {
            const def = BUILDINGS[a.type];
            for (let dy = -1; dy <= def.height; dy++) {
                for (let dx = -1; dx <= def.width; dx++) {
                    const tx = a.x + dx;
                    const ty = a.y + dy;
                    if (World.isWalkable(tx, ty)) {
                        const d = Utils.manhattan(fromX, fromY, tx, ty);
                        if (d < bestDist) {
                            bestDist = d;
                            best = { x: tx, y: ty };
                        }
                    }
                }
            }
        }
        return best;
    }
};
