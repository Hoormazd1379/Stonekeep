// Stonekeep - Time System (Phase 3.1)
// Manages 24-hour in-game day/night cycle with day phases and ambient lighting.
'use strict';

const Time = {
    // Current state
    hour: 8,           // 0-23 (fractional for smooth transitions)
    day: 1,            // Day counter (starts at 1)
    phase: 'day',      // 'dawn', 'day', 'dusk', 'night'
    _tickAccum: 0,     // Tick accumulator within current hour

    // Phase definitions: { start, end } in hours
    PHASES: {
        dawn:  { start: 5,  end: 7  },
        day:   { start: 7,  end: 19 },
        dusk:  { start: 19, end: 21 },
        night: { start: 21, end: 29 }  // 29 = 5 (wraps at 24)
    },

    init() {
        this.hour = CONFIG.START_HOUR;
        this.day = 1;
        this._tickAccum = 0;
        this._updatePhase();
    },

    update() {
        this._tickAccum++;
        if (this._tickAccum >= CONFIG.TICKS_PER_HOUR) {
            this._tickAccum = 0;
            this.hour++;
            if (this.hour >= 24) {
                this.hour = 0;
                this.day++;
            }
            this._updatePhase();
        }
    },

    _updatePhase() {
        const h = this.hour;
        if (h >= 5 && h < 7) {
            this.phase = 'dawn';
        } else if (h >= 7 && h < 19) {
            this.phase = 'day';
        } else if (h >= 19 && h < 21) {
            this.phase = 'dusk';
        } else {
            this.phase = 'night';
        }
    },

    // Get the fractional hour (includes tick progress within the hour)
    getExactHour() {
        return this.hour + this._tickAccum / CONFIG.TICKS_PER_HOUR;
    },

    // Get formatted time string "HH:MM"
    getTimeString() {
        const exact = this.getExactHour();
        const h = Math.floor(exact);
        const m = Math.floor((exact - h) * 60);
        return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    },

    // Get day/night icon for UI
    getPhaseIcon() {
        switch (this.phase) {
            case 'dawn':  return '^';
            case 'day':   return '*';
            case 'dusk':  return 'v';
            case 'night': return '(';
            default:      return '*';
        }
    },

    // Get phase display name
    getPhaseName() {
        switch (this.phase) {
            case 'dawn':  return 'Dawn';
            case 'day':   return 'Day';
            case 'dusk':  return 'Dusk';
            case 'night': return 'Night';
            default:      return 'Day';
        }
    },

    // Get current vision radius based on day phase
    getVisionRadius() {
        switch (this.phase) {
            case 'day':   return CONFIG.VISION_RADIUS;        // 15
            case 'dawn':
            case 'dusk':  return CONFIG.DAWN_VISION_RADIUS;   // 12
            case 'night': return CONFIG.NIGHT_VISION_RADIUS;  // 10
            default:      return CONFIG.VISION_RADIUS;
        }
    },

    // Get ambient overlay color and alpha for the current time
    // Returns { color: string, alpha: number } for compositing over the game canvas
    getAmbientOverlay() {
        const exact = this.getExactHour();

        // Smooth transitions using interpolation
        // Night (21-5): deep blue overlay, alpha ~0.35
        // Dawn (5-7): amber/orange overlay fading out
        // Day (7-19): no overlay (alpha 0)
        // Dusk (19-21): amber/orange overlay fading in

        if (exact >= 7 && exact < 19) {
            // Full day — no overlay
            return { r: 0, g: 0, b: 0, alpha: 0 };
        }

        if (exact >= 19 && exact < 21) {
            // Dusk: transition from clear to night
            const t = (exact - 19) / 2; // 0 to 1
            // Blend from warm amber to blue night
            const r = Math.floor(40 * (1 - t) + 10 * t);
            const g = Math.floor(25 * (1 - t) + 15 * t);
            const b = Math.floor(10 * (1 - t) + 50 * t);
            const alpha = t * 0.35;
            return { r, g, b, alpha };
        }

        if (exact >= 21 || exact < 5) {
            // Night: deep blue overlay
            return { r: 10, g: 15, b: 50, alpha: 0.35 };
        }

        if (exact >= 5 && exact < 7) {
            // Dawn: transition from night to clear
            const t = (exact - 5) / 2; // 0 to 1
            // Blend from blue night to warm amber to clear
            const r = Math.floor(10 * (1 - t) + 40 * t);
            const g = Math.floor(15 * (1 - t) + 25 * t);
            const b = Math.floor(50 * (1 - t) + 10 * t);
            const alpha = 0.35 * (1 - t);
            return { r, g, b, alpha };
        }

        return { r: 0, g: 0, b: 0, alpha: 0 };
    },

    // Is it currently night time?
    isNight() {
        return this.phase === 'night';
    },

    // Should fires/torches glow brighter? (night & dusk)
    isFireEnhanced() {
        return this.phase === 'night' || this.phase === 'dusk';
    }
};
