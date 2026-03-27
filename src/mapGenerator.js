// Stonekeep - Procedural Map Generator (Chunk-based)
'use strict';

const MapGenerator = {
    _seed: 0,
    _worldSize: 0,
    _centerX: 0,
    _centerY: 0,
    _regionSize: 256,
    _regionFeatures: {},  // cached per-region: { oases, clusters }

    // Initialize generator — features are generated lazily per region
    init(seed, worldSize) {
        this._seed = seed;
        this._worldSize = worldSize;
        this._centerX = Math.floor(worldSize / 2);
        this._centerY = Math.floor(worldSize / 2);
        this._regionFeatures = {};
    },

    // Lazily compute features for a 256×256 region using deterministic RNG
    _ensureRegion(rx, ry) {
        const key = rx + ',' + ry;
        if (this._regionFeatures[key]) return this._regionFeatures[key];

        const rng = Utils.createRNG(this._seed + rx * 73856093 + ry * 19349663);
        const rs = this._regionSize;
        const ox = rx * rs;
        const oy = ry * rs;
        const cX = this._centerX;
        const cY = this._centerY;

        // Oases: 0-2 per region (~35% chance per slot)
        const oases = [];
        const numSlots = 2 + Math.floor(rng() * 2);
        for (let i = 0; i < numSlots; i++) {
            if (rng() > 0.35) continue;
            oases.push({
                x: ox + Math.floor(rng() * rs),
                y: oy + Math.floor(rng() * rs),
                radius: 8 + Math.floor(rng() * 12)
            });
        }

        // Resource clusters
        const clusters = [];

        // Stone (2-4 per region)
        const numStone = 2 + Math.floor(rng() * 3);
        for (let i = 0; i < numStone; i++) {
            const cx = ox + Math.floor(rng() * rs);
            const cy = oy + Math.floor(rng() * rs);
            if (Utils.distance(cx, cy, cX, cY) < 10) continue;
            clusters.push({
                x: cx, y: cy,
                terrain: TERRAIN.STONE,
                size: 5 + Math.floor(rng() * 6),
                resource: 1000 + Math.floor(rng() * 1500)
            });
        }

        // Iron (1-3 per region)
        const numIron = 1 + Math.floor(rng() * 3);
        for (let i = 0; i < numIron; i++) {
            const cx = ox + Math.floor(rng() * rs);
            const cy = oy + Math.floor(rng() * rs);
            if (Utils.distance(cx, cy, cX, cY) < 12) continue;
            clusters.push({
                x: cx, y: cy,
                terrain: TERRAIN.IRON,
                size: 4 + Math.floor(rng() * 4),
                resource: 500 + Math.floor(rng() * 700)
            });
        }

        // Pitch (1-3 per region)
        const numPitch = 1 + Math.floor(rng() * 3);
        for (let i = 0; i < numPitch; i++) {
            const cx = ox + Math.floor(rng() * rs);
            const cy = oy + Math.floor(rng() * rs);
            if (Utils.distance(cx, cy, cX, cY) < 10) continue;
            clusters.push({
                x: cx, y: cy,
                terrain: TERRAIN.PITCH,
                size: 4 + Math.floor(rng() * 4),
                resource: 300 + Math.floor(rng() * 500)
            });
        }

        const features = { oases: oases, clusters: clusters };
        this._regionFeatures[key] = features;
        return features;
    },

    // Get all oases from 3×3 region neighborhood around (x, y)
    _getNearbyOases(x, y) {
        const rs = this._regionSize;
        const rx = Math.floor(x / rs);
        const ry = Math.floor(y / rs);
        const result = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const features = this._ensureRegion(rx + dx, ry + dy);
                for (let i = 0; i < features.oases.length; i++) result.push(features.oases[i]);
            }
        }
        return result;
    },

    // Get clusters from nearby regions that could overlap a chunk area
    _getNearbyClusters(ox, oy, cs) {
        const rs = this._regionSize;
        const margin = 8;
        const minRX = Math.floor((ox - margin) / rs);
        const maxRX = Math.floor((ox + cs + margin) / rs);
        const minRY = Math.floor((oy - margin) / rs);
        const maxRY = Math.floor((oy + cs + margin) / rs);
        const result = [];
        for (let ry = minRY; ry <= maxRY; ry++) {
            for (let rx = minRX; rx <= maxRX; rx++) {
                const features = this._ensureRegion(rx, ry);
                for (let i = 0; i < features.clusters.length; i++) {
                    const c = features.clusters[i];
                    if (c.x >= ox - margin && c.x < ox + cs + margin &&
                        c.y >= oy - margin && c.y < oy + cs + margin) {
                        result.push(c);
                    }
                }
            }
        }
        return result;
    },

    // Generate the initial starting area and guaranteed resources
    generateArea(centerX, centerY, areaSize) {
        const halfSize = Math.floor(areaSize / 2);
        const cs = CONFIG.CHUNK_SIZE;

        // Generate all chunks covering the initial area
        const minCX = Math.floor(Math.max(0, centerX - halfSize) / cs);
        const maxCX = Math.floor(Math.min(this._worldSize - 1, centerX + halfSize) / cs);
        const minCY = Math.floor(Math.max(0, centerY - halfSize) / cs);
        const maxCY = Math.floor(Math.min(this._worldSize - 1, centerY + halfSize) / cs);

        for (let cy = minCY; cy <= maxCY; cy++) {
            for (let cx = minCX; cx <= maxCX; cx++) {
                if (!World.isChunkGenerated(cx, cy)) {
                    this.generateChunk(cx, cy);
                }
            }
        }

        // Ensure start area (radius 12) is buildable — clear cliffs/water/minerals
        for (let dy = -12; dy <= 12; dy++) {
            for (let dx = -12; dx <= 12; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                const tile = World.getTile(x, y);
                if (!tile) continue;
                const t = tile.terrain;
                if (t === TERRAIN.CLIFF || t === TERRAIN.ROCK ||
                    t === TERRAIN.WATER || t === TERRAIN.IRON ||
                    t === TERRAIN.PITCH || t === TERRAIN.STONE) {
                    World.setTerrain(x, y, TERRAIN.DESERT, 0);
                }
            }
        }

        // Place guaranteed resources near start
        this._placeGuaranteedStartResources(centerX, centerY);
    },

    // Generate a single chunk (32×32 tiles)
    generateChunk(cx, cy) {
        const cs = CONFIG.CHUNK_SIZE;
        const ox = cx * cs;
        const oy = cy * cs;

        // Generate base terrain for each tile
        for (let ly = 0; ly < cs; ly++) {
            for (let lx = 0; lx < cs; lx++) {
                const x = ox + lx;
                const y = oy + ly;
                if (!Utils.inBounds(x, y, World.width, World.height)) continue;
                this._generateTile(x, y);
            }
        }

        // Apply resource clusters from nearby regions that overlap this chunk
        const clusters = this._getNearbyClusters(ox, oy, cs);
        for (const cluster of clusters) {
            this._applyCluster(cluster, ox, oy, cs);
        }

        // Scatter trees deterministically in this chunk
        this._scatterTreesInChunk(ox, oy, cs);

        World.markChunkGenerated(cx, cy);
    },

    // Generate terrain for a single tile using position-based noise
    _generateTile(x, y) {
        const seed = this._seed;
        const moisture = Utils.noise2D(x, y, seed + 1, 24);
        const elevation = Utils.noise2D(x, y, seed + 2, 20);
        const detail = Utils.noise2D(x, y, seed + 3, 8);

        // Distance from nearest oasis — check nearby regions
        const oases = this._getNearbyOases(x, y);
        let minOasisDist = Infinity;
        let nearestOasis = null;
        for (const o of oases) {
            const d = Utils.distance(x, y, o.x, o.y);
            if (d < minOasisDist) {
                minOasisDist = d;
                nearestOasis = o;
            }
        }

        let terrain = TERRAIN.DESERT;
        let resourceAmount = 0;

        // ── Cliffs (high elevation) ──
        if (elevation > 0.78 && detail > 0.4) {
            terrain = TERRAIN.CLIFF;
        }
        // ── Rocks ──
        else if (elevation > 0.72 && detail > 0.55) {
            terrain = TERRAIN.ROCK;
        }
        // ── Water (inner oasis ring) ──
        else if (nearestOasis && minOasisDist < nearestOasis.radius * 0.35) {
            terrain = TERRAIN.WATER;
        }
        // ── Oasis (fertile ground near oasis center) ──
        else if (nearestOasis && minOasisDist < nearestOasis.radius * 0.55) {
            terrain = TERRAIN.OASIS;
        }
        // ── Trees (near oasis or high moisture pockets) ──
        else if (nearestOasis && minOasisDist < nearestOasis.radius * 0.85 && detail > 0.35) {
            terrain = TERRAIN.TREE_OASIS;
            resourceAmount = 3 + Math.floor(Utils.hashNoise(x, y, seed + 5) * 5);
        }
        // ── Grassland (moderate moisture or near oasis) ──
        else if (nearestOasis && minOasisDist < nearestOasis.radius * 1.1 && moisture > 0.35) {
            terrain = TERRAIN.GRASS;
        }
        else if (moisture > 0.7 && detail > 0.4) {
            terrain = TERRAIN.GRASS;
        }
        // ── Scattered trees in moist areas ──
        else if (moisture > 0.65 && detail > 0.6) {
            terrain = TERRAIN.TREE_GRASS;
            resourceAmount = 2 + Math.floor(Utils.hashNoise(x, y, seed + 6) * 4);
        }

        World.setTerrain(x, y, terrain, resourceAmount);
    },

    // Deterministic cluster application — uses hash noise for organic shape
    _applyCluster(cluster, ox, oy, cs) {
        const r = cluster.size + 1;
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const x = cluster.x + dx;
                const y = cluster.y + dy;
                // Only apply tiles within this chunk
                if (x < ox || x >= ox + cs || y < oy || y >= oy + cs) continue;
                if (!Utils.inBounds(x, y, World.width, World.height)) continue;

                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > r) continue;

                const densityNoise = Utils.hashNoise(x, y, this._seed + 777 + cluster.x * 31 + cluster.y * 37);
                const falloff = 1.0 - (dist / r);
                if (densityNoise < falloff * 0.7) {
                    if (this._canPlaceResource(x, y)) {
                        World.setTerrain(x, y, cluster.terrain, cluster.resource);
                    }
                }
            }
        }
    },

    // Deterministic tree scattering within a chunk
    _scatterTreesInChunk(ox, oy, cs) {
        for (let ly = 0; ly < cs; ly++) {
            for (let lx = 0; lx < cs; lx++) {
                const x = ox + lx;
                const y = oy + ly;
                if (!Utils.inBounds(x, y, World.width, World.height)) continue;

                const h = Utils.hashNoise(x, y, this._seed + 999);
                if (h < 0.005) {
                    const tile = World.getTile(x, y);
                    if (tile && (tile.terrain === TERRAIN.GRASS || tile.terrain === TERRAIN.DESERT) &&
                        !World.getBuildingAt(x, y)) {
                        const treeTerrain = tile.terrain === TERRAIN.GRASS ? TERRAIN.TREE_GRASS : TERRAIN.TREE_DESERT;
                        const amt = 2 + Math.floor(Utils.hashNoise(x, y, this._seed + 1000) * 4);
                        World.setTerrain(x, y, treeTerrain, amt);
                    }
                }
            }
        }
    },

    // Guaranteed start resources using growth-based clusters (one-shot during initial gen)
    _placeGuaranteedStartResources(startX, startY) {
        const rng = Utils.createRNG(this._seed + 12345);

        // Trees near start (3 clusters)
        for (let i = 0; i < 3; i++) {
            const angle = rng() * Math.PI * 2;
            const dist = 14 + rng() * 10;
            const cx = Math.floor(startX + Math.cos(angle) * dist);
            const cy = Math.floor(startY + Math.sin(angle) * dist);
            this._placeTreeCluster(cx, cy, 5 + Math.floor(rng() * 4), 4, rng);
        }

        // Stone near start (guaranteed deposit — 6 tiles, 1500 resource)
        const stoneAngle = rng() * Math.PI * 2;
        const stoneDist = 18 + rng() * 12;
        const stx = Math.floor(startX + Math.cos(stoneAngle) * stoneDist);
        const sty = Math.floor(startY + Math.sin(stoneAngle) * stoneDist);
        this._placeCluster(stx, sty, 6, TERRAIN.STONE, 1500, rng);

        // Iron near start (guaranteed deposit — 6 tiles, 800 resource)
        const ironAngle = stoneAngle + (Math.PI * 0.5) + rng() * 0.5;
        const ironDist = 22 + rng() * 12;
        const irx = Math.floor(startX + Math.cos(ironAngle) * ironDist);
        const iry = Math.floor(startY + Math.sin(ironAngle) * ironDist);
        this._placeCluster(irx, iry, 6, TERRAIN.IRON, 800, rng);

        // Pitch near start (guaranteed deposit — 5 tiles, 600 resource)
        const pitchAngle = stoneAngle + (Math.PI * 1.2) + rng() * 0.5;
        const pitchDist = 22 + rng() * 12;
        const px = Math.floor(startX + Math.cos(pitchAngle) * pitchDist);
        const py = Math.floor(startY + Math.sin(pitchAngle) * pitchDist);
        this._placeCluster(px, py, 5, TERRAIN.PITCH, 600, rng);

        // Secondary iron deposits (2 extra at medium range)
        for (let i = 0; i < 2; i++) {
            const angle = rng() * Math.PI * 2;
            const dist = 35 + rng() * 20;
            const cx = Math.floor(startX + Math.cos(angle) * dist);
            const cy = Math.floor(startY + Math.sin(angle) * dist);
            this._placeCluster(cx, cy, 4, TERRAIN.IRON, 600, rng);
        }

        // Secondary pitch deposits (2 extra at medium range)
        for (let i = 0; i < 2; i++) {
            const angle = rng() * Math.PI * 2;
            const dist = 35 + rng() * 20;
            const cx = Math.floor(startX + Math.cos(angle) * dist);
            const cy = Math.floor(startY + Math.sin(angle) * dist);
            this._placeCluster(cx, cy, 3, TERRAIN.PITCH, 500, rng);
        }
    },

    _placeCluster(cx, cy, count, terrain, resourceAmount, rng) {
        const placed = [];
        if (this._canPlaceResource(cx, cy)) {
            World.setTerrain(cx, cy, terrain, resourceAmount);
            placed.push({ x: cx, y: cy });
        }

        let attempts = 0;
        while (placed.length < count && attempts < count * 10) {
            attempts++;
            const base = placed[Math.floor(rng() * placed.length)] || { x: cx, y: cy };
            const dx = Math.floor(rng() * 3) - 1;
            const dy = Math.floor(rng() * 3) - 1;
            const nx = base.x + dx;
            const ny = base.y + dy;
            if (this._canPlaceResource(nx, ny)) {
                World.setTerrain(nx, ny, terrain, resourceAmount);
                placed.push({ x: nx, y: ny });
            }
        }
    },

    _placeTreeCluster(cx, cy, count, resourceAmount, rng) {
        const placed = [];
        if (this._canPlaceResource(cx, cy)) {
            const treeTerrain = this._getTreeVariant(cx, cy);
            World.setTerrain(cx, cy, treeTerrain, resourceAmount);
            placed.push({ x: cx, y: cy });
        }

        let attempts = 0;
        while (placed.length < count && attempts < count * 10) {
            attempts++;
            const base = placed[Math.floor(rng() * placed.length)] || { x: cx, y: cy };
            const dx = Math.floor(rng() * 3) - 1;
            const dy = Math.floor(rng() * 3) - 1;
            const nx = base.x + dx;
            const ny = base.y + dy;
            if (this._canPlaceResource(nx, ny)) {
                const treeTerrain = this._getTreeVariant(nx, ny);
                World.setTerrain(nx, ny, treeTerrain, resourceAmount);
                placed.push({ x: nx, y: ny });
            }
        }
    },

    _canPlaceResource(x, y) {
        if (!Utils.inBounds(x, y, World.width, World.height)) return false;
        const tile = World.getTile(x, y);
        if (!tile) return false;
        return tile.terrain === TERRAIN.DESERT || tile.terrain === TERRAIN.GRASS ||
               (tile.terrain.isTree === true);
    },

    _getTreeVariant(x, y) {
        const tile = World.getTile(x, y);
        if (!tile) return TERRAIN.TREE_DESERT;
        const t = tile.terrain;
        if (t === TERRAIN.OASIS || t === TERRAIN.TREE_OASIS) return TERRAIN.TREE_OASIS;
        if (t === TERRAIN.GRASS || t === TERRAIN.TREE_GRASS) return TERRAIN.TREE_GRASS;
        return TERRAIN.TREE_DESERT;
    }
};
