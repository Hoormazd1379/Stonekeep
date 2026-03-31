// Stonekeep - Relationship System (Phase 3.6)
'use strict';

const Relationship = {
    // Relationship tiers
    TIERS: [
        { min: 80,  label: 'Close Friend', color: '#44ff44' },
        { min: 50,  label: 'Friend',       color: '#88cc44' },
        { min: 10,  label: 'Acquaintance',  color: '#cccc44' },
        { min: -9,  label: 'Stranger',      color: '#888888' },
        { min: -49, label: 'Rival',         color: '#cc8844' },
        { min: -100,label: 'Enemy',         color: '#cc4444' }
    ],

    // Get tier info for a relationship value
    getTier(value) {
        for (const t of this.TIERS) {
            if (value >= t.min) return { label: t.label, color: t.color };
        }
        return { label: 'Enemy', color: '#cc4444' };
    },

    // Get relationship value between two NPCs (0 = stranger)
    get(npc, otherId) {
        if (!npc.relationships) return 0;
        return npc.relationships[otherId] || 0;
    },

    // Change relationship value, clamped to [-100, 100]
    change(npc, otherId, delta) {
        if (!npc.relationships) npc.relationships = {};
        const current = npc.relationships[otherId] || 0;
        npc.relationships[otherId] = Utils.clamp(current + delta, -100, 100);
    },

    // Set relationship value directly
    set(npc, otherId, value) {
        if (!npc.relationships) npc.relationships = {};
        npc.relationships[otherId] = Utils.clamp(value, -100, 100);
    },

    // Get all relationships for display (sorted by value descending)
    getForDisplay(npc) {
        if (!npc.relationships) return [];
        const result = [];
        for (const [otherId, value] of Object.entries(npc.relationships)) {
            const id = parseInt(otherId);
            const other = World.npcs.find(n => n.id === id);
            if (!other || other.isBandit) continue;
            const tier = this.getTier(value);
            result.push({
                npcId: id,
                name: other.name || ('NPC #' + id),
                value: value,
                tier: tier.label,
                color: tier.color
            });
        }
        result.sort((a, b) => b.value - a.value);
        return result;
    },

    // Shared work drift: called once per day for NPCs working at the same building
    updateCoworkerDrift() {
        // Group NPCs by assigned building
        const groups = {};
        for (const npc of World.npcs) {
            if (npc.isBandit || !npc.assignedBuilding) continue;
            if (!groups[npc.assignedBuilding]) groups[npc.assignedBuilding] = [];
            groups[npc.assignedBuilding].push(npc);
        }
        // Apply +1 drift for each coworker pair
        for (const bid in groups) {
            const coworkers = groups[bid];
            for (let i = 0; i < coworkers.length; i++) {
                for (let j = i + 1; j < coworkers.length; j++) {
                    const a = coworkers[i], b = coworkers[j];
                    // Social personality builds faster
                    const aMod = Personality.getModifier(a, 'socialMoodBonus') > 0 ? 1.5 : 1;
                    const bMod = Personality.getModifier(b, 'socialMoodBonus') > 0 ? 1.5 : 1;
                    this.change(a, b.id, 1 * aMod);
                    this.change(b, a.id, 1 * bMod);
                }
            }
        }
    },

    // Apply relationship change from witnessing an event
    witnessEvent(npc, involvedNpcIds, delta) {
        for (const otherId of involvedNpcIds) {
            if (otherId === npc.id) continue;
            this.change(npc, otherId, delta);
        }
    },

    // Apply relationship change from secondhand memory
    secondhandInfluence(npc, entry, delta) {
        const reducedDelta = Math.round(delta * 0.4);
        if (reducedDelta === 0) return;
        for (const otherId of entry.involvedNpcs) {
            if (otherId === npc.id) continue;
            this.change(npc, otherId, reducedDelta);
        }
    }
};
