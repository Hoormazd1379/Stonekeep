// Stonekeep - NPC Mood System (Phase 3.4)
'use strict';

const Mood = {
    // Mood thresholds
    THRESHOLDS: [
        { min: 80, label: 'Joyful',    color: '#44ff44' },
        { min: 60, label: 'Content',   color: '#88cc44' },
        { min: 40, label: 'Neutral',   color: '#cccc44' },
        { min: 20, label: 'Unhappy',   color: '#cc8844' },
        { min: 10, label: 'Angry',     color: '#cc4444' },
        { min: 0,  label: 'Desperate', color: '#ff2222' }
    ],

    // ── Data-driven mood factor weights ──
    // Adding a new factor = add one entry here + implement its evaluator
    FACTORS: {
        hunger: {
            label: 'Hunger',
            evaluate(npc) {
                if (npc.hunger === undefined) return 0;
                if (npc.hunger <= CONFIG.HUNGER_STARVE_THRESHOLD) return { value: -20, label: 'Starving' };
                if (npc.hunger < CONFIG.HUNGER_EAT_THRESHOLD) return { value: -8, label: 'Hungry' };
                if (npc.hunger >= CONFIG.HUNGER_WELL_FED) return { value: 5, label: 'Well Fed' };
                return 0;
            }
        },
        fatigue: {
            label: 'Fatigue',
            evaluate(npc) {
                if (npc.fatigue === undefined) return 0;
                if (npc.fatigue >= CONFIG.FATIGUE_EXHAUSTION) return { value: -15, label: 'Exhausted' };
                if (npc.fatigue >= CONFIG.FATIGUE_HIGH) return { value: -8, label: 'Very Tired' };
                if (npc.fatigue < 20) return { value: 3, label: 'Rested' };
                return 0;
            }
        },
        health: {
            label: 'Health',
            evaluate(npc) {
                if (npc.maxHp <= 0) return 0;
                const ratio = npc.hp / npc.maxHp;
                if (ratio < 0.3) return { value: -12, label: 'Badly Injured' };
                if (ratio < 0.6) return { value: -5, label: 'Injured' };
                return 0;
            }
        },
        housing: {
            label: 'Housing',
            evaluate(npc) {
                if (npc.type !== 'peasant') return 0;
                if (!npc.homeBuilding) return { value: -10, label: 'Homeless' };
                const home = World.buildings.find(b => b.id === npc.homeBuilding);
                if (home) {
                    const tier = (BUILDINGS[home.type].housingTier || 1);
                    if (tier > 1) return { value: (tier - 1) * 3, label: 'Good Housing' };
                }
                return 0;
            }
        },
        tax: {
            label: 'Taxes',
            evaluate(npc) {
                const taxMod = Personality.getModifier(npc, 'taxSensitivity');
                const sens = taxMod !== 0 ? taxMod : 1.0;
                const val = -Popularity.taxRate * 3 * sens;
                if (val === 0) return 0;
                return { value: val, label: 'Taxes' };
            }
        },
        religion: {
            label: 'Religion',
            evaluate(npc) {
                const relMod = Personality.getModifier(npc, 'religionMoodBonus');
                if (npc.blessedUntil && npc.blessedUntil > World.tick) {
                    return { value: 4 + relMod, label: 'Blessed' };
                }
                return 0;
            }
        },
        disease: {
            label: 'Disease',
            evaluate(npc) {
                if (npc.diseased) return { value: -10, label: 'Diseased' };
                if (npc.onFire) return { value: -15, label: 'On Fire' };
                return 0;
            }
        },
        personalitySocial: {
            label: 'Personality (Social)',
            evaluate(npc) {
                const bonus = Personality.getModifier(npc, 'socialMoodBonus');
                if (bonus !== 0) return { value: bonus, label: 'Personality (Social)' };
                return 0;
            }
        },
        personalityPeace: {
            label: 'Peacetime',
            evaluate(npc) {
                const bonus = Personality.getModifier(npc, 'peaceMoodBonus');
                if (bonus !== 0) {
                    const banditsPresent = World.npcs.some(n => n.isBandit);
                    if (!banditsPresent) return { value: bonus, label: 'Peacetime' };
                }
                return 0;
            }
        },
        fear: {
            label: 'Fear',
            evaluate() {
                const val = Popularity.factors.fear * 0.5;
                if (val === 0) return 0;
                return { value: val, label: 'Fear' };
            }
        },
        ale: {
            label: 'Ale',
            evaluate() {
                const val = Popularity.factors.ale * 0.3;
                if (val === 0) return 0;
                return { value: val, label: 'Ale' };
            }
        },
        memories: {
            label: 'Memories',
            evaluate(npc) {
                if (!npc.memories || npc.memories.length === 0) return 0;
                const val = Memory.getMoodFromMemories(npc);
                if (val === 0) return 0;
                return { value: val, label: 'Memories' };
            }
        },
        relationships: {
            label: 'Relationships',
            evaluate(npc) {
                if (!npc.relationships || typeof Relationship === 'undefined') return 0;
                const ids = Object.keys(npc.relationships);
                if (ids.length === 0) return 0;
                let sum = 0;
                for (const id of ids) sum += npc.relationships[id];
                const avg = sum / ids.length;
                const val = Utils.clamp(Math.round(avg / 20), -5, 5);
                if (val === 0) return 0;
                return { value: val, label: 'Relationships' };
            }
        },
        socialRecent: {
            label: 'Social',
            evaluate(npc) {
                if (npc._recentSocialMoodUntil && npc._recentSocialMoodUntil > World.tick) {
                    const val = Utils.clamp(Math.round(npc._recentSocialMood || 0), -6, 6);
                    if (val !== 0) return { value: val, label: 'Social' };
                }
                return 0;
            }
        }
    },

    // Get mood label and color for a mood value
    getMoodInfo(mood) {
        for (const t of this.THRESHOLDS) {
            if (mood >= t.min) return { label: t.label, color: t.color };
        }
        return { label: 'Desperate', color: '#ff2222' };
    },

    // Compute mood for a single NPC (0-100)
    compute(npc) {
        let mood = 50; // Base mood
        for (const key in this.FACTORS) {
            const result = this.FACTORS[key].evaluate(npc);
            if (result && typeof result === 'object') {
                const val = result.value;
                if (typeof val === 'number' && !isNaN(val)) mood += val;
            }
        }
        const final = Utils.clamp(Math.round(mood), 0, 100);
        return isNaN(final) ? 50 : final;
    },

    // Return a breakdown of all mood factors for UI display
    getBreakdown(npc) {
        const factors = [{ label: 'Base', value: 50 }];
        for (const key in this.FACTORS) {
            const result = this.FACTORS[key].evaluate(npc);
            if (result && typeof result === 'object' && result.value !== 0) {
                factors.push({
                    label: result.label || this.FACTORS[key].label,
                    value: Math.round(result.value * 10) / 10
                });
            }
        }
        return factors;
    },

    // Compute work speed multiplier from mood
    getWorkSpeedMult(npc) {
        const mood = npc.mood || 50;
        if (mood >= 80) return 1.15;  // Joyful: 15% bonus
        if (mood >= 60) return 1.05;  // Content: 5% bonus
        if (mood < 20) return 0.75;   // Angry/Desperate: 25% penalty
        if (mood < 40) return 0.9;    // Unhappy: 10% penalty
        return 1.0;
    }
};
