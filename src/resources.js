// Stonekeep - Resource Manager
'use strict';

const Resources = {
    // Check if player can afford a cost (across all storages)
    canAfford(cost) {
        for (const key in cost) {
            if (this.getTotal(key) < cost[key]) return false;
        }
        return true;
    },

    // Deduct cost from resources — takes from main storage first, then forward storages
    spend(cost) {
        for (const key in cost) {
            let remaining = cost[key];
            // Take from main first
            const mainAmt = World.resources[key] || 0;
            const fromMain = Math.min(mainAmt, remaining);
            World.resources[key] = mainAmt - fromMain;
            remaining -= fromMain;
            // Take remainder from forward storages
            if (remaining > 0) {
                const forwards = this._getForwardStoragesForResource(key);
                for (const b of forwards) {
                    const bAmt = (b.storage && b.storage[key]) || 0;
                    const take = Math.min(bAmt, remaining);
                    if (take > 0) {
                        b.storage[key] -= take;
                        remaining -= take;
                    }
                    if (remaining <= 0) break;
                }
            }
        }
    },

    // Add resources to main storage
    add(type, amount) {
        World.resources[type] = (World.resources[type] || 0) + amount;
    },

    // Add resources to a specific building's storage
    addToBuilding(buildingId, type, amount) {
        const building = World.buildings.find(b => b.id === buildingId);
        if (!building) { this.add(type, amount); return; }
        if (!building.storage) building.storage = {};
        building.storage[type] = (building.storage[type] || 0) + amount;
    },

    // Remove resources from main storage (returns true if successful)
    remove(type, amount) {
        if ((World.resources[type] || 0) >= amount) {
            World.resources[type] -= amount;
            return true;
        }
        return false;
    },

    // Remove from a specific building's storage
    removeFromBuilding(buildingId, type, amount) {
        const building = World.buildings.find(b => b.id === buildingId);
        if (!building || !building.storage) return false;
        if ((building.storage[type] || 0) >= amount) {
            building.storage[type] -= amount;
            return true;
        }
        return false;
    },

    // Get amount of a resource in main storage only
    get(type) {
        return World.resources[type] || 0;
    },

    // Get total amount across main + all forward storages
    getTotal(type) {
        let total = World.resources[type] || 0;
        const forwards = this._getForwardStoragesForResource(type);
        for (const b of forwards) {
            total += (b.storage && b.storage[type]) || 0;
        }
        return total;
    },

    // Get total food count (across all storages)
    getTotalFood() {
        return this.getTotal('apples') +
               this.getTotal('bread') +
               this.getTotal('cheese') +
               this.getTotal('meat');
    },

    // Get food variety count (how many types of food are available across all storages)
    getFoodVariety() {
        let count = 0;
        if (this.getTotal('apples') > 0) count++;
        if (this.getTotal('bread') > 0) count++;
        if (this.getTotal('cheese') > 0) count++;
        if (this.getTotal('meat') > 0) count++;
        return count;
    },

    // Get forward storage buildings that can store a given resource type
    _getForwardStoragesForResource(type) {
        if (STORAGE_TYPES.granary.includes(type)) {
            return World.buildings.filter(b => b.type === 'forwardGranary');
        }
        if (STORAGE_TYPES.armory && STORAGE_TYPES.armory.includes(type)) {
            return []; // armory items stay in armory, no forward armory yet
        }
        // Stockpile resources
        return World.buildings.filter(b => b.type === 'forwardStockpile');
    },

    // Find nearest storage building (tile) to deposit a stockpile resource
    findNearestStockpile(fromX, fromY) {
        const buildings = World.getBuildingsOfType('stockpile')
            .concat(World.getBuildingsOfType('forwardStockpile'));
        return this._findNearestBuildingTile(buildings, fromX, fromY);
    },

    // Find nearest granary building (tile) to deposit food
    findNearestGranary(fromX, fromY) {
        const buildings = World.getBuildingsOfType('granary')
            .concat(World.getBuildingsOfType('forwardGranary'));
        return this._findNearestBuildingTile(buildings, fromX, fromY);
    },

    // Find nearest granary that has food available (for eating)
    findNearestGranaryWithFood(fromX, fromY) {
        const buildings = [];
        const mainGranaries = World.getBuildingsOfType('granary');
        for (const g of mainGranaries) {
            // Main granary — check World.resources for food
            const hasFood = STORAGE_TYPES.granary.some(f => (World.resources[f] || 0) > 0);
            if (hasFood) buildings.push(g);
        }
        const forwardGranaries = World.getBuildingsOfType('forwardGranary');
        for (const g of forwardGranaries) {
            const hasFood = g.storage && STORAGE_TYPES.granary.some(f => (g.storage[f] || 0) > 0);
            if (hasFood) buildings.push(g);
        }
        return this._findNearestBuildingTile(buildings, fromX, fromY);
    },

    // Find nearest stockpile that has a specific resource available (for pickup)
    findNearestStockpileWithResource(fromX, fromY, resourceType) {
        const buildings = [];
        const mainStockpiles = World.getBuildingsOfType('stockpile');
        for (const s of mainStockpiles) {
            if ((World.resources[resourceType] || 0) > 0) buildings.push(s);
        }
        const forwardStockpiles = World.getBuildingsOfType('forwardStockpile');
        for (const s of forwardStockpiles) {
            if (s.storage && (s.storage[resourceType] || 0) > 0) buildings.push(s);
        }
        return this._findNearestBuildingTile(buildings, fromX, fromY);
    },

    // Find nearest armory tile
    findNearestArmory(fromX, fromY) {
        const armories = World.getBuildingsOfType('armory');
        return this._findNearestBuildingTile(armories, fromX, fromY);
    },

    // Find the building instance that owns a particular tile coordinate
    getBuildingForTile(x, y) {
        const bid = World.buildingMap[y] && World.buildingMap[y][x];
        if (bid === null || bid === undefined) return null;
        return World.buildings.find(b => b.id === bid) || null;
    },

    // Helper: find nearest walkable tile near any of the given buildings
    _findNearestBuildingTile(buildings, fromX, fromY) {
        if (buildings.length === 0) return null;
        let best = null, bestDist = Infinity;
        for (const b of buildings) {
            const def = BUILDINGS[b.type];
            for (let dy = -1; dy <= def.height; dy++) {
                for (let dx = -1; dx <= def.width; dx++) {
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
    }
};
