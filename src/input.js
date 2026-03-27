// Stonekeep - Input Handler
'use strict';

const Input = {
    keys: {},
    mouse: { x: 0, y: 0, down: false, button: 0 },
    scrollDelta: 0,

    // Drag-select state
    _dragStart: null,   // { sx, sy } screen coords at mousedown
    _isDragging: false,
    _dragBox: null,      // { x1, y1, x2, y2 } screen coords for current drag rect
    _DRAG_THRESHOLD: 5,  // pixels before mousedown becomes a drag

    init() {
        const canvas = Renderer.canvas;

        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            // Prevent scrolling with arrow keys
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
            this._handleKeyPress(e.key);
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        canvas.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            this._handleMouseMove(e);
        });

        canvas.addEventListener('mousedown', (e) => {
            this.mouse.down = true;
            this.mouse.button = e.button;
            if (e.button === 0) {
                this._dragStart = { sx: e.clientX, sy: e.clientY };
                this._isDragging = false;
                this._dragBox = null;
            }
            this._handleMouseDown(e);
        });

        canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                if (this._isDragging) {
                    this._finishDragSelect(e);
                } else if (this._dragStart) {
                    // Was a click, not a drag
                    this._handleClickSelect(e);
                }
            }
            this._dragStart = null;
            this._isDragging = false;
            this._dragBox = null;
            this.mouse.down = false;
        });

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY < 0) Camera.zoomIn();
            else Camera.zoomOut();
        }, { passive: false });

        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    },

    update() {
        // WASD or arrow key scrolling
        if (this.keys['w'] || this.keys['ArrowUp']) Camera.scroll(0, -3);
        if (this.keys['s'] || this.keys['ArrowDown']) Camera.scroll(0, 3);
        if (this.keys['a'] || this.keys['ArrowLeft']) Camera.scroll(-3, 0);
        if (this.keys['d'] || this.keys['ArrowRight']) Camera.scroll(3, 0);

        // Edge scrolling
        const m = CONFIG.EDGE_SCROLL_MARGIN;
        if (this.mouse.x < m) Camera.scroll(-2, 0);
        if (this.mouse.x > Renderer.width - m) Camera.scroll(2, 0);
        // Only edge-scroll top/bottom outside of UI areas
        if (this.mouse.y < m && this.mouse.y > 0) Camera.scroll(0, -2);
        if (this.mouse.y > Renderer.height - m && this.mouse.y < Renderer.height) Camera.scroll(0, 2);
    },

    _handleKeyPress(key) {
        if (World.gamePhase !== 'playing' && World.gamePhase !== 'setup') return;

        // Speed controls
        if (key === '1') Game.setSpeed(0);
        if (key === '2') Game.setSpeed(1);
        if (key === '3') Game.setSpeed(2);
        if (key === '4') Game.setSpeed(3);

        // Cancel placement
        if (key === 'Escape') {
            if (BuildingPlacement.isPlacing) {
                BuildingPlacement.cancel();
            } else {
                UI.showBuildMenu();
            }
        }
    },

    _handleMouseDown(e) {
        if (World.gamePhase !== 'playing' && World.gamePhase !== 'setup') return;

        // Ignore clicks on UI area
        if (e.clientY < 32 || e.clientY > Renderer.height - 160) return;

        const tile = Camera.screenToTile(e.clientX, e.clientY);

        if (e.button === 0) { // Left click
            if (BuildingPlacement.isPlacing) {
                // Wall line-drawing mode
                if (BuildingPlacement._isWallType(BuildingPlacement.selectedBuilding)) {
                    if (!BuildingPlacement._wallDrawing) {
                        BuildingPlacement.startWallDraw(tile.x, tile.y);
                    } else {
                        BuildingPlacement.finishWallDraw();
                    }
                } else {
                    BuildingPlacement.place(tile.x, tile.y);
                }
                // Clear drag state when placing buildings
                this._dragStart = null;
            }
            // Selection is deferred to mouseup / drag-finish
        } else if (e.button === 2) { // Right click
            if (BuildingPlacement.isPlacing) {
                if (BuildingPlacement._wallDrawing) {
                    BuildingPlacement.cancelWallDraw();
                } else {
                    BuildingPlacement.cancel();
                }
            } else if (World.selectedUnits && World.selectedUnits.length > 0) {
                // Check if there's an enemy at the target tile
                const enemyNpc = World.npcs.find(n => n.isBandit && Math.floor(n.x) === tile.x && Math.floor(n.y) === tile.y);
                const hostileAnimal = Animal.getLivingAnimals().find(a => {
                    const def = Animal.TYPES[a.type];
                    return def && def.hostile && a.x === tile.x && a.y === tile.y;
                });

                for (const uid of World.selectedUnits) {
                    const unit = World.npcs.find(n => n.id === uid);
                    if (!unit) continue;

                    if (enemyNpc) {
                        // Attack order: target specific enemy
                        unit._attackTarget = enemyNpc.id;
                        unit._attackTargetAnimal = null;
                        unit.walkPurpose = 'attacking target';
                        Military.orderMove(unit, tile.x, tile.y);
                    } else if (hostileAnimal) {
                        // Attack order: target specific animal
                        unit._attackTargetAnimal = hostileAnimal.id;
                        unit._attackTarget = null;
                        unit.walkPurpose = 'attacking animal';
                        Military.orderMove(unit, tile.x, tile.y);
                    } else if (e.shiftKey) {
                        // Attack-move order (Shift+right-click)
                        unit._attackMoveTarget = { x: tile.x, y: tile.y };
                        unit._attackTarget = null;
                        unit._attackTargetAnimal = null;
                        unit.walkPurpose = 'attack-moving';
                        Military.orderMove(unit, tile.x, tile.y);
                    } else {
                        // Normal move order
                        unit._attackTarget = null;
                        unit._attackTargetAnimal = null;
                        unit._attackMoveTarget = null;
                        Military.orderMove(unit, tile.x, tile.y);
                    }
                }
            }
        }
    },

    _handleMouseMove(e) {
        if (World.gamePhase !== 'playing' && World.gamePhase !== 'setup') return;
        const tile = Camera.screenToTile(e.clientX, e.clientY);
        BuildingPlacement.cursorTileX = tile.x;

        // Track drag box for multi-select
        if (this._dragStart && this.mouse.down && this.mouse.button === 0 && !BuildingPlacement.isPlacing) {
            const dx = e.clientX - this._dragStart.sx;
            const dy = e.clientY - this._dragStart.sy;
            if (!this._isDragging && (Math.abs(dx) > this._DRAG_THRESHOLD || Math.abs(dy) > this._DRAG_THRESHOLD)) {
                this._isDragging = true;
            }
            if (this._isDragging) {
                this._dragBox = {
                    x1: Math.min(this._dragStart.sx, e.clientX),
                    y1: Math.min(this._dragStart.sy, e.clientY),
                    x2: Math.max(this._dragStart.sx, e.clientX),
                    y2: Math.max(this._dragStart.sy, e.clientY)
                };
            }
        }
        BuildingPlacement.cursorTileY = tile.y;

        if (BuildingPlacement._wallDrawing) {
            BuildingPlacement._updateWallPreview();
        }
    },

    // Finish a drag-select box: select all troops inside the rectangle
    _finishDragSelect(e) {
        if (!this._dragBox) return;
        const box = this._dragBox;
        const selected = [];

        for (const npc of World.npcs) {
            if (!(npc.type in TROOPS)) continue;
            if (npc.isBandit) continue;

            // NPC screen position
            const sx = (npc.x * Renderer.tileW - Camera.x) * Camera.zoom;
            const sy = (npc.y * Renderer.tileH - Camera.y) * Camera.zoom;

            if (sx >= box.x1 && sx <= box.x2 && sy >= box.y1 && sy <= box.y2) {
                selected.push(npc.id);
            }
        }

        if (selected.length > 0) {
            if (e.shiftKey) {
                // Additive selection
                for (const id of selected) {
                    if (!World.selectedUnits.includes(id)) {
                        World.selectedUnits.push(id);
                    }
                }
            } else {
                World.selectedUnits = selected;
            }
            UI.showMultiUnitInfo();
        } else if (!e.shiftKey) {
            World.selectedUnits = [];
        }
    },

    // Single click select (called from mouseup when no drag occurred)
    _handleClickSelect(e) {
        if (World.gamePhase !== 'playing' && World.gamePhase !== 'setup') return;
        if (BuildingPlacement.isPlacing) return;

        // Ignore clicks on UI area
        if (e.clientY < 32 || e.clientY > Renderer.height - 160) return;

        const tile = Camera.screenToTile(e.clientX, e.clientY);
        const troop = World.npcs.find(n =>
            n.type in TROOPS &&
            !n.isBandit &&
            Math.floor(n.x) === tile.x &&
            Math.floor(n.y) === tile.y
        );

        if (troop) {
            if (e.shiftKey) {
                // Toggle selection
                const idx = World.selectedUnits.indexOf(troop.id);
                if (idx !== -1) {
                    World.selectedUnits.splice(idx, 1);
                } else {
                    World.selectedUnits.push(troop.id);
                }
            } else {
                World.selectedUnits = [troop.id];
            }
            if (World.selectedUnits.length === 1) {
                const unit = World.npcs.find(n => n.id === World.selectedUnits[0]);
                if (unit) UI.showUnitInfo(unit);
            } else if (World.selectedUnits.length > 1) {
                UI.showMultiUnitInfo();
            }
        } else {
            if (!e.shiftKey) {
                World.selectedUnits = [];
                UI.showTileInfo(tile.x, tile.y);
            }
        }
    }
};
