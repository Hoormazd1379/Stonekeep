// Stonekeep - Popularity / Happiness System
'use strict';

const Popularity = {
    // Happiness factors
    factors: {
        food: 0,
        foodVariety: 0,
        tax: 0,
        religion: 0,
        housing: 0,
        ale: 0,
        fear: 0,
        disease: 0,
        hunger: 0
    },

    taxRate: 0,  // -5 to +5 scale, 0 = no tax
    // Negative tax = bribe (costs gold, gives happiness)
    // Positive tax = collects gold but reduces happiness
    _lastTaxDay: -1,  // Track last day tax was collected (once per work shift)

    init() {
        this.taxRate = 0;
        this._lastTaxDay = -1;
        this.factors = {
            food: 0, foodVariety: 0, tax: 0, religion: 0,
            housing: 0, ale: 0, fear: 0, disease: 0, hunger: 0
        };
    },

    update() {
        // Calculate each factor (still computed globally for use in per-NPC happiness)
        this._calcFoodFactor();
        this._calcFoodVarietyFactor();
        this._calcTaxFactor();
        this._calcReligionFactor();
        this._calcHousingFactor();
        this._calcAleFactor();
        this._calcFearFactor();
        this._calcDiseaseFactor();
        this._calcHungerFactor();

        // Compute per-NPC mood and happiness (Phase 3.4)
        const civilians = World.npcs.filter(n => n.type === 'peasant');
        if (civilians.length > 0) {
            let happinessSum = 0;
            for (const npc of civilians) {
                // Update mood
                npc.mood = Mood.compute(npc);
                // Individual happiness: blend mood with global factors
                npc.happiness = this._calcNpcHappiness(npc);
                happinessSum += npc.happiness;
            }
            World.happiness = Utils.clamp(Math.round(happinessSum / civilians.length), 0, 100);
        } else {
            World.happiness = 50;
        }

        // Handle peasant arrival/departure
        this._handlePopulationChange();

        // Handle tax collection
        this._collectTax();
    },

    _calcFoodFactor() {
        const food = Resources.getTotalFood();
        if (food <= 0) {
            this.factors.food = -8;
        } else if (food < World.population) {
            this.factors.food = -4;
        } else if (food < World.population * 2) {
            this.factors.food = 0;
        } else {
            this.factors.food = 4;
        }
        // SC-accurate ration level bonus/penalty
        const rationBonus = { 'Half': -4, 'Normal': 0, 'Extra': 4, 'Double': 8 };
        this.factors.food += rationBonus[World.rationLevel] || 0;
    },

    _calcFoodVarietyFactor() {
        const variety = Resources.getFoodVariety();
        // SC-accurate: 0-1 types = 0, 2 types = +1, 3 types = +2, 4 types = +3
        this.factors.foodVariety = Math.max(0, variety - 1);
    },

    _calcTaxFactor() {
        this.factors.tax = -this.taxRate * 4; // Each tax level costs 4 happiness
    },

    _calcReligionFactor() {
        let bonus = 0;

        // Static building bonuses (wells and other non-religious happiness buildings)
        for (const b of World.buildings) {
            const def = BUILDINGS[b.type];
            if (def.happinessBonus && !def.isReligious) {
                bonus += def.happinessBonus;
            }
        }

        // First-building bonuses for religious buildings
        let hasChurch = false, hasCathedral = false;
        for (const b of World.buildings) {
            if (!b.active) continue;
            const def = BUILDINGS[b.type];
            if (!def.isReligious) continue;
            if (b.type === 'church' && !hasChurch) { bonus += 1; hasChurch = true; }
            if (b.type === 'cathedral' && !hasCathedral) { bonus += 2; hasCathedral = true; }
        }

        // Coverage-based religion bonus (from priest blessing)
        const civilians = World.npcs.filter(n => n.type === 'peasant');
        if (civilians.length > 0) {
            const blessed = civilians.filter(n => n.blessedUntil && n.blessedUntil > World.tick).length;
            const coverage = blessed / civilians.length;
            if (coverage >= 1.0) bonus += 8;
            else if (coverage >= 0.75) bonus += 6;
            else if (coverage >= 0.5) bonus += 4;
            else if (coverage >= 0.25) bonus += 2;
        }

        this.factors.religion = bonus;
    },

    _calcHousingFactor() {
        if (World.maxPopulation <= 0) {
            this.factors.housing = 0;
            return;
        }
        const civilians = World.npcs.filter(n => n.type === 'peasant');
        if (civilians.length === 0) {
            this.factors.housing = 0;
            return;
        }
        // Count homeless NPCs — those without a home building (or whose home was destroyed)
        let homeless = 0;
        let tierSum = 0;
        for (const npc of civilians) {
            if (!npc.homeBuilding) {
                homeless++;
            } else {
                const home = World.buildings.find(b => b.id === npc.homeBuilding);
                if (!home) {
                    homeless++;
                } else {
                    const def = BUILDINGS[home.type];
                    tierSum += (def.housingTier || 1);
                }
            }
        }
        // Homeless penalty
        const homelessRatio = homeless / civilians.length;
        let bonus = 0;
        if (homelessRatio > 0.5) bonus = -6;
        else if (homelessRatio > 0.2) bonus = -3;
        else if (homelessRatio > 0) bonus = -1;
        // Housing quality bonus from tier average
        const housed = civilians.length - homeless;
        if (housed > 0) {
            const avgTier = tierSum / housed;
            if (avgTier >= 2.5) bonus += 4;       // Mostly houses
            else if (avgTier >= 1.8) bonus += 2;   // Mix of cottages/houses
            else if (avgTier >= 1.0) bonus += 1;   // Basic hovels
        }
        // Overcrowding (ratio-based fallback)
        const ratio = World.population / World.maxPopulation;
        if (ratio > 1.0) bonus -= 4;
        this.factors.housing = bonus;
    },

    _calcAleFactor() {
        // Count active inns with workers
        let activeInns = 0;
        for (const b of World.buildings) {
            if (b.type !== 'inn' || !b.active) continue;
            // Check if inn has a worker assigned
            const hasWorker = World.npcs.some(
                n => n.assignedBuilding === b.id
            );
            if (hasWorker) activeInns++;
        }

        if (activeInns === 0) {
            this.factors.ale = 0;
            return;
        }

        // Coverage: 1 inn per 25 population
        const needed = Math.max(1, Math.ceil(World.population / 25));
        const coverage = activeInns / needed;

        if (coverage >= 1.0) {
            this.factors.ale = 8;
        } else if (coverage >= 0.75) {
            this.factors.ale = 6;
        } else if (coverage >= 0.5) {
            this.factors.ale = 4;
        } else if (coverage >= 0.25) {
            this.factors.ale = 2;
        } else {
            this.factors.ale = 0;
        }
    },

    _calcFearFactor() {
        // Count good things (fearValue < 0) and bad things (fearValue > 0)
        let goodCount = 0;
        let badCount = 0;
        for (const b of World.buildings) {
            if (!b.active) continue;
            const def = BUILDINGS[b.type];
            if (!def.fearValue) continue;
            if (def.fearValue < 0) goodCount++;
            else if (def.fearValue > 0) badCount++;
        }

        // 1 building per 16 population per degree
        const perDegree = Math.max(1, Math.ceil(World.population / 16));

        // Raw fear: positive = bad, negative = good
        const netFear = badCount - goodCount;
        const rawFear = netFear >= 0
            ? Math.floor(netFear / perDegree)
            : -Math.floor(Math.abs(netFear) / perDegree);
        World.fearFactor = Utils.clamp(rawFear, -5, 5);

        // Fear popularity effect: each degree of fear costs 4 happiness
        // Negative fear (good) = +popularity, positive fear (bad) = -popularity
        this.factors.fear = -World.fearFactor * 4;

        // Production efficiency: 50% at fear -5 to 150% at fear +5
        World.fearEfficiency = 1.0 + (World.fearFactor * 0.10);
    },

    _calcDiseaseFactor() {
        // Count diseased NPCs
        const civilians = World.npcs.filter(n => !n.isBandit);
        if (civilians.length === 0) {
            this.factors.disease = 0;
            return;
        }
        const diseased = civilians.filter(n => n.diseased).length;
        const ratio = diseased / civilians.length;
        // Disease impact: -2 per 25% of population diseased (max -8)
        if (ratio >= 0.75) this.factors.disease = -8;
        else if (ratio >= 0.5) this.factors.disease = -6;
        else if (ratio >= 0.25) this.factors.disease = -4;
        else if (ratio > 0) this.factors.disease = -2;
        else this.factors.disease = 0;
    },

    _calcHungerFactor() {
        // Average hunger of civilian NPCs affects happiness
        const civilians = World.npcs.filter(n => n.type === 'peasant');
        if (civilians.length === 0) {
            this.factors.hunger = 0;
            return;
        }
        let starving = 0;
        let hungry = 0;
        let wellFed = 0;
        for (const npc of civilians) {
            if (npc.hunger <= CONFIG.HUNGER_STARVE_THRESHOLD) starving++;
            else if (npc.hunger < CONFIG.HUNGER_EAT_THRESHOLD) hungry++;
            else if (npc.hunger >= CONFIG.HUNGER_WELL_FED) wellFed++;
        }
        const starvingRatio = starving / civilians.length;
        const hungryRatio = hungry / civilians.length;
        const wellFedRatio = wellFed / civilians.length;
        let bonus = 0;
        // Starving: severe penalty
        if (starvingRatio > 0.5) bonus -= 6;
        else if (starvingRatio > 0.2) bonus -= 3;
        else if (starvingRatio > 0) bonus -= 1;
        // Hungry: mild penalty
        if (hungryRatio > 0.5) bonus -= 2;
        // Well-fed: bonus
        if (wellFedRatio > 0.75) bonus += 3;
        else if (wellFedRatio > 0.5) bonus += 2;
        else if (wellFedRatio > 0.25) bonus += 1;
        this.factors.hunger = bonus;
    },

    _handlePopulationChange() {
        // Every ~20 ticks, check for arrival/departure
        if (World.tick % 20 !== 0) return;

        if (World.happiness >= CONFIG.HAPPINESS_ARRIVAL_THRESHOLD &&
            World.population < World.maxPopulation) {
            // Spawn a new peasant
            if (World.keepPos) {
                const kx = World.keepPos.x + 1;
                const ky = World.keepPos.y + 3;
                NPC.spawnPeasant(kx, ky);
            }
        } else if (World.happiness < CONFIG.HAPPINESS_LEAVE_THRESHOLD &&
                   World.population > 0) {
            // Remove an idle peasant
            const idle = World.npcs.findIndex(
                n => n.type === 'peasant' && n.state === NPC.STATE.IDLE && !n.assignedBuilding
            );
            if (idle !== -1) {
                const leaver = World.npcs[idle];
                EventLog.add('caution', leaver.name + ' left due to low settlement happiness.', leaver.x, leaver.y);
                World.npcs.splice(idle, 1);
                World.population--;
                World.idlePeasants--;
            }
        }
    },

    _collectTax() {
        // Collect/bribe once per work shift (when work phase starts each day)
        const phase = NPC._getSchedulePhase();
        if (phase !== 'work') return;
        if (this._lastTaxDay === Time.day) return;  // Already collected today
        this._lastTaxDay = Time.day;

        if (this.taxRate > 0) {
            Resources.add('gold', this.taxRate * World.population);
        } else if (this.taxRate < 0) {
            const cost = Math.abs(this.taxRate) * World.population;
            if (Resources.get('gold') >= cost) {
                Resources.remove('gold', cost);
            }
        }
    },

    setTaxRate(rate) {
        this.taxRate = Utils.clamp(rate, -5, 5);
    },

    // Per-NPC happiness: combines individual mood with global factors (Phase 3.4)
    _calcNpcHappiness(npc) {
        // Start with mood as primary individual component (weighted ~60%)
        let h = npc.mood * 0.6;

        // Add global factors scaled down (weighted ~40% of their full effect)
        h += (50 + this.factors.food + this.factors.foodVariety + this.factors.ale
              + this.factors.fear + this.factors.disease) * 0.4;

        // Individual hunger factor (from mood already, but direct happiness impact)
        if (npc.hunger !== undefined) {
            if (npc.hunger <= CONFIG.HUNGER_STARVE_THRESHOLD) h -= 5;
            else if (npc.hunger >= CONFIG.HUNGER_WELL_FED) h += 2;
        }

        // Individual housing quality
        if (!npc.homeBuilding) {
            h -= 5;
        } else {
            const home = World.buildings.find(b => b.id === npc.homeBuilding);
            if (home) {
                const tier = (BUILDINGS[home.type].housingTier || 1);
                h += tier;
            }
        }

        // Tax sensitivity (modified by personality)
        const taxSens = Personality.getModifier(npc, 'taxSensitivity') || 1.0;
        h -= this.taxRate * 2 * taxSens;

        // Religion (individual: blessed NPCs get a bonus)
        const relMod = Personality.getModifier(npc, 'religionSensitivity') || 1.0;
        if (npc.blessedUntil && npc.blessedUntil > World.tick) {
            h += 3 * relMod;
        }

        return Utils.clamp(Math.round(h), 0, 100);
    }
};
