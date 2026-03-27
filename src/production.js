// Stonekeep - Production System
// Production is now driven by workers physically at buildings.
// The NPC._workingAtBuilding() method handles production ticks.
// This module is kept for any production validation/query utilities.
'use strict';

const Production = {
    update() {
        // Production is now tick-driven by worker presence in NPC._workingAtBuilding()
        // No independent production happens here.
        // This method is kept as a hook for future production-related updates
        // (e.g. building decay, maintenance, etc.)
    },

    // Get production progress info for a building
    getProgress(building) {
        const def = BUILDINGS[building.type];
        if (!def || !def.produces) return null;
        // Hunter buildings use butcherTicks via NPC workTimer, not standard production
        if (def.isHunter) return null;
        if (!def.produceTicks) return null;
        return {
            current: building.production || 0,
            total: def.produceTicks,
            product: def.produces,
            input: def.consumes || null,
            percent: Math.floor(((building.production || 0) / def.produceTicks) * 100)
        };
    }
};
