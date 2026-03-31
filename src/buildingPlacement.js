// Stonekeep - Building Placement
'use strict';

const BuildingPlacement = {
    isPlacing: false,
    selectedBuilding: null,
    cursorTileX: 0,
    cursorTileY: 0,

    // Wall line-drawing state
    _wallDrawing: false,
    _wallStartX: -1,
    _wallStartY: -1,
    _wallPreviewTiles: [],

    startPlacing(buildingId) {
        this.selectedBuilding = buildingId;
        this.isPlacing = true;
        this._wallDrawing = false;
        this._wallStartX = -1;
        this._wallStartY = -1;
        this._wallPreviewTiles = [];
    },

    cancel() {
        this.isPlacing = false;
        this.selectedBuilding = null;
        this._wallDrawing = false;
        this._wallStartX = -1;
        this._wallStartY = -1;
        this._wallPreviewTiles = [];
        UI.clearBuildSelection();
    },

    _isWallType(buildingId) {
        const def = BUILDINGS[buildingId];
        return def && (def.isWall === true || def.isMoat === true || def.isFill === true || def.isPitchDitch === true);
    },

    _canReplaceWall(buildingId) {
        const def = BUILDINGS[buildingId];
        return def && (def.isTower || def.isGate);
    },

    _getLineTiles(x0, y0, x1, y1) {
        // Bresenham's line algorithm for any-angle wall lines
        const tiles = [];
        let dx = Math.abs(x1 - x0);
        let dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;
        let cx = x0, cy = y0;

        while (true) {
            tiles.push({ x: cx, y: cy });
            if (cx === x1 && cy === y1) break;
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                cx += sx;
            }
            if (e2 < dx) {
                err += dx;
                cy += sy;
            }
        }
        return tiles;
    },

    _updateWallPreview() {
        if (!this._wallDrawing || this._wallStartX < 0) {
            this._wallPreviewTiles = [];
            return;
        }
        this._wallPreviewTiles = this._getLineTiles(
            this._wallStartX, this._wallStartY,
            this.cursorTileX, this.cursorTileY
        );
    },

    canPlaceWallAt(x, y) {
        if (!this.selectedBuilding) return false;
        const def = BUILDINGS[this.selectedBuilding];
        if (!def) return false;
        if (!Resources.canAfford(def.cost)) return false;

        const tile = World.getTile(x, y);
        if (!tile || !tile.discovered) return false;

        // Moat: allow on buildable terrain, disallow on water or existing buildings
        if (def.isMoat) {
            if (tile.terrain === TERRAIN.WATER) return false;
            if (World.getBuildingAt(x, y)) return false;
            if (!tile.terrain.buildable) return false;
            return true;
        }

        // Fill: only on water tiles (converts water back to desert)
        if (def.isFill) {
            if (tile.terrain !== TERRAIN.WATER) return false;
            return true;
        }

        // Pitch Ditch: allow on buildable terrain, disallow on water/buildings/pitch ditch
        if (def.isPitchDitch) {
            if (tile.terrain === TERRAIN.WATER) return false;
            if (tile.terrain === TERRAIN.PITCH_DITCH) return false;
            if (World.getBuildingAt(x, y)) return false;
            if (!tile.terrain.buildable) return false;
            return true;
        }

        if (World.getBuildingAt(x, y)) return false;
        if (!tile.terrain.buildable) return false;
        return true;
    },

    startWallDraw(x, y) {
        this._wallDrawing = true;
        this._wallStartX = x;
        this._wallStartY = y;
        this._updateWallPreview();
    },

    finishWallDraw() {
        if (!this._wallDrawing) return;
        const tiles = this._wallPreviewTiles;
        const def = BUILDINGS[this.selectedBuilding];

        for (const t of tiles) {
            if (!this.canPlaceWallAt(t.x, t.y)) continue;
            if (!Resources.canAfford(def.cost)) break;

            Resources.spend(def.cost);

            if (def.isMoat) {
                // Moat converts terrain to water instead of creating a building
                World.setTerrain(t.x, t.y, TERRAIN.WATER);
            } else if (def.isFill) {
                // Fill converts water terrain back to desert
                World.setTerrain(t.x, t.y, TERRAIN.DESERT);
            } else if (def.isPitchDitch) {
                // Pitch ditch converts terrain to flammable pitch ditch
                World.setTerrain(t.x, t.y, TERRAIN.PITCH_DITCH);
            } else {
                const building = {
                    id: World.createBuildingId(),
                    type: this.selectedBuilding,
                    x: t.x,
                    y: t.y,
                    workers: [],
                    production: 0,
                    active: true,
                    storage: {}
                };
                World.addBuilding(building);
            }
        }

        this._wallDrawing = false;
        this._wallStartX = -1;
        this._wallStartY = -1;
        this._wallPreviewTiles = [];
        // Keep placing mode for walls
    },

    cancelWallDraw() {
        this._wallDrawing = false;
        this._wallStartX = -1;
        this._wallStartY = -1;
        this._wallPreviewTiles = [];
    },

    canPlace(x, y) {
        if (!this.selectedBuilding) return false;
        const def = BUILDINGS[this.selectedBuilding];
        if (!def) return false;

        // Check cost
        if (!Resources.canAfford(def.cost)) return false;

        // Check unique
        if (def.unique && World.getBuildingsOfType(this.selectedBuilding).length > 0) {
            return false;
        }

        // Check all tiles in footprint
        let totalTiles = 0;
        let fertileTiles = 0;
        let depositTiles = 0;
        for (let dy = 0; dy < def.height; dy++) {
            for (let dx = 0; dx < def.width; dx++) {
                const tx = x + dx;
                const ty = y + dy;
                const tile = World.getTile(tx, ty);
                if (!tile || !tile.discovered) return false;

                // For deposit-gathering buildings (quarry, iron mine, pitch rig),
                // allow placement on matching deposit terrain
                if (def.placeOnDeposit && def.gathersFrom && tile && tile.terrain.resource === def.gathersFrom) {
                    // Still disallow if another building already occupies this tile
                    if (World.getBuildingAt(tx, ty)) return false;
                    depositTiles++;
                } else if (this._canReplaceWall(this.selectedBuilding) && World.getBuildingAt(tx, ty)) {
                    // Towers and gatehouses can replace wall tiles
                    const existingBuilding = World.getBuildingAt(tx, ty);
                    if (!existingBuilding || !BUILDINGS[existingBuilding.type].isWall) {
                        return false; // Can only replace walls, not other buildings
                    }
                } else if (!World.isBuildable(tx, ty)) {
                    return false;
                }

                totalTiles++;
                // Track fertility for ≥50% overlap check
                if (def.requiresFertile) {
                    if (tile && tile.terrain.fertile) {
                        fertileTiles++;
                    }
                }
            }
        }

        // Deposit-gathering buildings must have at least 50% of tiles on deposit
        if (def.placeOnDeposit && def.gathersFrom && depositTiles < Math.ceil(totalTiles / 2)) {
            return false;
        }

        // Check fertility: at least 50% of tiles must be on fertile terrain
        if (def.requiresFertile && fertileTiles < Math.ceil(totalTiles / 2)) {
            return false;
        }

        // Setup phase restrictions
        if (World.gamePhase === 'setup') {
            if (World.setupStep === 0 && this.selectedBuilding !== 'keep') return false;
            if (World.setupStep === 1 && this.selectedBuilding !== 'granary') return false;
            if (World.setupStep === 2 && this.selectedBuilding !== 'stockpile') return false;
        }

        return true;
    },

    place(x, y) {
        if (!this.canPlace(x, y)) return false;

        const def = BUILDINGS[this.selectedBuilding];

        // Remove any wall tiles that this building would replace (tower/gatehouse)
        if (this._canReplaceWall(this.selectedBuilding)) {
            for (let dy = 0; dy < def.height; dy++) {
                for (let dx = 0; dx < def.width; dx++) {
                    const tx = x + dx;
                    const ty = y + dy;
                    const existingBuilding = World.getBuildingAt(tx, ty);
                    if (existingBuilding && BUILDINGS[existingBuilding.type].isWall) {
                        World.removeBuilding(existingBuilding.id);
                    }
                }
            }
        }

        Resources.spend(def.cost);

        const building = {
            id: World.createBuildingId(),
            type: this.selectedBuilding,
            x: x,
            y: y,
            workers: [],
            production: 0,
            active: true,
            storage: {}
        };

        // All buildings get structural HP
        building.maxHp = CONFIG.BUILDING_BASE_HP * def.width * def.height;
        building.hp = building.maxHp;

        // Flammable buildings get fire HP
        if (def.flammable) {
            building.fireHp = CONFIG.FIRE_BUILDING_HP;
        }

        World.addBuilding(building);
        EventLog.add('positive', 'Construction completed: ' + def.name + '.', building.x, building.y);

        // Handle setup phase
        if (World.gamePhase === 'setup') {
            if (World.setupStep === 0) {
                World.keepPos = { x, y };
                World.setupStep = 1;
                UI.showSetupMessage('Place your Granary');
                this.startPlacing('granary');
                return true;
            } else if (World.setupStep === 1) {
                World.granaryPos = { x, y };
                World.setupStep = 2;
                UI.showSetupMessage('Place your Stockpile');
                this.startPlacing('stockpile');
                return true;
            } else if (World.setupStep === 2) {
                World.stockpilePos = { x, y };
                World.setupStep = 3;
                World.gamePhase = 'playing';
                this.cancel();
                Game.onSetupComplete();
                return true;
            }
        }

        // Update core building positions when rebuilt
        if (this.selectedBuilding === 'keep') World.keepPos = { x, y };
        if (this.selectedBuilding === 'granary') World.granaryPos = { x, y };
        if (this.selectedBuilding === 'stockpile') World.stockpilePos = { x, y };

        // Handle housing
        if (def.housing) {
            World.maxPopulation += def.housing;
            NPC.reassignAllHomes();
        }

        // Handle happiness buildings
        if (def.happinessBonus) {
            // Happiness bonus is checked each tick in Popularity module
        }

        // Assign workers if building needs them
        if (def.workers && def.workers > 0) {
            NPC.assignWorkersToBuilding(building);
        }

        // If building gathers from a terrain resource, don't stop placing (for walls etc.)
        if (def.isWall || def.isMoat || def.isFill || def.isPitchDitch || def.id === 'lowWall' || def.id === 'highWall') {
            // Keep placing mode for walls and moat
            return true;
        }

        this.cancel();
        return true;
    }
};
