// Stonekeep - ASCII Tile Renderer
'use strict';

const Renderer = {
    canvas: null,
    ctx: null,
    uiCanvas: null,
    uiCtx: null,
    minimapCanvas: null,
    minimapCtx: null,
    width: 0,
    height: 0,

    // Cached tile dimensions
    tileW: CONFIG.TILE_WIDTH,
    tileH: CONFIG.TILE_HEIGHT,

    // Animation
    animFrame: 0,
    waterChars: ['~', '~', '≈', '~'],

    // Projectile animations
    projectiles: [],

    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.uiCanvas = document.getElementById('uiCanvas');
        this.uiCtx = this.uiCanvas.getContext('2d');
        this.minimapCanvas = document.getElementById('minimap');
        this.minimapCtx = this.minimapCanvas.getContext('2d');

        this.resize();
        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.uiCanvas.width = this.width;
        this.uiCanvas.height = this.height;
    },

    // Clear the game canvas
    clear() {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);
    },

    // Render the visible portion of the world
    renderWorld() {
        if (World.gamePhase === 'menu') return;

        this.clear();
        const ctx = this.ctx;
        const tw = this.tileW * Camera.zoom;
        const th = this.tileH * Camera.zoom;
        const fontSize = Math.max(8, Math.floor(CONFIG.FONT_SIZE * Camera.zoom));

        // Build a quick lookup cache for buildings by id
        this._buildingCache = {};
        for (const b of World.buildings) {
            this._buildingCache[b.id] = b;
        }

        // Cache seasonal terrain tints (per terrain category)
        this._seasonTintMap = null;
        if (typeof Season !== 'undefined' && World.gamePhase === 'playing') {
            const seasonTints = CONFIG.SEASON_TERRAIN_TINT[Season.current];
            if (seasonTints) {
                this._seasonTintMap = {};
                const catMap = CONFIG.SEASON_TERRAIN_CATEGORY || {};
                // Pre-compute rgba string for each terrain id
                for (const terrainId in catMap) {
                    const cat = catMap[terrainId];
                    const t = seasonTints[cat] || seasonTints['default'];
                    if (t && t.alpha > 0) {
                        this._seasonTintMap[terrainId] = `rgba(${t.r}, ${t.g}, ${t.b}, ${t.alpha})`;
                    }
                }
                // Also cache a default for unknown terrain ids
                const def = seasonTints['default'];
                if (def && def.alpha > 0) {
                    this._seasonTintDefault = `rgba(${def.r}, ${def.g}, ${def.b}, ${def.alpha})`;
                } else {
                    this._seasonTintDefault = null;
                }
            }
        }

        // Calculate visible tile range
        const startX = Math.floor(Camera.x / this.tileW);
        const startY = Math.floor(Camera.y / this.tileH);
        const endX = Math.ceil((Camera.x + this.width / Camera.zoom) / this.tileW);
        const endY = Math.ceil((Camera.y + this.height / Camera.zoom) / this.tileH);

        ctx.font = `${fontSize}px ${CONFIG.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Pre-compute active furnace positions for winter snow melt
        let activeFurnaces = null;
        const isWinter = typeof Season !== 'undefined' && Season.isWinter();
        if (isWinter) {
            activeFurnaces = [];
            for (const b of World.buildings) {
                if (b.type === 'heatingFurnace' && b.active) {
                    activeFurnaces.push({ x: b.x, y: b.y });
                }
            }
        }

        // Render terrain tiles
        for (let y = Math.max(0, startY); y < Math.min(World.height, endY); y++) {
            for (let x = Math.max(0, startX); x < Math.min(World.width, endX); x++) {
                const tile = World.tiles[y] && World.tiles[y][x];

                // Fog of war: skip undiscovered or ungenerated tiles (render black)
                if (!tile || !tile.discovered) continue;

                const screenX = (x * this.tileW - Camera.x) * Camera.zoom;
                const screenY = (y * this.tileH - Camera.y) * Camera.zoom;

                const terrain = tile.terrain;

                // Background
                ctx.fillStyle = terrain.bg;
                ctx.fillRect(screenX, screenY, tw + 1, th + 1);

                // Seasonal terrain tint overlay (per terrain type)
                if (this._seasonTintMap) {
                    const tintColor = this._seasonTintMap[terrain.id] || this._seasonTintDefault;
                    if (tintColor) {
                        ctx.fillStyle = tintColor;
                        ctx.fillRect(screenX, screenY, tw + 1, th + 1);
                    }
                }

                // Draw building or terrain char
                const bid = World.buildingMap[y] ? World.buildingMap[y][x] : undefined;

                // Road overlay (warm earthy brown path based on road level)
                if (tile.roadLevel > 0 && (bid === null || bid === undefined)) {
                    const alpha = tile.roadLevel * 0.05; // 0.05 to 0.75 for levels 1-15
                    ctx.fillStyle = `rgba(120, 100, 55, ${alpha})`;
                    ctx.fillRect(screenX, screenY, tw + 1, th + 1);
                }
                if (bid !== null && bid !== undefined) {
                    const building = this._buildingCache[bid];
                    if (building) {
                        const def = BUILDINGS[building.type];
                        // Building background for every tile of the building
                        ctx.fillStyle = def.bg;
                        ctx.fillRect(screenX, screenY, tw + 1, th + 1);
                        // Draw building char on every tile of the footprint
                        ctx.fillStyle = def.fg;
                        ctx.fillText(def.char, screenX + tw / 2, screenY + th / 2);

                        // Building border — draw edge lines on boundary tiles
                        ctx.strokeStyle = def.fg;
                        ctx.lineWidth = 1;
                        const top = !World.buildingMap[y - 1] || World.buildingMap[y - 1][x] !== bid;
                        const bottom = !World.buildingMap[y + 1] || World.buildingMap[y + 1][x] !== bid;
                        const left = World.buildingMap[y][x - 1] !== bid;
                        const right = World.buildingMap[y][x + 1] !== bid;
                        ctx.beginPath();
                        if (top) { ctx.moveTo(screenX, screenY + 0.5); ctx.lineTo(screenX + tw, screenY + 0.5); }
                        if (bottom) { ctx.moveTo(screenX, screenY + th - 0.5); ctx.lineTo(screenX + tw, screenY + th - 0.5); }
                        if (left) { ctx.moveTo(screenX + 0.5, screenY); ctx.lineTo(screenX + 0.5, screenY + th); }
                        if (right) { ctx.moveTo(screenX + tw - 0.5, screenY); ctx.lineTo(screenX + tw - 0.5, screenY + th); }
                        ctx.stroke();
                    }
                } else {
                    // Terrain char
                    let ch = terrain.char;
                    if (terrain.animated) {
                        ch = this.waterChars[this.animFrame % this.waterChars.length];
                    }
                    ctx.fillStyle = terrain.fg;
                    ctx.fillText(ch, screenX + tw / 2, screenY + th / 2);
                }

                // Winter snow overlay — white layer on all terrain, melted near active furnaces
                if (isWinter) {
                    let inFurnaceRange = false;
                    if (activeFurnaces) {
                        const radius = CONFIG.HEATING_FURNACE_RADIUS;
                        for (const f of activeFurnaces) {
                            if (Math.abs(x - f.x) + Math.abs(y - f.y) <= radius) {
                                inFurnaceRange = true;
                                break;
                            }
                        }
                    }
                    if (!inFurnaceRange) {
                        ctx.fillStyle = 'rgba(220, 225, 235, 0.18)';
                        ctx.fillRect(screenX, screenY, tw + 1, th + 1);
                    }
                }

                // Fog of war dimming: discovered but not currently visible
                if (World.gamePhase !== 'setup' && tile.lastSeenTick !== World.tick) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
                    ctx.fillRect(screenX, screenY, tw + 1, th + 1);
                }
            }
        }

        // Render NPCs
        this._renderNPCs(ctx, fontSize, tw, th);

        // Render overlay animations (above NPCs, below UI)
        this._renderAnimations(ctx, fontSize, tw, th);

        // Render animals
        this._renderAnimals(ctx, fontSize, tw, th);

        // Render fire overlay
        this._renderFires(ctx, fontSize, tw, th);

        // Render disease cloud overlay
        this._renderDiseaseClouds(ctx, fontSize, tw, th);

        // Render projectile animations
        this._renderProjectiles(ctx, tw, th);

        // Render placement preview
        if (BuildingPlacement.isPlacing) {
            this._renderPlacementPreview(ctx, tw, th, fontSize);
        }

        // Render event notifications
        this._renderNotifications(ctx);

        // Render ambient lighting overlay (day/night cycle)
        this._renderAmbientOverlay(ctx);

        // Render weather particles (rain, snow)
        this._renderWeatherParticles(ctx);

        // Render drag-select box
        this._renderDragBox(ctx);
    },

    _renderNPCs(ctx, fontSize, tw, th) {
        ctx.font = `bold ${fontSize}px ${CONFIG.FONT_FAMILY}`;
        const selected = World.selectedUnits || [];
        for (const npc of World.npcs) {
            // Bandits only visible on currently visible tiles
            if (npc.isBandit) {
                const nTile = World.tiles[Math.floor(npc.y)] && World.tiles[Math.floor(npc.y)][Math.floor(npc.x)];
                if (!nTile || nTile.lastSeenTick !== World.tick) continue;
            }

            const screenX = (npc.x * this.tileW - Camera.x) * Camera.zoom;
            const screenY = (npc.y * this.tileH - Camera.y) * Camera.zoom;

            // Check if on screen
            if (screenX < -tw || screenX > this.width + tw) continue;
            if (screenY < -th || screenY > this.height + th) continue;

            // Draw selection highlight
            if (selected.includes(npc.id)) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.strokeRect(screenX + 1, screenY + 1, tw - 2, th - 2);
            }

            ctx.fillStyle = npc.fg || '#ffffff';
            // Burning NPCs flash orange/red
            if (npc.onFire && World.tick % 3 < 2) {
                ctx.fillStyle = World.tick % 2 === 0 ? '#FF6600' : '#FF2200';
            }
            // Diseased NPCs flash green
            if (npc.diseased && World.tick % 4 < 2) {
                ctx.fillStyle = '#88CC00';
            }
            ctx.fillText(npc.char || '@', screenX + tw / 2, screenY + th / 2);

            // Combat indicator — now handled by Animations system

            // Sleep indicator — now handled by Animations system

            // Social indicator — now handled by Animations system
        }

        // Health bars for NPCs in combat or damaged
        for (const npc of World.npcs) {
            if (npc.hp >= npc.maxHp && !npc._attackCooldown && !npc._buildingAttackCooldown) continue;
            if (npc.hp >= npc.maxHp) continue;

            if (npc.isBandit) {
                const nTile = World.tiles[Math.floor(npc.y)] && World.tiles[Math.floor(npc.y)][Math.floor(npc.x)];
                if (!nTile || nTile.lastSeenTick !== World.tick) continue;
            }

            const screenX = (npc.x * this.tileW - Camera.x) * Camera.zoom;
            const screenY = (npc.y * this.tileH - Camera.y) * Camera.zoom;
            if (screenX < -tw || screenX > this.width + tw) continue;
            if (screenY < -th || screenY > this.height + th) continue;

            const barW = tw - 4;
            const barH = 2;
            const barX = screenX + 2;
            const barY = screenY;
            const hpPct = npc.hp / npc.maxHp;
            const barColor = hpPct > 0.6 ? '#44cc44' : hpPct > 0.3 ? '#cccc44' : '#cc4444';

            ctx.fillStyle = '#222';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = barColor;
            ctx.fillRect(barX, barY, barW * hpPct, barH);
        }
    },

    _renderAnimations(ctx, fontSize, tw, th) {
        const anims = Animations.getActive();
        if (anims.length === 0) return;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const a of anims) {
            const tileX = Math.floor(a.x);
            const tileY = Math.floor(a.y);

            // Respect fog of war — only render on currently visible tiles
            const tile = World.tiles[tileY] && World.tiles[tileY][tileX];
            if (!tile || tile.lastSeenTick !== World.tick) continue;

            const def = Animations.TYPES[a.type];
            if (!def) continue;

            const elapsed = World.tick - a.startTick;
            const chars = a.chars || def.chars;
            const charIdx = (World.tick + Math.floor(a.x * 7)) % chars.length;
            const ch = chars[charIdx];

            // Compute screen position with offset
            let screenX = (a.x * this.tileW - Camera.x) * Camera.zoom + tw * def.offsetX;
            let screenY = (a.y * this.tileH - Camera.y) * Camera.zoom + th * def.offsetY;

            // Float upward effect
            if (def.float) {
                screenY -= (elapsed % 8) * 0.4 * Camera.zoom;
            }

            // Culling
            if (screenX < -tw || screenX > this.width + tw) continue;
            if (screenY < -th || screenY > this.height + th) continue;

            // Compute alpha for fade effect
            let alpha = 1.0;
            if (def.fade && a.duration > 0) {
                const progress = elapsed / a.duration;
                // Fade out in the last 40% of duration
                if (progress > 0.6) {
                    alpha = 1.0 - ((progress - 0.6) / 0.4);
                    if (alpha < 0) alpha = 0;
                }
            }

            // Color (alt color flicker for combat type)
            let color = a.color || def.color;
            if (def.altColor && World.tick % 2 === 0) {
                color = def.altColor;
            }

            const fSize = Math.max(6, Math.round(fontSize * def.fontScale));
            ctx.font = `bold ${fSize}px ${CONFIG.FONT_FAMILY}`;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;
            ctx.fillText(ch, screenX, screenY);
            ctx.globalAlpha = 1.0;
        }

        // Restore font
        ctx.font = `bold ${fontSize}px ${CONFIG.FONT_FAMILY}`;
    },

    _renderAnimals(ctx, fontSize, tw, th) {
        ctx.font = `${fontSize}px ${CONFIG.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Living animals
        const animals = Animal.getLivingAnimals();
        for (const a of animals) {
            const screenX = (a.x * this.tileW - Camera.x) * Camera.zoom;
            const screenY = (a.y * this.tileH - Camera.y) * Camera.zoom;
            if (screenX < -tw || screenX > this.width + tw) continue;
            if (screenY < -th || screenY > this.height + th) continue;
            // Only render animals on currently visible tiles
            const aTile = World.tiles[a.y] && World.tiles[a.y][a.x];
            if (!aTile || aTile.lastSeenTick !== World.tick) continue;
            ctx.fillStyle = a.fg;
            ctx.fillText(a.char, screenX + tw / 2, screenY + th / 2);
        }

        // Carcasses
        const carcasses = Animal.getCarcasses();
        for (const c of carcasses) {
            const screenX = (c.x * this.tileW - Camera.x) * Camera.zoom;
            const screenY = (c.y * this.tileH - Camera.y) * Camera.zoom;
            if (screenX < -tw || screenX > this.width + tw) continue;
            if (screenY < -th || screenY > this.height + th) continue;
            const cTile = World.tiles[c.y] && World.tiles[c.y][c.x];
            if (!cTile || cTile.lastSeenTick !== World.tick) continue;
            ctx.fillStyle = '#8B4513';
            ctx.fillText('x', screenX + tw / 2, screenY + th / 2);
        }
    },

    _renderFires(ctx, fontSize, tw, th) {
        const fires = Fire.getActiveFires();
        if (fires.length === 0) return;

        ctx.font = `bold ${fontSize}px ${CONFIG.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const fireChars = ['^', '*', '~'];
        const fireColors = ['#FF4500', '#FF6600', '#FFAA00'];

        for (const fire of fires) {
            const screenX = (fire.x * this.tileW - Camera.x) * Camera.zoom;
            const screenY = (fire.y * this.tileH - Camera.y) * Camera.zoom;
            if (screenX < -tw || screenX > this.width + tw) continue;
            if (screenY < -th || screenY > this.height + th) continue;
            // Only render fires on currently visible tiles
            const fTile = World.tiles[fire.y] && World.tiles[fire.y][fire.x];
            if (!fTile || fTile.lastSeenTick !== World.tick) continue;

            // Flickering fire effect — pick char and color based on tick + position
            const flicker = (World.tick + fire.x * 7 + fire.y * 13) % 3;

            // Fire background glow (brighter at night/dusk)
            const glowAlpha = (typeof Time !== 'undefined' && Time.isFireEnhanced()) ? 0.55 : 0.35;
            ctx.fillStyle = `rgba(255, 80, 0, ${glowAlpha})`;
            ctx.fillRect(screenX, screenY, tw + 1, th + 1);

            // Fire character
            ctx.fillStyle = fireColors[flicker];
            ctx.fillText(fireChars[flicker], screenX + tw / 2, screenY + th / 2);
        }
    },

    _renderDiseaseClouds(ctx, fontSize, tw, th) {
        const clouds = Events.diseaseClouds;
        if (!clouds || clouds.length === 0) return;

        ctx.font = `bold ${fontSize}px ${CONFIG.FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const cloudChars = ['%', '&', '?'];
        const cloudColors = ['#88CC00', '#66AA00', '#AADD22'];

        for (const cloud of clouds) {
            const screenX = (cloud.x * this.tileW - Camera.x) * Camera.zoom;
            const screenY = (cloud.y * this.tileH - Camera.y) * Camera.zoom;
            if (screenX < -tw || screenX > this.width + tw) continue;
            if (screenY < -th || screenY > this.height + th) continue;

            // Only render on currently visible tiles
            const cTile = World.tiles[cloud.y] && World.tiles[cloud.y][cloud.x];
            if (!cTile || cTile.lastSeenTick !== World.tick) continue;

            // Floating effect — pick char based on tick
            const drift = (World.tick + cloud.x * 5 + cloud.y * 11) % 3;

            // Disease background haze
            ctx.fillStyle = 'rgba(100, 160, 0, 0.25)';
            ctx.fillRect(screenX, screenY, tw + 1, th + 1);

            // Disease character
            ctx.fillStyle = cloudColors[drift];
            ctx.fillText(cloudChars[drift], screenX + tw / 2, screenY + th / 2);
        }
    },

    addProjectile(sx, sy, tx, ty, color) {
        this.projectiles.push({
            sx, sy, tx, ty, color: color || '#FFAA00',
            startTick: World.tick, duration: 4
        });
    },

    _renderProjectiles(ctx, tw, th) {
        const alive = [];
        for (const p of this.projectiles) {
            const elapsed = World.tick - p.startTick;
            if (elapsed >= p.duration) continue;
            alive.push(p);

            const t = elapsed / p.duration;
            const cx = p.sx + (p.tx - p.sx) * t;
            const cy = p.sy + (p.ty - p.sy) * t;

            const screenX = (cx * this.tileW - Camera.x) * Camera.zoom;
            const screenY = (cy * this.tileH - Camera.y) * Camera.zoom;

            ctx.fillStyle = p.color;
            const r = Math.max(2, 3 * Camera.zoom);
            ctx.beginPath();
            ctx.arc(screenX + tw / 2, screenY + th / 2, r, 0, Math.PI * 2);
            ctx.fill();
        }
        this.projectiles = alive;
    },

    _renderPlacementPreview(ctx, tw, th, fontSize) {
        const def = BUILDINGS[BuildingPlacement.selectedBuilding];
        if (!def) return;

        // Wall line-drawing preview (blueprint/holo style)
        if (BuildingPlacement._wallDrawing && BuildingPlacement._wallPreviewTiles.length > 0) {
            const tiles = BuildingPlacement._wallPreviewTiles;
            ctx.font = `${fontSize}px ${CONFIG.FONT_FAMILY}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            for (const tile of tiles) {
                const screenX = (tile.x * this.tileW - Camera.x) * Camera.zoom;
                const screenY = (tile.y * this.tileH - Camera.y) * Camera.zoom;
                const tileValid = BuildingPlacement.canPlaceWallAt(tile.x, tile.y);

                ctx.fillStyle = tileValid ? 'rgba(0, 200, 255, 0.25)' : CONFIG.COLORS.CURSOR_INVALID;
                ctx.fillRect(screenX, screenY, tw, th);
                ctx.strokeStyle = tileValid ? 'rgba(0, 200, 255, 0.6)' : 'rgba(255, 0, 0, 0.6)';
                ctx.strokeRect(screenX, screenY, tw, th);

                if (tileValid) {
                    ctx.globalAlpha = 0.7;
                    ctx.fillStyle = def.fg;
                    ctx.fillText(def.char, screenX + tw / 2, screenY + th / 2);
                    ctx.globalAlpha = 1.0;
                }
            }
            return;
        }

        const mx = BuildingPlacement.cursorTileX;
        const my = BuildingPlacement.cursorTileY;
        const valid = BuildingPlacement.canPlace(mx, my);

        for (let dy = 0; dy < def.height; dy++) {
            for (let dx = 0; dx < def.width; dx++) {
                const tx = mx + dx;
                const ty = my + dy;
                const screenX = (tx * this.tileW - Camera.x) * Camera.zoom;
                const screenY = (ty * this.tileH - Camera.y) * Camera.zoom;

                ctx.fillStyle = valid ? CONFIG.COLORS.CURSOR_VALID : CONFIG.COLORS.CURSOR_INVALID;
                ctx.fillRect(screenX, screenY, tw, th);
            }
        }

        // Draw building char preview
        if (valid) {
            const csx = ((mx + def.width / 2) * this.tileW - Camera.x) * Camera.zoom;
            const csy = ((my + def.height / 2) * this.tileH - Camera.y) * Camera.zoom;
            ctx.fillStyle = def.fg;
            ctx.font = `${fontSize}px ${CONFIG.FONT_FAMILY}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(def.char, csx, csy);
        }
    },

    _renderAmbientOverlay(ctx) {
        if (World.gamePhase !== 'playing') return;
        if (typeof Time === 'undefined') return;
        const ambient = Time.getAmbientOverlay();
        if (ambient.alpha <= 0) return;
        ctx.fillStyle = `rgba(${ambient.r}, ${ambient.g}, ${ambient.b}, ${ambient.alpha})`;
        ctx.fillRect(0, 0, this.width, this.height);
    },

    _renderWeatherParticles(ctx) {
        if (typeof Season === 'undefined') return;
        const particles = Season.getParticles();
        if (particles.length === 0) return;

        for (const p of particles) {
            const sx = p.x * this.width;
            const sy = p.y * this.height;
            if (sx < 0 || sx > this.width || sy < 0 || sy > this.height) continue;

            if (p.type === 'snow') {
                ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.random() * 0.3})`;
                const size = 2 + Math.random() * 2;
                ctx.beginPath();
                ctx.arc(sx, sy, size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Rain
                ctx.strokeStyle = `rgba(150, 180, 255, ${0.3 + Math.random() * 0.3})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx + 1, sy + 6);
                ctx.stroke();
            }
        }
    },

    _renderDragBox(ctx) {
        const box = Input._dragBox;
        if (!box || !Input._isDragging) return;

        ctx.save();
        ctx.strokeStyle = 'rgba(0, 255, 100, 0.8)';
        ctx.lineWidth = 1;
        ctx.fillStyle = 'rgba(0, 255, 100, 0.1)';
        const w = box.x2 - box.x1;
        const h = box.y2 - box.y1;
        ctx.fillRect(box.x1, box.y1, w, h);
        ctx.strokeRect(box.x1, box.y1, w, h);
        ctx.restore();
    },

    _renderNotifications(ctx) {
        const notifications = Events.getActiveNotifications();
        if (notifications.length === 0) return;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const centerX = this.width / 2;
        let y = 60;

        for (const notif of notifications) {
            const age = World.tick - notif.tick;
            const maxAge = CONFIG.EVENT_NOTIFICATION_DURATION;
            // Fade out in last 30% of duration
            const fadeStart = maxAge * 0.7;
            const alpha = age > fadeStart ? 1 - ((age - fadeStart) / (maxAge - fadeStart)) : 1;

            ctx.font = 'bold 16px monospace';
            ctx.fillStyle = 'rgba(0, 0, 0, ' + (0.6 * alpha) + ')';
            const textWidth = ctx.measureText(notif.text).width;
            ctx.fillRect(centerX - textWidth / 2 - 10, y - 2, textWidth + 20, 22);

            ctx.fillStyle = notif.color;
            ctx.globalAlpha = alpha;
            ctx.fillText(notif.text, centerX, y);
            ctx.globalAlpha = 1;
            y += 26;
        }

        ctx.restore();
    },

    // Render minimap — shows area centered on camera
    renderMinimap() {
        if (World.gamePhase === 'menu') return;

        const ctx = this.minimapCtx;
        const mw = CONFIG.MINIMAP_SIZE;
        const mh = CONFIG.MINIMAP_SIZE;

        // Show a region centered on camera (256 tile radius each direction)
        const viewRadius = 256;
        const cameraTileX = Camera.x / this.tileW + (this.width / Camera.zoom) / (2 * this.tileW);
        const cameraTileY = Camera.y / this.tileH + (this.height / Camera.zoom) / (2 * this.tileH);
        const viewMinX = Math.floor(cameraTileX - viewRadius);
        const viewMinY = Math.floor(cameraTileY - viewRadius);
        const viewSize = viewRadius * 2;
        const scale = mw / viewSize;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, mw, mh);

        // Draw terrain
        const imageData = ctx.createImageData(mw, mh);
        const data = imageData.data;

        for (let my = 0; my < mh; my++) {
            for (let mx = 0; mx < mw; mx++) {
                const wx = viewMinX + Math.floor(mx / scale);
                const wy = viewMinY + Math.floor(my / scale);
                if (wx < 0 || wy < 0 || wx >= World.width || wy >= World.height) continue;

                const tile = World.getTile(wx, wy);
                if (!tile || !tile.discovered) continue;

                let color = tile.terrain.fg;

                // Show buildings
                const bid = World.buildingMap[wy] && World.buildingMap[wy][wx];
                if (bid !== null && bid !== undefined) {
                    const b = this._buildingCache ? this._buildingCache[bid] : null;
                    if (b) color = BUILDINGS[b.type].fg;
                }

                const idx = (my * mw + mx) * 4;
                const rgb = this._hexToRgb(color);

                // Apply road overlay
                if (tile.roadLevel > 0 && (bid === null || bid === undefined)) {
                    const ra = tile.roadLevel * 0.05;
                    rgb.r = Math.round(rgb.r * (1 - ra) + 120 * ra);
                    rgb.g = Math.round(rgb.g * (1 - ra) + 100 * ra);
                    rgb.b = Math.round(rgb.b * (1 - ra) + 55 * ra);
                }

                // Dim discovered-but-not-visible tiles
                if (World.gamePhase !== 'setup' && tile.lastSeenTick !== World.tick) {
                    rgb.r = Math.round(rgb.r * 0.4);
                    rgb.g = Math.round(rgb.g * 0.4);
                    rgb.b = Math.round(rgb.b * 0.4);
                }

                data[idx] = rgb.r;
                data[idx + 1] = rgb.g;
                data[idx + 2] = rgb.b;
                data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);

        // Draw camera viewport rectangle
        const vx = (Camera.x / this.tileW - viewMinX) * scale;
        const vy = (Camera.y / this.tileH - viewMinY) * scale;
        const vw = (this.width / Camera.zoom) / this.tileW * scale;
        const vh = (this.height / Camera.zoom) / this.tileH * scale;

        ctx.strokeStyle = CONFIG.COLORS.MINIMAP_CAMERA;
        ctx.lineWidth = 1;
        ctx.strokeRect(vx, vy, vw, vh);
    },

    _hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 128, g: 128, b: 128 };
    },

    // Update animation frame
    updateAnimation() {
        this.animFrame = (this.animFrame + 1) % 60;
    }
};
