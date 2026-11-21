/**
 * Storage & Hall of Fame Leaderboard System
 * Pre-seeded with the exact Top 10 records reverse-engineered from ROGUE.SCR.
 */

const STORAGE_KEY_HOF = 'rogue_custom_hall_of_fame_v1';

// Exact historical leaderboard reverse-engineered from binary ROGUE.SCR:
const INITIAL_HALL_OF_FAME = [
  { rank: 1,  gold: 14739, name: 'Jimmy the Master', outcome: 'won on level 26', level: 26 },
  { rank: 2,  gold: 8311,  name: 'Merklin',          outcome: 'quit on level 26', level: 26 },
  { rank: 3,  gold: 2592,  name: 'Yaglov',           outcome: 'killed by a troll on level 12', level: 12 },
  { rank: 4,  gold: 1478,  name: 'Pylos',            outcome: 'killed by a starvation on level 11', level: 11 },
  { rank: 5,  gold: 1005,  name: 'shawn',            outcome: 'killed by a phantom on level 7', level: 7 },
  { rank: 6,  gold: 882,   name: 'Zykil',            outcome: 'killed by a centaur on level 9', level: 9 },
  { rank: 7,  gold: 526,   name: 'frizzlefryd',      outcome: 'quit on level 3', level: 3 },
  { rank: 8,  gold: 398,   name: 'Metzel',           outcome: 'quit on level 4', level: 4 },
  { rank: 9,  gold: 260,   name: 'Papa Smurf',       outcome: 'killed by a rattlesnake on level 4', level: 4 },
  { rank: 10, gold: 134,   name: 'Metzel',           outcome: 'killed by an emu on level 2', level: 2 }
];

class LeaderboardStorage {
  static getHallOfFame() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HOF);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('LocalStorage unavailable, falling back to memory storage', e);
    }
    // Return cloned initial seed
    return JSON.parse(JSON.stringify(INITIAL_HALL_OF_FAME));
  }

  static saveHallOfFame(entries) {
    try {
      localStorage.setItem(STORAGE_KEY_HOF, JSON.stringify(entries));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
  }

  static recordScore(name, gold, outcome, level) {
    const hof = this.getHallOfFame();
    const newEntry = {
      name: name || 'Adventurer',
      gold: Math.max(0, gold),
      outcome: outcome || 'quit',
      level: level || 1,
      timestamp: Date.now()
    };

    // Add and sort strictly descending by gold
    hof.push(newEntry);
    hof.sort((a, b) => b.gold - a.gold);

    // Keep top 10
    const top10 = hof.slice(0, 10).map((item, index) => ({
      ...item,
      rank: index + 1
    }));

    this.saveHallOfFame(top10);

    // Check if new entry placed in Top 10
    const placedIndex = top10.findIndex(e => e.name === newEntry.name && e.gold === newEntry.gold && e.level === newEntry.level);
    return {
      placed: placedIndex !== -1,
      rank: placedIndex !== -1 ? placedIndex + 1 : null,
      top10: top10
    };
  }

  static resetToDefault() {
    this.saveHallOfFame(INITIAL_HALL_OF_FAME);
    return JSON.parse(JSON.stringify(INITIAL_HALL_OF_FAME));
  }
}
