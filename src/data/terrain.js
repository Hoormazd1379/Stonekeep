// Stonekeep - Terrain Data Definitions
'use strict';

const TERRAIN = {
    GRASS: {
        id: 'grass',
        name: 'Grassland',
        char: '.',
        fg: '#4a7a2e',
        bg: '#1a2e0a',
        walkable: true,
        buildable: true,
        fertile: true
    },
    DESERT: {
        id: 'desert',
        name: 'Desert',
        char: '.',
        fg: '#c8a832',
        bg: '#3a2e10',
        walkable: true,
        buildable: true,
        fertile: false
    },
    OASIS: {
        id: 'oasis',
        name: 'Oasis',
        char: '"',
        fg: '#2eaa2e',
        bg: '#0a3a0a',
        walkable: true,
        buildable: true,
        fertile: true
    },
    TREE: {
        id: 'tree',
        name: 'Trees',
        char: '\u2663', // ♣
        fg: '#2e8a2e',
        bg: '#0a2a0a',
        walkable: true,
        buildable: false,
        resource: 'wood',
        harvestable: true,
        isTree: true,
        baseTerrain: 'GRASS'
    },
    TREE_DESERT: {
        id: 'tree_desert',
        name: 'Desert Trees',
        char: '\u2663', // ♣
        fg: '#5a9a3a',
        bg: '#2a2210',
        walkable: true,
        buildable: false,
        resource: 'wood',
        harvestable: true,
        isTree: true,
        baseTerrain: 'DESERT'
    },
    TREE_GRASS: {
        id: 'tree_grass',
        name: 'Grassland Trees',
        char: '\u2663', // ♣
        fg: '#2e8a2e',
        bg: '#0a2a0a',
        walkable: true,
        buildable: false,
        resource: 'wood',
        harvestable: true,
        isTree: true,
        baseTerrain: 'GRASS'
    },
    TREE_OASIS: {
        id: 'tree_oasis',
        name: 'Oasis Trees',
        char: '\u2663', // ♣
        fg: '#1eaa3e',
        bg: '#0a3a0a',
        walkable: true,
        buildable: false,
        resource: 'wood',
        harvestable: true,
        isTree: true,
        baseTerrain: 'OASIS'
    },
    STONE: {
        id: 'stone',
        name: 'Stone Deposit',
        char: '\u25B2', // ▲
        fg: '#999999',
        bg: '#2a2a2a',
        walkable: false,
        buildable: false,
        resource: 'stone',
        harvestable: true,
        baseTerrain: 'DESERT'
    },
    IRON: {
        id: 'iron',
        name: 'Iron Deposit',
        char: '\u25A0', // ■
        fg: '#8888cc',
        bg: '#1a1a2a',
        walkable: false,
        buildable: false,
        resource: 'iron',
        harvestable: true,
        baseTerrain: 'DESERT'
    },
    PITCH: {
        id: 'pitch',
        name: 'Pitch Deposit',
        char: '\u25A0', // ■
        fg: '#222222',
        bg: '#0a0a0a',
        walkable: false,
        buildable: false,
        resource: 'pitch',
        harvestable: true,
        baseTerrain: 'DESERT'
    },
    WATER: {
        id: 'water',
        name: 'Water',
        char: '~',
        fg: '#4488cc',
        bg: '#0a1a3a',
        walkable: false,
        buildable: false,
        animated: true
    },
    CLIFF: {
        id: 'cliff',
        name: 'Cliff',
        char: '\u2588', // █
        fg: '#666666',
        bg: '#333333',
        walkable: false,
        buildable: false
    },
    ROCK: {
        id: 'rock',
        name: 'Rocks',
        char: '*',
        fg: '#777777',
        bg: '#2a2a2a',
        walkable: false,
        buildable: false
    },
    PITCH_DITCH: {
        id: 'pitch_ditch',
        name: 'Pitch Ditch',
        char: '~',
        fg: '#1a1a00',
        bg: '#0a0a00',
        walkable: false,
        buildable: false,
        flammable: true,
        animated: true
    }
};

// Lookup by id string
const TERRAIN_BY_ID = {};
for (const key in TERRAIN) {
    TERRAIN_BY_ID[TERRAIN[key].id] = TERRAIN[key];
}
