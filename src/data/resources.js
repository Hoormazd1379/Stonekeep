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
    herbs:  { id: 'herbs',  name: 'Herbs',  category: 'food', icon: 'H', color: '#55aa55' },
    jerky:  { id: 'jerky',  name: 'Jerky',  category: 'food', icon: 'j', color: '#aa6644' },

    // Prepared meals (Cookhouse outputs — named by recipe)
    meatPie:       { id: 'meatPie',       name: 'Meat Pie',       category: 'food', icon: 'P', color: '#cc8844' },
    herbBread:     { id: 'herbBread',      name: 'Herb Bread',     category: 'food', icon: 'B', color: '#88aa44' },
    appleCheese:   { id: 'appleCheese',    name: 'Apple & Cheese', category: 'food', icon: 'C', color: '#ccaa44' },
    meatStew:      { id: 'meatStew',       name: 'Meat Stew',      category: 'food', icon: 'S', color: '#cc6644' },
    herbSalad:     { id: 'herbSalad',      name: 'Herb Salad',     category: 'food', icon: 'L', color: '#66cc66' },
    fruitPie:      { id: 'fruitPie',       name: 'Fruit Pie',      category: 'food', icon: 'F', color: '#cc5555' },
    cheeseBread:   { id: 'cheeseBread',    name: 'Cheese Bread',   category: 'food', icon: 'D', color: '#ddcc44' },
    spicedMeat:    { id: 'spicedMeat',     name: 'Spiced Meat',    category: 'food', icon: 'M', color: '#cc4422' },
    appleStrudel:  { id: 'appleStrudel',   name: 'Apple Strudel',  category: 'food', icon: 'A', color: '#cc7744' },
    herbCheese:    { id: 'herbCheese',     name: 'Herb Cheese',    category: 'food', icon: 'E', color: '#aacc44' },

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
    granary:   ['apples', 'bread', 'cheese', 'meat', 'herbs', 'jerky',
                'meatPie', 'herbBread', 'appleCheese', 'meatStew', 'herbSalad',
                'fruitPie', 'cheeseBread', 'spicedMeat', 'appleStrudel', 'herbCheese'],
    armory:    ['bows', 'spears', 'swords', 'armor']
};

// Cookhouse recipes: 2 different raw foods → 4 prepared meals
// Key format: "food1,food2" (alphabetically sorted)
const COOKHOUSE_RECIPES = {
    'bread,meat':    'meatPie',
    'bread,herbs':   'herbBread',
    'apples,cheese': 'appleCheese',
    'cheese,meat':   'meatStew',
    'herbs,meat':    'spicedMeat',
    'apples,herbs':  'herbSalad',
    'apples,bread':  'fruitPie',
    'bread,cheese':  'cheeseBread',
    'apples,meat':   'appleStrudel',
    'cheese,herbs':  'herbCheese'
};

// Raw food types the cookhouse can use
const COOKHOUSE_INPUTS = ['apples', 'bread', 'cheese', 'meat', 'herbs'];
