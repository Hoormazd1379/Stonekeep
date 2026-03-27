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
        disease: 0
    },

    taxRate: 0,  // -5 to +5 scale, 0 = no tax
    // Negative tax = bribe (costs gold, gives happiness)
    // Positive tax = collects gold but reduces happiness

    update() {
        // Calculate each factor
        this._calcFoodFactor();
        this._calcFoodVarietyFactor();
        this._calcTaxFactor();
        this._calcReligionFactor();
        this._calcHousingFactor();
        this._calcAleFactor();
        this._calcFearFactor();
        this._calcDiseaseFactor();

        // Sum all factors
        let total = 50; // Base happiness
        total += this.factors.food;
        total += this.factors.foodVariety;
        total += this.factors.tax;
        total += this.factors.religion;
        total += this.factors.housing;
        total += this.factors.ale;
        total += this.factors.fear;
        total += this.factors.disease;

        World.happiness = Utils.clamp(Math.floor(total), 0, 100);

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
        const ratio = World.population / World.maxPopulation;
        if (ratio > 1.0) {
            this.factors.housing = -6; // Overcrowded
        } else if (ratio > 0.8) {
            this.factors.housing = -2;
        } else {
            this.factors.housing = 2;
        }
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
                World.npcs.splice(idle, 1);
                World.population--;
                World.idlePeasants--;
            }
        }
    },

    _collectTax() {
        // Collect/bribe every 30 ticks
        if (World.tick % 30 !== 0) return;

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
    }
};
