// Stonekeep - Save/Load System (Phase 3.12)
'use strict';

const SaveLoad = {
    SAVE_VERSION: 2,
    NUM_SLOTS: 3,
    STORAGE_PREFIX: 'stonekeep_save_',
    AUTO_SAVE_SLOT: 'auto',
    AUTO_SAVE_INTERVAL: 1200, // ticks between auto-saves (~10 min at speed 1)
    _autoSaveAccum: 0,

    // ── Compression (LZW to fit localStorage quota, Phase 3.12.1) ──
    _COMPRESS_MARKER: 'STC1',
    _MAX_DICT: 55294, // max LZW code — output char = code+1 stays below surrogate 0xD800

    _compress(str) {
        if (!str) return '';
        // Convert UTF-16 to Latin-1 binary string (UTF-8 bytes)
        const input = unescape(encodeURIComponent(str));
        // LZW compress
        const dict = new Map();
        for (let i = 0; i < 256; i++) dict.set(String.fromCharCode(i), i);
        let nextCode = 256;
        let w = '';
        const codes = [];
        for (let i = 0; i < input.length; i++) {
            const c = input.charAt(i);
            const wc = w + c;
            if (dict.has(wc)) {
                w = wc;
            } else {
                codes.push(dict.get(w));
                if (nextCode <= this._MAX_DICT) dict.set(wc, nextCode++);
                w = c;
            }
        }
        if (w !== '') codes.push(dict.get(w));
        // Encode codes as UTF-16 safe string (+1 to avoid null char)
        const out = new Array(codes.length);
        for (let i = 0; i < codes.length; i++) {
            out[i] = String.fromCharCode(codes[i] + 1);
        }
        return out.join('');
    },

    _decompress(compressed) {
        if (!compressed) return '';
        const len = compressed.length;
        const codes = new Array(len);
        for (let i = 0; i < len; i++) {
            codes[i] = compressed.charCodeAt(i) - 1;
        }
        // LZW decompress
        const dict = [];
        for (let i = 0; i < 256; i++) dict[i] = String.fromCharCode(i);
        let nextCode = 256;
        let w = dict[codes[0]];
        if (w === undefined) return '';
        const result = [w];
        for (let i = 1; i < len; i++) {
            const code = codes[i];
            let entry;
            if (code < nextCode && dict[code] !== undefined) {
                entry = dict[code];
            } else if (code === nextCode) {
                entry = w + w.charAt(0);
            } else {
                return '';
            }
            result.push(entry);
            if (nextCode <= this._MAX_DICT) {
                dict[nextCode++] = w + entry.charAt(0);
            }
            w = entry;
        }
        return decodeURIComponent(escape(result.join('')));
    },

    _migrateOldSaves() {
        const slots = [this.AUTO_SAVE_SLOT];
        for (let i = 1; i <= this.NUM_SLOTS; i++) slots.push(String(i));
        for (const s of slots) {
            const k = this.STORAGE_PREFIX + s;
            const raw = localStorage.getItem(k);
            if (raw && !raw.startsWith(this._COMPRESS_MARKER)) {
                try {
                    const compressed = this._COMPRESS_MARKER + this._compress(raw);
                    localStorage.setItem(k, compressed);
                } catch (_) { /* skip */ }
            }
        }
    },

    // ── Auto-save tick hook ──
    update() {
        if (World.gamePhase !== 'playing') return;
        this._autoSaveAccum++;
        if (this._autoSaveAccum >= this.AUTO_SAVE_INTERVAL) {
            this._autoSaveAccum = 0;
            this.save(this.AUTO_SAVE_SLOT, true);
        }
    },

    // ── Public API ──

    save(slot, isAuto) {
        const data = this._serialize();
        data.meta = {
            slot: slot,
            timestamp: Date.now(),
            day: Time.day,
            hour: Math.floor(Time.hour),
            population: World.population,
            seedDisplay: Game.seedDisplay || '',
            isAuto: !!isAuto,
            version: this.SAVE_VERSION
        };
        const key = this.STORAGE_PREFIX + slot;
        try {
            const json = JSON.stringify(data);
            const stored = this._COMPRESS_MARKER + this._compress(json);
            try {
                localStorage.setItem(key, stored);
            } catch (_) {
                this._migrateOldSaves();
                localStorage.setItem(key, stored);
            }
            if (!isAuto) {
                Events._notifications.push({
                    text: 'Game saved to slot ' + slot,
                    tick: World.tick,
                    color: '#44DD44'
                });
            }
            return true;
        } catch (e) {
            Events._notifications.push({
                text: 'Save failed: ' + e.message,
                tick: World.tick,
                color: '#FF4444'
            });
            return false;
        }
    },

    load(slot) {
        const key = this.STORAGE_PREFIX + slot;
        const raw = localStorage.getItem(key);
        if (!raw) return false;
        try {
            const json = raw.startsWith(this._COMPRESS_MARKER)
                ? this._decompress(raw.slice(this._COMPRESS_MARKER.length))
                : raw;
            const data = JSON.parse(json);
            if (!data || !data.meta) return false;
            this._deserialize(data);
            return true;
        } catch (e) {
            console.error('Load failed:', e);
            return false;
        }
    },

    getSlotInfo(slot) {
        const key = this.STORAGE_PREFIX + slot;
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        try {
            const json = raw.startsWith(this._COMPRESS_MARKER)
                ? this._decompress(raw.slice(this._COMPRESS_MARKER.length))
                : raw;
            const data = JSON.parse(json);
            return data && data.meta ? data.meta : null;
        } catch (e) {
            return null;
        }
    },

    deleteSlot(slot) {
        localStorage.removeItem(this.STORAGE_PREFIX + slot);
    },

    hasSaves() {
        for (let i = 1; i <= this.NUM_SLOTS; i++) {
            if (this.getSlotInfo(i)) return true;
        }
        if (this.getSlotInfo(this.AUTO_SAVE_SLOT)) return true;
        return false;
    },

    // ── Serialization ──

    _serialize() {
        return {
            world: this._serializeWorld(),
            game: this._serializeGame(),
            time: this._serializeTime(),
            camera: this._serializeCamera(),
            fire: this._serializeFire(),
            events: this._serializeEvents(),
            animal: this._serializeAnimal(),
            popularity: this._serializePopularity(),
            eventLog: this._serializeEventLog(),
            npcSystem: this._serializeNpcSystem()
        };
    },

    _serializeWorld() {
        // Serialize tiles (sparse)
        const tiles = {};
        for (const y in World.tiles) {
            tiles[y] = {};
            for (const x in World.tiles[y]) {
                const t = World.tiles[y][x];
                const td = { t: t.terrain.id };
                if (t.height) td.h = t.height;
                if (t.resourceAmount) td.r = t.resourceAmount;
                if (t.discovered) td.d = 1;
                if (t.roadLevel) td.rd = t.roadLevel;
                tiles[y][x] = td;
            }
        }

        // Serialize buildings
        const buildings = World.buildings.map(b => ({
            id: b.id,
            type: b.type,
            x: b.x,
            y: b.y,
            workers: b.workers.slice(),
            production: b.production,
            active: b.active,
            storage: Object.assign({}, b.storage),
            maxHp: b.maxHp,
            hp: b.hp,
            fireHp: b.fireHp
        }));

        // Serialize NPCs
        const npcs = World.npcs.map(n => this._serializeNpc(n));

        return {
            width: World.width,
            height: World.height,
            seed: World.seed,
            tick: World.tick,
            gamePhase: World.gamePhase,
            setupStep: World.setupStep,
            gameSpeed: World.gameSpeed,
            fowEnabled: World.fowEnabled,
            generatedChunks: Array.from(World.generatedChunks),
            resources: Object.assign({}, World.resources),
            population: World.population,
            maxPopulation: World.maxPopulation,
            happiness: World.happiness,
            fearFactor: World.fearFactor,
            fearEfficiency: World.fearEfficiency,
            idlePeasants: World.idlePeasants,
            keepPos: World.keepPos ? { x: World.keepPos.x, y: World.keepPos.y } : null,
            granaryPos: World.granaryPos ? { x: World.granaryPos.x, y: World.granaryPos.y } : null,
            stockpilePos: World.stockpilePos ? { x: World.stockpilePos.x, y: World.stockpilePos.y } : null,
            rationLevel: World.rationLevel,
            selectedUnits: World.selectedUnits.slice(),
            autoTrade: JSON.parse(JSON.stringify(World.autoTrade)),
            nextBuildingId: World.nextBuildingId,
            nextNpcId: World.nextNpcId,
            tiles: tiles,
            buildings: buildings,
            npcs: npcs
        };
    },

    _serializeNpc(n) {
        const data = {
            // Identity
            id: n.id,
            name: n.name,
            type: n.type,
            char: n.char,
            fg: n.fg,
            // Position & movement
            x: n.x,
            y: n.y,
            targetX: n.targetX,
            targetY: n.targetY,
            path: n.path ? n.path.slice() : null,
            pathIndex: n.pathIndex,
            moveProgress: n.moveProgress,
            walkFrom: n.walkFrom ? { x: n.walkFrom.x, y: n.walkFrom.y } : null,
            walkTo: n.walkTo ? { x: n.walkTo.x, y: n.walkTo.y } : null,
            walkPurpose: n.walkPurpose || '',
            // State
            state: n.state,
            assignedBuilding: n.assignedBuilding,
            carrying: n.carrying,
            carryAmount: n.carryAmount,
            gatherTimer: n.gatherTimer,
            workTimer: n.workTimer || 0,
            idleReason: n.idleReason || '',
            // Combat
            hp: n.hp,
            maxHp: n.maxHp,
            damage: n.damage,
            // Schedule & needs
            homeBuilding: n.homeBuilding,
            schedulePhase: n.schedulePhase,
            hunger: n.hunger,
            fatigue: n.fatigue,
            lastAteType: n.lastAteType,
            foodTypesEaten: n.foodTypesEaten ? n.foodTypesEaten.slice() : [],
            lastAteDay: n.lastAteDay,
            // Internal accumulators
            _hungerAccum: n._hungerAccum || 0,
            _fatigueAccum: n._fatigueAccum || 0,
            _starveAccum: n._starveAccum || 0,
            _regenAccum: n._regenAccum || 0,
            _eatTimer: n._eatTimer || 0,
            // Social
            _socialUntil: n._socialUntil || 0,
            _socialPartnerId: n._socialPartnerId,
            _socialTone: n._socialTone,
            _socialCooldownUntil: n._socialCooldownUntil || 0,
            _recentSocialMood: n._recentSocialMood || 0,
            _recentSocialMoodUntil: n._recentSocialMoodUntil || 0,
            // Conflict
            _fightTargetId: n._fightTargetId,
            _fightUntil: n._fightUntil || 0,
            _fightId: n._fightId || 0,
            _conflictCooldownUntil: n._conflictCooldownUntil || 0,
            // Desperation
            _desperateSinceDay: n._desperateSinceDay,
            _desertTarget: n._desertTarget ? { x: n._desertTarget.x, y: n._desertTarget.y } : null,
            _desertingSinceTick: n._desertingSinceTick || 0,
            // Theft
            _theftTargetBuildingId: n._theftTargetBuildingId,
            _theftTargetType: n._theftTargetType,
            _theftAmount: n._theftAmount || 0,
            _theftTimer: n._theftTimer || 0,
            // Personality, mood, happiness
            traits: n.traits ? n.traits.slice() : [],
            mood: n.mood,
            happiness: n.happiness,
            // Memories
            memories: n.memories ? n.memories.map(m => ({
                type: m.type,
                priority: m.priority,
                tick: m.tick,
                dayNumber: m.dayNumber,
                location: m.location ? { x: m.location.x, y: m.location.y } : null,
                involvedNpcs: m.involvedNpcs ? m.involvedNpcs.slice() : [],
                description: m.description,
                isFirsthand: m.isFirsthand
            })) : [],
            // Relationships
            relationships: n.relationships ? Object.assign({}, n.relationships) : {},
            // Dynamic runtime flags
            onFire: !!n.onFire,
            _fireTick: n._fireTick || 0,
            diseased: !!n.diseased,
            blessedUntil: n.blessedUntil || 0,
            _lastDamageSource: n._lastDamageSource || '',
            _reservedTreeKey: n._reservedTreeKey || null,
            _reservedAnimalId: n._reservedAnimalId || null,
            _huntTarget: n._huntTarget || null,
            _carcassTarget: n._carcassTarget || null
        };

        // Troop-specific
        if (n.type !== 'peasant' && !n.isBandit) {
            data.ranged = !!n.ranged;
            data.range = n.range || 0;
            data.isSleepingAtPost = !!n.isSleepingAtPost;
            data._guardX = n._guardX;
            data._guardY = n._guardY;
            data._arrivalState = n._arrivalState || '';
            data._attackCooldown = n._attackCooldown || 0;
        }

        // Bandit-specific
        if (n.isBandit) {
            data.isBandit = true;
            data.ranged = !!n.ranged;
            data.range = n.range || 0;
            data._attackCooldown = n._attackCooldown || 0;
            data._raidTarget = n._raidTarget ? JSON.parse(JSON.stringify(n._raidTarget)) : null;
        }

        return data;
    },

    _serializeGame() {
        return {
            speed: Game.speed,
            seedDisplay: Game.seedDisplay,
            tickCount: Game.tickCount || 0
        };
    },

    _serializeTime() {
        return {
            hour: Time.hour,
            day: Time.day,
            _tickAccum: Time._tickAccum
        };
    },

    _serializeCamera() {
        return {
            x: Camera.x,
            y: Camera.y,
            zoom: Camera.zoom,
            targetX: Camera.targetX,
            targetY: Camera.targetY,
            _followNpcId: Camera._followNpcId
        };
    },

    _serializeFire() {
        return {
            fires: Fire.fires.map(f => ({
                x: f.x,
                y: f.y,
                startTick: f.startTick,
                isPitchDitch: !!f.isPitchDitch,
                spreadCooldown: f.spreadCooldown || 0
            }))
        };
    },

    _serializeEvents() {
        return {
            _nextEventTick: Events._nextEventTick,
            _notifications: Events._notifications.map(n => ({
                text: n.text,
                tick: n.tick,
                color: n.color
            })),
            diseaseClouds: Events.diseaseClouds.map(c => ({
                x: c.x,
                y: c.y,
                startTick: c.startTick
            })),
            _raidActive: Events._raidActive
        };
    },

    _serializeAnimal() {
        return {
            _animals: Animal._animals.map(a => ({
                id: a.id,
                type: a.type,
                herdId: a.herdId,
                x: a.x,
                y: a.y,
                hp: a.hp,
                maxHp: a.maxHp,
                char: a.char,
                fg: a.fg,
                dead: !!a.dead,
                isTamed: !!a.isTamed,
                _attackCooldown: a._attackCooldown || 0,
                _healCooldown: a._healCooldown || 0
            })),
            _herds: Animal._herds.map(h => ({
                id: h.id,
                type: h.type,
                animals: h.animals.slice(),
                centerX: h.centerX,
                centerY: h.centerY,
                fleeing: !!h.fleeing,
                fleeFromX: h.fleeFromX || 0,
                fleeFromY: h.fleeFromY || 0
            })),
            _carcasses: Animal._carcasses.map(c => ({
                id: c.id,
                x: c.x,
                y: c.y,
                type: c.type,
                resource: c.resource,
                amount: c.amount
            })),
            _nextId: Animal._nextId,
            _nextHerdId: Animal._nextHerdId
        };
    },

    _serializePopularity() {
        return {
            taxRate: Popularity.taxRate,
            _lastTaxDay: Popularity._lastTaxDay
        };
    },

    _serializeEventLog() {
        return {
            _entries: EventLog._entries.map(e => ({
                id: e.id,
                day: e.day,
                timeText: e.timeText,
                category: e.category,
                color: e.color,
                label: e.label,
                description: e.description,
                x: e.x,
                y: e.y
            })),
            _nextId: EventLog._nextId
        };
    },

    _serializeNpcSystem() {
        return {
            _treeReservations: JSON.parse(JSON.stringify(NPC._treeReservations)),
            _animalReservations: JSON.parse(JSON.stringify(NPC._animalReservations)),
            _fightSeq: NPC._fightSeq,
            _resolvedFightIds: Object.assign({}, NPC._resolvedFightIds)
        };
    },

    // ── Deserialization ──

    _deserialize(data) {
        // Pause game during load
        Game.running = false;

        // Restore World
        this._deserializeWorld(data.world);

        // Restore systems
        this._deserializeGame(data.game);
        this._deserializeTime(data.time);
        this._deserializeCamera(data.camera);
        this._deserializeFire(data.fire);
        this._deserializeEvents(data.events);
        this._deserializeAnimal(data.animal);
        this._deserializePopularity(data.popularity);
        this._deserializeEventLog(data.eventLog);
        this._deserializeNpcSystem(data.npcSystem);

        // Re-init map generator (deterministic from seed)
        MapGenerator.init(World.seed, World.width);
        // Mark generated chunks so terrain isn't re-generated
        MapGenerator._regionFeatures = {};

        // Reset transient systems
        Animations.reset();
        BuildingPlacement.isPlacing = false;
        BuildingPlacement.selectedBuilding = null;

        // Show HUD
        document.getElementById('menuOverlay').style.display = 'none';
        document.getElementById('newGamePanel').style.display = 'none';
        document.getElementById('loadGamePanel').style.display = 'none';
        document.getElementById('hud').style.display = 'block';

        // Resume
        Game.running = true;
        Game.lastTick = performance.now();
        Game.tickAccumulator = 0;
        this._autoSaveAccum = 0;
    },

    _deserializeWorld(w) {
        World.width = w.width;
        World.height = w.height;
        World.seed = w.seed;
        World.tick = w.tick;
        World.gamePhase = w.gamePhase;
        World.setupStep = w.setupStep;
        World.gameSpeed = w.gameSpeed;
        World.fowEnabled = w.fowEnabled;
        World.generatedChunks = new Set(w.generatedChunks);
        World.resources = Object.assign({}, w.resources);
        World.population = w.population;
        World.maxPopulation = w.maxPopulation;
        World.happiness = w.happiness;
        World.fearFactor = w.fearFactor;
        World.fearEfficiency = w.fearEfficiency;
        World.idlePeasants = w.idlePeasants;
        World.keepPos = w.keepPos;
        World.granaryPos = w.granaryPos;
        World.stockpilePos = w.stockpilePos;
        World.rationLevel = w.rationLevel;
        World.selectedUnits = w.selectedUnits || [];
        World.autoTrade = w.autoTrade || {};
        World.nextBuildingId = w.nextBuildingId;
        World.nextNpcId = w.nextNpcId;

        // Restore tiles (sparse)
        World.tiles = {};
        World.buildingMap = {};
        for (const y in w.tiles) {
            World.tiles[y] = {};
            World.buildingMap[y] = {};
            for (const x in w.tiles[y]) {
                const st = w.tiles[y][x];
                World.tiles[y][x] = {
                    terrain: TERRAIN_BY_ID[st.t] || TERRAIN.DESERT,
                    height: st.h || 0,
                    resourceAmount: st.r || 0,
                    visible: true,
                    discovered: !!st.d,
                    lastSeenTick: -1,
                    roadLevel: st.rd || 0
                };
                World.buildingMap[y][x] = null;
            }
        }

        // Restore buildings and rebuild buildingMap
        World.buildings = w.buildings.map(b => ({
            id: b.id,
            type: b.type,
            x: b.x,
            y: b.y,
            workers: b.workers.slice(),
            production: b.production,
            active: b.active,
            storage: Object.assign({}, b.storage),
            maxHp: b.maxHp,
            hp: b.hp,
            fireHp: b.fireHp
        }));

        // Rebuild buildingMap from buildings
        for (const b of World.buildings) {
            const def = BUILDINGS[b.type];
            if (!def) continue;
            const w2 = def.width || 1;
            const h2 = def.height || 1;
            for (let dy = 0; dy < h2; dy++) {
                for (let dx = 0; dx < w2; dx++) {
                    const bx = b.x + dx;
                    const by = b.y + dy;
                    if (!World.buildingMap[by]) World.buildingMap[by] = {};
                    World.buildingMap[by][bx] = b.id;
                }
            }
        }

        // Restore NPCs
        World.npcs = w.npcs.map(n => this._deserializeNpc(n));
    },

    _deserializeNpc(n) {
        const npc = {
            id: n.id,
            name: n.name,
            type: n.type,
            char: n.char,
            fg: n.fg,
            x: n.x,
            y: n.y,
            targetX: n.targetX,
            targetY: n.targetY,
            path: n.path,
            pathIndex: n.pathIndex,
            moveProgress: n.moveProgress,
            walkFrom: n.walkFrom,
            walkTo: n.walkTo,
            walkPurpose: n.walkPurpose || '',
            state: n.state,
            assignedBuilding: n.assignedBuilding,
            carrying: n.carrying,
            carryAmount: n.carryAmount,
            gatherTimer: n.gatherTimer,
            workTimer: n.workTimer || 0,
            idleReason: n.idleReason || '',
            hp: n.hp,
            maxHp: n.maxHp,
            damage: n.damage,
            homeBuilding: n.homeBuilding,
            schedulePhase: n.schedulePhase,
            hunger: n.hunger,
            fatigue: n.fatigue,
            lastAteType: n.lastAteType,
            foodTypesEaten: n.foodTypesEaten || [],
            lastAteDay: n.lastAteDay,
            _hungerAccum: n._hungerAccum || 0,
            _fatigueAccum: n._fatigueAccum || 0,
            _starveAccum: n._starveAccum || 0,
            _regenAccum: n._regenAccum || 0,
            _eatTimer: n._eatTimer || 0,
            _socialUntil: n._socialUntil || 0,
            _socialPartnerId: n._socialPartnerId,
            _socialTone: n._socialTone,
            _socialCooldownUntil: n._socialCooldownUntil || 0,
            _recentSocialMood: n._recentSocialMood || 0,
            _recentSocialMoodUntil: n._recentSocialMoodUntil || 0,
            _fightTargetId: n._fightTargetId,
            _fightUntil: n._fightUntil || 0,
            _fightId: n._fightId || 0,
            _conflictCooldownUntil: n._conflictCooldownUntil || 0,
            _desperateSinceDay: n._desperateSinceDay,
            _desertTarget: n._desertTarget,
            _desertingSinceTick: n._desertingSinceTick || 0,
            _theftTargetBuildingId: n._theftTargetBuildingId,
            _theftTargetType: n._theftTargetType,
            _theftAmount: n._theftAmount || 0,
            _theftTimer: n._theftTimer || 0,
            traits: n.traits || [],
            mood: n.mood,
            happiness: n.happiness,
            memories: n.memories || [],
            relationships: n.relationships || {},
            onFire: !!n.onFire,
            _fireTick: n._fireTick || 0,
            diseased: !!n.diseased,
            blessedUntil: n.blessedUntil || 0,
            _lastDamageSource: n._lastDamageSource || '',
            _reservedTreeKey: n._reservedTreeKey || null,
            _reservedAnimalId: n._reservedAnimalId || null,
            _huntTarget: n._huntTarget || null,
            _carcassTarget: n._carcassTarget || null
        };

        // Troop-specific
        if (n.ranged !== undefined && !n.isBandit) {
            npc.ranged = !!n.ranged;
            npc.range = n.range || 0;
            npc.isSleepingAtPost = !!n.isSleepingAtPost;
            npc._guardX = n._guardX;
            npc._guardY = n._guardY;
            npc._arrivalState = n._arrivalState || '';
            npc._attackCooldown = n._attackCooldown || 0;
        }

        // Bandit-specific
        if (n.isBandit) {
            npc.isBandit = true;
            npc.ranged = !!n.ranged;
            npc.range = n.range || 0;
            npc._attackCooldown = n._attackCooldown || 0;
            npc._raidTarget = n._raidTarget || null;
        }

        return npc;
    },

    _deserializeGame(g) {
        Game.speed = g.speed;
        Game.seedDisplay = g.seedDisplay;
        Game.tickCount = g.tickCount || 0;
        Game.setSpeed(g.speed);
    },

    _deserializeTime(t) {
        Time.hour = t.hour;
        Time.day = t.day;
        Time._tickAccum = t._tickAccum;
        Time._updatePhase();
    },

    _deserializeCamera(c) {
        Camera.x = c.x;
        Camera.y = c.y;
        Camera.zoom = c.zoom;
        Camera.targetX = c.targetX;
        Camera.targetY = c.targetY;
        Camera._followNpcId = c._followNpcId;
        // Clear transient shake
        Camera._shakeIntensity = 0;
        Camera._shakeDuration = 0;
        Camera._shakeOffsetX = 0;
        Camera._shakeOffsetY = 0;
    },

    _deserializeFire(f) {
        Fire.fires = [];
        Fire.fireMap = {};
        for (const fd of f.fires) {
            Fire.fires.push({
                x: fd.x,
                y: fd.y,
                startTick: fd.startTick,
                isPitchDitch: !!fd.isPitchDitch,
                spreadCooldown: fd.spreadCooldown || 0
            });
            Fire._setFire(fd.x, fd.y, true);
        }
    },

    _deserializeEvents(e) {
        Events._nextEventTick = e._nextEventTick;
        Events._notifications = e._notifications || [];
        Events.diseaseClouds = [];
        Events.diseaseMap = {};
        Events._raidActive = !!e._raidActive;
        for (const c of (e.diseaseClouds || [])) {
            Events.diseaseClouds.push({
                x: c.x,
                y: c.y,
                startTick: c.startTick
            });
            Events._setDisease(c.x, c.y, true);
        }
    },

    _deserializeAnimal(a) {
        Animal._animals = a._animals.map(an => ({
            id: an.id,
            type: an.type,
            herdId: an.herdId,
            x: an.x,
            y: an.y,
            hp: an.hp,
            maxHp: an.maxHp,
            char: an.char,
            fg: an.fg,
            dead: !!an.dead,
            isTamed: !!an.isTamed,
            _attackCooldown: an._attackCooldown || 0,
            _healCooldown: an._healCooldown || 0
        }));
        Animal._herds = a._herds.map(h => ({
            id: h.id,
            type: h.type,
            animals: h.animals.slice(),
            centerX: h.centerX,
            centerY: h.centerY,
            fleeing: !!h.fleeing,
            fleeFromX: h.fleeFromX || 0,
            fleeFromY: h.fleeFromY || 0
        }));
        Animal._carcasses = a._carcasses.map(c => ({
            id: c.id,
            x: c.x,
            y: c.y,
            type: c.type,
            resource: c.resource,
            amount: c.amount
        }));
        Animal._nextId = a._nextId;
        Animal._nextHerdId = a._nextHerdId;
    },

    _deserializePopularity(p) {
        Popularity.taxRate = p.taxRate;
        Popularity._lastTaxDay = p._lastTaxDay;
        // Factors will be recomputed next tick
        Popularity.factors = {
            food: 0, foodVariety: 0, tax: 0, religion: 0,
            housing: 0, ale: 0, fear: 0, disease: 0, hunger: 0
        };
    },

    _deserializeEventLog(el) {
        EventLog._entries = el._entries || [];
        EventLog._nextId = el._nextId || 1;
        EventLog._activeFilter = 'all';
        EventLog._render();
    },

    _deserializeNpcSystem(ns) {
        NPC._treeReservations = ns._treeReservations || {};
        NPC._animalReservations = ns._animalReservations || {};
        NPC._fightSeq = ns._fightSeq || 0;
        NPC._resolvedFightIds = ns._resolvedFightIds || {};
    }
};
