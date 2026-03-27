// Stonekeep - Resource Data Definitions
'use strict';

const RESOURCE_TYPES = {
    // Primary resources
    gold:  { id: 'gold',  name: 'Gold',  category: 'primary', icon: '$', color: '#c8a82e' },
    wood:  { id: 'wood',  name: 'Wood',  category: 'primary', icon: '=', color: '#8B6914' },
    stone: { id: 'stone', name: 'Stone', category: 'primary', icon: 'o', color: '#999999' },
    iron:  { id: 'iron',  name: 'Iron',  category: 'primary', icon: 'I', color: '#8888cc' },
    pitch: { id: 'pitch', name: 'Pitch', category: 'primary', icon: 'p', color: '#333333' },

    // Food
    apples: { id: 'apples', name: 'Apples', category: 'food', icon: 'a', color: '#cc3333' },
    bread:  { id: 'bread',  name: 'Bread',  category: 'food', icon: 'b', color: '#c8a832' },
    cheese: { id: 'cheese', name: 'Cheese', category: 'food', icon: 'c', color: '#cccc44' },
    meat:   { id: 'meat',   name: 'Meat',   category: 'food', icon: 'm', color: '#cc6644' },

    // Intermediate
    wheat: { id: 'wheat', name: 'Wheat', category: 'intermediate', icon: 'w', color: '#ccaa44' },
    flour: { id: 'flour', name: 'Flour', category: 'intermediate', icon: 'f', color: '#ddddaa' },
    hops:  { id: 'hops',  name: 'Hops',  category: 'intermediate', icon: 'h', color: '#5a8a2e' },
    ale:   { id: 'ale',   name: 'Ale',   category: 'intermediate', icon: 'A', color: '#c87832' },

    // Weapons
    bows:    { id: 'bows',    name: 'Bows',    category: 'weapon', icon: ')', color: '#8B6914' },
    spears:  { id: 'spears',  name: 'Spears',  category: 'weapon', icon: '/', color: '#8B6914' },
    swords:  { id: 'swords',  name: 'Swords',  category: 'weapon', icon: '|', color: '#aaaacc' },

    // Armor
    armor: { id: 'armor', name: 'Metal Armor', category: 'armor', icon: '[', color: '#aaaacc' }
};

// Which resources are stored where
const STORAGE_TYPES = {
    stockpile: ['wood', 'stone', 'iron', 'pitch', 'wheat', 'flour', 'hops', 'ale'],
    granary:   ['apples', 'bread', 'cheese', 'meat'],
    armory:    ['bows', 'spears', 'swords', 'armor']
};
