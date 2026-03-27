// Stonekeep - Camera
'use strict';

const Camera = {
    x: 0,
    y: 0,
    zoom: 1.0,
    targetX: 0,
    targetY: 0,
    _followNpcId: null,

    init(centerX, centerY) {
        const px = centerX * CONFIG.TILE_WIDTH - Renderer.width / 2;
        const py = centerY * CONFIG.TILE_HEIGHT - Renderer.height / 2;
        this.x = px;
        this.y = py;
        this.targetX = px;
        this.targetY = py;
        this._followNpcId = null;
        this.clamp();
    },

    centerOn(tileX, tileY) {
        this.targetX = tileX * CONFIG.TILE_WIDTH - Renderer.width / (2 * this.zoom);
        this.targetY = tileY * CONFIG.TILE_HEIGHT - Renderer.height / (2 * this.zoom);
    },

    startFollow(npcId) {
        this._followNpcId = npcId;
        // Immediately center on the NPC
        const npc = World.npcs.find(n => n.id === npcId);
        if (npc) {
            this.centerOn(Math.floor(npc.x), Math.floor(npc.y));
        }
    },

    stopFollow() {
        this._followNpcId = null;
    },

    scroll(dx, dy) {
        // Manual scrolling cancels follow mode
        this._followNpcId = null;
        this.targetX += dx * CONFIG.SCROLL_SPEED / this.zoom;
        this.targetY += dy * CONFIG.SCROLL_SPEED / this.zoom;
    },

    zoomIn() {
        this.zoom = Math.min(CONFIG.ZOOM_MAX, this.zoom + CONFIG.ZOOM_STEP);
    },

    zoomOut() {
        this.zoom = Math.max(CONFIG.ZOOM_MIN, this.zoom - CONFIG.ZOOM_STEP);
    },

    update() {
        // Follow NPC if tracking one
        if (this._followNpcId !== null) {
            const npc = World.npcs.find(n => n.id === this._followNpcId);
            if (npc) {
                this.centerOn(Math.floor(npc.x), Math.floor(npc.y));
            } else {
                this._followNpcId = null;
            }
        }
        // Smooth scrolling
        this.x += (this.targetX - this.x) * 0.2;
        this.y += (this.targetY - this.y) * 0.2;
        this.clamp();
    },

    clamp() {
        // No strict clamping — infinite world allows free movement
        // Only prevent going to negative coordinates
        this.x = Math.max(0, this.x);
        this.y = Math.max(0, this.y);
        this.targetX = Math.max(0, this.targetX);
        this.targetY = Math.max(0, this.targetY);
        // Soft upper bound at world edge
        const maxX = World.width * CONFIG.TILE_WIDTH - Renderer.width / this.zoom;
        const maxY = World.height * CONFIG.TILE_HEIGHT - Renderer.height / this.zoom;
        if (maxX > 0) {
            this.x = Math.min(this.x, maxX);
            this.targetX = Math.min(this.targetX, maxX);
        }
        if (maxY > 0) {
            this.y = Math.min(this.y, maxY);
            this.targetY = Math.min(this.targetY, maxY);
        }
    },

    // Convert screen coordinates to tile coordinates
    screenToTile(screenX, screenY) {
        const worldX = screenX / this.zoom + this.x;
        const worldY = screenY / this.zoom + this.y;
        return {
            x: Math.floor(worldX / CONFIG.TILE_WIDTH),
            y: Math.floor(worldY / CONFIG.TILE_HEIGHT)
        };
    },

    // Convert tile coordinates to screen coordinates
    tileToScreen(tileX, tileY) {
        return {
            x: (tileX * CONFIG.TILE_WIDTH - this.x) * this.zoom,
            y: (tileY * CONFIG.TILE_HEIGHT - this.y) * this.zoom
        };
    }
};
