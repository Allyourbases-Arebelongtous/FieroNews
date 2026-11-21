/**
 * Catalogues: Complete 26-Monster Species Table & Items Catalogue
 * Ground-truth definitions derived from REA binary analysis of ROGUE.EXE.
 */

// All 26 Monsters (A to Z) with verified damage dice & traits
const MONSTER_CATALOGUE = {
  'A': { name: 'Aquator', symbol: 'A', hpDice: '5d8', ac: 2, damage: '0d0', exp: 20, minLevel: 8, traits: ['RUST_ARMOR'], color: '#00FFFF' },
  'B': { name: 'Bat', symbol: 'B', hpDice: '1d8', ac: 3, damage: '1d2', exp: 1, minLevel: 1, traits: ['FLYING', 'RANDOM_MOVE'], color: '#AA00AA' },
  'C': { name: 'Centaur', symbol: 'C', hpDice: '4d8', ac: 4, damage: '1d6/1d6', exp: 25, minLevel: 7, traits: ['FAST', 'DROPS_ITEMS'], color: '#FFFF55' },
  'D': { name: 'Dragon', symbol: 'D', hpDice: '10d8', ac: -1, damage: '1d8/1d8/3d10', exp: 6800, minLevel: 22, traits: ['FIRE_BREATH', 'BOSS'], color: '#FF0000' },
  'E': { name: 'Emu', symbol: 'E', hpDice: '1d8', ac: 7, damage: '1d2', exp: 2, minLevel: 1, traits: ['FAST'], color: '#55FF55' },
  'F': { name: 'Venus Flytrap', symbol: 'F', hpDice: '8d8', ac: 3, damage: '%%%d0', exp: 80, minLevel: 14, traits: ['HOLD_PLAYER'], color: '#00AA00' },
  'G': { name: 'Griffin', symbol: 'G', hpDice: '13d8', ac: 2, damage: '4d3/3d5/4d3', exp: 2000, minLevel: 17, traits: ['MULTI_ATTACK'], color: '#FFAA00' },
  'H': { name: 'Hobgoblin', symbol: 'H', hpDice: '1d8+2', ac: 5, damage: '1d8', exp: 3, minLevel: 1, traits: ['MEAN'], color: '#AA5500' },
  'I': { name: 'Ice Monster', symbol: 'I', hpDice: '1d8', ac: 9, damage: '0d0', exp: 15, minLevel: 2, traits: ['FREEZE'], color: '#55FFFF' },
  'J': { name: 'Jabberwock', symbol: 'J', hpDice: '15d8', ac: 0, damage: '2d12/2d4', exp: 4000, minLevel: 21, traits: ['MULTI_ATTACK'], color: '#FF55FF' },
  'K': { name: 'Kestral', symbol: 'K', hpDice: '1d8', ac: 7, damage: '1d4', exp: 1, minLevel: 1, traits: ['FLYING', 'FAST'], color: '#AAAAAA' },
  'L': { name: 'Leprechaun', symbol: 'L', hpDice: '3d8', ac: 8, damage: '1d1', exp: 10, minLevel: 3, traits: ['STEAL_GOLD', 'TELEPORT_AWAY'], color: '#00FF00' },
  'M': { name: 'Medusa', symbol: 'M', hpDice: '8d8', ac: 2, damage: '3d4/3d4/2d5', exp: 250, minLevel: 18, traits: ['CONFUSE_GAZE'], color: '#AA00AA' },
  'N': { name: 'Nymph', symbol: 'N', hpDice: '3d8', ac: 9, damage: '0d0', exp: 37, minLevel: 10, traits: ['STEAL_ITEM', 'TELEPORT_AWAY'], color: '#FF88AA' },
  'O': { name: 'Orc', symbol: 'O', hpDice: '1d8', ac: 6, damage: '1d8', exp: 5, minLevel: 3, traits: ['GREEDY_GOLD'], color: '#00AA55' },
  'P': { name: 'Phantom', symbol: 'P', hpDice: '8d8', ac: 3, damage: '4d4', exp: 120, minLevel: 12, traits: ['INVISIBLE'], color: '#777777' },
  'Q': { name: 'Quagga', symbol: 'Q', hpDice: '3d8', ac: 3, damage: '1d2/1d2/1d4', exp: 32, minLevel: 9, traits: ['MEAN'], color: '#888800' },
  'R': { name: 'Rattlesnake', symbol: 'R', hpDice: '2d8', ac: 3, damage: '1d6', exp: 9, minLevel: 4, traits: ['POISON_STR'], color: '#AA0000' },
  'S': { name: 'Snake', symbol: 'S', hpDice: '1d8', ac: 5, damage: '1d3', exp: 2, minLevel: 1, traits: ['MEAN'], color: '#55AA55' },
  'T': { name: 'Troll', symbol: 'T', hpDice: '6d8', ac: 4, damage: '1d8/1d8/2d6', exp: 120, minLevel: 11, traits: ['REGENERATE'], color: '#55FF55' },
  'U': { name: 'Ur-vile', symbol: 'U', hpDice: '7d8', ac: -2, damage: '1d3/1d3/1d3/4d6', exp: 190, minLevel: 16, traits: ['MULTI_ATTACK'], color: '#AA55AA' },
  'V': { name: 'Vampire', symbol: 'V', hpDice: '8d8', ac: 1, damage: '1d10', exp: 350, minLevel: 19, traits: ['DRAIN_MAX_HP', 'REGENERATE'], color: '#880000' },
  'W': { name: 'Wraith', symbol: 'W', hpDice: '5d8', ac: 4, damage: '1d6', exp: 55, minLevel: 15, traits: ['DRAIN_EXP'], color: '#AAAAFF' },
  'X': { name: 'Xeroc', symbol: 'X', hpDice: '7d8', ac: 7, damage: '3d4', exp: 100, minLevel: 13, traits: ['MIMIC'], color: '#DDDD55' },
  'Y': { name: 'Yeti', symbol: 'Y', hpDice: '4d8', ac: 6, damage: '1d6/1d6', exp: 50, minLevel: 9, traits: ['COLD_RESIST'], color: '#EEEEEE' },
  'Z': { name: 'Zombie', symbol: 'Z', hpDice: '2d8', ac: 8, damage: '1d8', exp: 6, minLevel: 2, traits: ['UNDEAD'], color: '#88AA88' }
};

// Item Templates & Categories
const POTION_TYPES = [
  { id: 'heal', name: 'Healing', desc: 'Restores lost hit points.' },
  { id: 'extra_heal', name: 'Extra Healing', desc: 'Powerful healing and increases maximum hit points.' },
  { id: 'gain_str', name: 'Gain Strength', desc: 'Permanently raises your strength by 1.' },
  { id: 'restore_str', name: 'Restore Strength', desc: 'Restores strength lost to poison back to maximum.' },
  { id: 'raise_lvl', name: 'Raise Level', desc: 'Immediately awards enough experience for the next level.' },
  { id: 'haste', name: 'Haste Self', desc: 'Allows you to move and attack twice as fast for several turns.' },
  { id: 'detect_mon', name: 'Monster Detection', desc: 'Reveals the locations of all monsters on this floor.' },
  { id: 'detect_magic', name: 'Magic Detection', desc: 'Reveals the locations of all magic items on this floor.' },
  { id: 'see_invis', name: 'See Invisible', desc: 'Enables sight of phantoms and other hidden beings.' },
  { id: 'confusion', name: 'Confusion', desc: 'Causes severe disorientation and erratic stumbling.' },
  { id: 'blindness', name: 'Blindness', desc: 'Plunges your surroundings into total darkness.' },
  { id: 'poison', name: 'Poison', desc: 'Weakens your body and drains 1-3 points of strength.' },
  { id: 'hallucination', name: 'Hallucination', desc: 'Distorts your vision into shifting strange figures.' },
  { id: 'thirst', name: 'Thirst Quenching', desc: 'A refreshing draught that tastes exceptionally dull.' }
];

const SCROLL_TYPES = [
  { id: 'magic_map', name: 'Magic Mapping', desc: 'Magically charts the entire dungeon floor layout.' },
  { id: 'identify', name: 'Identify', desc: 'Reveals the exact true magical nature of an item in your pack.' },
  { id: 'enchant_wep', name: 'Enchant Weapon', desc: 'Imbues your wielded weapon with +1 hit and damage bonuses.' },
  { id: 'enchant_arm', name: 'Enchant Armor', desc: 'Hardens your worn armor, improving Armor Class by 1.' },
  { id: 'teleport', name: 'Teleportation', desc: 'Instantaneously transports you to a random dungeon tile.' },
  { id: 'hold_mon', name: 'Hold Monster', desc: 'Freezes all adjacent monsters in place.' },
  { id: 'sleep', name: 'Sleep', desc: 'Induces an irresistible sudden slumber.' },
  { id: 'create_mon', name: 'Create Monster', desc: 'Summons a hostile creature directly adjacent to you.' },
  { id: 'remove_curse', name: 'Remove Curse', desc: 'Purifies cursed equipment, allowing you to unequip them.' },
  { id: 'aggravate', name: 'Aggravate Monsters', desc: 'Emits a shrill reverberation that awakens every beast on the floor.' },
  { id: 'confuse_mon', name: 'Monster Confusion', desc: 'Enchants your hands; your next strike leaves the foe bewildered.' },
  { id: 'blank', name: 'Blank Paper', desc: 'A blank parchment with nothing written upon it.' }
];

const RING_TYPES = [
  { id: 'protection', name: 'Protection', bonusAC: 1, desc: 'Shields the wearer, granting an Armor Class bonus.' },
  { id: 'add_str', name: 'Add Strength', bonusStr: 1, desc: 'Increases the wearer\'s physical strength.' },
  { id: 'sustain_str', name: 'Sustain Strength', desc: 'Immunizes the wearer against strength-draining poisons.' },
  { id: 'searching', name: 'Searching', desc: 'Frequently auto-detects hidden traps and secret doors.' },
  { id: 'see_invis', name: 'See Invisible', desc: 'Allows the wearer to spot invisible phantoms.' },
  { id: 'regeneration', name: 'Regeneration', desc: 'Accelerates hit point recovery at the cost of faster hunger.' },
  { id: 'slow_digest', name: 'Slow Digestion', desc: 'Drastically reduces the rate at which food is consumed.' },
  { id: 'stealth', name: 'Stealth', desc: 'Permits silent movement without alerting sleeping monsters.' },
  { id: 'increase_dmg', name: 'Increase Damage', bonusDmg: 1, desc: 'Adds +1 damage to all melee and ranged strikes.' },
  { id: 'dexterity', name: 'Dexterity', bonusHit: 1, desc: 'Improves agility and accuracy in combat.' },
  { id: 'teleportation', name: 'Teleportation', desc: 'Periodically shifts the wearer randomly through the dungeon.' }
];

const WAND_TYPES = [
  { id: 'magic_missile', name: 'Magic Missile', charges: 5, damage: '2d6', desc: 'Unleashes an unerring arcane bolt.' },
  { id: 'fire', name: 'Fire', charges: 4, damage: '4d6', desc: 'Shoots a searing blast of elemental fire.' },
  { id: 'cold', name: 'Cold', charges: 4, damage: '4d6', desc: 'Hurls a freezing ray that damages and slows foes.' },
  { id: 'lightning', name: 'Lightning', charges: 4, damage: '5d6', desc: 'Discharges an electric bolt that ricochets off stone.' },
  { id: 'light', name: 'Light', charges: 8, desc: 'Permanently illuminates a dark chamber.' },
  { id: 'striking', name: 'Striking', charges: 6, damage: '2d8', desc: 'Strikes the target with crushing kinetic force.' },
  { id: 'polymorph', name: 'Polymorph', charges: 5, desc: 'Transforms a monster into a completely different creature.' },
  { id: 'teleport_away', name: 'Teleport Away', charges: 5, desc: 'Banishes the targeted monster to a far corner of the dungeon.' },
  { id: 'slow_mon', name: 'Slow Monster', charges: 5, desc: 'Reduces the movement speed of the target creature.' },
  { id: 'haste_mon', name: 'Haste Monster', charges: 4, desc: 'Supercharges a creature with frantic speed.' },
  { id: 'cancellation', name: 'Cancellation', charges: 4, desc: 'Neutralizes all magical and special abilities of a beast.' },
  { id: 'drain_life', name: 'Drain Life', charges: 3, desc: 'Siphons half the target\'s health into your vitality.' }
];

const WEAPON_TYPES = [
  { id: 'mace', name: 'Mace', damage: '1d8', glyph: GLYPHS.WEAPON },
  { id: 'long_sword', name: 'Long Sword', damage: '1d10', glyph: GLYPHS.WEAPON },
  { id: 'two_handed_sword', name: 'Two-Handed Sword', damage: '3d6', glyph: GLYPHS.WEAPON },
  { id: 'dagger', name: 'Dagger', damage: '1d4', glyph: GLYPHS.WEAPON },
  { id: 'short_bow', name: 'Short Bow', damage: '1d6', isRanged: true, glyph: GLYPHS.WEAPON },
  { id: 'arrows', name: 'Arrows', damage: '1d4', isAmmo: true, glyph: GLYPHS.WEAPON }
];

const ARMOR_TYPES = [
  { id: 'leather', name: 'Leather Armor', baseAC: 8, glyph: GLYPHS.ARMOR },
  { id: 'ring_mail', name: 'Ring Mail', baseAC: 7, glyph: GLYPHS.ARMOR },
  { id: 'scale_mail', name: 'Scale Mail', baseAC: 6, glyph: GLYPHS.ARMOR },
  { id: 'chain_mail', name: 'Chain Mail', baseAC: 5, glyph: GLYPHS.ARMOR },
  { id: 'banded_mail', name: 'Banded Mail', baseAC: 4, glyph: GLYPHS.ARMOR },
  { id: 'splint_mail', name: 'Splint Mail', baseAC: 4, glyph: GLYPHS.ARMOR },
  { id: 'plate_armor', name: 'Plate Armor', baseAC: 3, glyph: GLYPHS.ARMOR }
];
