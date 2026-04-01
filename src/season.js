// Stonekeep - Season & Weather System (Phase 4.2)
'use strict';

const Season = {
    current: 'spring',      // Current season: spring, summer, autumn, winter
    weather: 'clear',        // Current weather type
    _weatherEndTick: 0,      // Tick when current weather expires
    _seasonDay: 0,           // Day-within-season counter (0 to DAYS_PER_SEASON-1)
    _lastDay: -1,            // Track day changes
    _particles: [],          // Weather particle effects

    init() {
        this.current = 'spring';
        this.weather = 'clear';
        this._weatherEndTick = 0;
        this._seasonDay = 0;
        this._lastDay = -1;
        this._particles = [];
    },

    update() {
        if (World.gamePhase !== 'playing') return;

        // Check for day change → advance season counter
        if (Time.day !== this._lastDay) {
            if (this._lastDay >= 0) {
                this._seasonDay++;
                if (this._seasonDay >= CONFIG.DAYS_PER_SEASON) {
                    this._advanceSeason();
                }
            }
            this._lastDay = Time.day;
        }

        // Check if weather has expired → roll new weather
        if (World.tick >= this._weatherEndTick) {
            this._rollWeather();
        }

        // Update weather particles (every 2 ticks for performance)
        if (World.tick % 2 === 0) {
            this._updateParticles();
        }
    },

    _advanceSeason() {
        this._seasonDay = 0;
        const seasons = CONFIG.SEASONS;
        const idx = seasons.indexOf(this.current);
        this.current = seasons[(idx + 1) % seasons.length];

        // Notify player
        const name = CONFIG.SEASON_NAMES[this.current];
        const icon = CONFIG.SEASON_ICONS[this.current];
        Events.notify(icon + ' ' + name + ' has arrived!', '#88CCFF');
        EventLog.add('info', name + ' has begun (Day ' + Time.day + ').', null, null);

        // Roll new weather for the new season
        this._rollWeather();
    },

    _rollWeather() {
        const pool = CONFIG.WEATHER_POOLS[this.current];
        const totalWeight = pool.reduce((s, e) => s + e.weight, 0);
        let roll = Math.random() * totalWeight;
        let chosen = pool[0].type;
        for (const entry of pool) {
            roll -= entry.weight;
            if (roll <= 0) {
                chosen = entry.type;
                break;
            }
        }

        this.weather = chosen;
        const durationHours = CONFIG.WEATHER_MIN_DURATION_HOURS +
            Math.floor(Math.random() * (CONFIG.WEATHER_MAX_DURATION_HOURS - CONFIG.WEATHER_MIN_DURATION_HOURS + 1));
        this._weatherEndTick = World.tick + durationHours * CONFIG.TICKS_PER_HOUR;
    },

    // ── Query helpers ──

    isWinter() {
        return this.current === 'winter';
    },

    isFarmingSeason() {
        return this.current !== 'winter';
    },

    isRaining() {
        return this.weather === 'rain' || this.weather === 'storm';
    },

    isSnowing() {
        return this.weather === 'snow';
    },

    isCold() {
        return this.weather === 'cold' || this.weather === 'snow';
    },

    isHot() {
        return this.weather === 'heat';
    },

    getSpeedModifier() {
        let mod = 0;
        if (this.isWinter()) mod += CONFIG.WINTER_SPEED_PENALTY;
        if (this.weather === 'cold') mod += CONFIG.COLD_SPEED_PENALTY;
        if (this.weather === 'heat') mod += CONFIG.HEAT_SPEED_PENALTY;
        return mod; // Total penalty to subtract from walk speed
    },

    getRoadDecayMultiplier() {
        if (this.isSnowing()) return CONFIG.SNOW_ROAD_DECAY_MULT;
        if (this.isRaining()) return CONFIG.RAIN_ROAD_DECAY_MULT;
        return 1.0;
    },

    getSeasonName() {
        return CONFIG.SEASON_NAMES[this.current] || 'Spring';
    },

    getSeasonIcon() {
        return CONFIG.SEASON_ICONS[this.current] || '✿';
    },

    getWeatherName() {
        const wt = CONFIG.WEATHER_TYPES[this.weather];
        return wt ? wt.name : 'Clear';
    },

    getWeatherIcon() {
        const wt = CONFIG.WEATHER_TYPES[this.weather];
        return wt ? wt.icon : '☼';
    },

    getTerrainTint() {
        return CONFIG.SEASON_TERRAIN_TINT[this.current] || null;
    },

    // ── Weather particles ──

    _updateParticles() {
        // Remove expired particles
        this._particles = this._particles.filter(p => p.life > 0);

        // Spawn new particles based on weather
        if (this.isRaining() || this.isSnowing()) {
            const count = this.weather === 'storm' ? 6 : 3;
            for (let i = 0; i < count; i++) {
                this._particles.push({
                    x: Math.random(),    // 0-1 normalized screen position
                    y: -0.02,
                    vx: this.isRaining() ? (Math.random() * 0.002 - 0.001) : (Math.random() * 0.004 - 0.002),
                    vy: this.isRaining() ? (0.01 + Math.random() * 0.008) : (0.003 + Math.random() * 0.003),
                    life: 120 + Math.floor(Math.random() * 60),
                    type: this.isSnowing() ? 'snow' : 'rain'
                });
            }
        }

        // Cap particle count
        if (this._particles.length > 300) {
            this._particles = this._particles.slice(-300);
        }

        // Move particles
        for (const p of this._particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.y > 1.05) p.life = 0;
        }
    },

    getParticles() {
        return this._particles;
    },

    // ── Heating furnace warmth check ──

    isInFurnaceRange(x, y) {
        for (const b of World.buildings) {
            if (b.type !== 'heatingFurnace' || !b.active) continue;
            const dist = Math.abs(x - b.x) + Math.abs(y - b.y);
            if (dist <= CONFIG.HEATING_FURNACE_RADIUS) return true;
        }
        return false;
    },

    // ── Serialization ──

    serialize() {
        return {
            current: this.current,
            weather: this.weather,
            _weatherEndTick: this._weatherEndTick,
            _seasonDay: this._seasonDay,
            _lastDay: this._lastDay
        };
    },

    deserialize(data) {
        if (!data) return;
        this.current = data.current || 'spring';
        this.weather = data.weather || 'clear';
        this._weatherEndTick = data._weatherEndTick || 0;
        this._seasonDay = data._seasonDay || 0;
        this._lastDay = data._lastDay || -1;
        this._particles = [];
    }
};
