// Stonekeep - NPC Personality Trait System (Phase 3.4)
'use strict';

const Personality = {
    // Data-driven trait pool — each trait has modifier weights
    TRAITS: {
        brave: {
            name: 'Brave',
            description: 'Less likely to flee from danger',
            modifiers: { fleeChance: -0.6, combatWillingness: 0.3, moodBufferNeg: 0.1 }
        },
        cowardly: {
            name: 'Cowardly',
            description: 'More likely to flee, avoids conflict',
            modifiers: { fleeChance: 0.4, combatWillingness: -0.4, moodBufferNeg: -0.1 }
        },
        greedy: {
            name: 'Greedy',
            description: 'Dislikes taxes more, higher theft chance',
            modifiers: { taxSensitivity: 1.5, theftChance: 0.15 }
        },
        generous: {
            name: 'Generous',
            description: 'Tolerates taxes better, improves relationships',
            modifiers: { taxSensitivity: 0.5, relationshipGainRate: 1.3 }
        },
        social: {
            name: 'Social',
            description: 'Happier around others, gains mood from interactions',
            modifiers: { socialMoodBonus: 3, relationshipGainRate: 1.2 }
        },
        loner: {
            name: 'Loner',
            description: 'Prefers solitude, unaffected by social interactions',
            modifiers: { socialMoodBonus: -1, relationshipGainRate: 0.7 }
        },
        hardworking: {
            name: 'Hardworking',
            description: 'Works faster but tires more quickly',
            modifiers: { workSpeedMult: 1.2, fatigueRateMult: 1.15 }
        },
        lazy: {
            name: 'Lazy',
            description: 'Works slower but tires less quickly',
            modifiers: { workSpeedMult: 0.8, fatigueRateMult: 0.85 }
        },
        aggressive: {
            name: 'Aggressive',
            description: 'More likely to fight, higher damage',
            modifiers: { combatWillingness: 0.5, fightChance: 0.2, moodBufferNeg: -0.1 }
        },
        peaceful: {
            name: 'Peaceful',
            description: 'Avoids conflict, happier in peaceful times',
            modifiers: { combatWillingness: -0.3, fightChance: -0.15, peaceMoodBonus: 2 }
        },
        pious: {
            name: 'Pious',
            description: 'Benefits more from religion, happier near chapels',
            modifiers: { religionSensitivity: 1.5, religionMoodBonus: 3 }
        },
        skeptical: {
            name: 'Skeptical',
            description: 'Less affected by religion, more independent',
            modifiers: { religionSensitivity: 0.5, religionMoodBonus: -1 }
        }
    },

    // Opposing trait pairs — can't have both
    _opposites: [
        ['brave', 'cowardly'],
        ['greedy', 'generous'],
        ['social', 'loner'],
        ['hardworking', 'lazy'],
        ['aggressive', 'peaceful'],
        ['pious', 'skeptical']
    ],

    // Assign 2-3 traits to an NPC based on their id (deterministic)
    assignTraits(npc) {
        const traitKeys = Object.keys(this.TRAITS);
        const seed = npc.id * 31 + 7;
        const count = 2 + (seed % 3 === 0 ? 1 : 0); // 2 or 3 traits

        const chosen = [];
        let attempt = 0;
        const rng = this._seededRng(seed);

        while (chosen.length < count && attempt < 50) {
            attempt++;
            const idx = Math.floor(rng() * traitKeys.length);
            const traitId = traitKeys[idx];
            if (chosen.includes(traitId)) continue;

            // Check for opposing traits
            let hasOpposite = false;
            for (const pair of this._opposites) {
                if (pair.includes(traitId) && chosen.some(c => pair.includes(c))) {
                    hasOpposite = true;
                    break;
                }
            }
            if (hasOpposite) continue;

            chosen.push(traitId);
        }

        npc.traits = chosen;
    },

    // Get the combined modifier value for an NPC
    getModifier(npc, modifierKey) {
        if (!npc.traits) return 0;
        let total = 0;
        for (const traitId of npc.traits) {
            const trait = this.TRAITS[traitId];
            if (trait && trait.modifiers[modifierKey] !== undefined) {
                total += trait.modifiers[modifierKey];
            }
        }
        return total;
    },

    // Get multiplier-type modifier (returns 1.0 if no traits affect it)
    getMultiplier(npc, modifierKey) {
        if (!npc.traits) return 1.0;
        let mult = 1.0;
        for (const traitId of npc.traits) {
            const trait = this.TRAITS[traitId];
            if (trait && trait.modifiers[modifierKey] !== undefined) {
                mult = trait.modifiers[modifierKey];
            }
        }
        return mult;
    },

    // Get trait display info for UI
    getTraitInfo(traitId) {
        return this.TRAITS[traitId] || null;
    },

    // Simple seeded PRNG (xorshift-like)
    _seededRng(s) {
        let state = s;
        return function() {
            state ^= state << 13;
            state ^= state >> 17;
            state ^= state << 5;
            return (Math.abs(state) % 10000) / 10000;
        };
    }
};
