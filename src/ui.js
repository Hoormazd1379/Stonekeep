// Stonekeep - UI System
'use strict';

const UI = {
    setupMessageEl: null,
    _selectedBuilding: null,  // Currently selected building instance for action menu
    _buildMenuVisible: true,
    _activeBuildTab: 'resource', // Currently selected build menu tab (defaults to Industry)
    _previousResources: {},   // For trend tracking
    _resourceTrends: {},      // delta per 10 ticks
    _lastTrendTick: -1,       // Last tick trends were updated (prevents multi-frame overwrite)
    _tpsLastTime: 0,
    _tpsDisplay: 0,
    _lastTickCount: 0,
    _lastInfoTileX: -1,      // For live-updating info panel
    _lastInfoTileY: -1,

    init() {
        this._setupMenuButtons();
        this._buildBuildMenu();
        this._setupSpeedControls();
        this._initTrends();
    },

    _initTrends() {
        const tracked = ['gold', 'wood', 'stone', 'iron', 'pitch', 'food', 'happiness'];
        for (const k of tracked) {
            this._previousResources[k] = 0;
            this._resourceTrends[k] = 0;
        }
        this._tpsLastTime = performance.now();
        this._lastTickCount = 0;
        this._tpsDisplay = 0;
    },

    _setupMenuButtons() {
        document.getElementById('btnNewGame').addEventListener('click', () => {
            document.getElementById('menuOverlay').style.display = 'none';
            document.getElementById('newGamePanel').style.display = 'flex';
            const randomSeed = Math.floor(Math.random() * 999999).toString();
            document.getElementById('seedInput').value = randomSeed;
        });

        document.getElementById('btnBackToMenu').addEventListener('click', () => {
            document.getElementById('newGamePanel').style.display = 'none';
            document.getElementById('menuOverlay').style.display = 'flex';
        });

        document.getElementById('btnStartGame').addEventListener('click', () => {
            const seedStr = document.getElementById('seedInput').value.trim() ||
                            Math.floor(Math.random() * 999999).toString();
            const mapSize = parseInt(document.getElementById('mapSizeSelect').value);
            const seed = Utils.hashString(seedStr);
            const fowEnabled = document.getElementById('fowToggle').value === 'on';

            document.getElementById('newGamePanel').style.display = 'none';
            document.getElementById('hud').style.display = 'block';

            World.fowEnabled = fowEnabled;
            Game.startNewGame(mapSize, seed, seedStr);
        });

        // NPC Details modal close
        document.getElementById('npcDetailsClose').addEventListener('click', () => {
            this.closeNpcDetails();
        });
        document.getElementById('npcDetailsOverlay').addEventListener('click', (e) => {
            if (e.target.id === 'npcDetailsOverlay') this.closeNpcDetails();
        });

        // NPC List button
        document.getElementById('btnNpcList').addEventListener('click', () => {
            UI._showNpcList();
        });

        // Knowledge Base button on HUD top bar
        document.getElementById('btnHelpHud').addEventListener('click', () => {
            KnowledgeBase.open();
        });

        // Save Game button on HUD top bar
        document.getElementById('btnSaveGame').addEventListener('click', () => {
            UI._showSaveDialog();
        });

        // Load Game menu button
        document.getElementById('btnLoadGame').addEventListener('click', () => {
            document.getElementById('menuOverlay').style.display = 'none';
            UI._showLoadPanel();
        });

        // Back from load panel
        document.getElementById('btnBackFromLoad').addEventListener('click', () => {
            document.getElementById('loadGamePanel').style.display = 'none';
            document.getElementById('menuOverlay').style.display = 'flex';
        });

        // Show load button if saves exist
        if (SaveLoad.hasSaves()) {
            document.getElementById('btnLoadGame').style.display = 'block';
        }

        // Event delegation for Focus/Details buttons in info panel
        document.getElementById('infoContent').addEventListener('mousedown', (e) => {
            const btn = e.target.closest('[data-focus-npc],[data-details-npc]');
            if (!btn) return;
            if (btn.dataset.focusNpc) {
                Camera.startFollow(parseInt(btn.dataset.focusNpc));
            } else if (btn.dataset.detailsNpc) {
                UI.openNpcDetails(parseInt(btn.dataset.detailsNpc));
            }
        });

        // Event delegation for buttons in NPC details modal
        document.getElementById('npcDetailsContent').addEventListener('mousedown', (e) => {
            const btn = e.target.closest('[data-focus-npc],[data-focus-building],[data-show-memories],[data-show-mood],[data-show-relationships]');
            if (!btn) return;
            if (btn.dataset.showMemories) {
                UI._showMemoryLog(parseInt(btn.dataset.showMemories));
            } else if (btn.dataset.showMood) {
                UI._showMoodBreakdown(parseInt(btn.dataset.showMood));
            } else if (btn.dataset.showRelationships) {
                UI._showRelationships(parseInt(btn.dataset.showRelationships));
            } else if (btn.dataset.focusBuilding) {
                const bid = parseInt(btn.dataset.focusBuilding);
                const b = World.buildings.find(b => b.id === bid);
                if (b) {
                    Camera.stopFollow();
                    Camera.centerOn(b.x, b.y);
                    UI.showBuildingActions(b);
                }
            } else if (btn.dataset.focusNpc) {
                Camera.startFollow(parseInt(btn.dataset.focusNpc));
            }
        });

        // Event delegation for Focus/Details buttons in build menu (housing residents)
        document.getElementById('buildMenu').addEventListener('mousedown', (e) => {
            const btn = e.target.closest('[data-focus-npc],[data-details-npc]');
            if (!btn) return;
            if (btn.dataset.focusNpc) {
                Camera.startFollow(parseInt(btn.dataset.focusNpc));
            } else if (btn.dataset.detailsNpc) {
                UI.openNpcDetails(parseInt(btn.dataset.detailsNpc));
            }
        });
    },

    _buildBuildMenu() {
        const menu = document.getElementById('buildMenu');
        menu.innerHTML = '';

        // ── Tab Bar (browser-style tabs) ──
        const tabBar = document.createElement('div');
        tabBar.style.cssText = 'display:flex;flex-wrap:wrap;gap:0;padding:0 0 0 4px;border-bottom:1px solid #c8a82e;min-height:30px;align-items:flex-end;';

        for (const cat of BUILD_CATEGORIES) {
            // Skip castle category unless a core building is destroyed
            const playableBuildings = cat.buildings.filter(bid => {
                const d = BUILDINGS[bid];
                if (!d) return false;
                if (d.placementPhase === 'setup') {
                    // Show only if this building has been destroyed (not in world)
                    return !World.buildings.some(b => b.type === bid);
                }
                return true;
            });
            if (playableBuildings.length === 0) continue;

            const tab = document.createElement('button');
            tab.className = 'build-tab' + (cat.id === this._activeBuildTab ? ' active' : '');
            tab.textContent = cat.name;
            tab.addEventListener('click', () => {
                this._activeBuildTab = cat.id;
                this._buildBuildMenu();
            });
            tabBar.appendChild(tab);
        }
        menu.appendChild(tabBar);

        // ── Building List for Active Tab ──
        const activeCat = BUILD_CATEGORIES.find(c => c.id === this._activeBuildTab);
        if (!activeCat) return;

        const div = document.createElement('div');
        div.className = 'build-category';
        div.style.cssText = 'min-height:120px;display:flex;flex-wrap:wrap;gap:4px;padding:8px 4px;';

        for (const buildingId of activeCat.buildings) {
            const def = BUILDINGS[buildingId];
            if (def.placementPhase === 'setup' && World.buildings.some(b => b.type === buildingId)) continue;

            const btn = document.createElement('button');
            btn.className = 'build-btn';
            btn.dataset.building = buildingId;

            // Building name
            const nameSpan = document.createElement('span');
            nameSpan.textContent = `${def.char} ${def.name}`;
            btn.appendChild(nameSpan);

            // Resource costs
            if (def.cost) {
                const costSpan = document.createElement('span');
                costSpan.style.cssText = 'font-size:9px;color:#888;margin-left:6px;';
                const parts = [];
                for (const res in def.cost) {
                    const amt = def.cost[res];
                    const has = Resources.get(res) || 0;
                    const color = has >= amt ? '#8a8' : '#a66';
                    parts.push(`<span data-res="${res}" data-amt="${amt}" style="color:${color}">${amt} ${res}</span>`);
                }
                costSpan.innerHTML = parts.join(' ');
                btn.appendChild(costSpan);
            }

            btn.title = def.description;

            btn.addEventListener('click', () => {
                if (World.gamePhase !== 'playing') return;
                this._selectBuild(buildingId, btn);
            });

            div.appendChild(btn);
        }

        menu.appendChild(div);
    },

    _selectBuild(buildingId, btn) {
        this.showBuildMenu(); // Ensure build menu is visible
        document.querySelectorAll('.build-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        BuildingPlacement.startPlacing(buildingId);
    },

    clearBuildSelection() {
        document.querySelectorAll('.build-btn').forEach(b => b.classList.remove('selected'));
    },

    _setupSpeedControls() {
        document.querySelectorAll('#speedControls button[data-speed]').forEach(btn => {
            btn.addEventListener('click', () => {
                const speed = parseInt(btn.dataset.speed);
                Game.setSpeed(speed);
                document.querySelectorAll('#speedControls button[data-speed]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        // Zoom controls
        document.getElementById('zoomIn').addEventListener('click', () => Camera.zoomIn());
        document.getElementById('zoomOut').addEventListener('click', () => Camera.zoomOut());
        document.getElementById('zoomReset').addEventListener('click', () => { Camera.zoom = 1.0; });
    },

    // ── Trend Tracking ──
    _updateTrends() {
        const current = {
            gold: World.resources.gold || 0,
            wood: World.resources.wood || 0,
            stone: World.resources.stone || 0,
            iron: World.resources.iron || 0,
            pitch: World.resources.pitch || 0,
            food: Resources.getTotalFood(),
            happiness: World.happiness
        };

        for (const k in current) {
            // Store raw delta per 10 ticks for prediction
            this._resourceTrends[k] = current[k] - (this._previousResources[k] || 0);
            this._previousResources[k] = current[k];
        }
    },

    _trendArrow(key) {
        const delta = this._resourceTrends[key] || 0;
        // Predict value in 100 ticks (10 intervals of 10 ticks)
        const predicted = delta * 10;
        if (delta > 0) return `<span style="color:#4c4;font-size:10px"> ▲+${predicted}</span>`;
        if (delta < 0) return `<span style="color:#c44;font-size:10px"> ▼${predicted}</span>`;
        return '<span style="color:#666;font-size:10px"> ►0</span>';
    },

    _updateTPS() {
        const now = performance.now();
        const elapsed = now - this._tpsLastTime;
        if (elapsed >= 1000) {
            const ticks = (Game.tickCount || 0) - (this._lastTickCount || 0);
            this._tpsDisplay = Math.round(ticks / (elapsed / 1000));
            this._lastTickCount = Game.tickCount || 0;
            this._tpsLastTime = now;
        }
    },

    updateHUD() {
        // Update trends every ~10 ticks (guard against multi-frame calls within same tick)
        if (World.tick % 10 === 0 && World.tick !== this._lastTrendTick) {
            this._updateTrends();
            this._lastTrendTick = World.tick;
        }

        // Update TPS counter
        this._updateTPS();

        document.getElementById('resGold').innerHTML = (World.resources.gold || 0) + this._trendArrow('gold');
        document.getElementById('resWood').innerHTML = (World.resources.wood || 0) + this._trendArrow('wood');
        document.getElementById('resStone').innerHTML = (World.resources.stone || 0) + this._trendArrow('stone');
        document.getElementById('resIron').innerHTML = (World.resources.iron || 0) + this._trendArrow('iron');
        document.getElementById('resPitch').innerHTML = (World.resources.pitch || 0) + this._trendArrow('pitch');
        document.getElementById('resPop').textContent = World.population;
        document.getElementById('resPopMax').textContent = World.maxPopulation;
        document.getElementById('resIdle').textContent = World.idlePeasants;
        document.getElementById('resFood').innerHTML = Resources.getTotalFood() + this._trendArrow('food');
        document.getElementById('resHops').innerHTML = (World.resources.hops || 0) + this._trendArrow('hops');
        document.getElementById('resAle').innerHTML = (World.resources.ale || 0) + this._trendArrow('ale');
        document.getElementById('resHappiness').innerHTML = World.happiness + this._trendArrow('happiness');
        document.getElementById('tpsDisplay').textContent = this._tpsDisplay;

        // Update clock display
        if (typeof Time !== 'undefined') {
            document.getElementById('clockTime').textContent = Time.getTimeString();
            document.getElementById('clockIcon').textContent = Time.getPhaseIcon();
            document.getElementById('clockPhase').textContent = Time.getPhaseName();
            document.getElementById('clockDay').textContent = 'Day ' + Time.day;
            // Schedule phase indicator
            const schedPhase = NPC._getSchedulePhase();
            const schedLabels = { work: ':: Work', free: '~~ Free', sleep: '-- Sleep' };
            const schedColors = { work: '#88aaff', free: '#88ff88', sleep: '#8888ff' };
            const schedEl = document.getElementById('clockSchedule');
            if (schedEl) {
                schedEl.textContent = schedLabels[schedPhase] || '';
                schedEl.style.color = schedColors[schedPhase] || '#888';
            }
        }

        // Live-update info panel if a tile is selected
        if (this._lastInfoTileX >= 0 && this._lastInfoTileY >= 0) {
            if (World.selectedUnits.length > 1) {
                this.showMultiUnitInfo();
            } else if (World.selectedUnits.length === 1) {
                const unit = World.npcs.find(n => n.id === World.selectedUnits[0]);
                if (unit) this.showUnitInfo(unit);
            } else {
                this._refreshTileInfo();
            }
        }

        // Live-update build menu cost colors
        if (this._buildMenuVisible) {
            this._refreshBuildCosts();
        }

        // Live-update action menu if a building is selected
        if (this._selectedBuilding) {
            const building = World.buildings.find(b => b.id === this._selectedBuilding.id);
            if (!building) {
                this.showBuildMenu();
            } else {
                // Refresh building menu to update live NPC statuses
                this.showBuildingActions(building);
            }
        }
    },

    showSetupMessage(message) {
        const info = document.getElementById('infoContent');
        info.innerHTML = `<span style="color:#c8a82e;font-size:14px;">${message}</span>`;
    },

    // ── Show Build Menu (restore from action menu) ──
    showBuildMenu() {
        if (this._buildMenuVisible) return;
        this._selectedBuilding = null;
        this._buildMenuVisible = true;
        const menu = document.getElementById('buildMenu');
        menu.innerHTML = '';
        menu.style.flexDirection = 'column';
        menu.style.flexWrap = '';
        this._buildBuildMenu();
    },

    // ── Live-update cost colors in build menu ──
    _refreshBuildCosts() {
        const btns = document.querySelectorAll('#buildMenu button[data-building]');
        for (const btn of btns) {
            const buildingId = btn.dataset.building;
            const def = BUILDINGS[buildingId];
            if (!def || !def.cost) continue;
            const costSpans = btn.querySelectorAll('span[data-res]');
            for (const span of costSpans) {
                const res = span.dataset.res;
                const amt = parseInt(span.dataset.amt);
                const has = Resources.get(res) || 0;
                span.style.color = has >= amt ? '#8a8' : '#a66';
            }
        }
    },

    // ── Building Action Menu ──
    showBuildingActions(building) {
        this._selectedBuilding = building;
        this._buildMenuVisible = false;
        const menu = document.getElementById('buildMenu');
        menu.innerHTML = '';
        menu.style.flexDirection = 'row';
        menu.style.flexWrap = 'wrap';

        const def = BUILDINGS[building.type];

        // Header
        const header = document.createElement('div');
        header.className = 'build-category';
        const title = document.createElement('div');
        title.className = 'build-category-title';
        title.textContent = def.name + ' Actions';
        header.appendChild(title);

        // Back button
        const backBtn = document.createElement('button');
        backBtn.className = 'build-btn';
        backBtn.textContent = '← Back to Build Menu';
        backBtn.addEventListener('mousedown', () => this.showBuildMenu());
        header.appendChild(backBtn);

        menu.appendChild(header);

        // Building HP display
        if (building.hp !== undefined && building.maxHp) {
            const hpDiv = document.createElement('div');
            hpDiv.className = 'build-category';
            const hpPct = building.hp / building.maxHp;
            const hpColor = hpPct > 0.6 ? '#4a4' : hpPct > 0.3 ? '#aa4' : '#a44';
            hpDiv.innerHTML = '<div style="color:' + hpColor + ';font-size:11px;padding:2px 4px;">HP: ' + building.hp + ' / ' + building.maxHp + '</div>';
            // HP bar
            const barOuter = document.createElement('div');
            barOuter.style.cssText = 'width:100%;height:6px;background:#333;border-radius:3px;margin:2px 4px;';
            const barInner = document.createElement('div');
            barInner.style.cssText = 'width:' + (hpPct * 100) + '%;height:100%;background:' + hpColor + ';border-radius:3px;';
            barOuter.appendChild(barInner);
            hpDiv.appendChild(barOuter);
            menu.appendChild(hpDiv);
        }

        // Building-specific actions
        if (building.type === 'keep') {
            this._addKeepActions(menu);
        } else if (building.type === 'granary') {
            this._addGranaryActions(menu);
        } else if (building.type === 'bazaar') {
            this._addBazaarActions(menu);
        } else if (building.type === 'barracks') {
            this._addBarracksActions(menu);
        }

        // ── Schedule & Status info for worker buildings ──
        if (def.workers && def.workers > 0) {
            const schedDiv = document.createElement('div');
            schedDiv.className = 'build-category';
            const schedTitle = document.createElement('div');
            schedTitle.className = 'build-category-title';
            schedTitle.textContent = 'Schedule';
            schedDiv.appendChild(schedTitle);

            const phase = NPC._getSchedulePhase();
            const isService = def.isWell || def.isReligious || def.isApothecary || def.isInn;
            const isOpen = isService ? (phase !== 'sleep') : (phase === 'work');
            const statusColor = isOpen ? '#4c4' : '#c44';
            const statusText = isOpen ? 'Open' : 'Closed';
            const schedRow = document.createElement('div');
            schedRow.style.cssText = 'font-size:11px;padding:2px 4px;color:#aaa;';
            schedRow.innerHTML = `Status: <span style="color:${statusColor};font-weight:bold">${statusText}</span>`;
            if (isService) {
                schedRow.innerHTML += ` <span style="font-size:10px;color:#888">(service — open during work + free time)</span>`;
            }
            schedDiv.appendChild(schedRow);

            // Worker status summary
            const workers = (building.workers || []).map(wid => World.npcs.find(n => n.id === wid)).filter(Boolean);
            if (workers.length > 0) {
                const sleeping = workers.filter(w => w.state === NPC.STATE.SLEEPING).length;
                const working = workers.filter(w => w.state === NPC.STATE.WORKING || w.walkPurpose).length;
                const avgFatigue = Math.round(workers.reduce((s, w) => s + (w.fatigue || 0), 0) / workers.length);
                const workerRow = document.createElement('div');
                workerRow.style.cssText = 'font-size:10px;padding:2px 4px;color:#aaa;';
                workerRow.innerHTML = `Workers: ${workers.length}/${def.workers}`;
                if (sleeping > 0) workerRow.innerHTML += ` | <span style="color:#8888FF">${sleeping} sleeping</span>`;
                if (avgFatigue > 50) workerRow.innerHTML += ` | <span style="color:#cccc44">Avg fatigue: ${avgFatigue}%</span>`;
                schedDiv.appendChild(workerRow);
            }
            menu.appendChild(schedDiv);
        }

        // Housing info for housing buildings
        if (def.housing) {
            const houseDiv = document.createElement('div');
            houseDiv.className = 'build-category';
            const houseTitle = document.createElement('div');
            houseTitle.className = 'build-category-title';
            houseTitle.textContent = 'Housing';
            houseDiv.appendChild(houseTitle);

            const residents = World.npcs.filter(n => n.homeBuilding === building.id);
            const tierLabels = { 1: 'Basic (Hovel)', 2: 'Comfortable (Cottage)', 3: 'Quality (House)' };
            const houseRow = document.createElement('div');
            houseRow.style.cssText = 'font-size:11px;padding:2px 4px;color:#aaa;';
            houseRow.innerHTML = `Tier: <span style="color:#bb9966">${tierLabels[def.housingTier] || 'Unknown'}</span>`;
            houseRow.innerHTML += `<br>Residents: <span style="color:#ccc">${residents.length} / ${def.housing}</span>`;
            houseDiv.appendChild(houseRow);

            // Show each resident with Focus/Details buttons
            for (const res of residents) {
                const resRow = document.createElement('div');
                resRow.style.cssText = 'font-size:10px;color:#aaf;margin-left:8px;padding:1px 0;';
                let resHtml = `${res.name || ('Villager #' + res.id)}`;
                resHtml += ` -- <span style="color:#ccc">${res.walkPurpose || res.state}</span>`;
                resHtml += ` <button data-focus-npc="${res.id}" style="padding:0 4px;font-size:9px;cursor:pointer;background:#333;color:#c8a82e;border:1px solid #555">Focus</button>`;
                resHtml += ` <button data-details-npc="${res.id}" style="padding:0 4px;font-size:9px;cursor:pointer;background:#333;color:#c8a82e;border:1px solid #555">Details</button>`;
                resRow.innerHTML = resHtml;
                houseDiv.appendChild(resRow);
            }

            menu.appendChild(houseDiv);
        }

        // Common actions for all non-core buildings
        const commonDiv = document.createElement('div');
        commonDiv.className = 'build-category';
        const commonTitle = document.createElement('div');
        commonTitle.className = 'build-category-title';
        commonTitle.textContent = 'Building Controls';
        commonDiv.appendChild(commonTitle);

        // Sleep/Wake toggle
        if (def.workers && def.workers > 0) {
            const sleepBtn = document.createElement('button');
            sleepBtn.className = 'build-btn';
            sleepBtn.textContent = building.active ? 'Zzz Deactivate' : '[+] Activate';
            sleepBtn.addEventListener('mousedown', () => {
                building.active = !building.active;
                if (!building.active) {
                    // Release workers
                    for (const wid of building.workers) {
                        NPC.releaseWorker(wid);
                    }
                    building.workers = [];
                } else {
                    // Reassign workers
                    NPC.assignWorkersToBuilding(building);
                }
                this.showBuildingActions(building);
                this.showTileInfo(building.x, building.y);
            });
            commonDiv.appendChild(sleepBtn);
        }

        // Repair button (shown when building is damaged)
        if (building.hp !== undefined && building.hp < building.maxHp) {
            const damagePct = 1 - building.hp / building.maxHp;
            const repairCost = {};
            if (def.cost) {
                for (const res in def.cost) {
                    const amount = Math.max(1, Math.ceil(def.cost[res] * damagePct));
                    repairCost[res] = amount;
                }
            }
            // Default repair cost if building has no cost (core buildings)
            if (Object.keys(repairCost).length === 0) {
                repairCost.stone = Math.max(1, Math.ceil(10 * damagePct));
                repairCost.wood = Math.max(1, Math.ceil(5 * damagePct));
            }
            const canAfford = Resources.canAfford(repairCost);
            const costStr = Object.entries(repairCost).map(([r, a]) => a + ' ' + r).join(', ');
            const repairBtn = document.createElement('button');
            repairBtn.className = 'build-btn';
            repairBtn.style.color = canAfford ? '#4a4' : '#a44';
            repairBtn.textContent = '[#] Repair (' + costStr + ')';
            repairBtn.addEventListener('mousedown', () => {
                if (Resources.canAfford(repairCost)) {
                    Resources.spend(repairCost);
                    building.hp = building.maxHp;
                    if (def.flammable && building.fireHp !== undefined) {
                        building.fireHp = CONFIG.FIRE_BUILDING_HP;
                    }
                    this.showBuildingActions(building);
                }
            });
            commonDiv.appendChild(repairBtn);
        }

        // Demolish button (not for core buildings)
        if (!def.placementPhase) {
            const demolishBtn = document.createElement('button');
            demolishBtn.className = 'build-btn';
            demolishBtn.style.color = '#cc4444';
            demolishBtn.textContent = 'x Demolish';
            demolishBtn.addEventListener('mousedown', () => {
                // Release workers
                for (const wid of building.workers || []) {
                    NPC.releaseWorker(wid);
                }
                // Refund half cost
                if (def.cost) {
                    for (const res in def.cost) {
                        Resources.add(res, Math.floor(def.cost[res] / 2));
                    }
                }
                // Remove housing
                if (def.housing) {
                    World.maxPopulation -= def.housing;
                }
                World.removeBuilding(building.id);
                NPC.reassignAllHomes();
                this.showBuildMenu();
                const info = document.getElementById('infoContent');
                info.innerHTML = '<span style="color:#c8a82e">' + def.name + ' demolished. Resources partially refunded.</span>';
            });
            commonDiv.appendChild(demolishBtn);
        }

        menu.appendChild(commonDiv);
    },

    _addKeepActions(menu) {
        // ── Castle Statistics ──
        const statsDiv = document.createElement('div');
        statsDiv.className = 'build-category';
        const statsTitle = document.createElement('div');
        statsTitle.className = 'build-category-title';
        statsTitle.textContent = 'Castle Statistics';
        statsDiv.appendChild(statsTitle);

        const statStyle = 'color:#aaa;font-size:10px;padding:1px 4px;';

        // Population
        const popRow = document.createElement('div');
        popRow.style.cssText = statStyle;
        popRow.innerHTML = `Population: <span style="color:#fff">${World.population}/${World.maxPopulation}</span> (Idle: ${World.idlePeasants})`;
        statsDiv.appendChild(popRow);

        // Workers breakdown
        const totalWorkers = World.npcs.filter(n => n.type === 'worker').length;
        const totalTroops = World.npcs.filter(n => n.type in TROOPS).length;
        const workerRow = document.createElement('div');
        workerRow.style.cssText = statStyle;
        workerRow.innerHTML = `Workers: <span style="color:#aaf">${totalWorkers}</span> | Troops: <span style="color:#faa">${totalTroops}</span>`;
        statsDiv.appendChild(workerRow);

        // Buildings count
        const bldgRow = document.createElement('div');
        bldgRow.style.cssText = statStyle;
        bldgRow.innerHTML = `Buildings: <span style="color:#fff">${World.buildings.length}</span>`;
        statsDiv.appendChild(bldgRow);

        // Disease info
        const diseaseCount = Events.getDiseaseCloudCount();
        const diseasedNpcs = World.npcs.filter(n => n.diseased && !n.isBandit).length;
        if (diseaseCount > 0 || diseasedNpcs > 0) {
            const diseaseRow = document.createElement('div');
            diseaseRow.style.cssText = statStyle;
            const resPct = Math.round(Events.getDiseaseResistance() * 100);
            diseaseRow.innerHTML = `<span style="color:#88CC00">Disease: ${diseaseCount} tiles, ${diseasedNpcs} infected | Resist: ${resPct}%</span>`;
            statsDiv.appendChild(diseaseRow);
        }

        menu.appendChild(statsDiv);

        // ── Happiness Breakdown ──
        const happyDiv = document.createElement('div');
        happyDiv.className = 'build-category';
        const happyTitle = document.createElement('div');
        happyTitle.className = 'build-category-title';
        happyTitle.textContent = 'Happiness Breakdown';
        happyDiv.appendChild(happyTitle);

        const avgNote = document.createElement('div');
        avgNote.style.cssText = 'color:#888;font-size:9px;padding:0 4px 2px;font-style:italic;';
        avgNote.textContent = `Castle happiness: ${World.happiness} (avg of ${World.population} villagers)`;
        happyDiv.appendChild(avgNote);

        const baseRow = document.createElement('div');
        baseRow.style.cssText = statStyle;
        baseRow.innerHTML = `Base: <span style="color:#fff">50</span>`;
        happyDiv.appendChild(baseRow);

        const factorNames = {
            food: 'Food/Rations',
            foodVariety: 'Food Variety',
            tax: 'Taxation',
            religion: 'Religion/Good Things',
            housing: 'Housing',
            ale: 'Ale Coverage',
            fear: 'Fear Factor',
            disease: 'Disease',
            hunger: 'Population Hunger'
        };
        for (const [key, label] of Object.entries(factorNames)) {
            const val = Popularity.factors[key] || 0;
            const color = val > 0 ? '#4c4' : val < 0 ? '#c44' : '#888';
            const sign = val > 0 ? '+' : '';
            const row = document.createElement('div');
            row.style.cssText = statStyle;
            row.innerHTML = `${label}: <span style="color:${color}">${sign}${val}</span>`;
            happyDiv.appendChild(row);
        }

        const totalRow = document.createElement('div');
        totalRow.style.cssText = 'color:#c8a82e;font-size:11px;padding:2px 4px;font-weight:bold;';
        totalRow.innerHTML = `Total: ${World.happiness}`;
        happyDiv.appendChild(totalRow);

        // Fear factor details
        const fearLevel = World.fearFactor;
        const fearLabel = fearLevel < 0 ? 'Good' : fearLevel > 0 ? 'Cruel' : 'Neutral';
        const fearColor = fearLevel < 0 ? '#4c4' : fearLevel > 0 ? '#c44' : '#888';
        const effPct = Math.round(World.fearEfficiency * 100);
        const dmgPct = Math.round(Military.getFearDamageBonus() * 100);
        const fearRow = document.createElement('div');
        fearRow.style.cssText = 'color:#aaa;font-size:10px;padding:2px 4px;margin-top:4px;border-top:1px solid #444;';
        fearRow.innerHTML = `Fear: <span style="color:${fearColor}">${fearLevel} (${fearLabel})</span> | Prod: ${effPct}% | Troop Dmg: ${dmgPct}%`;
        happyDiv.appendChild(fearRow);

        menu.appendChild(happyDiv);

        // ── Warnings / Issues ──
        const warnings = [];
        if (World.idlePeasants === 0 && World.population >= World.maxPopulation) {
            warnings.push('No idle peasants — build more housing');
        }
        if (Resources.getTotalFood() <= 0) {
            warnings.push('No food! People will leave');
        } else if (Resources.getTotalFood() < World.population) {
            warnings.push('Food supply running low');
        }
        if (World.population >= World.maxPopulation) {
            warnings.push('Housing full — build more hovels');
        }
        if (World.happiness < 40) {
            warnings.push('Low happiness — people may leave');
        }
        if (World.idlePeasants > 5) {
            warnings.push(`${World.idlePeasants} idle peasants — assign them jobs`);
        }

        if (warnings.length > 0) {
            const warnDiv = document.createElement('div');
            warnDiv.className = 'build-category';
            const warnTitle = document.createElement('div');
            warnTitle.className = 'build-category-title';
            warnTitle.style.color = '#cc4444';
            warnTitle.textContent = '[!] Issues';
            warnDiv.appendChild(warnTitle);
            for (const w of warnings) {
                const wRow = document.createElement('div');
                wRow.style.cssText = 'color:#cc8844;font-size:10px;padding:1px 4px;';
                wRow.textContent = '• ' + w;
                warnDiv.appendChild(wRow);
            }
            menu.appendChild(warnDiv);
        }

        // ── Tax Management ──
        const div = document.createElement('div');
        div.className = 'build-category';
        const title = document.createElement('div');
        title.className = 'build-category-title';
        title.textContent = 'Tax Management';
        div.appendChild(title);

        const taxLabel = document.createElement('div');
        taxLabel.style.cssText = 'color:#aaa;font-size:11px;padding:4px;';
        taxLabel.textContent = `Current Tax Rate: ${Popularity.taxRate}`;
        div.appendChild(taxLabel);

        const taxRow = document.createElement('div');
        taxRow.style.cssText = 'display:flex;gap:4px;';

        const lowerBtn = document.createElement('button');
        lowerBtn.className = 'build-btn';
        lowerBtn.textContent = '- Lower Tax';
        lowerBtn.addEventListener('mousedown', () => {
            Popularity.taxRate = Math.max(-5, Popularity.taxRate - 1);
            this.showBuildingActions(this._selectedBuilding);
        });
        taxRow.appendChild(lowerBtn);

        const raiseBtn = document.createElement('button');
        raiseBtn.className = 'build-btn';
        raiseBtn.textContent = '+ Raise Tax';
        raiseBtn.addEventListener('mousedown', () => {
            Popularity.taxRate = Math.min(5, Popularity.taxRate + 1);
            this.showBuildingActions(this._selectedBuilding);
        });
        taxRow.appendChild(raiseBtn);
        div.appendChild(taxRow);

        const taxInfo = document.createElement('div');
        taxInfo.style.cssText = 'color:#888;font-size:10px;padding:4px;';
        if (Popularity.taxRate > 0) {
            taxInfo.textContent = `Collecting ${Popularity.taxRate * World.population} gold per cycle. Happiness -${Popularity.taxRate * 4}`;
        } else if (Popularity.taxRate < 0) {
            taxInfo.textContent = `Bribing: -${Math.abs(Popularity.taxRate) * World.population} gold per cycle. Happiness +${Math.abs(Popularity.taxRate) * 4}`;
        } else {
            taxInfo.textContent = 'No taxes. Neutral happiness effect.';
        }
        div.appendChild(taxInfo);

        menu.appendChild(div);
    },

    _addGranaryActions(menu) {
        const div = document.createElement('div');
        div.className = 'build-category';
        const title = document.createElement('div');
        title.className = 'build-category-title';
        title.textContent = 'Ration Management';
        div.appendChild(title);

        const rationLabel = document.createElement('div');
        rationLabel.style.cssText = 'color:#aaa;font-size:11px;padding:4px;';
        rationLabel.textContent = `Ration Level: ${World.rationLevel || 'Normal'}`;
        div.appendChild(rationLabel);

        const rations = ['Half', 'Normal', 'Extra', 'Double'];
        for (const r of rations) {
            const btn = document.createElement('button');
            btn.className = 'build-btn';
            btn.textContent = r + ' Rations';
            if ((World.rationLevel || 'Normal') === r) {
                btn.classList.add('selected');
            }
            btn.addEventListener('mousedown', () => {
                World.rationLevel = r;
                this.showBuildingActions(this._selectedBuilding);
            });
            div.appendChild(btn);
        }

        const rationInfo = document.createElement('div');
        rationInfo.style.cssText = 'color:#888;font-size:10px;padding:4px;';
        rationInfo.textContent = 'Higher rations increase happiness but consume more food.';
        div.appendChild(rationInfo);

        menu.appendChild(div);
    },

    _addBazaarActions(menu) {
        const div = document.createElement('div');
        div.className = 'build-category';
        const title = document.createElement('div');
        title.className = 'build-category-title';
        title.textContent = 'Trade';
        div.appendChild(title);

        const tradeable = [
            { id: 'wood', name: 'Wood', baseBuy: 8, baseSell: 4 },
            { id: 'stone', name: 'Stone', baseBuy: 12, baseSell: 6 },
            { id: 'iron', name: 'Iron', baseBuy: 20, baseSell: 10 },
            { id: 'pitch', name: 'Pitch', baseBuy: 15, baseSell: 7 },
            { id: 'apples', name: 'Apples', baseBuy: 6, baseSell: 3 },
            { id: 'bread', name: 'Bread', baseBuy: 10, baseSell: 5 },
            { id: 'cheese', name: 'Cheese', baseBuy: 8, baseSell: 4 },
            { id: 'meat', name: 'Meat', baseBuy: 8, baseSell: 4 },
            { id: 'bows', name: 'Bows', baseBuy: 25, baseSell: 12 },
            { id: 'spears', name: 'Spears', baseBuy: 25, baseSell: 12 },
            { id: 'swords', name: 'Swords', baseBuy: 40, baseSell: 20 },
            { id: 'armor', name: 'Armor', baseBuy: 45, baseSell: 22 }
        ];

        for (const item of tradeable) {
            const stock = Resources.get(item.id) || 0;
            // Price multiplier: low stock = cheap (0.6×), high stock = expensive (1.5×)
            const mult = Math.max(0.6, Math.min(1.5, 0.6 + stock / 100));
            const buyPrice = Math.max(1, Math.round(item.baseBuy * mult));
            const sellPrice = Math.max(1, Math.round(item.baseSell * mult));

            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:4px;padding:1px 0;';

            const label = document.createElement('span');
            label.style.cssText = 'color:#aaa;font-size:10px;min-width:50px;';
            label.textContent = item.name + ':' + stock;
            row.appendChild(label);

            const buyBtn = document.createElement('button');
            buyBtn.className = 'build-btn';
            buyBtn.style.cssText = 'font-size:9px;padding:2px 4px;';
            buyBtn.textContent = `Buy(${buyPrice}g)`;
            buyBtn.addEventListener('mousedown', () => {
                if (Resources.get('gold') >= buyPrice) {
                    Resources.remove('gold', buyPrice);
                    Resources.add(item.id, 5);
                    EventLog.add('info', 'Bazaar trade: bought 5 ' + item.name + ' for ' + buyPrice + ' gold.', this._selectedBuilding.x, this._selectedBuilding.y);
                    this.showBuildingActions(this._selectedBuilding);
                }
            });
            row.appendChild(buyBtn);

            const sellBtn = document.createElement('button');
            sellBtn.className = 'build-btn';
            sellBtn.style.cssText = 'font-size:9px;padding:2px 4px;';
            sellBtn.textContent = `Sell(${sellPrice}g)`;
            sellBtn.addEventListener('mousedown', () => {
                if (Resources.get(item.id) >= 5) {
                    Resources.remove(item.id, 5);
                    Resources.add('gold', sellPrice);
                    EventLog.add('info', 'Bazaar trade: sold 5 ' + item.name + ' for ' + sellPrice + ' gold.', this._selectedBuilding.x, this._selectedBuilding.y);
                    this.showBuildingActions(this._selectedBuilding);
                }
            });
            row.appendChild(sellBtn);

            // Auto-trade controls
            const rule = World.autoTrade[item.id] || {};
            const autoDiv = document.createElement('div');
            autoDiv.style.cssText = 'display:flex;flex-direction:column;gap:1px;margin-left:2px;';

            // Helper to create a row with label, value display, and +-0∞ buttons
            const makeAutoRow = (labelText, key, defaultVal, isInfDefault) => {
                const rowEl = document.createElement('div');
                rowEl.style.cssText = 'display:flex;align-items:center;gap:1px;';

                const lbl = document.createElement('span');
                lbl.style.cssText = 'font-size:8px;color:#888;min-width:20px;';
                lbl.textContent = labelText;
                rowEl.appendChild(lbl);

                const valDisplay = document.createElement('span');
                valDisplay.style.cssText = 'font-size:9px;color:#ccc;min-width:22px;text-align:center;background:#1a1a1a;border:1px solid #444;padding:0 2px;';
                const currentVal = rule[key] !== undefined ? rule[key] : defaultVal;
                valDisplay.textContent = currentVal === Infinity ? '∞' : currentVal;
                rowEl.appendChild(valDisplay);

                const btnStyle = 'font-size:9px;padding:0 3px;cursor:pointer;background:#333;color:#ccc;border:1px solid #555;min-width:14px;';

                const updateVal = (newVal) => {
                    if (!World.autoTrade[item.id]) World.autoTrade[item.id] = { min: 0, max: Infinity };
                    World.autoTrade[item.id][key] = newVal;
                    valDisplay.textContent = newVal === Infinity ? '∞' : newVal;
                    // Clean up if both at defaults
                    const r = World.autoTrade[item.id];
                    if (r.min === 0 && r.max === Infinity) delete World.autoTrade[item.id];
                };

                const getVal = () => {
                    const r = World.autoTrade[item.id];
                    if (!r || r[key] === undefined) return isInfDefault ? Infinity : 0;
                    return r[key];
                };

                const minusBtn = document.createElement('button');
                minusBtn.style.cssText = btnStyle;
                minusBtn.textContent = '-';
                minusBtn.title = 'Decrease by 5';
                minusBtn.addEventListener('mousedown', () => {
                    const v = getVal();
                    if (v === Infinity) updateVal(500);
                    else updateVal(Math.max(0, v - 5));
                });
                rowEl.appendChild(minusBtn);

                const plusBtn = document.createElement('button');
                plusBtn.style.cssText = btnStyle;
                plusBtn.textContent = '+';
                plusBtn.title = 'Increase by 5';
                plusBtn.addEventListener('mousedown', () => {
                    const v = getVal();
                    if (v === Infinity) return;
                    updateVal(v + 5);
                });
                rowEl.appendChild(plusBtn);

                const zeroBtn = document.createElement('button');
                zeroBtn.style.cssText = btnStyle;
                zeroBtn.textContent = '0';
                zeroBtn.title = 'Set to 0';
                zeroBtn.addEventListener('mousedown', () => { updateVal(0); });
                rowEl.appendChild(zeroBtn);

                const infBtn = document.createElement('button');
                infBtn.style.cssText = btnStyle + 'color:#c8a82e;';
                infBtn.textContent = '∞';
                infBtn.title = 'Set to unlimited (no limit)';
                infBtn.addEventListener('mousedown', () => { updateVal(Infinity); });
                rowEl.appendChild(infBtn);

                return rowEl;
            };

            autoDiv.appendChild(makeAutoRow('Buy<', 'min', 0, false));
            autoDiv.appendChild(makeAutoRow('Sell>', 'max', Infinity, true));
            row.appendChild(autoDiv);

            div.appendChild(row);
        }

        menu.appendChild(div);
    },

    _addBarracksActions(menu) {
        const div = document.createElement('div');
        div.className = 'build-category';
        const title = document.createElement('div');
        title.className = 'build-category-title';
        title.textContent = 'Recruit Troops';
        div.appendChild(title);

        const counts = Military.getTroopCounts();

        for (const troopId in TROOPS) {
            const def = TROOPS[troopId];
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:4px;padding:2px 0;';

            const btn = document.createElement('button');
            btn.className = 'build-btn';
            btn.style.cssText = 'flex:1;';
            btn.textContent = `${def.char} ${def.name} (${counts[troopId] || 0})`;

            const reqParts = [];
            if (def.cost.gold) reqParts.push(`${def.cost.gold}g`);
            for (const req in def.requires) {
                reqParts.push(`${def.requires[req]} ${req}`);
            }
            reqParts.push('1 peasant');
            btn.title = `Requires: ${reqParts.join(', ')}`;

            btn.addEventListener('mousedown', () => {
                if (World.gamePhase !== 'playing') return;
                Military.recruit(troopId);
                this.showBuildingActions(this._selectedBuilding);
            });
            row.appendChild(btn);
            div.appendChild(row);
        }

        const info = document.createElement('div');
        info.style.cssText = 'color:#888;font-size:10px;padding:4px;';
        info.textContent = `Idle peasants: ${World.idlePeasants}`;
        div.appendChild(info);

        menu.appendChild(div);
    },

    // ── Tile Info ──
    showTileInfo(x, y) {
        this._lastInfoTileX = x;
        this._lastInfoTileY = y;
        this._refreshTileInfo(true);
    },

    _refreshTileInfo(isClick) {
        const x = this._lastInfoTileX;
        const y = this._lastInfoTileY;
        const info = document.getElementById('infoContent');
        const tile = World.getTile(x, y);
        if (!tile) {
            info.textContent = 'Out of bounds';
            return;
        }

        if (!tile.discovered) {
            info.innerHTML = '<div style="color:#666">Undiscovered territory</div>';
            return;
        }

        let html = `<div style="color:#888">Tile: ${x}, ${y}</div>`;
        html += `<div>Terrain: <span style="color:${tile.terrain.fg}">${tile.terrain.name}</span></div>`;

        if (tile.resourceAmount > 0) {
            html += `<div>Resource: ${tile.resourceAmount} remaining</div>`;
        }
        if (tile.roadLevel > 0) {
            html += `<div>Road: Level ${tile.roadLevel}/15</div>`;
        }
        if (tile.height > 0) {
            html += `<div>Height: ${tile.height}</div>`;
        }
        if (Events.isDiseased(x, y)) {
            html += `<div style="color:#88CC00">[!] Disease Cloud</div>`;
        }

        const building = World.getBuildingAt(x, y);
        if (building) {
            html += this._buildingInfoHtml(building);
            // Only show building action menu on explicit tile click, not on live refresh
            if (isClick && World.gamePhase === 'playing' && (!this._selectedBuilding || this._selectedBuilding.id !== building.id)) {
                this.showBuildingActions(building);
            }
        } else {
            // If no building selected, show build menu
            if (this._selectedBuilding) {
                this.showBuildMenu();
            }
        }

        // Check for NPCs at this tile
        const npcsHere = World.npcs.filter(n =>
            Math.floor(n.x) === x && Math.floor(n.y) === y
        );
        if (npcsHere.length > 0) {
            html += `<div style="margin-top:4px;color:#c8a82e">Villagers: ${npcsHere.length}</div>`;
            for (const npc of npcsHere.slice(0, 5)) {
                html += this._npcInfoHtml(npc);
            }
        }

        // Check for animals at this tile
        const animalsHere = Animal.getLivingAnimals().filter(a => a.x === x && a.y === y);
        const carcassesHere = Animal.getCarcasses().filter(c => c.x === x && c.y === y);
        if (animalsHere.length > 0 || carcassesHere.length > 0) {
            html += `<div style="margin-top:4px;color:#C4A27C">Animals:</div>`;
            for (const a of animalsHere) {
                const typeDef = Animal.TYPES[a.type];
                html += `<div style="font-size:10px;margin-left:8px;color:#C4A27C">`;
                html += `${typeDef ? typeDef.char : '?'} ${a.type} — HP: ${a.hp}/${a.maxHp}`;
                html += `</div>`;
            }
            for (const c of carcassesHere) {
                html += `<div style="font-size:10px;margin-left:8px;color:#8B4513">`;
                html += `x ${c.type} carcass — yields ${c.amount} ${c.resource}`;
                html += `</div>`;
            }
        }

        info.innerHTML = html;
    },

    showUnitInfo(unit) {
        this._lastInfoTileX = Math.floor(unit.x);
        this._lastInfoTileY = Math.floor(unit.y);
        const info = document.getElementById('infoContent');
        const def = TROOPS[unit.type];
        let html = `<div style="color:#c8a82e;font-size:13px">${def.char} ${unit.name}</div>`;
        html += `<div style="font-size:10px;color:#888">${def.name}</div>`;
        html += `<div style="font-size:10px">HP: ${unit.hp}/${unit.maxHp} | DMG: ${unit.damage}</div>`;
        if (unit.ranged) {
            const bonus = Military.getHeightBonus(unit);
            const bonusPct = Math.round((bonus - 1) * 100);
            html += `<div style="font-size:10px">Range: ${unit.range}${bonusPct > 0 ? ` | Height bonus: +${bonusPct}%` : ''}</div>`;
        }
        html += `<div style="font-size:10px;color:#4c4">State: ${unit.walkPurpose || unit.state}</div>`;
        if (unit.diseased) {
            html += `<div style="font-size:10px;color:#88CC00">[!] Diseased</div>`;
        }
        html += `<div style="font-size:10px;color:#888;margin-top:4px">Right-click to issue move order</div>`;
        html += `<button data-focus-npc="${unit.id}" style="margin-top:4px;padding:2px 8px;font-size:10px;cursor:pointer;background:#333;color:#c8a82e;border:1px solid #555">Focus</button>`;
        html += ` <button data-details-npc="${unit.id}" style="padding:2px 8px;font-size:10px;cursor:pointer;background:#333;color:#c8a82e;border:1px solid #555">Details</button>`;
        info.innerHTML = html;

        // Show selection highlight — deselect building if any
        if (this._selectedBuilding) {
            this.showBuildMenu();
        }
    },

    showMultiUnitInfo() {
        const info = document.getElementById('infoContent');
        const units = World.selectedUnits
            .map(id => World.npcs.find(n => n.id === id))
            .filter(Boolean);

        if (units.length === 0) return;
        if (units.length === 1) {
            this.showUnitInfo(units[0]);
            return;
        }

        // Count by type
        const typeCounts = {};
        let totalHp = 0, totalMaxHp = 0, diseasedCount = 0;
        for (const u of units) {
            const typeName = TROOPS[u.type] ? TROOPS[u.type].name : u.type;
            typeCounts[typeName] = (typeCounts[typeName] || 0) + 1;
            totalHp += u.hp;
            totalMaxHp += u.maxHp;
            if (u.diseased) diseasedCount++;
        }

        let html = `<div style="color:#c8a82e;font-size:13px">[${units.length}] Units Selected</div>`;
        html += `<div style="font-size:10px">Total HP: ${totalHp}/${totalMaxHp}</div>`;

        // Type breakdown
        for (const [name, count] of Object.entries(typeCounts)) {
            html += `<div style="font-size:10px;color:#aaf;margin-left:4px">${name}: ${count}</div>`;
        }

        if (diseasedCount > 0) {
            html += `<div style="font-size:10px;color:#88CC00">[!] ${diseasedCount} diseased</div>`;
        }

        html += `<div style="font-size:10px;color:#888;margin-top:4px">Right-click to issue group move order</div>`;
        html += `<div style="font-size:10px;color:#888">Shift+click to add/remove units</div>`;
        info.innerHTML = html;

        if (this._selectedBuilding) {
            this.showBuildMenu();
        }
    },

    _buildingInfoHtml(building) {
        const def = BUILDINGS[building.type];
        let html = `<div style="margin-top:4px;color:#c8a82e;font-size:13px">${def.char} ${def.name}</div>`;
        html += `<div style="font-size:10px;color:#888">${def.description}</div>`;
        html += `<div style="font-size:10px">Status: ${building.active ? '<span style="color:#4c4">Active</span>' : '<span style="color:#c44">Inactive</span>'}</div>`;

        // Workers
        if (def.workers) {
            html += `<div>Workers: ${building.workers.length}/${def.workers}</div>`;
            // Show each worker's status
            for (const wid of building.workers) {
                const worker = World.npcs.find(n => n.id === wid);
                if (worker) {
                    html += `<div style="font-size:10px;color:#aaf;margin-left:8px">`;
                    html += `${worker.name || ('Worker #' + worker.id)}`;
                    html += ` — <span style="color:#ccc">${worker.walkPurpose || worker.state}</span>`;
                    if (worker.state === NPC.STATE.IDLE && worker.idleReason) {
                        html += ` <span style="color:#cc8844">(${worker.idleReason})</span>`;
                    }
                    if (worker.carrying) {
                        html += ` <span style="color:#ca8">[carrying: ${worker.carrying}]</span>`;
                    }
                    html += ` <button data-focus-npc="${worker.id}" style="padding:0 4px;font-size:9px;cursor:pointer;background:#333;color:#c8a82e;border:1px solid #555">Focus</button>`;
                    html += ` <button data-details-npc="${worker.id}" style="padding:0 4px;font-size:9px;cursor:pointer;background:#333;color:#c8a82e;border:1px solid #555">Details</button>`;
                    html += `</div>`;
                }
            }
        }

        // Production info
        if (def.produces) {
            const progress = Production.getProgress(building);
            if (progress) {
                html += `<div style="margin-top:2px">Produces: <span style="color:#c8a82e">${progress.product}</span></div>`;
                if (progress.input) {
                    html += `<div>Consumes: <span style="color:#ca8">${progress.input}</span></div>`;
                }
                html += `<div>Production: ${progress.percent}% (${progress.current}/${progress.total} ticks)</div>`;
                // Show production bar
                html += `<div style="background:#222;height:6px;margin:2px 0;border:1px solid #444;">`;
                html += `<div style="background:#c8a82e;height:100%;width:${progress.percent}%"></div></div>`;
            }
        }

        // Granary inventory
        if (building.type === 'granary') {
            html += this._storageInventoryHtml('granary');
        }

        // Stockpile inventory
        if (building.type === 'stockpile') {
            html += this._storageInventoryHtml('stockpile');
        }

        // Armory inventory
        if (building.type === 'armory') {
            html += this._storageInventoryHtml('armory');
        }

        return html;
    },

    _storageInventoryHtml(type) {
        let html = '<div style="margin-top:4px;color:#c8a82e;font-size:11px">Inventory:</div>';

        const items = STORAGE_TYPES[type] || [];
        for (const item of items) {
            const amount = Resources.get(item);
            if (amount > 0) {
                html += `<div style="font-size:10px;color:#aaa;margin-left:8px">${item}: ${amount}</div>`;
            }
        }

        if (type === 'granary') {
            const total = Resources.getTotalFood();
            html += `<div style="font-size:10px;color:#c8a82e;margin-left:8px">Total food: ${total}</div>`;
        }

        return html;
    },

    _npcInfoHtml(npc) {
        let html = `<div style="font-size:11px;color:${npc.fg};margin-top:3px;border-top:1px solid #333;padding-top:3px">`;
        html += `${npc.char} <strong>${npc.name || (npc.type + ' #' + npc.id)}</strong></div>`;
        html += `<div style="font-size:10px;color:#aaa;margin-left:8px">Type: ${npc.type}</div>`;
        html += `<div style="font-size:10px;color:#aaa;margin-left:8px">State: <span style="color:#4c4">${npc.walkPurpose || npc.state}</span></div>`;

        // Idle reason
        if (npc.state === NPC.STATE.IDLE && npc.idleReason) {
            html += `<div style="font-size:10px;color:#cc8844;margin-left:8px">Idle: ${npc.idleReason}</div>`;
        }

        if (npc.walkFrom && npc.walkTo) {
            html += `<div style="font-size:10px;color:#888;margin-left:8px">`;
            html += `From (${npc.walkFrom.x},${npc.walkFrom.y}) → (${npc.walkTo.x},${npc.walkTo.y})`;
            html += `</div>`;
        }

        // Carrying
        if (npc.carrying) {
            html += `<div style="font-size:10px;color:#ca8;margin-left:8px">Carrying: ${npc.carrying} ×${npc.carryAmount}</div>`;
        }

        // Assigned building
        if (npc.assignedBuilding) {
            const b = World.buildings.find(b => b.id === npc.assignedBuilding);
            if (b) {
                const bdef = BUILDINGS[b.type];
                html += `<div style="font-size:10px;color:#aaf;margin-left:8px">Works at: ${bdef.name} (${b.x},${b.y})</div>`;
            }
        }

        // Troop stats
        if (npc.hp !== undefined) {
            html += `<div style="font-size:10px;color:#ccc;margin-left:8px">HP: ${npc.hp}/${npc.maxHp} | DMG: ${npc.damage}</div>`;
        }

        // Disease status
        if (npc.diseased) {
            html += `<div style="font-size:10px;color:#88CC00;margin-left:8px">[!] Diseased</div>`;
        }

        // On fire status
        if (npc.onFire) {
            html += `<div style="font-size:10px;color:#FF6600;margin-left:8px">~^ On Fire!</div>`;
        }

        // Focus button + Details button
        html += `<button data-focus-npc="${npc.id}" style="margin:2px 0 0 8px;padding:1px 6px;font-size:9px;cursor:pointer;background:#333;color:#c8a82e;border:1px solid #555">Focus</button>`;
        html += ` <button data-details-npc="${npc.id}" style="padding:1px 6px;font-size:9px;cursor:pointer;background:#333;color:#c8a82e;border:1px solid #555">Details</button>`;

        return html;
    },

    // ── NPC Details Modal ──
    _npcDetailsId: null,
    _npcDetailsInterval: null,
    _savedSpeedBeforeModal: null,

    openNpcDetails(npcId) {
        this._npcDetailsId = npcId;
        const overlay = document.getElementById('npcDetailsOverlay');
        overlay.style.display = 'flex';

        // Pause game while modal is open
        this._savedSpeedBeforeModal = Game.speed;
        Game.setSpeed(0);

        this._updateNpcDetails();
        // Live-update every 500ms
        if (this._npcDetailsInterval) clearInterval(this._npcDetailsInterval);
        this._npcDetailsInterval = setInterval(() => this._updateNpcDetails(), 500);
    },

    closeNpcDetails() {
        document.getElementById('npcDetailsOverlay').style.display = 'none';
        this._npcDetailsId = null;
        if (this._npcDetailsInterval) {
            clearInterval(this._npcDetailsInterval);
            this._npcDetailsInterval = null;
        }
        // Restore game speed
        if (this._savedSpeedBeforeModal !== null) {
            Game.setSpeed(this._savedSpeedBeforeModal);
            this._savedSpeedBeforeModal = null;
        }
    },

    _updateNpcDetails() {
        const npc = World.npcs.find(n => n.id === this._npcDetailsId);
        const content = document.getElementById('npcDetailsContent');
        if (!npc) {
            content.innerHTML = '<div style="color:#cc4444;text-align:center;padding:20px">Villager no longer exists.</div>';
            return;
        }
        let html = '';

        // Header
        html += `<div style="text-align:center;border-bottom:1px solid #c8a82e;padding-bottom:8px;margin-bottom:8px">`;
        html += `<div style="font-size:28px">${npc.char || '@'}</div>`;
        html += `<div style="color:#c8a82e;font-size:15px;font-weight:bold">${npc.name || ('Villager #' + npc.id)}</div>`;
        const typeName = TROOPS[npc.type] ? TROOPS[npc.type].name : npc.type;
        html += `<div style="font-size:11px;color:#888">${typeName}</div>`;
        html += `</div>`;

        // Stats
        const hpPct = npc.maxHp > 0 ? npc.hp / npc.maxHp : 1;
        const hpColor = hpPct > 0.6 ? '#44cc44' : hpPct > 0.3 ? '#cccc44' : '#cc4444';
        html += `<div style="margin-bottom:6px">`;
        html += `<div style="font-size:11px;color:#aaa">Health</div>`;
        html += `<div style="background:#222;height:8px;border:1px solid #444;margin:2px 0">`;
        html += `<div style="background:${hpColor};height:100%;width:${(hpPct * 100).toFixed(0)}%"></div></div>`;
        html += `<div style="font-size:10px;color:#ccc;text-align:right">${npc.hp} / ${npc.maxHp}</div>`;
        html += `</div>`;

        // Combat stats
        if (npc.damage !== undefined) {
            html += `<div style="font-size:11px;color:#aaa">Damage: <span style="color:#ccc">${npc.damage}</span>`;
            if (npc.ranged) html += ` | Range: <span style="color:#ccc">${npc.range}</span>`;
            html += `</div>`;
        }

        // Personality traits (Phase 3.4)
        if (npc.traits && npc.traits.length > 0) {
            html += `<div style="margin:6px 0;border-top:1px solid #333;padding-top:4px">`;
            html += `<div style="font-size:11px;color:#aaa;margin-bottom:2px">Personality</div>`;
            for (const traitId of npc.traits) {
                const info = Personality.getTraitInfo(traitId);
                if (info) {
                    html += `<span style="display:inline-block;background:#2a2a2a;border:1px solid #555;border-radius:3px;padding:1px 5px;margin:1px;font-size:10px;color:#c8a82e" title="${info.description}">${info.name}</span>`;
                }
            }
            html += `</div>`;
        }

        // Mood indicator (Phase 3.4)
        if (npc.mood !== undefined) {
            const moodInfo = Mood.getMoodInfo(npc.mood);
            const moodPct = npc.mood / 100;
            html += `<div style="margin-bottom:4px">`;
            html += `<div style="font-size:11px;color:#aaa">Mood <span style="color:${moodInfo.color};font-size:10px">(${moodInfo.label})</span></div>`;
            html += `<div style="background:#222;height:6px;border:1px solid #444;margin:2px 0">`;
            html += `<div style="background:${moodInfo.color};height:100%;width:${(moodPct * 100).toFixed(0)}%"></div></div>`;
            html += `</div>`;
        }


        // Hunger bar (peasants and troops)
        if (npc.hunger !== undefined) {
            const hungerPct = npc.hunger / CONFIG.HUNGER_MAX;
            const hungerColor = hungerPct > 0.7 ? '#44cc44' : hungerPct > 0.3 ? '#cccc44' : '#cc4444';
            const hungerLabel = npc.hunger <= CONFIG.HUNGER_STARVE_THRESHOLD ? 'Starving!' :
                npc.hunger < CONFIG.HUNGER_EAT_THRESHOLD ? 'Hungry' :
                npc.hunger >= CONFIG.HUNGER_WELL_FED ? 'Well Fed' : 'Satisfied';
            html += `<div style="margin-bottom:4px">`;
            html += `<div style="font-size:11px;color:#aaa">Hunger <span style="color:${hungerColor};font-size:10px">(${hungerLabel})</span></div>`;
            html += `<div style="background:#222;height:6px;border:1px solid #444;margin:2px 0">`;
            html += `<div style="background:${hungerColor};height:100%;width:${(hungerPct * 100).toFixed(0)}%"></div></div>`;
            html += `</div>`;
        }

        // Fatigue bar (peasants and troops)
        if (npc.fatigue !== undefined) {
            const fatiguePct = npc.fatigue / CONFIG.FATIGUE_MAX;
            const fatigueColor = fatiguePct < 0.5 ? '#44cc44' : fatiguePct < 0.8 ? '#cccc44' : '#cc4444';
            const fatigueLabel = npc.fatigue >= CONFIG.FATIGUE_EXHAUSTION ? 'Exhausted!' :
                npc.fatigue >= CONFIG.FATIGUE_HIGH ? 'Very Tired' :
                npc.fatigue >= 50 ? 'Tired' : 'Rested';
            html += `<div style="margin-bottom:4px">`;
            html += `<div style="font-size:11px;color:#aaa">Fatigue <span style="color:${fatigueColor};font-size:10px">(${fatigueLabel})</span></div>`;
            html += `<div style="background:#222;height:6px;border:1px solid #444;margin:2px 0">`;
            html += `<div style="background:${fatigueColor};height:100%;width:${(fatiguePct * 100).toFixed(0)}%"></div></div>`;
            html += `</div>`;
        }

        // Position
        html += `<div style="font-size:11px;color:#aaa;margin-top:6px">Position: <span style="color:#ccc">(${Math.floor(npc.x)}, ${Math.floor(npc.y)})</span></div>`;

        // Schedule phase
        if (npc.schedulePhase) {
            const phaseNames = { work: 'Working', free: 'Free Time', sleep: 'Sleeping' };
            const phaseColors = { work: '#88aaff', free: '#88ff88', sleep: '#8888ff' };
            html += `<div style="font-size:11px;color:#aaa">Schedule: <span style="color:${phaseColors[npc.schedulePhase] || '#ccc'}">${phaseNames[npc.schedulePhase] || npc.schedulePhase}</span></div>`;
        }

        // State
        html += `<div style="font-size:11px;color:#aaa">State: <span style="color:#4c4">${npc.walkPurpose || npc.state}</span></div>`;

        // Idle reason
        if (npc.state === NPC.STATE.IDLE && npc.idleReason) {
            html += `<div style="font-size:11px;color:#cc8844">Idle: ${npc.idleReason}</div>`;
        }

        // Assigned building
        if (npc.assignedBuilding) {
            const b = World.buildings.find(b => b.id === npc.assignedBuilding);
            if (b) {
                const bdef = BUILDINGS[b.type];
                html += `<div style="font-size:11px;color:#aaa;margin-top:4px">Workplace: <span style="color:#88aaff">${bdef.name} (${b.x},${b.y})</span>`;
                html += ` <button data-focus-building="${b.id}" style="padding:0 4px;font-size:9px;cursor:pointer;background:#333;color:#c8a82e;border:1px solid #555">View</button>`;
                html += `</div>`;
            }
        }

        // Home building
        if (npc.homeBuilding) {
            const home = World.buildings.find(b => b.id === npc.homeBuilding);
            if (home) {
                const hdef = BUILDINGS[home.type];
                const tierLabels = { 1: 'Basic', 2: 'Comfortable', 3: 'Quality' };
                html += `<div style="font-size:11px;color:#aaa">Home: <span style="color:#bb9966">${hdef.name} (${tierLabels[hdef.housingTier] || ''}) (${home.x},${home.y})</span>`;
                html += ` <button data-focus-building="${home.id}" style="padding:0 4px;font-size:9px;cursor:pointer;background:#333;color:#c8a82e;border:1px solid #555">View</button>`;
                html += `</div>`;
            }
        } else if (npc.type === 'peasant') {
            html += `<div style="font-size:11px;color:#cc8844">Home: <span style="color:#cc4444">Homeless</span></div>`;
        }

        // Carrying
        if (npc.carrying) {
            html += `<div style="font-size:11px;color:#ca8">Carrying: ${npc.carrying} x${npc.carryAmount}</div>`;
        }

        // Status effects
        let statusHtml = '';
        if (npc.diseased) statusHtml += `<span style="color:#88CC00">\u26a0 Diseased</span> `;
        if (npc.onFire) statusHtml += `<span style="color:#FF6600">* On Fire</span> `;
        if (npc.state === NPC.STATE.SLEEPING || npc.isSleepingAtPost) statusHtml += `<span style="color:#8888FF">~ Sleeping</span> `;
        if (npc.hunger !== undefined && npc.hunger <= CONFIG.HUNGER_STARVE_THRESHOLD) statusHtml += `<span style="color:#cc4444">\u2620 Starving</span> `;
        if (npc.fatigue !== undefined && npc.fatigue >= CONFIG.FATIGUE_EXHAUSTION) statusHtml += `<span style="color:#cc8844">\u231b Exhausted</span> `;
        if (statusHtml) {
            html += `<div style="font-size:11px;margin-top:6px;border-top:1px solid #333;padding-top:4px">${statusHtml}</div>`;
        }

        // Focus button + Mood button + Memory button + Relationships button
        const isTroop = !!(TROOPS[npc.type]);
        html += `<div style="display:flex;flex-direction:column;gap:4px;margin-top:8px;border-top:1px solid #333;padding-top:8px">`;
        html += `<button data-focus-npc="${npc.id}" style="width:100%;padding:4px 12px;font-size:11px;cursor:pointer;background:#333;color:#c8a82e;border:1px solid #555;box-sizing:border-box">Center Camera</button>`;
        if (!isTroop) {
            html += `<button data-show-mood="${npc.id}" style="width:100%;padding:4px 12px;font-size:11px;cursor:pointer;background:#333;color:#c8a82e;border:1px solid #555;box-sizing:border-box">Mood</button>`;
        }
        if (npc.memories && npc.memories.length > 0) {
            html += `<button data-show-memories="${npc.id}" style="width:100%;padding:4px 12px;font-size:11px;cursor:pointer;background:#333;color:#c8a82e;border:1px solid #555;box-sizing:border-box">Memories (${npc.memories.length})</button>`;
        }
        if (!isTroop) {
            const relCount = npc.relationships ? Object.keys(npc.relationships).length : 0;
            html += `<button data-show-relationships="${npc.id}" style="width:100%;padding:4px 12px;font-size:11px;cursor:pointer;background:#333;color:#c8a82e;border:1px solid #555;box-sizing:border-box">Relations (${relCount})</button>`;
        }
        html += `</div>`;

        content.innerHTML = html;
    },

    // ── Save/Load UI ──

    _showSaveDialog() {
        let existing = document.getElementById('saveDialogOverlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'saveDialogOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:3000;display:flex;align-items:center;justify-content:center';
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        const panel = document.createElement('div');
        panel.style.cssText = 'background:#111;border:2px solid #c8a82e;padding:16px;min-width:340px;font-family:monospace;color:#ccc';
        panel.innerHTML = '<h3 style="color:#c8a82e;margin:0 0 12px;font-size:16px">Save Game</h3>';

        for (let i = 1; i <= SaveLoad.NUM_SLOTS; i++) {
            const info = SaveLoad.getSlotInfo(i);
            const btn = document.createElement('button');
            btn.style.cssText = 'display:block;width:100%;padding:10px;margin:4px 0;font-family:monospace;font-size:12px;background:#1a1a1a;color:#c8a82e;border:1px solid #444;cursor:pointer;text-align:left';
            btn.textContent = info
                ? 'Slot ' + i + ' — Day ' + info.day + ', ' + info.population + ' pop (' + new Date(info.timestamp).toLocaleString() + ')'
                : 'Slot ' + i + ' — Empty';
            btn.addEventListener('click', async () => {
                await SaveLoad.save(i, false);
                overlay.remove();
                // Ensure Load Game button is visible on menu
                document.getElementById('btnLoadGame').style.display = 'block';
            });
            panel.appendChild(btn);
        }

        const cancelBtn = document.createElement('button');
        cancelBtn.style.cssText = 'display:block;width:100%;padding:8px;margin-top:8px;font-family:monospace;font-size:12px;background:#1a1a1a;color:#888;border:1px solid #333;cursor:pointer';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => overlay.remove());
        panel.appendChild(cancelBtn);

        overlay.appendChild(panel);
        document.body.appendChild(overlay);
    },

    _showLoadPanel() {
        const panel = document.getElementById('loadGamePanel');
        const list = document.getElementById('saveSlotList');
        list.innerHTML = '';

        const slots = [];
        // Auto-save slot first
        slots.push({ slot: SaveLoad.AUTO_SAVE_SLOT, label: 'Auto-Save' });
        for (let i = 1; i <= SaveLoad.NUM_SLOTS; i++) {
            slots.push({ slot: i, label: 'Slot ' + i });
        }

        for (const s of slots) {
            const info = SaveLoad.getSlotInfo(s.slot);
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;gap:6px;align-items:center';
            const btn = document.createElement('button');
            btn.style.cssText = 'flex:1;padding:10px;font-family:monospace;font-size:12px;background:#1a1a1a;color:#c8a82e;border:1px solid #444;cursor:pointer;text-align:left';
            if (info) {
                btn.textContent = s.label + ' — Day ' + info.day + ', ' + info.population + ' pop (' + new Date(info.timestamp).toLocaleString() + ')';
                btn.addEventListener('click', async () => {
                    await SaveLoad.load(s.slot);
                });
            } else {
                btn.textContent = s.label + ' — Empty';
                btn.disabled = true;
                btn.style.color = '#555';
                btn.style.cursor = 'default';
            }
            row.appendChild(btn);

            if (info) {
                const delBtn = document.createElement('button');
                delBtn.style.cssText = 'padding:10px;font-family:monospace;font-size:12px;background:#1a1a1a;color:#FF4444;border:1px solid #444;cursor:pointer';
                delBtn.textContent = 'X';
                delBtn.title = 'Delete save';
                delBtn.addEventListener('click', async () => {
                    await SaveLoad.deleteSlot(s.slot);
                    UI._showLoadPanel(); // refresh
                    if (!SaveLoad.hasSaves()) {
                        document.getElementById('btnLoadGame').style.display = 'none';
                    }
                });
                row.appendChild(delBtn);
            }

            list.appendChild(row);
        }

        panel.style.display = 'flex';
    },

    _showNpcList() {
        let existing = document.getElementById('npcListOverlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'npcListOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:3000;display:flex;align-items:center;justify-content:center';

        const modal = document.createElement('div');
        modal.style.cssText = 'background:#1a1a1a;border:2px solid #c8a82e;border-radius:6px;padding:12px;max-width:720px;width:95%;max-height:80vh;display:flex;flex-direction:column';

        const npcs = World.npcs.filter(n => !n.isBandit);
        let sortKey = 'name';
        let sortDir = 1;

        const getOccupation = (npc) => {
            if (npc.type in TROOPS) return TROOPS[npc.type].name;
            if (npc.assignedBuilding) {
                const b = World.buildings.find(b => b.id === npc.assignedBuilding);
                if (b) return BUILDINGS[b.type].name + ' worker';
            }
            return 'Idle';
        };

        const render = () => {
            const sorted = npcs.slice().sort((a, b) => {
                let va, vb;
                switch (sortKey) {
                    case 'name': va = a.name || ''; vb = b.name || ''; return sortDir * va.localeCompare(vb);
                    case 'occupation': va = getOccupation(a); vb = getOccupation(b); return sortDir * va.localeCompare(vb);
                    case 'mood': va = a.mood || 0; vb = b.mood || 0; break;
                    case 'hunger': va = a.hunger || 0; vb = b.hunger || 0; break;
                    case 'fatigue': va = a.fatigue || 0; vb = b.fatigue || 0; break;
                    case 'hp': va = a.hp || 0; vb = b.hp || 0; break;
                    case 'damage': va = a.damage || 0; vb = b.damage || 0; break;
                    default: va = 0; vb = 0;
                }
                return sortDir * (va - vb);
            });

            let h = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">`;
            h += `<div style="color:#c8a82e;font-weight:bold;font-size:14px">Villagers (${npcs.length})</div>`;
            h += `<button id="closeNpcList" style="background:#333;color:#c8a82e;border:1px solid #555;cursor:pointer;padding:2px 8px">X</button>`;
            h += `</div>`;

            const cols = [
                { key: 'name', label: 'Name', w: '22%' },
                { key: 'occupation', label: 'Occupation', w: '16%' },
                { key: 'mood', label: 'Mood', w: '8%' },
                { key: 'hunger', label: 'Hunger', w: '8%' },
                { key: 'fatigue', label: 'Fatigue', w: '8%' },
                { key: 'hp', label: 'HP', w: '10%' },
                { key: 'damage', label: 'DMG', w: '6%' }
            ];

            h += `<div style="overflow-y:auto;flex:1">`;
            h += `<table style="width:100%;border-collapse:collapse;font-size:11px">`;
            h += `<tr>`;
            for (const col of cols) {
                const arrow = sortKey === col.key ? (sortDir === 1 ? ' ^' : ' v') : '';
                h += `<th class="npclist-sort" data-sort="${col.key}" style="color:#c8a82e;text-align:left;padding:3px 4px;border-bottom:1px solid #555;cursor:pointer;width:${col.w}">${col.label}${arrow}</th>`;
            }
            h += `<th style="color:#c8a82e;text-align:center;padding:3px 4px;border-bottom:1px solid #555;width:14%">Actions</th>`;
            h += `</tr>`;

            for (const npc of sorted) {
                const moodInfo = Mood.getMoodInfo(npc.mood || 50);
                const hpPct = npc.maxHp > 0 ? npc.hp / npc.maxHp : 1;
                const hpColor = hpPct > 0.6 ? '#44cc44' : hpPct > 0.3 ? '#cccc44' : '#cc4444';
                const hungerPct = npc.hunger !== undefined ? npc.hunger / CONFIG.HUNGER_MAX : 1;
                const hungerColor = hungerPct > 0.7 ? '#44cc44' : hungerPct > 0.3 ? '#cccc44' : '#cc4444';
                const fatiguePct = npc.fatigue !== undefined ? npc.fatigue / CONFIG.FATIGUE_MAX : 0;
                const fatigueColor = fatiguePct < 0.5 ? '#44cc44' : fatiguePct < 0.8 ? '#cccc44' : '#cc4444';
                h += `<tr style="border-bottom:1px solid #222">`;
                h += `<td style="padding:3px 4px;color:#ccc">${npc.name || 'Villager #' + npc.id}</td>`;
                h += `<td style="padding:3px 4px;color:#88aaff;font-size:10px">${getOccupation(npc)}</td>`;
                h += `<td style="padding:3px 4px;color:${moodInfo.color}">${npc.mood || 0}</td>`;
                h += `<td style="padding:3px 4px;color:${hungerColor}">${npc.hunger !== undefined ? npc.hunger : '-'}</td>`;
                h += `<td style="padding:3px 4px;color:${fatigueColor}">${npc.fatigue !== undefined ? Math.round(npc.fatigue) : '-'}</td>`;
                h += `<td style="padding:3px 4px;color:${hpColor}">${npc.hp}/${npc.maxHp}</td>`;
                h += `<td style="padding:3px 4px;color:#ccc">${npc.damage || 0}</td>`;
                h += `<td style="padding:3px 4px;text-align:center">`;
                h += `<button data-details-npc="${npc.id}" style="padding:1px 6px;font-size:10px;cursor:pointer;background:#333;color:#c8a82e;border:1px solid #555;margin-right:2px">Info</button>`;
                h += `<button data-focus-npc="${npc.id}" style="padding:1px 6px;font-size:10px;cursor:pointer;background:#333;color:#c8a82e;border:1px solid #555">Focus</button>`;
                h += `</td></tr>`;
            }
            h += `</table></div>`;
            modal.innerHTML = h;

            // Wire up close
            document.getElementById('closeNpcList').addEventListener('mousedown', () => overlay.remove());

            // Wire up sort headers
            modal.querySelectorAll('.npclist-sort').forEach(th => {
                th.addEventListener('mousedown', () => {
                    const key = th.dataset.sort;
                    if (sortKey === key) sortDir *= -1;
                    else { sortKey = key; sortDir = 1; }
                    render();
                });
            });

            // Wire up details/focus buttons
            modal.querySelectorAll('[data-details-npc]').forEach(btn => {
                btn.addEventListener('mousedown', () => {
                    overlay.remove();
                    UI.openNpcDetails(parseInt(btn.dataset.detailsNpc));
                });
            });
            modal.querySelectorAll('[data-focus-npc]').forEach(btn => {
                btn.addEventListener('mousedown', () => {
                    overlay.remove();
                    Camera.startFollow(parseInt(btn.dataset.focusNpc));
                });
            });
        };

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) overlay.remove(); });
        render();
    },

    _showRelationships(npcId) {
        const npc = World.npcs.find(n => n.id === npcId);
        if (!npc) return;
        const rels = Relationship.getForDisplay(npc);

        let existing = document.getElementById('relOverlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'relOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:3000;display:flex;align-items:center;justify-content:center';

        const modal = document.createElement('div');
        modal.style.cssText = 'background:#1a1a1a;border:2px solid #c8a82e;border-radius:6px;padding:12px;max-width:500px;width:90%;max-height:70vh;display:flex;flex-direction:column';

        let h = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">`;
        h += `<div style="color:#c8a82e;font-weight:bold;font-size:14px">${npc.name} — Relationships (${rels.length})</div>`;
        h += `<button id="closeRelModal" style="background:#333;color:#c8a82e;border:1px solid #555;cursor:pointer;padding:2px 8px">X</button>`;
        h += `</div>`;

        h += `<div style="overflow-y:auto;flex:1">`;
        if (rels.length === 0) {
            h += `<div style="color:#888;text-align:center;padding:20px">No relationships yet.</div>`;
        } else {
            for (const rel of rels) {
                const sign = rel.value >= 0 ? '+' : '';
                h += `<div style="display:flex;align-items:center;gap:6px;padding:4px 2px;border-bottom:1px solid #222;font-size:11px">`;
                h += `<span style="flex:1;color:#ccc">${rel.name}</span>`;
                h += `<span style="color:${rel.color};width:80px;text-align:center">${rel.tier}</span>`;
                h += `<span style="color:${rel.color};width:40px;text-align:right;font-weight:bold">${sign}${rel.value}</span>`;
                h += `<button data-rel-details="${rel.npcId}" style="padding:1px 6px;font-size:10px;cursor:pointer;background:#333;color:#c8a82e;border:1px solid #555">Info</button>`;
                h += `<button data-rel-focus="${rel.npcId}" style="padding:1px 6px;font-size:10px;cursor:pointer;background:#333;color:#c8a82e;border:1px solid #555">Focus</button>`;
                h += `</div>`;
            }
        }
        h += `</div>`;
        modal.innerHTML = h;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        document.getElementById('closeRelModal').addEventListener('mousedown', () => overlay.remove());
        overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) overlay.remove(); });

        // Wire up Info/Focus buttons
        modal.querySelectorAll('[data-rel-details]').forEach(btn => {
            btn.addEventListener('mousedown', () => {
                overlay.remove();
                UI.openNpcDetails(parseInt(btn.dataset.relDetails));
            });
        });
        modal.querySelectorAll('[data-rel-focus]').forEach(btn => {
            btn.addEventListener('mousedown', () => {
                overlay.remove();
                Camera.startFollow(parseInt(btn.dataset.relFocus));
            });
        });
    },

    _showMoodBreakdown(npcId) {
        const npc = World.npcs.find(n => n.id === npcId);
        if (!npc) return;
        const factors = Mood.getBreakdown(npc);
        const moodInfo = Mood.getMoodInfo(npc.mood);

        let existing = document.getElementById('moodBreakdownOverlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'moodBreakdownOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:3000;display:flex;align-items:center;justify-content:center';

        const modal = document.createElement('div');
        modal.style.cssText = 'background:#1a1a1a;border:2px solid #c8a82e;border-radius:6px;padding:12px;max-width:400px;width:90%;max-height:70vh;display:flex;flex-direction:column';

        let mHtml = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">`;
        mHtml += `<div style="color:#c8a82e;font-weight:bold;font-size:14px">${npc.name} — Mood Breakdown</div>`;
        mHtml += `<button id="closeMoodBreakdown" style="background:#333;color:#c8a82e;border:1px solid #555;cursor:pointer;padding:2px 8px">X</button>`;
        mHtml += `</div>`;

        mHtml += `<div style="text-align:center;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #333">`;
        mHtml += `<span style="font-size:18px;color:${moodInfo.color};font-weight:bold">${moodInfo.label}</span>`;
        mHtml += `<span style="color:#888;font-size:12px;margin-left:8px">(${npc.mood}/100)</span>`;
        mHtml += `</div>`;

        mHtml += `<div style="overflow-y:auto;flex:1">`;
        for (const f of factors) {
            const sign = f.value >= 0 ? '+' : '';
            const color = f.value > 0 ? '#44cc44' : f.value < 0 ? '#cc4444' : '#888';
            mHtml += `<div style="display:flex;justify-content:space-between;padding:3px 4px;border-bottom:1px solid #222;font-size:12px">`;
            mHtml += `<span style="color:#ccc">${f.label}</span>`;
            mHtml += `<span style="color:${color};font-weight:bold">${sign}${f.value}</span>`;
            mHtml += `</div>`;
        }
        const total = factors.reduce((s, f) => s + f.value, 0);
        mHtml += `<div style="display:flex;justify-content:space-between;padding:6px 4px;font-size:12px;border-top:1px solid #c8a82e;margin-top:4px">`;
        mHtml += `<span style="color:#c8a82e;font-weight:bold">Total (before clamp)</span>`;
        mHtml += `<span style="color:#c8a82e;font-weight:bold">${total}</span>`;
        mHtml += `</div>`;
        mHtml += `</div>`;

        modal.innerHTML = mHtml;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        document.getElementById('closeMoodBreakdown').addEventListener('mousedown', () => overlay.remove());
        overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) overlay.remove(); });
    },

    _showMemoryLog(npcId) {
        const npc = World.npcs.find(n => n.id === npcId);
        if (!npc || !npc.memories) return;
        const memories = Memory.getMemoriesForDisplay(npc);

        // Build modal overlay
        let existing = document.getElementById('memoryLogOverlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'memoryLogOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:3000;display:flex;align-items:center;justify-content:center';

        const modal = document.createElement('div');
        modal.style.cssText = 'background:#1a1a1a;border:2px solid #c8a82e;border-radius:6px;padding:12px;max-width:520px;width:90%;max-height:70vh;display:flex;flex-direction:column';

        let mHtml = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">`;
        mHtml += `<div style="color:#c8a82e;font-weight:bold;font-size:14px">${npc.name} — Memories (${memories.length})</div>`;
        mHtml += `<button id="closeMemoryLog" style="background:#333;color:#c8a82e;border:1px solid #555;cursor:pointer;padding:2px 8px">X</button>`;
        mHtml += `</div>`;
        mHtml += `<div style="overflow-y:auto;flex:1">`;

        if (memories.length === 0) {
            mHtml += `<div style="color:#888;text-align:center;padding:20px">No memories yet.</div>`;
        } else {
            const typeIcons = {
                arrived: '\u2605', npc_died: '\u2620', bandit_killed: '\u2694',
                fire_broke_out: '\u2737', caught_fire: '\u2737', building_destroyed: '\u2302',
                bandit_raid: '\u2694', got_sick: '\u26A0', recovered: '\u2764',
                exhaustion: '\u231B', assigned_work: '\u2692', fled_danger: '\u21E8',
                blessed: '\u2721', drank_ale: '\u2615', survived_raid: '\u2694'
            };
            for (const mem of memories) {
                const icon = typeIcons[mem.type] || '\u25CF';
                const hand = mem.isFirsthand ? '<span style="color:#88cc44;font-size:9px">1st</span>' : '<span style="color:#888;font-size:9px">2nd</span>';
                const ep = Memory.effectivePriority(mem).toFixed(1);
                const dayLabel = mem.dayNumber !== undefined ? 'Day ' + mem.dayNumber : '';
                mHtml += `<div style="display:flex;gap:6px;padding:3px 0;border-bottom:1px solid #222;font-size:11px;align-items:flex-start">`;
                mHtml += `<span style="flex-shrink:0;width:20px;text-align:center">${icon}</span>`;
                mHtml += `<span style="flex:1;color:#ccc">${mem.description}</span>`;
                mHtml += `<span style="flex-shrink:0;color:#888;width:44px;text-align:right">${dayLabel}</span>`;
                mHtml += `<span style="flex-shrink:0;width:24px;text-align:center">${hand}</span>`;
                mHtml += `<span style="flex-shrink:0;color:#666;width:28px;text-align:right;font-size:9px">${ep}</span>`;
                mHtml += `</div>`;
            }
        }
        mHtml += `</div>`;
        modal.innerHTML = mHtml;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        document.getElementById('closeMemoryLog').addEventListener('mousedown', () => overlay.remove());
        overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) overlay.remove(); });
    }
};
