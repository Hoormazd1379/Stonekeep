// Stonekeep - Overlay Animation System (Phase 3.10)
'use strict';

const Animations = {
    // Active animation instances
    _active: [],
    _nextId: 1,

    // Data-driven animation type definitions
    // New animation = add one entry here
    TYPES: {
        speech: {
            chars: ['o', 'O', 'o'],
            color: '#66ccff',
            defaultDuration: 6,
            float: true,
            fade: true,
            fontScale: 0.5,
            offsetX: 0.6,
            offsetY: -0.3
        },
        heart: {
            chars: ['<3'],
            color: '#ff6688',
            defaultDuration: 8,
            float: true,
            fade: true,
            fontScale: 0.5,
            offsetX: 0.6,
            offsetY: -0.3
        },
        anger: {
            chars: ['#', '*', '#'],
            color: '#ff4444',
            defaultDuration: 8,
            float: false,
            fade: true,
            fontScale: 0.5,
            offsetX: 0.6,
            offsetY: -0.3
        },
        music: {
            chars: ['~', '*', '~'],
            color: '#cc88ff',
            defaultDuration: 8,
            float: true,
            fade: true,
            fontScale: 0.5,
            offsetX: 0.6,
            offsetY: -0.3
        },
        sleep: {
            chars: ['z', 'Z', 'z'],
            color: '#8888FF',
            defaultDuration: 10,
            float: true,
            fade: false,
            fontScale: 0.5,
            offsetX: 0.6,
            offsetY: -0.3
        },
        sweat: {
            chars: [',', '.', ','],
            color: '#88ccff',
            defaultDuration: 6,
            float: true,
            fade: true,
            fontScale: 0.5,
            offsetX: 0.6,
            offsetY: -0.1
        },
        hunger: {
            chars: ['o'],
            color: '#cc8844',
            defaultDuration: 10,
            float: false,
            fade: true,
            fontScale: 0.5,
            offsetX: 0.6,
            offsetY: -0.3
        },
        skull: {
            chars: ['d', 'b'],
            color: '#cccccc',
            defaultDuration: 12,
            float: true,
            fade: true,
            fontScale: 0.5,
            offsetX: 0.5,
            offsetY: -0.3
        },
        tool: {
            chars: ['/', '\\', '/'],
            color: '#aaaaaa',
            defaultDuration: 4,
            float: false,
            fade: false,
            fontScale: 0.5,
            offsetX: 0.6,
            offsetY: -0.3
        },
        sparkle: {
            chars: ['+', '*', '.', '*'],
            color: '#ffdd44',
            defaultDuration: 6,
            float: true,
            fade: true,
            fontScale: 0.5,
            offsetX: 0.5,
            offsetY: -0.3
        },
        carry: {
            chars: ['^'],
            color: '#88aa44',
            defaultDuration: 0, // 0 = persistent until removed
            float: false,
            fade: false,
            fontScale: 0.45,
            offsetX: 0.5,
            offsetY: -0.2
        },
        combat: {
            chars: ['x', '+', 'x'],
            color: '#FF4444',
            altColor: '#FF8800',
            defaultDuration: 4,
            float: false,
            fade: false,
            fontScale: 0.6,
            offsetX: 0.8,
            offsetY: -0.3
        },
        exclaim: {
            chars: ['!'],
            color: '#ffcc00',
            defaultDuration: 6,
            float: true,
            fade: true,
            fontScale: 0.6,
            offsetX: 0.5,
            offsetY: -0.4
        },
        disease: {
            chars: ['~', '*', '~'],
            color: '#88CC00',
            defaultDuration: 10,
            float: false,
            fade: true,
            fontScale: 0.5,
            offsetX: 0.6,
            offsetY: -0.3
        },
        flash: {
            chars: ['*', '+', '*', '.'],
            color: '#ffffff',
            defaultDuration: 10,
            float: false,
            fade: true,
            fontScale: 0.7,
            offsetX: 0.5,
            offsetY: 0.0
        },
        ember: {
            chars: ['.', ',', '`', '.'],
            color: '#FF6600',
            altColor: '#FF3300',
            defaultDuration: 6,
            float: true,
            fade: true,
            fontScale: 0.4,
            offsetX: 0.5,
            offsetY: 0.0
        },
        miasma: {
            chars: ['~', '.', '~', '.'],
            color: '#88CC00',
            altColor: '#66AA00',
            defaultDuration: 8,
            float: true,
            fade: true,
            fontScale: 0.4,
            offsetX: 0.5,
            offsetY: 0.0
        }
    },

    /** Reset all active animations (called on new game) */
    reset() {
        this._active = [];
        this._nextId = 1;
    },

    /**
     * Add an overlay animation at a world position.
     * @param {number} x - World tile X
     * @param {number} y - World tile Y
     * @param {string} type - Key into Animations.TYPES
     * @param {number} [duration] - Override duration in ticks (0 = persistent)
     * @param {object} [opts] - Optional overrides: { npcId, color, chars }
     * @returns {number} Animation instance id (for manual removal)
     */
    add(x, y, type, duration, opts) {
        const def = this.TYPES[type];
        if (!def) return -1;

        const dur = (duration !== undefined && duration !== null) ? duration : def.defaultDuration;
        const id = this._nextId++;

        const anim = {
            id: id,
            x: x,
            y: y,
            type: type,
            startTick: World.tick,
            duration: dur,
            npcId: (opts && opts.npcId) || null,
            color: (opts && opts.color) || null,
            chars: (opts && opts.chars) || null
        };

        this._active.push(anim);
        return id;
    },

    /**
     * Remove animation by id (for persistent animations like carry indicator).
     * @param {number} id - Animation instance id returned by add()
     */
    remove(id) {
        const idx = this._active.findIndex(a => a.id === id);
        if (idx !== -1) this._active.splice(idx, 1);
    },

    /**
     * Remove all animations attached to a specific NPC.
     * @param {number} npcId
     */
    removeByNpc(npcId) {
        this._active = this._active.filter(a => a.npcId !== npcId);
    },

    /**
     * Remove all animations of a specific type at given coordinates.
     * @param {number} x
     * @param {number} y
     * @param {string} type
     */
    removeAt(x, y, type) {
        this._active = this._active.filter(a => !(a.x === x && a.y === y && a.type === type));
    },

    /**
     * Update: expire animations, follow NPCs, sync state-driven overlays.
     * Called once per game tick from the game loop.
     */
    update() {
        // Update NPC-attached animations to follow their NPC position
        for (let i = this._active.length - 1; i >= 0; i--) {
            const a = this._active[i];

            // Follow NPC position
            if (a.npcId !== null) {
                const npc = World.npcs.find(n => n.id === a.npcId);
                if (!npc) {
                    // NPC gone — remove animation
                    this._active.splice(i, 1);
                    continue;
                }
                a.x = npc.x;
                a.y = npc.y;
            }

            // Expire timed animations
            if (a.duration > 0 && (World.tick - a.startTick) >= a.duration) {
                this._active.splice(i, 1);
            }
        }

        // Sync state-driven animations with NPC states
        this._syncNpcStates();
    },

    /**
     * Sync persistent overlays to NPC states.
     * Adds animations when NPCs enter certain states, removes when they leave.
     */
    _syncNpcStates() {
        for (const npc of World.npcs) {
            // Combat indicator applies to all NPCs (including bandits and troops)
            const isFighting = npc.state === NPC.STATE.FIGHTING;
            const isInCombat = (npc._attackCooldown > 0 || npc._buildingAttackCooldown > 0) && !isFighting;

            if (isInCombat && !this.hasNpcAnimation(npc.id, 'combat')) {
                this.add(npc.x, npc.y, 'combat', 0, { npcId: npc.id });
            } else if (!isInCombat && this.hasNpcAnimation(npc.id, 'combat')) {
                this._removeNpcType(npc.id, 'combat');
            }

            // Skip bandits for civilian-only overlays
            if (npc.isBandit) continue;

            const isSleeping = npc.state === NPC.STATE.SLEEPING || npc.isSleepingAtPost;
            const isSocializing = npc.state === NPC.STATE.SOCIALIZING ||
                (npc._socialUntil && npc._socialUntil > World.tick);

            // Sleep Zzz
            if (isSleeping && !this.hasNpcAnimation(npc.id, 'sleep')) {
                this.add(npc.x, npc.y, 'sleep', 0, { npcId: npc.id });
            } else if (!isSleeping && this.hasNpcAnimation(npc.id, 'sleep')) {
                this._removeNpcType(npc.id, 'sleep');
            }

            // Speech bubble (socializing)
            if (isSocializing && !this.hasNpcAnimation(npc.id, 'speech')) {
                this.add(npc.x, npc.y, 'speech', 0, { npcId: npc.id });
            } else if (!isSocializing && this.hasNpcAnimation(npc.id, 'speech')) {
                this._removeNpcType(npc.id, 'speech');
            }

            // Fighting indicator (civilian fight — anger symbol)
            if (isFighting && !this.hasNpcAnimation(npc.id, 'anger')) {
                this.add(npc.x, npc.y, 'anger', 0, { npcId: npc.id });
            } else if (!isFighting && this.hasNpcAnimation(npc.id, 'anger')) {
                this._removeNpcType(npc.id, 'anger');
            }

            // Carrying indicator
            const isCarrying = !!npc.carrying;
            if (isCarrying && !this.hasNpcAnimation(npc.id, 'carry')) {
                this.add(npc.x, npc.y, 'carry', 0, { npcId: npc.id });
            } else if (!isCarrying && this.hasNpcAnimation(npc.id, 'carry')) {
                this._removeNpcType(npc.id, 'carry');
            }
        }
    },

    /**
     * Remove all animations of a specific type for a specific NPC.
     */
    _removeNpcType(npcId, type) {
        this._active = this._active.filter(a => !(a.npcId === npcId && a.type === type));
    },

    /**
     * Get all active animations (for rendering).
     * @returns {Array}
     */
    getActive() {
        return this._active;
    },

    /**
     * Check if an NPC already has a specific animation type.
     * @param {number} npcId
     * @param {string} type
     * @returns {boolean}
     */
    hasNpcAnimation(npcId, type) {
        return this._active.some(a => a.npcId === npcId && a.type === type);
    }
};
