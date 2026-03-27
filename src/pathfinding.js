// Stonekeep - A* Pathfinding
'use strict';

const Pathfinding = {
    /**
     * Find path from (sx,sy) to (tx,ty) using A*.
     * Returns array of {x,y} or null if no path.
     */
    findPath(sx, sy, tx, ty, opts = {}) {
        if (sx === tx && sy === ty) return [{ x: sx, y: sy }];
        if (!Utils.inBounds(tx, ty, World.width, World.height)) return null;

        const allowWall = opts.allowWall || false;
        const ownBuildingId = opts.ownBuildingId !== undefined ? opts.ownBuildingId : null;

        // Distance-proportional iteration budget: scales with search area
        // Supports virtually infinite distances while preventing runaway on unreachable targets
        const dist = Utils.manhattan(sx, sy, tx, ty);
        const maxIterations = Math.max(50000, dist * dist * 4);

        const w = World.width;
        const key = (x, y) => y * w + x;

        // Heuristic scale: minimum possible move cost (max road level 15)
        const hScale = 1 / (1 + 15 * 0.02); // ~0.769, keeps heuristic admissible

        const open = new MinHeap();
        const cameFrom = new Map();
        const gScore = new Map();
        const startKey = key(sx, sy);
        gScore.set(startKey, 0);
        open.push({ x: sx, y: sy, f: Utils.manhattan(sx, sy, tx, ty) * hScale });
        cameFrom.set(startKey, null);

        let steps = 0;
        while (open.size() > 0 && steps < maxIterations) {
            steps++;
            const current = open.pop();
            const cx = current.x, cy = current.y;

            if (cx === tx && cy === ty) {
                return this._reconstructPath(cameFrom, key, tx, ty);
            }

            const neighbors = Utils.getNeighbors4(cx, cy);
            const cKey = key(cx, cy);
            const cg = gScore.get(cKey);

            for (const n of neighbors) {
                if (!Utils.inBounds(n.x, n.y, World.width, World.height)) continue;

                // Check walkability and height transitions
                if (!this._canTransition(cx, cy, n.x, n.y, allowWall, ownBuildingId)) {
                    // Allow destination even if not walkable (for approaching resources etc.)
                    // But never bypass height transitions for wall-walking paths
                    if (allowWall || !(n.x === tx && n.y === ty)) continue;
                }

                const nKey = key(n.x, n.y);
                // Weight edge cost by traversal time: faster tiles (higher road level) = lower cost
                const nTile = World.tiles[n.y][n.x];
                const roadLevel = (nTile && nTile.roadLevel) || 0;
                const moveCost = 1 / (1 + roadLevel * 0.02); // matches NPC speed formula
                const ng = cg + moveCost;

                if (!gScore.has(nKey) || ng < gScore.get(nKey)) {
                    gScore.set(nKey, ng);
                    const f = ng + Utils.manhattan(n.x, n.y, tx, ty) * hScale;
                    cameFrom.set(nKey, cKey);
                    open.push({ x: n.x, y: n.y, f });
                }
            }
        }

        return null; // No path found
    },

    /**
     * Find nearest tile matching a predicate.
     * Returns {x, y} or null.
     */
    findNearest(sx, sy, predicate, maxDist) {
        const w = World.width;
        const visited = new Set();
        const queue = [{ x: sx, y: sy, dist: 0 }];
        visited.add(sy * w + sx);

        // Progressive search: no fixed distance cap by default
        // Safety iteration limit prevents runaway on huge/infinite maps
        const distLimit = maxDist || Infinity;
        const maxIterations = 200000;
        let iterations = 0;

        while (queue.length > 0 && iterations < maxIterations) {
            iterations++;
            const curr = queue.shift();
            if (curr.dist > distLimit) break;

            if (predicate(curr.x, curr.y)) {
                return { x: curr.x, y: curr.y };
            }

            const neighbors = Utils.getNeighbors4(curr.x, curr.y);
            for (const n of neighbors) {
                if (!Utils.inBounds(n.x, n.y, World.width, World.height)) continue;
                const nk = n.y * w + n.x;
                if (visited.has(nk)) continue;
                visited.add(nk);
                queue.push({ x: n.x, y: n.y, dist: curr.dist + 1 });
            }
        }
        return null;
    },

    _isPassable(x, y, allowWall, ownBuildingId) {
        const tile = World.getTile(x, y);
        if (!tile) return false;
        const bid = World.buildingMap[y] ? World.buildingMap[y][x] : undefined;
        // Allow passage through own building tiles (even on non-walkable terrain like deposits)
        if (ownBuildingId !== null && ownBuildingId !== undefined && bid === ownBuildingId) return true;
        if (!tile.terrain.walkable) return false;
        if (bid !== null && bid !== undefined) {
            const b = World.buildings.find(b => b.id === bid);
            if (b) {
                const def = BUILDINGS[b.type];
                // Stairs are always passable (connect ground to wall)
                if (def.isStairs) return true;
                if (allowWall && def.wallWalkable) return true;
                return def.walkable;
            }
        }
        return true;
    },

    // Check if neighbor is reachable considering height transitions
    _canTransition(fromX, fromY, toX, toY, allowWall, ownBuildingId) {
        if (!this._isPassable(toX, toY, allowWall, ownBuildingId || null)) return false;
        if (!allowWall) return true;

        // With allowWall, check height transitions require stairs
        const fromBid = World.buildingMap[fromY] ? World.buildingMap[fromY][fromX] : null;
        const toBid = World.buildingMap[toY] ? World.buildingMap[toY][toX] : null;
        const fromDef = fromBid !== null ? (() => { const b = World.buildings.find(b => b.id === fromBid); return b ? BUILDINGS[b.type] : null; })() : null;
        const toDef = toBid !== null ? (() => { const b = World.buildings.find(b => b.id === toBid); return b ? BUILDINGS[b.type] : null; })() : null;

        const fromIsWall = fromDef && fromDef.wallWalkable && !fromDef.isStairs && !fromDef.walkable;
        const toIsWall = toDef && toDef.wallWalkable && !toDef.isStairs && !toDef.walkable;
        const fromIsStairs = fromDef && fromDef.isStairs;
        const toIsStairs = toDef && toDef.isStairs;
        const fromIsGround = !fromDef || (fromDef.walkable && !fromDef.wallWalkable);
        const toIsGround = !toDef || (toDef.walkable && !toDef.wallWalkable);

        // Ground-to-wall or wall-to-ground transitions require going through stairs
        if (fromIsGround && toIsWall) return false;
        if (fromIsWall && toIsGround) return false;

        return true;
    },

    _reconstructPath(cameFrom, keyFn, tx, ty) {
        const path = [];
        let ck = keyFn(tx, ty);
        const w = World.width;
        while (ck !== null) {
            const y = Math.floor(ck / w);
            const x = ck % w;
            path.unshift({ x, y });
            ck = cameFrom.get(ck);
        }
        return path;
    }
};

// Simple min-heap for A*
class MinHeap {
    constructor() { this.data = []; }
    size() { return this.data.length; }
    push(item) {
        this.data.push(item);
        this._bubbleUp(this.data.length - 1);
    }
    pop() {
        const top = this.data[0];
        const last = this.data.pop();
        if (this.data.length > 0) {
            this.data[0] = last;
            this._sinkDown(0);
        }
        return top;
    }
    _bubbleUp(i) {
        while (i > 0) {
            const pi = (i - 1) >> 1;
            if (this.data[i].f < this.data[pi].f) {
                [this.data[i], this.data[pi]] = [this.data[pi], this.data[i]];
                i = pi;
            } else break;
        }
    }
    _sinkDown(i) {
        const n = this.data.length;
        while (true) {
            let min = i;
            const l = 2 * i + 1, r = 2 * i + 2;
            if (l < n && this.data[l].f < this.data[min].f) min = l;
            if (r < n && this.data[r].f < this.data[min].f) min = r;
            if (min !== i) {
                [this.data[i], this.data[min]] = [this.data[min], this.data[i]];
                i = min;
            } else break;
        }
    }
}
