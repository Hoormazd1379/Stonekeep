// Stonekeep - NPC Memory System (Phase 3.5)
'use strict';

const Memory = {
    // Maximum memories per NPC
    MAX_MEMORIES: 100,

    // Visual range for witnessing events (Manhattan distance)
    WITNESS_RANGE: 8,

    // Priority levels
    PRIORITY: {
        ROUTINE:          1,  // Routine work, eating, sleeping
        ROUTINE_SIGHTING: 2,  // Seeing an animal, passing another NPC
        SOCIAL:           3,  // Pleasant chat, memory sharing
        NOTABLE_WORK:     4,  // Exhaustion, big harvest
        MAJOR_SOCIAL:     5,  // Argument, new friendship
        UPHEAVAL:         6,  // Desertion and settlement-shaking disruptions
        DISEASE:          6,  // Disease outbreak, getting sick
        CRIME:            7,  // Theft, caught stealing
        COMBAT:           8,  // Bandit attack, NPC fight
        FIRE:             9,  // Fire breaking out, building destroyed
        DEATH:           10   // Death of an NPC
    },

    // Recency decay: how quickly memories fade in importance
    // Returns multiplier based on days since the event
    _recencyFactor(daysSince) {
        if (daysSince <= 0) return 1.0;
        if (daysSince === 1) return 0.8;
        if (daysSince === 2) return 0.65;
        if (daysSince === 3) return 0.5;
        if (daysSince <= 7) return 0.3;
        return 0.15;
    },

    // Compute effective priority (base × recency)
    effectivePriority(entry) {
        const daysSince = Time.day - (entry.dayNumber || 0);
        return entry.priority * this._recencyFactor(daysSince);
    },

    // Mood weight for memory entries (positive => happy, negative => sad)
    _moodWeights: {
        'arrived':          0.5,
        'assigned_work':    0.3,
        'ate_food':         0.2,
        'slept':            0.1,
        'exhaustion':      -0.7,
        'starving':        -1.4,
        'saw_animal':       0.1,
        'fire_broke_out':  -2.8,
        'building_destroyed': -3.5,
        'caught_fire':     -4.0,
        'got_sick':        -2.0,
        'recovered':        1.0,
        'bandit_raid':     -2.8,
        'combat':          -2.0,
        'npc_died':        -4.0,
        'npc_killed':      -0.7,  // killed an enemy — less negative
        'fled_bandits':    -1.4,
        'building_completed': 1.0,
        'blessed':          0.8,
        'harvest':          0.5,
        'routine_sighting': 0.1,
        'pleasant_chat':    0.8,
        'memory_shared':    0.4,
        'argument':        -2.0,
        'friendship_formed': 1.5,
        'rivalry_formed':  -2.0,
        'npc_fight':       -1.6,
        'won_fight_satisfied': 0.8,
        'won_fight_guilty': -0.7,
        'lost_fight':      -1.8,
        'stole_resource':   0.4,
        'caught_stealing': -1.8,
        'theft_witnessed': -2.2,
        'deserted_settlement': -1.8,
        'saw_desertion':   -1.6,
        'drank_ale':        1.0,
        'survived_raid':    0.8
    },

    // Get mood contribution from recent memories
    getMoodFromMemories(npc) {
        if (!npc.memories || npc.memories.length === 0) return 0;
        let moodSum = 0;
        for (const mem of npc.memories) {
            const weight = this._moodWeights[mem.type] || 0;
            if (weight === 0) continue;
            const daysSince = Time.day - (mem.dayNumber || 0);
            const recency = this._recencyFactor(daysSince);
            // Firsthand memories have full impact; secondhand reduced
            const handFactor = mem.isFirsthand ? 1.0 : 0.4;
            moodSum += weight * recency * handFactor;
        }
        // Clamp and scale to a reasonable mood modifier range (-20 to +10)
        return Utils.clamp(Math.round(moodSum), -20, 10);
    },

    // ── Core API ──

    // Add a memory to an NPC
    add(npc, type, priority, description, involvedNpcs, isFirsthand) {
        if (!npc.memories) npc.memories = [];
        const entry = {
            type: type,
            priority: priority,
            tick: World.tick,
            dayNumber: Time.day,
            location: { x: Math.floor(npc.x), y: Math.floor(npc.y) },
            involvedNpcs: involvedNpcs || [],
            description: description,
            isFirsthand: isFirsthand !== false  // default true
        };
        npc.memories.push(entry);

        // Evict lowest effective-priority memory if over capacity
        if (npc.memories.length > this.MAX_MEMORIES) {
            this._evictLowest(npc);
        }
    },

    // Add a memory to all NPCs who can witness an event at (x, y)
    addToWitnesses(x, y, type, priority, description, involvedNpcIds, excludeIds) {
        const exclude = new Set(excludeIds || []);
        // Relationship deltas for witnessing events involving other NPCs
        const witnessRelDelta = {
            npc_died: -5, bandit_killed: 3, fire_broke_out: -2,
            caught_fire: -2, building_destroyed: -3, bandit_raid: -2,
            got_sick: -2, recovered: 3, blessed: 2, arrived: 1,
            npc_fight: -5, theft_witnessed: -10
        };
        const delta = witnessRelDelta[type] || 0;
        for (const npc of World.npcs) {
            if (npc.isBandit) continue;
            if (exclude.has(npc.id)) continue;
            const dist = Math.abs(Math.floor(npc.x) - x) + Math.abs(Math.floor(npc.y) - y);
            if (dist <= this.WITNESS_RANGE) {
                this.add(npc, type, priority, description, involvedNpcIds || [], true);
                // Relationship change for witnessed events (Phase 3.6)
                if (delta !== 0 && involvedNpcIds && typeof Relationship !== 'undefined') {
                    Relationship.witnessEvent(npc, involvedNpcIds, delta);
                }
            }
        }
    },

    // Create a secondhand memory from an existing memory entry
    createSecondhand(entry) {
        const secondhandPriorityMult = entry.isFirsthand ? 0.6 : 0.3;
        return {
            type: entry.type,
            priority: Math.max(1, Math.round(entry.priority * secondhandPriorityMult)),
            tick: entry.tick,
            dayNumber: entry.dayNumber,
            location: { x: entry.location.x, y: entry.location.y },
            involvedNpcs: entry.involvedNpcs.slice(),
            description: entry.description,
            isFirsthand: false
        };
    },

    // Select memories to share (highest effective priority, recent ones preferred)
    selectToShare(npc, count) {
        if (!npc.memories || npc.memories.length === 0) return [];
        // Score each memory by effective priority
        const scored = npc.memories.map((m, i) => ({
            idx: i,
            mem: m,
            score: this.effectivePriority(m)
        }));
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, count).map(s => s.mem);
    },

    // Receive a secondhand memory (avoid duplicates of very similar entries)
    receiveSecondhand(npc, originalEntry) {
        if (!npc.memories) npc.memories = [];
        // Check for duplicates: same type, same day, same involved NPCs
        const isDuplicate = npc.memories.some(m =>
            m.type === originalEntry.type &&
            m.dayNumber === originalEntry.dayNumber &&
            m.involvedNpcs.length === originalEntry.involvedNpcs.length &&
            m.involvedNpcs.every(id => originalEntry.involvedNpcs.includes(id))
        );
        if (isDuplicate) return false;

        const secondhand = this.createSecondhand(originalEntry);
        npc.memories.push(secondhand);
        if (npc.memories.length > this.MAX_MEMORIES) {
            this._evictLowest(npc);
        }
        // Secondhand relationship influence (Phase 3.6)
        if (typeof Relationship !== 'undefined' && originalEntry.involvedNpcs && originalEntry.involvedNpcs.length > 0) {
            const negTypes = new Set([
                'npc_died', 'fire_broke_out', 'caught_fire', 'building_destroyed',
                'bandit_raid', 'got_sick', 'npc_fight', 'theft_witnessed', 'caught_stealing', 'saw_desertion', 'deserted_settlement'
            ]);
            const posTypes = new Set(['recovered', 'blessed', 'bandit_killed', 'arrived', 'won_fight_satisfied']);
            let delta = 0;
            if (negTypes.has(originalEntry.type)) delta = -3;
            else if (posTypes.has(originalEntry.type)) delta = 2;
            if (delta !== 0) Relationship.secondhandInfluence(npc, originalEntry, delta);
        }
        return true;
    },

    // Get memories for display in the UI (sorted by recency)
    getMemoriesForDisplay(npc) {
        if (!npc.memories) return [];
        // Return a copy sorted by tick descending (most recent first)
        return npc.memories.slice().sort((a, b) => b.tick - a.tick);
    },

    // ── Internal ──

    _evictLowest(npc) {
        let lowestIdx = 0;
        let lowestScore = Infinity;
        for (let i = 0; i < npc.memories.length; i++) {
            const score = this.effectivePriority(npc.memories[i]);
            if (score < lowestScore) {
                lowestScore = score;
                lowestIdx = i;
            }
        }
        npc.memories.splice(lowestIdx, 1);
    }
};
