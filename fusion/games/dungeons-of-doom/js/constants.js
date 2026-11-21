/**
 * Game Constants & Tile Definitions
 * Matches the classic 80x24 terminal specification verified via REA.
 */

const COLS = 80;
const ROWS = 24;

// Character & Glyph definitions
const GLYPHS = {
  EMPTY: ' ',
  FLOOR: '.',
  WALL_H: '-',
  WALL_V: '|',
  DOOR: '+',
  DOOR_OPEN: "'",
  CORRIDOR: '#',
  STAIRS_DOWN: '>',
  STAIRS_UP: '<',
  GOLD: '*',
  POTION: '!',
  SCROLL: '?',
  WAND: '/',
  RING: '=',
  WEAPON: ')',
  ARMOR: '[',
  FOOD: ':',
  AMULET: '&',
  TRAP: '^',
  PLAYER: '@'
};

// Colors matching classic DOS Rogue palette
const COLORS = {
  BG: '#000000',
  TEXT_DEFAULT: '#E0E0E0',
  BANNER: '#FFFFFF',
  HUD: '#FFFF55', // Yellow status bar
  WALL: '#A52A2A', // Brown brick
  FLOOR: '#00AA00', // Green dots
  CORRIDOR: '#888888',
  DOOR: '#CD853F',
  GOLD: '#FFD700', // Bright gold
  POTION: '#FF55FF', // Magenta
  SCROLL: '#55FFFF', // Cyan
  WAND: '#FFAA00', // Orange
  RING: '#55FF55', // Light green
  WEAPON: '#AAAAAA',
  ARMOR: '#5555FF', // Blue
  FOOD: '#FF8800', // Orange
  AMULET: '#FFFF00', // Glowing gold
  TRAP: '#FF4444',
  PLAYER: '#FF5555', // Red / bright smiling avatar
  MONSTER_DEFAULT: '#55FF55',
  FOG_DIMMED: '#333333'
};

// Cardinal & Diagonal directions
const DIRECTIONS = {
  UP:         { dx: 0,  dy: -1 },
  DOWN:       { dx: 0,  dy: 1  },
  LEFT:       { dx: -1, dy: 0  },
  RIGHT:      { dx: 1,  dy: 0  },
  UP_LEFT:    { dx: -1, dy: -1 },
  UP_RIGHT:   { dx: 1,  dy: -1 },
  DOWN_LEFT:  { dx: -1, dy: 1  },
  DOWN_RIGHT: { dx: 1,  dy: 1  }
};

// Key bindings
const KEY_MAP = {
  // Arrow keys
  'ArrowUp': DIRECTIONS.UP,
  'ArrowDown': DIRECTIONS.DOWN,
  'ArrowLeft': DIRECTIONS.LEFT,
  'ArrowRight': DIRECTIONS.RIGHT,

  // vi movement keys
  'k': DIRECTIONS.UP,
  'j': DIRECTIONS.DOWN,
  'h': DIRECTIONS.LEFT,
  'l': DIRECTIONS.RIGHT,
  'y': DIRECTIONS.UP_LEFT,
  'u': DIRECTIONS.UP_RIGHT,
  'b': DIRECTIONS.DOWN_LEFT,
  'n': DIRECTIONS.DOWN_RIGHT,

  // Numpad movement
  '8': DIRECTIONS.UP,
  '2': DIRECTIONS.DOWN,
  '4': DIRECTIONS.LEFT,
  '6': DIRECTIONS.RIGHT,
  '7': DIRECTIONS.UP_LEFT,
  '9': DIRECTIONS.UP_RIGHT,
  '1': DIRECTIONS.DOWN_LEFT,
  '3': DIRECTIONS.DOWN_RIGHT
};

// Hunger levels
const HUNGER_STATES = {
  NORMAL: 'Normal',
  HUNGRY: 'Hungry',
  WEAK: 'Weak',
  FAINT: 'Faint'
};
