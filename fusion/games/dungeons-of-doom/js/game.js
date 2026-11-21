/**
 * Core Rogue Game Engine & State Controller
 * Glues rendering, input, player actions, dungeon progression, and leaderboards.
 */

class Player {
  constructor(name) {
    this.name = name || 'Adventurer';
    this.level = 1;
    this.hp = 12;
    this.maxHp = 12;
    this.strength = 16;
    this.maxStrength = 16;
    this.gold = 0;
    this.exp = 0;
    this.x = 0;
    this.y = 0;
    this.hungerTurns = 1200;
    this.isFrozen = 0;
    this.hasAmulet = false;

    // Equipped gear references
    this.weapon = null;
    this.armor = null;
    this.leftRing = null;
    this.rightRing = null;

    // Status effect turn timers
    this.hasteTurns = 0;
    this.confusionTurns = 0;
    this.blindTurns = 0;
    this.hallucinationTurns = 0;
    this.seeInvisibleTurns = 0;
    this.detectMonstersTurns = 0;
    this.detectMagicTurns = 0;
    this.handsGlowing = false;

    // Verified starting pack
    this.inventory = [];
    this.initStartingPack();
  }

  get rings() {
    const list = [];
    if (this.leftRing) list.push(this.leftRing);
    if (this.rightRing) list.push(this.rightRing);
    return list;
  }

  hasRing(ringId) {
    return (this.leftRing && this.leftRing.id === ringId) || (this.rightRing && this.rightRing.id === ringId);
  }

  getRingCount() {
    let count = 0;
    if (this.leftRing) count++;
    if (this.rightRing) count++;
    return count;
  }

  getEffectiveStrength() {
    let str = this.strength;
    for (const r of this.rings) {
      if (r.id === 'add_str') str += (r.bonusStr || 1);
    }
    return Math.max(1, str);
  }

  getEffectiveMaxStrength() {
    let maxStr = this.maxStrength;
    for (const r of this.rings) {
      if (r.id === 'add_str') maxStr += (r.bonusStr || 1);
    }
    return Math.max(1, maxStr);
  }

  getRingBonusAC() {
    let bonus = 0;
    for (const r of this.rings) {
      if (r.id === 'protection') bonus += (r.bonusAC || 1);
    }
    return bonus;
  }

  getRingBonusDmg() {
    let bonus = 0;
    for (const r of this.rings) {
      if (r.id === 'increase_dmg') bonus += (r.bonusDmg || 1);
    }
    return bonus;
  }

  getRingBonusHit() {
    let bonus = 0;
    for (const r of this.rings) {
      if (r.id === 'dexterity') bonus += (r.bonusHit || 1);
    }
    return bonus;
  }

  initStartingPack() {
    const food = { type: 'food', id: 'food_1', name: 'Some food', glyph: GLYPHS.FOOD };
    const armor = { type: 'armor', id: 'ring_mail', name: '+1 ring mail [armor class 5]', baseAC: 7, bonusAC: -2, glyph: GLYPHS.ARMOR, isWorn: true };
    const mace = { type: 'weapon', id: 'mace', name: 'A +1,+1 mace', damage: '1d8', bonusHit: 1, bonusDmg: 1, glyph: GLYPHS.WEAPON, isWielded: true };
    const bow = { type: 'weapon', id: 'bow', name: 'A +1,+0 short bow', damage: '1d6', bonusHit: 1, bonusDmg: 0, isRanged: true, glyph: GLYPHS.WEAPON };
    const arrows = { type: 'weapon', id: 'arrows', name: '38 +0,+0 arrows', damage: '1d4', count: 38, isAmmo: true, glyph: GLYPHS.WEAPON };

    this.inventory = [food, armor, mace, bow, arrows];
    this.armor = armor;
    this.weapon = mace;
  }

  getArmorClass() {
    let ac = 10;
    if (this.armor) {
      ac = this.armor.baseAC + (this.armor.bonusAC || 0);
    }
    ac -= this.getRingBonusAC();
    return Math.max(-5, ac);
  }

  canSeeInvisible() {
    return this.hasRing('see_invis') || this.seeInvisibleTurns > 0;
  }
}

class RogueGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new TextGridRenderer(this.canvas);
    this.player = null;
    this.floor = null;
    this.currentLevel = 1;
    this.turnCounter = 319; // Initial verified turn offset: 5:19
    this.bannerMessage = '';
    this.messageQueue = [];
    this.awaitingMore = false;
    this.turnHadMessage = false;
    this.pendingAction = null; // For 2-step actions (e.g. direction for wand)
    this.activeModal = null;

    // DOM Elements
    this.overlay = document.getElementById('overlay-container');
    this.screenNameEntry = document.getElementById('screen-name-entry');
    this.screenInventory = document.getElementById('screen-inventory');
    this.screenDirection = document.getElementById('screen-direction');
    this.screenLevelSelect = document.getElementById('screen-level-select');
    this.screenHelp = document.getElementById('screen-help');
    this.screenHandSelect = document.getElementById('screen-hand-select');
    this.screenGameOver = document.getElementById('screen-game-over');
    this.screenHallOfFame = document.getElementById('screen-hall-of-fame');
    this.nameInput = document.getElementById('player-name-input');

    this.pendingEquipRing = null;
    this.pendingHandAction = null;

    this.bindEvents();
    this.initGame();
  }

  initGame() {
    // Show Name Entry
    this.showModal(this.screenNameEntry);
    this.nameInput.value = 'Robin';
    this.nameInput.focus();
  }

  startQuest(playerName) {
    this.player = new Player(playerName || 'Robin');
    this.currentLevel = 1;
    this.turnCounter = 319;
    this.messageQueue = [];
    this.turnHadMessage = false;
    this.awaitingMore = false;
    this.hideAllModals();

    this.loadLevel(1);
    this.setBanner(`Hello ${this.player.name}, Welcome to the Dungeons of Doom`);
    this.render();
  }

  loadLevel(levelNum) {
    this.currentLevel = Math.max(1, Math.min(26, levelNum));
    this.floor = new DungeonFloor(this.currentLevel, this.player);
    this.renderer.render(this);
  }

  formatTurnTime() {
    const hours = Math.floor(this.turnCounter / 60) % 24;
    const mins = this.turnCounter % 60;
    return `${hours}:${mins < 10 ? '0' + mins : mins}`;
  }

  setBanner(msg, requireMore = false) {
    if (!msg) {
      if (!this.turnHadMessage) {
        this.bannerMessage = '';
        this.awaitingMore = false;
      }
      this.render();
      return;
    }

    if (this.turnHadMessage && this.bannerMessage) {
      this.messageQueue.push(msg);
      this.awaitingMore = true;
    } else {
      this.bannerMessage = msg;
      this.turnHadMessage = true;
      this.awaitingMore = requireMore;
    }
    this.render();
  }

  advanceMessage() {
    if (this.messageQueue.length > 0) {
      this.bannerMessage = this.messageQueue.shift();
      this.awaitingMore = this.messageQueue.length > 0;
    } else {
      this.awaitingMore = false;
      this.bannerMessage = '';
    }
    this.render();
  }

  render() {
    this.renderer.render(this);
  }

  // --- Modal Management ---
  showModal(element) {
    this.hideAllModals();
    this.overlay.classList.remove('hidden');
    element.classList.remove('hidden');
    this.activeModal = element;
  }

  hideAllModals() {
    this.overlay.classList.add('hidden');
    const modals = [
      this.screenNameEntry, this.screenInventory, this.screenDirection,
      this.screenLevelSelect, this.screenHelp, this.screenHandSelect,
      this.screenGameOver, this.screenHallOfFame
    ];
    modals.forEach(m => m && m.classList.add('hidden'));
    this.activeModal = null;
    this.render();
  }

  // --- Player Action Handling ---
  handlePlayerMove(dx, dy) {
    if (this.awaitingMore) {
      this.advanceMessage();
      return;
    }

    this.turnHadMessage = false;
    this.bannerMessage = '';

    if (this.player.isFrozen > 0) {
      this.player.isFrozen--;
      this.setBanner('You are still frozen!');
      this.endTurn();
      return;
    }

    // Confusion effect: 50% chance to stumble in random direction
    if (this.player.confusionTurns > 0 && Math.random() < 0.50) {
      const dirs = Object.values(DIRECTIONS);
      const rd = dirs[Math.floor(Math.random() * dirs.length)];
      dx = rd.dx;
      dy = rd.dy;
    }

    const nx = this.player.x + dx;
    const ny = this.player.y + dy;

    // Check monster attack
    const targetMonster = this.floor.getMonsterAt(nx, ny);
    if (targetMonster) {
      CombatSystem.resolvePlayerAttack(this.player, targetMonster, this);
      this.endTurn();
      return;
    }

    // Check passable
    if (this.floor.isPassable(nx, ny)) {
      this.player.x = nx;
      this.player.y = ny;
      this.floor.updateVisibility(nx, ny);

      // Check stepping on hidden or revealed trap
      const trap = this.floor.getTrapAt ? this.floor.getTrapAt(nx, ny) : null;
      if (trap) {
        this.triggerTrap(trap);
      }

      // Check item / gold pickup
      const item = this.floor.getItemAt(nx, ny);
      if (item) {
        if (item.type === 'gold') {
          this.player.gold += item.amount;
          this.setBanner(`you found ${item.amount} gold pieces`);
          this.floor.items = this.floor.items.filter(i => i !== item);
        } else if (item.type === 'artifact') {
          this.player.hasAmulet = true;
          this.setBanner('You found the Amulet of Yendor! Now climb back to Level 1!', true);
          this.floor.items = this.floor.items.filter(i => i !== item);
        } else {
          if (this.player.inventory.length < 23) {
            this.player.inventory.push(item);
            this.setBanner(`you found ${item.name}`);
            this.floor.items = this.floor.items.filter(i => i !== item);
          } else {
            this.setBanner(`you see ${item.name} but your pack is full`);
          }
        }
      }

      // Ring of Searching auto-detection on move
      if (this.player.hasRing('searching') && Math.random() < 0.50) {
        this.performSearch(true);
      }

      this.endTurn();
    } else {
      // Wall collision
      this.setBanner('');
      this.render();
    }
  }

  triggerTrap(trap) {
    trap.isRevealed = true;
    if (trap.type === 'dart') {
      const dmg = this.floor.rollDice('1d4');
      this.player.hp -= dmg;
      let msg = `A small dart whizzes out from the wall and hits you! (${dmg} dmg)`;
      if (!this.player.hasRing('sustain_str') && Math.random() < 0.25) {
        this.player.strength = Math.max(3, this.player.strength - 1);
        msg += ' A sickly venom weakens your muscles! (-1 Str)';
      }
      this.setBanner(msg);
      if (this.player.hp <= 0) {
        this.player.hp = 0;
        this.triggerGameOver('killed by a poison dart trap');
      }
    } else if (trap.type === 'bear') {
      this.player.isFrozen = Math.floor(Math.random() * 3) + 2;
      this.setBanner('You stepped into a bear trap! You are held fast!');
    } else if (trap.type === 'teleport') {
      const r = this.floor.rooms[Math.floor(Math.random() * this.floor.rooms.length)];
      this.player.x = r.cx;
      this.player.y = r.cy;
      this.floor.updateVisibility(r.cx, r.cy);
      this.setBanner('A teleport trap flashes! You are whisked through the ether!');
    } else if (trap.type === 'sleep') {
      this.player.isFrozen = Math.floor(Math.random() * 3) + 3;
      this.setBanner('A puff of sleeping gas puts you into sudden slumber!');
    }
  }

  endTurn() {
    this.turnCounter++;

    // Decrement temporary status effect timers
    if (this.player.hasteTurns > 0) this.player.hasteTurns--;
    if (this.player.confusionTurns > 0) this.player.confusionTurns--;
    if (this.player.blindTurns > 0) this.player.blindTurns--;
    if (this.player.hallucinationTurns > 0) this.player.hallucinationTurns--;
    if (this.player.seeInvisibleTurns > 0) this.player.seeInvisibleTurns--;
    if (this.player.detectMonstersTurns > 0) this.player.detectMonstersTurns--;
    if (this.player.detectMagicTurns > 0) this.player.detectMagicTurns--;

    // Ring of Teleportation random chance
    if (this.player.hasRing('teleportation') && Math.random() < 0.015) {
      const r = this.floor.rooms[Math.floor(Math.random() * this.floor.rooms.length)];
      this.player.x = r.cx;
      this.player.y = r.cy;
      this.floor.updateVisibility(r.cx, r.cy);
      this.setBanner('You feel yanked through space by your ring!', true);
    }

    // Hunger calculation incorporating Slow Digestion and Ring wear penalties
    let hungerCost = 1;
    if (this.player.hasRing('slow_digest')) {
      hungerCost = (this.turnCounter % 2 === 0) ? 1 : 0;
    } else {
      hungerCost += this.player.getRingCount(); // Each equipped ring increases food burn
    }
    this.player.hungerTurns = Math.max(0, this.player.hungerTurns - hungerCost);

    if (this.player.hungerTurns === 300) {
      this.setBanner('You are starting to get hungry');
    } else if (this.player.hungerTurns === 100) {
      this.setBanner('You are getting very weak from hunger');
    } else if (this.player.hungerTurns <= 0) {
      this.player.hp -= 1;
      if (this.player.hp <= 0) {
        this.player.hp = 0;
        this.triggerGameOver('killed by starvation');
        return;
      }
    }

    // Ring of regeneration effect
    if (this.player.hasRing('regeneration') && this.turnCounter % 3 === 0) {
      if (this.player.hp < this.player.maxHp) {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1);
      }
    }

    // Process Monster AI turns (Haste skips monster turns every 2nd player action)
    const skipMonsterTurn = (this.player.hasteTurns > 0 && this.turnCounter % 2 === 1);
    if (!skipMonsterTurn) {
      CombatSystem.processMonsterTurns(this);
    }

    this.render();
  }

  // --- Item Interactions ---
  openInventory(mode = 'view') {
    const list = document.getElementById('inventory-list');
    list.innerHTML = '';

    if (this.player.inventory.length === 0) {
      list.innerHTML = '<p style="color: #888;">Your pack is empty.</p>';
    } else {
      this.player.inventory.forEach((item, idx) => {
        const letter = String.fromCharCode(97 + idx); // a, b, c...
        const row = document.createElement('div');
        row.className = 'item-row';

        let tag = '';
        if (item.isWielded) tag = '(weapon in hand)';
        else if (item.isWorn) tag = '(being worn)';
        else if (this.player.leftRing === item) tag = '(on left hand)';
        else if (this.player.rightRing === item) tag = '(on right hand)';
        else if (item.isRanged) tag = '(quiver)';

        row.innerHTML = `
          <span><span class="item-key">${letter})</span> ${item.name}</span>
          <span class="item-tag">${tag}</span>
        `;
        row.onclick = () => this.handleItemSelection(letter, mode);
        list.appendChild(row);
      });
    }

    const titles = {
      'view': 'PACK INVENTORY',
      'eat': 'WHAT DO YOU WISH TO EAT?',
      'drink': 'WHAT DO YOU WISH TO QUAFF?',
      'read': 'WHAT DO YOU WISH TO READ?',
      'zap': 'WHAT DO YOU WISH TO ZAP?',
      'drop': 'WHAT DO YOU WISH TO DROP?',
      'wield': 'WHAT DO YOU WISH TO WIELD?',
      'wear': 'WHAT DO YOU WISH TO WEAR?',
      'put_on_ring': 'WHICH RING DO YOU WISH TO PUT ON?',
      'identify': 'WHAT ITEM DO YOU WISH TO IDENTIFY?'
    };
    document.getElementById('inventory-title').textContent = titles[mode] || 'PACK INVENTORY';
    document.getElementById('inventory-hint').textContent = mode === 'view' ? '- Press letter or Space to close -' : '- Select a letter [a-z] or Space to cancel -';

    this.currentInventoryMode = mode;
    this.showModal(this.screenInventory);
  }

  handleItemSelection(letter, mode = this.currentInventoryMode) {
    const idx = letter.toLowerCase().charCodeAt(0) - 97;
    if (idx < 0 || idx >= this.player.inventory.length) {
      this.hideAllModals();
      return;
    }

    const item = this.player.inventory[idx];
    this.hideAllModals();
    this.turnHadMessage = false;
    this.bannerMessage = '';

    if (mode === 'eat') {
      if (item.type === 'food') {
        this.player.inventory.splice(idx, 1);
        this.player.hungerTurns = 1200;
        this.setBanner('Yum, that tasted good'); // Exact verified Rogue phrase
        this.endTurn();
      } else {
        this.setBanner('That is not food!');
      }
    } else if (mode === 'drink') {
      if (item.type === 'potion') {
        this.player.inventory.splice(idx, 1);
        this.applyPotionEffect(item);
        this.endTurn();
      } else {
        this.setBanner('You can only drink potions!');
      }
    } else if (mode === 'read') {
      if (item.type === 'scroll') {
        this.player.inventory.splice(idx, 1);
        this.applyScrollEffect(item);
        this.endTurn();
      } else {
        this.setBanner('You can only read scrolls!');
      }
    } else if (mode === 'drop') {
      if (item === this.player.weapon) { this.player.weapon = null; item.isWielded = false; }
      if (item === this.player.armor) { this.player.armor = null; item.isWorn = false; }
      if (item === this.player.leftRing) this.player.leftRing = null;
      if (item === this.player.rightRing) this.player.rightRing = null;
      this.player.inventory.splice(idx, 1);
      item.x = this.player.x;
      item.y = this.player.y;
      this.floor.items.push(item);
      this.setBanner(`Dropped ${item.name}`);
      this.endTurn();
    } else if (mode === 'wield') {
      if (item.type === 'weapon') {
        this.player.inventory.forEach(i => i.isWielded = false);
        item.isWielded = true;
        this.player.weapon = item;
        this.setBanner(`Wielding ${item.name}`);
        this.endTurn();
      } else {
        this.setBanner('You cannot wield that as a weapon!');
      }
    } else if (mode === 'wear') {
      if (item.type === 'armor') {
        this.player.inventory.forEach(i => i.isWorn = false);
        item.isWorn = true;
        this.player.armor = item;
        this.setBanner(`You are now wearing ${item.name}`);
        this.endTurn();
      } else {
        this.setBanner('You can only wear suits of armor! (Use P for rings)');
      }
    } else if (mode === 'put_on_ring') {
      if (item.type !== 'ring') {
        this.setBanner('That is not a ring!');
        return;
      }
      if (item === this.player.leftRing || item === this.player.rightRing) {
        this.setBanner('You are already wearing that ring!');
        return;
      }
      if (this.player.getRingCount() >= 2) {
        this.setBanner('You are already wearing two rings! (Remove one first with R)');
        return;
      }
      if (!this.player.leftRing && !this.player.rightRing) {
        this.pendingEquipRing = item;
        this.openHandSelect('put');
      } else if (!this.player.leftRing) {
        this.player.leftRing = item;
        this.setBanner(`You put on the ${item.name} on your left hand.`);
        this.endTurn();
      } else {
        this.player.rightRing = item;
        this.setBanner(`You put on the ${item.name} on your right hand.`);
        this.endTurn();
      }
    } else if (mode === 'identify') {
      this.setBanner(`Identified: ${item.name} - ${item.desc || 'Ordinary dungeon equipment'}`);
      this.endTurn();
    } else if (mode === 'zap') {
      if (item.type === 'wand') {
        this.pendingWand = item;
        this.showModal(this.screenDirection);
      } else {
        this.setBanner('You can only zap wands and staffs!');
      }
    }
  }

  applyPotionEffect(potion) {
    if (potion.id === 'heal') {
      const heal = Math.floor(Math.random() * 8) + 4;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
      this.setBanner(`You feel much better. (+${heal} HP)`);
    } else if (potion.id === 'extra_heal') {
      this.player.maxHp += 4;
      this.player.hp = this.player.maxHp;
      this.setBanner('You feel vitality surge through your veins! (+4 Max HP)');
    } else if (potion.id === 'gain_str') {
      this.player.strength++;
      this.player.maxStrength = Math.max(this.player.maxStrength, this.player.strength);
      this.setBanner('You feel stronger, what an unusual feeling!');
    } else if (potion.id === 'restore_str') {
      this.player.strength = this.player.maxStrength;
      this.setBanner('Your strength returns to full vitality.');
    } else if (potion.id === 'raise_lvl') {
      this.player.level++;
      const hpGain = Math.floor(Math.random() * 10) + 2;
      this.player.maxHp += hpGain;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + hpGain);
      this.player.exp = Math.pow(2, this.player.level - 1) * 10;
      this.setBanner(`Welcome to level ${this.player.level}! (+${hpGain} Max HP)`);
    } else if (potion.id === 'haste') {
      this.player.hasteTurns += 20;
      this.setBanner('You feel yourself moving with blinding quickness!');
    } else if (potion.id === 'detect_mon') {
      this.player.detectMonstersTurns += 40;
      this.floor.monsters.forEach(m => m.isAsleep = false);
      this.setBanner('You sense the presences of dungeon monsters!');
    } else if (potion.id === 'detect_magic') {
      this.player.detectMagicTurns += 40;
      this.setBanner('You sense magical auras radiating through the stone!');
    } else if (potion.id === 'see_invis') {
      this.player.seeInvisibleTurns += 100;
      this.setBanner('This tastes like cherry syrup. Your vision gains strange depth!');
    } else if (potion.id === 'confusion') {
      this.player.confusionTurns += 15;
      this.setBanner('Wait, what direction is north? Everything spins around you!');
    } else if (potion.id === 'blindness') {
      this.player.blindTurns += 20;
      this.setBanner('A dark veil covers your eyes! You cannot see!');
    } else if (potion.id === 'poison') {
      if (this.player.hasRing('sustain_str')) {
        this.setBanner('You taste foul poison, but your ring sustains you!');
      } else {
        const loss = Math.floor(Math.random() * 2) + 1;
        this.player.strength = Math.max(3, this.player.strength - loss);
        this.setBanner(`You choke on a foul venom! (-${loss} Strength)`);
      }
    } else if (potion.id === 'hallucination') {
      this.player.hallucinationTurns += 25;
      this.setBanner('Oh wow! Everything is totally groovy, man! Strange shapes swirl.');
    } else {
      this.setBanner('This potion tastes remarkably like ordinary water. Nothing happens.');
    }
  }

  applyScrollEffect(scroll) {
    if (scroll.id === 'magic_map') {
      // Reveal entire floor!
      for (let y = 0; y < this.floor.rows; y++) {
        for (let x = 0; x < this.floor.cols; x++) {
          this.floor.explored[y][x] = true;
        }
      }
      this.setBanner('An exact map of this floor appears in your mind!');
    } else if (scroll.id === 'identify') {
      this.openInventory('identify');
    } else if (scroll.id === 'enchant_arm' && this.player.armor) {
      this.player.armor.bonusAC = (this.player.armor.bonusAC || 0) - 1; // Lower AC is better
      this.setBanner('Your armor glows faintly silver (AC improved by 1)!');
    } else if (scroll.id === 'enchant_wep' && this.player.weapon) {
      this.player.weapon.bonusHit = (this.player.weapon.bonusHit || 0) + 1;
      this.player.weapon.bonusDmg = (this.player.weapon.bonusDmg || 0) + 1;
      this.setBanner('Your weapon glows with ethereal blue fire (+1 hit/+1 dmg)!');
    } else if (scroll.id === 'teleport') {
      const r = this.floor.rooms[Math.floor(Math.random() * this.floor.rooms.length)];
      this.player.x = r.cx;
      this.player.y = r.cy;
      this.floor.updateVisibility(r.cx, r.cy);
      this.setBanner('Your surroundings vanish in a flash of light!');
    } else if (scroll.id === 'hold_mon') {
      let count = 0;
      for (const m of this.floor.monsters) {
        const dist = Math.max(Math.abs(m.x - this.player.x), Math.abs(m.y - this.player.y));
        if (dist <= 2) {
          m.isFrozen = Math.floor(Math.random() * 5) + 5;
          count++;
        }
      }
      this.setBanner(count > 0 ? 'The monsters around you freeze into immobile statues!' : 'You feel a binding pulse radiate outwards.');
    } else if (scroll.id === 'sleep') {
      this.player.isFrozen = Math.floor(Math.random() * 3) + 3;
      this.setBanner('You fall into an unnatural sudden sleep...');
    } else if (scroll.id === 'create_mon') {
      const spawned = this.floor.spawnMonsterNear(this.player.x, this.player.y);
      this.setBanner(spawned ? `A foul ${spawned.name.toLowerCase()} appears with a burst of sulfur!` : 'You hear a faint squeak in the dark.');
    } else if (scroll.id === 'remove_curse') {
      this.player.inventory.forEach(i => {
        if (i.bonusAC && i.bonusAC > 0) i.bonusAC = 0;
        if (i.bonusHit && i.bonusHit < 0) i.bonusHit = 0;
        if (i.bonusDmg && i.bonusDmg < 0) i.bonusDmg = 0;
      });
      this.setBanner('You feel as though someone is watching over you.');
    } else if (scroll.id === 'aggravate') {
      this.floor.monsters.forEach(m => m.isAsleep = false);
      this.setBanner('You hear a high-pitched humming noise that reverberates through the stone!');
    } else if (scroll.id === 'confuse_mon') {
      this.player.handsGlowing = true;
      this.setBanner('Your hands begin to glow with a bright purple aura!');
    } else {
      this.setBanner('This scroll appears completely blank.');
    }
  }

  handleDirectionSelection(dir) {
    this.hideAllModals();
    if (this.pendingWand) {
      const wand = this.pendingWand;
      this.pendingWand = null;

      if ((wand.charges || 0) <= 0) {
        this.setBanner('The wand produces a faint dry spark.');
        return;
      }
      wand.charges--;

      if (wand.id === 'light') {
        const room = this.floor.getRoomAt(this.player.x, this.player.y);
        if (room) {
          room.isDark = false;
          this.floor.updateVisibility(this.player.x, this.player.y);
          this.setBanner('A brilliant orb of light illuminates the entire room!');
        } else {
          this.setBanner('A dazzling flash lights the corridor momentarily.');
        }
        this.endTurn();
        return;
      }

      // Project beam in direction
      let curX = this.player.x + dir.dx;
      let curY = this.player.y + dir.dy;
      let hitMonster = null;

      while (this.floor.isPassable(curX, curY)) {
        const monster = this.floor.getMonsterAt(curX, curY);
        if (monster) {
          hitMonster = monster;
          break;
        }
        curX += dir.dx;
        curY += dir.dy;
      }

      if (!hitMonster) {
        this.setBanner('The beam streaks harmlessly into the distance.');
        this.endTurn();
        return;
      }

      const m = hitMonster;
      m.isAsleep = false;

      if (wand.id === 'magic_missile') {
        const dmg = this.floor.rollDice('2d6');
        m.hp -= dmg;
        this.setBanner(`The magic missile strikes the ${m.name.toLowerCase()}! (${dmg} dmg)`);
      } else if (wand.id === 'fire') {
        let dmg = this.floor.rollDice('4d6');
        if (m.symbol === 'I') dmg *= 2; // Ice Monster melts
        m.hp -= dmg;
        this.setBanner(`A roaring jet of fire engulfs the ${m.name.toLowerCase()}! (${dmg} fire dmg)`);
      } else if (wand.id === 'cold') {
        let dmg = this.floor.rollDice('4d6');
        if (m.symbol === 'D') dmg *= 2; // Dragon susceptible
        m.hp -= dmg;
        m.isFrozen = 3;
        this.setBanner(`A freezing ray blasts the ${m.name.toLowerCase()}! (${dmg} cold dmg, frozen!)`);
      } else if (wand.id === 'lightning') {
        const dmg = this.floor.rollDice('5d6');
        m.hp -= dmg;
        this.setBanner(`An arc of lightning shocks the ${m.name.toLowerCase()}! (${dmg} lightning dmg)`);
      } else if (wand.id === 'striking') {
        const dmg = this.floor.rollDice('2d8');
        m.hp -= dmg;
        this.setBanner(`A hammer of kinetic force slams the ${m.name.toLowerCase()}! (${dmg} dmg)`);
      } else if (wand.id === 'polymorph') {
        const keys = Object.keys(MONSTER_CATALOGUE).filter(k => k !== m.symbol);
        const randKey = keys[Math.floor(Math.random() * keys.length)];
        const spec = MONSTER_CATALOGUE[randKey];
        const hp = this.floor.rollDice(spec.hpDice);
        m.name = spec.name;
        m.symbol = spec.symbol;
        m.hp = hp;
        m.maxHp = hp;
        m.ac = spec.ac;
        m.damage = spec.damage;
        m.exp = spec.exp;
        m.traits = [...spec.traits];
        m.color = spec.color;
        this.setBanner(`In a cloud of magical vapor, the monster becomes a ${spec.name}!`);
      } else if (wand.id === 'teleport_away') {
        CombatSystem.teleportMonster(m, this.floor);
        this.setBanner(`The ${m.name.toLowerCase()} vanishes into thin air!`);
      } else if (wand.id === 'slow_mon') {
        m.isSlowed = true;
        this.setBanner(`The ${m.name.toLowerCase()} starts moving with sluggish clumsiness.`);
      } else if (wand.id === 'haste_mon') {
        m.isHasted = true;
        this.setBanner(`The ${m.name.toLowerCase()} twitches and accelerates to frantic speed!`);
      } else if (wand.id === 'cancellation') {
        m.traits = [];
        this.setBanner(`A nullifying field dispels the special powers of the ${m.name.toLowerCase()}!`);
      } else if (wand.id === 'drain_life') {
        const drained = Math.max(1, Math.floor(m.hp / 2));
        m.hp -= drained;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + drained);
        this.setBanner(`You drain ${drained} HP from the ${m.name.toLowerCase()} into your own body!`);
      }

      if (m.hp <= 0) {
        this.setBanner(`You destroyed the ${m.name.toLowerCase()}!`);
        this.player.exp += m.exp;
        CombatSystem.checkLevelUp(this.player, this);
        this.floor.monsters = this.floor.monsters.filter(mon => mon !== m);
      }

      this.endTurn();
    }
  }

  useStairs(direction) {
    this.turnHadMessage = false;
    this.bannerMessage = '';
    if (direction === 'down') {
      if (this.floor.stairsDown && this.player.x === this.floor.stairsDown.x && this.player.y === this.floor.stairsDown.y) {
        this.loadLevel(this.currentLevel + 1);
        this.setBanner(`You descend deeper into Dungeon Level ${this.currentLevel}.`);
      } else {
        this.setBanner('I see no way down.');
      }
    } else if (direction === 'up') {
      if (this.floor.stairsUp && this.player.x === this.floor.stairsUp.x && this.player.y === this.floor.stairsUp.y) {
        if (this.currentLevel === 1 && this.player.hasAmulet) {
          // WON THE GAME!
          this.triggerWin();
          return;
        }
        this.loadLevel(this.currentLevel - 1);
        this.setBanner(`You ascend towards Dungeon Level ${this.currentLevel}.`);
      } else {
        this.setBanner('I see no way up.');
      }
    }
  }

  searchTiles() {
    this.turnHadMessage = false;
    this.bannerMessage = '';
    this.performSearch(false);
    this.endTurn();
  }

  performSearch(silent = false) {
    const found = this.floor.searchAdjacent ? this.floor.searchAdjacent(this.player.x, this.player.y) : [];
    if (found.length > 0) {
      this.setBanner(`You uncovered a hidden ${found.join(' and ')}!`);
      this.render();
    } else if (!silent) {
      this.setBanner('You search carefully for secret doors and traps...');
    }
  }

  // --- End Game & Leaderboards ---
  triggerGameOver(reason) {
    const outcome = `${reason} on level ${this.currentLevel}`;
    const result = LeaderboardStorage.recordScore(this.player.name, this.player.gold, outcome, this.currentLevel);

    document.getElementById('game-over-title').textContent = 'QUEST TERMINATED';
    document.getElementById('game-over-message').textContent = `You quit with ${this.player.gold} gold pieces. ${reason}.`;
    document.getElementById('game-over-stats').innerHTML = `
      <p>Final Score: <strong>${this.player.gold}</strong> Gold Pieces</p>
      <p>Dungeon Level: <strong>${this.currentLevel}</strong></p>
      <p>Experience: <strong>Level ${this.player.level} (${this.player.exp} XP)</strong></p>
      ${result.placed ? `<p style="color: var(--green-term); font-weight: bold;">Congratulations! You achieved Rank #${result.rank} in the Hall of Fame!</p>` : ''}
    `;

    this.showModal(this.screenGameOver);
  }

  triggerWin() {
    const outcome = `won on level 26`;
    const result = LeaderboardStorage.recordScore(this.player.name, this.player.gold + 5000, outcome, 26);

    document.getElementById('game-over-title').textContent = 'VICTORY ACHIEVED!';
    document.getElementById('game-over-message').textContent = `You successfully escaped the Dungeons of Doom with the Amulet of Yendor!`;
    document.getElementById('game-over-stats').innerHTML = `
      <p>Final Score: <strong>${this.player.gold + 5000}</strong> Gold Pieces (including 5000 Amulet bonus)</p>
      <p style="color: var(--amber-gold); font-weight: bold;">Rank #${result.rank} in the Guildmaster's Hall of Fame!</p>
    `;
    this.showModal(this.screenGameOver);
  }

  renderHallOfFame() {
    const tbody = document.getElementById('hof-tbody');
    tbody.innerHTML = '';
    const hof = LeaderboardStorage.getHallOfFame();

    hof.forEach((entry, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>#${idx + 1}</td>
        <td>${entry.gold.toLocaleString()}</td>
        <td>${entry.name}</td>
        <td>${entry.outcome}</td>
        <td>${entry.level}</td>
      `;
      tbody.appendChild(tr);
    });

    this.showModal(this.screenHallOfFame);
  }

  // --- Keyboard & UI Bindings ---
  bindEvents() {
    // Start game button
    document.getElementById('btn-start-adventure').onclick = () => {
      this.startQuest(this.nameInput.value.trim());
    };
    this.nameInput.onkeydown = (e) => {
      if (e.key === 'Enter') this.startQuest(this.nameInput.value.trim());
    };

    // Header buttons
    document.getElementById('btn-show-help').onclick = () => this.showModal(this.screenHelp);
    document.getElementById('btn-close-help').onclick = () => this.hideAllModals();
    document.getElementById('btn-hall-of-fame').onclick = () => this.renderHallOfFame();
    document.getElementById('btn-close-hof').onclick = () => this.hideAllModals();
    document.getElementById('btn-play-again').onclick = () => this.initGame();
    document.getElementById('btn-restart').onclick = () => {
      if (confirm('Start a new quest? Any unrecorded progress will be lost.')) this.initGame();
    };
    document.getElementById('btn-view-scores').onclick = () => this.renderHallOfFame();

    // Hand selection buttons for rings
    document.getElementById('btn-hand-left').onclick = () => this.handleHandChoice('left');
    document.getElementById('btn-hand-right').onclick = () => this.handleHandChoice('right');

    // Floor select dialog
    document.getElementById('btn-level-jump').onclick = () => this.openLevelSelect();
    document.getElementById('btn-close-level-select').onclick = () => this.hideAllModals();

    // CRT Toggle
    document.getElementById('btn-toggle-crt').onclick = (e) => {
      document.body.classList.toggle('crt-theme');
      e.target.textContent = document.body.classList.contains('crt-theme') ? 'CRT FX: ON' : 'CRT FX: OFF';
    };

    // Global Key Listener
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  openHandSelect(action) {
    this.pendingHandAction = action; // 'put' or 'remove'
    const title = document.getElementById('hand-select-title');
    const prompt = document.getElementById('hand-select-prompt');
    if (action === 'put') {
      title.textContent = 'PUT ON RING';
      prompt.textContent = `Which hand for ${this.pendingEquipRing ? this.pendingEquipRing.name : 'ring'}? [L]eft or [R]ight`;
    } else {
      title.textContent = 'REMOVE RING';
      const lName = this.player.leftRing ? this.player.leftRing.name : 'Empty';
      const rName = this.player.rightRing ? this.player.rightRing.name : 'Empty';
      prompt.textContent = `Which hand to remove? [L]eft: ${lName} or [R]ight: ${rName}`;
    }
    this.showModal(this.screenHandSelect);
  }

  handleHandChoice(hand) {
    this.hideAllModals();
    this.turnHadMessage = false;
    this.bannerMessage = '';

    if (this.pendingHandAction === 'put') {
      const ring = this.pendingEquipRing;
      this.pendingEquipRing = null;
      if (!ring) return;

      if (hand === 'left') {
        if (this.player.leftRing) {
          this.setBanner(`You already have a ring on your left hand!`);
          return;
        }
        this.player.leftRing = ring;
        this.setBanner(`You put on the ${ring.name} on your left hand.`);
      } else {
        if (this.player.rightRing) {
          this.setBanner(`You already have a ring on your right hand!`);
          return;
        }
        this.player.rightRing = ring;
        this.setBanner(`You put on the ${ring.name} on your right hand.`);
      }
      this.endTurn();
    } else if (this.pendingHandAction === 'remove') {
      if (hand === 'left') {
        if (this.player.leftRing) {
          const r = this.player.leftRing;
          this.player.leftRing = null;
          this.setBanner(`You removed the ${r.name} from your left hand.`);
          this.endTurn();
        } else {
          this.setBanner('There is no ring on your left hand.');
        }
      } else {
        if (this.player.rightRing) {
          const r = this.player.rightRing;
          this.player.rightRing = null;
          this.setBanner(`You removed the ${r.name} from your right hand.`);
          this.endTurn();
        } else {
          this.setBanner('There is no ring on your right hand.');
        }
      }
    }
    this.pendingHandAction = null;
  }

  openLevelSelect() {
    const grid = document.getElementById('level-select-buttons');
    grid.innerHTML = '';
    for (let lvl = 1; lvl <= 26; lvl++) {
      const b = document.createElement('button');
      b.className = 'level-select-btn';
      b.textContent = `L${lvl}`;
      b.onclick = () => {
        this.hideAllModals();
        this.turnHadMessage = false;
        this.messageQueue = [];
        this.awaitingMore = false;
        this.loadLevel(lvl);
        this.setBanner(`Teleported to Dungeon Level ${lvl}.`);
      };
      grid.appendChild(b);
    }
    this.showModal(this.screenLevelSelect);
  }

  handleKeyDown(e) {
    // If name entry modal is active, let normal input handle typing
    if (this.activeModal === this.screenNameEntry) {
      if (e.key === 'Enter') this.startQuest(this.nameInput.value.trim());
      return;
    }

    // Modal navigation
    if (this.activeModal) {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        this.hideAllModals();
        return;
      }
      if (this.activeModal === this.screenInventory) {
        if (e.key.length === 1 && e.key.match(/[a-z]/i)) {
          e.preventDefault();
          this.handleItemSelection(e.key);
          return;
        }
      }
      if (this.activeModal === this.screenHandSelect) {
        if (e.key === 'l' || e.key === 'L') {
          e.preventDefault();
          this.handleHandChoice('left');
          return;
        }
        if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          this.handleHandChoice('right');
          return;
        }
      }
      if (this.activeModal === this.screenDirection) {
        const dir = KEY_MAP[e.key];
        if (dir) {
          e.preventDefault();
          this.handleDirectionSelection(dir);
          return;
        }
      }
      if (this.activeModal === this.screenGameOver && e.key === 'Enter') {
        e.preventDefault();
        this.renderHallOfFame();
        return;
      }
      if (this.activeModal === this.screenHallOfFame && e.key === 'Enter') {
        e.preventDefault();
        this.initGame();
        return;
      }
      return;
    }

    // Level selector shortcut (Ctrl+L)
    if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      this.openLevelSelect();
      return;
    }

    // Dismiss message if awaiting --More--
    if (this.awaitingMore) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.advanceMessage();
      }
      return;
    }

    // Directional Movement
    const dir = KEY_MAP[e.key];
    if (dir) {
      e.preventDefault();
      this.handlePlayerMove(dir.dx, dir.dy);
      return;
    }

    // Action Key Commands
    switch (e.key) {
      case 'i':
        e.preventDefault();
        this.openInventory('view');
        break;
      case 'e':
        e.preventDefault();
        this.openInventory('eat');
        break;
      case 'q':
        e.preventDefault();
        this.openInventory('drink');
        break;
      case 'r':
        e.preventDefault();
        this.openInventory('read');
        break;
      case 'z':
        e.preventDefault();
        this.openInventory('zap');
        break;
      case 'd':
        e.preventDefault();
        this.openInventory('drop');
        break;
      case 'w':
        e.preventDefault();
        this.openInventory('wield');
        break;
      case 'W':
        e.preventDefault();
        this.openInventory('wear');
        break;
      case 'T':
        e.preventDefault();
        this.turnHadMessage = false;
        this.bannerMessage = '';
        if (!this.player.armor) {
          this.setBanner('You are not wearing any armor.');
          return;
        }
        const arm = this.player.armor;
        arm.isWorn = false;
        this.player.armor = null;
        this.setBanner(`You took off your ${arm.name}.`);
        this.endTurn();
        break;
      case 'P':
        e.preventDefault();
        this.turnHadMessage = false;
        this.bannerMessage = '';
        if (this.player.getRingCount() >= 2) {
          this.setBanner('You are already wearing two rings! (Remove one first with R)');
          return;
        }
        const hasRingsInPack = this.player.inventory.some(i => i.type === 'ring' && i !== this.player.leftRing && i !== this.player.rightRing);
        if (!hasRingsInPack) {
          this.setBanner('You are not carrying any rings.');
          return;
        }
        this.openInventory('put_on_ring');
        break;
      case 'R':
        e.preventDefault();
        this.turnHadMessage = false;
        this.bannerMessage = '';
        if (this.player.getRingCount() === 0) {
          this.setBanner('You are not wearing any rings.');
          return;
        }
        if (this.player.leftRing && !this.player.rightRing) {
          const r = this.player.leftRing;
          this.player.leftRing = null;
          this.setBanner(`You removed the ${r.name} from your left hand.`);
          this.endTurn();
        } else if (!this.player.leftRing && this.player.rightRing) {
          const r = this.player.rightRing;
          this.player.rightRing = null;
          this.setBanner(`You removed the ${r.name} from your right hand.`);
          this.endTurn();
        } else {
          this.openHandSelect('remove');
        }
        break;
      case 's':
        e.preventDefault();
        this.searchTiles();
        break;
      case '>':
        e.preventDefault();
        this.useStairs('down');
        break;
      case '<':
        e.preventDefault();
        this.useStairs('up');
        break;
      case 'Q': // Shift+Q
        e.preventDefault();
        if (confirm('Do you wish to end your quest now (yes/no)?')) {
          this.triggerGameOver('quit');
        }
        break;
      case '?':
        e.preventDefault();
        this.showModal(this.screenHelp);
        break;
      default:
        break;
    }
  }
}

// Boot game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.game = new RogueGame();
});
