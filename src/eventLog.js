// Stonekeep - Event Log System
'use strict';

const EventLog = {
    _entries: [],
    _maxEntries: 400,
    _nextId: 1,
    _activeFilter: 'all',

    _categoryStyle: {
        danger: { label: 'Danger', color: '#FF4444' },
        warning: { label: 'Warning', color: '#FF8800' },
        caution: { label: 'Caution', color: '#DDDD44' },
        positive: { label: 'Positive', color: '#44DD44' },
        info: { label: 'Info', color: '#44DDDD' },
        neutral: { label: 'Info', color: '#CCCCCC' }
    },

    init() {
        this._entries = [];
        this._nextId = 1;
        this._activeFilter = 'all';
        this._maxEntries = CONFIG.EVENT_LOG_MAX_ENTRIES || 400;

        const panel = document.getElementById('eventLogPanel');
        if (!panel) return;

        panel.addEventListener('mousedown', (e) => {
            const gotoBtn = e.target.closest('[data-event-goto]');
            if (gotoBtn) {
                const id = parseInt(gotoBtn.dataset.eventGoto, 10);
                const entry = this._entries.find(ev => ev.id === id);
                if (entry && entry.x !== null && entry.y !== null) {
                    Camera.stopFollow();
                    Camera.centerOn(entry.x, entry.y);
                }
                return;
            }

            const filterBtn = e.target.closest('[data-event-filter]');
            if (filterBtn) {
                this._activeFilter = filterBtn.dataset.eventFilter || 'all';
                this._render();
            }
        });

        this._render();
    },

    reset() {
        this._entries = [];
        this._nextId = 1;
        this._activeFilter = 'all';
        this._render();
    },

    add(category, description, x, y) {
        if (!description) return;

        const style = this._categoryStyle[category] || this._categoryStyle.neutral;
        const day = (typeof Time !== 'undefined' && Time.day !== undefined) ? Time.day : 1;
        const timeText = (typeof Time !== 'undefined' && Time.getTimeString) ? Time.getTimeString() : '00:00';

        this._entries.push({
            id: this._nextId++,
            day: day,
            timeText: timeText,
            category: category || 'neutral',
            color: style.color,
            label: style.label,
            description: description,
            x: Number.isFinite(x) ? Math.floor(x) : null,
            y: Number.isFinite(y) ? Math.floor(y) : null
        });

        if (this._entries.length > this._maxEntries) {
            this._entries.splice(0, this._entries.length - this._maxEntries);
        }

        this._render();
    },

    _getVisibleEntries() {
        if (this._activeFilter === 'all') return this._entries;
        return this._entries.filter(ev => ev.category === this._activeFilter);
    },

    _render() {
        const list = document.getElementById('eventLogList');
        const filters = document.getElementById('eventLogFilters');
        if (!list || !filters) return;

        for (const btn of filters.querySelectorAll('[data-event-filter]')) {
            const isActive = btn.dataset.eventFilter === this._activeFilter;
            btn.classList.toggle('active', isActive);
        }

        const visible = this._getVisibleEntries();
        if (visible.length === 0) {
            list.innerHTML = '<div class="event-log-empty">No events yet.</div>';
            return;
        }

        const rows = [];
        for (let i = visible.length - 1; i >= 0; i--) {
            const ev = visible[i];
            const gotoDisabled = ev.x === null || ev.y === null;
            const gotoAttrs = gotoDisabled ? 'disabled' : ('data-event-goto="' + ev.id + '"');
            const gotoTitle = gotoDisabled ? 'No location for this event' : ('Center camera on ' + ev.x + ', ' + ev.y);

            rows.push(
                '<div class="event-log-row" style="border-left-color:' + ev.color + '">' +
                    '<div class="event-log-head">' +
                        '<span class="event-log-time">[Day ' + ev.day + ', ' + ev.timeText + ']</span> ' +
                        '<span class="event-log-tag" style="color:' + ev.color + '">' + ev.label + '</span>' +
                    '</div>' +
                    '<div class="event-log-body">' + ev.description + '</div>' +
                    '<div class="event-log-actions">' +
                        '<button class="event-goto" ' + gotoAttrs + ' title="' + gotoTitle + '">Goto</button>' +
                    '</div>' +
                '</div>'
            );
        }

        list.innerHTML = rows.join('');
    }
};
