// Stonekeep - Utilities
'use strict';

const Utils = {
    // Seeded random number generator (mulberry32)
    createRNG(seed) {
        let s = seed | 0;
        return function() {
            s = (s + 0x6D2B79F5) | 0;
            let t = Math.imul(s ^ (s >>> 15), 1 | s);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    },

    // Hash a string to a number for seeding
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const c = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + c;
            hash |= 0;
        }
        return Math.abs(hash);
    },

    // Distance between two points
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    // Manhattan distance
    manhattan(x1, y1, x2, y2) {
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    },

    // Clamp value
    clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    },

    // Lerp
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    // Check if coordinates are in bounds
    inBounds(x, y, width, height) {
        return x >= 0 && y >= 0 && x < width && y < height;
    },

    // Get 4-directional neighbors
    getNeighbors4(x, y) {
        return [
            { x: x - 1, y },
            { x: x + 1, y },
            { x, y: y - 1 },
            { x, y: y + 1 }
        ];
    },

    // Get 8-directional neighbors
    getNeighbors8(x, y) {
        return [
            { x: x - 1, y: y - 1 }, { x, y: y - 1 }, { x: x + 1, y: y - 1 },
            { x: x - 1, y },                           { x: x + 1, y },
            { x: x - 1, y: y + 1 }, { x, y: y + 1 }, { x: x + 1, y: y + 1 }
        ];
    },

    // Hash-based deterministic noise value [0,1] from integer position and seed
    hashNoise(x, y, seed) {
        let h = (seed | 0) + (x | 0) * 374761393 + (y | 0) * 668265263;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        h = h ^ (h >>> 16);
        return (h & 0x7fffffff) / 0x7fffffff;
    },

    // Position-based 2D value noise with smoothstep interpolation [0,1]
    noise2D(x, y, seed, scale) {
        const sx = x / scale;
        const sy = y / scale;
        const ix = Math.floor(sx);
        const iy = Math.floor(sy);
        const fx = sx - ix;
        const fy = sy - iy;
        const ux = fx * fx * (3 - 2 * fx);
        const uy = fy * fy * (3 - 2 * fy);
        const a = this.hashNoise(ix, iy, seed);
        const b = this.hashNoise(ix + 1, iy, seed);
        const c = this.hashNoise(ix, iy + 1, seed);
        const d = this.hashNoise(ix + 1, iy + 1, seed);
        return this.lerp(
            this.lerp(a, b, ux),
            this.lerp(c, d, ux),
            uy
        );
    },

    // Simple 2D noise using RNG (value noise)
    createNoiseGrid(width, height, rng, scale) {
        const grid = [];
        const sw = Math.ceil(width / scale) + 2;
        const sh = Math.ceil(height / scale) + 2;
        const samples = [];
        for (let y = 0; y < sh; y++) {
            samples[y] = [];
            for (let x = 0; x < sw; x++) {
                samples[y][x] = rng();
            }
        }

        for (let y = 0; y < height; y++) {
            grid[y] = [];
            for (let x = 0; x < width; x++) {
                const sx = x / scale;
                const sy = y / scale;
                const ix = Math.floor(sx);
                const iy = Math.floor(sy);
                const fx = sx - ix;
                const fy = sy - iy;
                // Smoothstep
                const ux = fx * fx * (3 - 2 * fx);
                const uy = fy * fy * (3 - 2 * fy);

                const a = samples[iy][ix];
                const b = samples[iy][ix + 1];
                const c = samples[iy + 1][ix];
                const d = samples[iy + 1][ix + 1];

                const val = Utils.lerp(
                    Utils.lerp(a, b, ux),
                    Utils.lerp(c, d, ux),
                    uy
                );
                grid[y][x] = val;
            }
        }
        return grid;
    }
};
