/**
 * Combat, Turn Processing & Monster AI System
 * Implements combat resolution, turn advancing, hunger, and special monster abilities.
 */

class CombatSystem {
  static resolvePlayerAttack(player, monster, game) {
    // Attack Roll incorporating effective strength and Ring of Dexterity
    const d20 = Math.floor(Math.random() * 20) + 1;
    const effStr = player.getEffectiveStrength();
    const hitBonus = (player.weapon ? player.weapon.bonusHit : 0) + Math.floor((effStr - 16) / 2) + player.getRingBonusHit();
    const toHit = d20 + hitBonus;

    // AC comparison (lower AC is harder to hit)
    const targetAC = monster.ac;
    const isHit = toHit >= (10 - targetAC);

    if (isHit) {
      // Calculate damage incorporating effective strength and Ring of Increase Damage
      const wepDmg = player.weapon ? player.weapon.damage : '1d4';
      const baseDmg = game.floor.rollDice(wepDmg);
      const strBonus = Math.max(0, Math.floor((effStr - 16) / 2));
      const ringDmg = player.getRingBonusDmg();
      const totalDmg = Math.max(1, baseDmg + strBonus + (player.weapon ? player.weapon.bonusDmg : 0) + ringDmg);

      monster.hp -= totalDmg;
      game.setBanner(`You hit the ${monster.name.toLowerCase()}! (${totalDmg} damage)`);

      // Wake monster up
      monster.isAsleep = false;

      // Confuse Monster Scroll effect
      if (player.handsGlowing) {
        player.handsGlowing = false;
        monster.isConfused = 6;
        game.setBanner(`Your glowing hands confuse the ${monster.name.toLowerCase()}!`);
      }

      if (monster.hp <= 0) {
        // Monster Defeated
        game.setBanner(`You defeated the ${monster.name.toLowerCase()}!`);
        player.exp += monster.exp;
        this.checkLevelUp(player, game);
        // Remove monster from floor
        game.floor.monsters = game.floor.monsters.filter(m => m !== monster);
      }
    } else {
      // Verified exact Rogue string: "You don't hit the <monster>"
      game.setBanner(`You don't hit the ${monster.name.toLowerCase()}`);
    }
  }

  static checkLevelUp(player, game) {
    // Required EXP thresholds: 10, 20, 40, 80, 160...
    const needed = Math.pow(2, player.level) * 10;
    if (player.exp >= needed) {
      player.level++;
      const hpGain = Math.floor(Math.random() * 10) + 2;
      player.maxHp += hpGain;
      player.hp = Math.min(player.maxHp, player.hp + hpGain);
      game.setBanner(`Welcome to level ${player.level}! (+${hpGain} Max HP)`);
    }
  }

  static processMonsterTurns(game) {
    const player = game.player;
    const floor = game.floor;

    for (const monster of floor.monsters) {
      if (monster.hp <= 0) continue;

      // Status conditions: Frozen
      if (monster.isFrozen > 0) {
        monster.isFrozen--;
        continue;
      }

      // Status conditions: Slowed (acts every other turn)
      if (monster.isSlowed && game.turnCounter % 2 === 1) {
        continue;
      }

      const actions = monster.isHasted ? 2 : 1;
      for (let act = 0; act < actions; act++) {
        if (monster.hp <= 0) break;

        const dist = Math.max(Math.abs(monster.x - player.x), Math.abs(monster.y - player.y));

        // Wake-up check (stealth ring drops wake chance to 5%)
        if (monster.isAsleep) {
          const wakeChance = player.hasRing('stealth') ? 0.05 : 0.40;
          if (dist <= 3 || (monster.room && monster.room === floor.getRoomAt(player.x, player.y))) {
            if (Math.random() < wakeChance) monster.isAsleep = false;
          }
          continue;
        }

        // Confused monster behavior
        if (monster.isConfused > 0) {
          monster.isConfused--;
          if (Math.random() < 0.50) {
            const wanderDirs = [{dx:0,dy:1},{dx:0,dy:-1},{dx:1,dy:0},{dx:-1,dy:0}];
            const wd = wanderDirs[Math.floor(Math.random() * wanderDirs.length)];
            const wx = monster.x + wd.dx;
            const wy = monster.y + wd.dy;
            if (floor.isPassable(wx, wy) && !floor.getMonsterAt(wx, wy) && !(wx === player.x && wy === player.y)) {
              monster.x = wx;
              monster.y = wy;
            }
            continue;
          }
        }

        // If adjacent to player -> Attack!
        if (dist === 1) {
          this.monsterAttackPlayer(monster, player, game);
        } else {
          // Pathfind towards player
          this.moveMonsterTowards(monster, player.x, player.y, floor);
        }
      }

      // Troll / Vampire Regeneration
      if (monster.traits.includes('REGENERATE') && monster.hp < monster.maxHp) {
        monster.hp = Math.min(monster.maxHp, monster.hp + 1);
      }
    }
  }

  static monsterAttackPlayer(monster, player, game) {
    if (monster.isConfused > 0 && Math.random() < 0.50) {
      game.setBanner(`The confused ${monster.name.toLowerCase()} flails about and misses!`);
      return;
    }

    const d20 = Math.floor(Math.random() * 20) + 1;
    const effectiveAC = player.getArmorClass();
    const isHit = d20 >= (10 - effectiveAC);

    if (isHit) {
      // Parse multi-attacks e.g. "1d6/1d6" or "4d3/3d5/4d3"
      const attacks = monster.damage.split('/');
      let totalDmg = 0;
      for (const atk of attacks) {
        totalDmg += game.floor.rollDice(atk);
      }
      totalDmg = Math.max(1, totalDmg);
      player.hp -= totalDmg;

      let msg = `The ${monster.name.toLowerCase()} hits you! (${totalDmg} dmg)`;

      // Apply Verified Monster Special Traits
      if (monster.traits.includes('RUST_ARMOR') && player.armor) {
        player.armor.bonusAC = Math.max(-4, (player.armor.bonusAC || 0) - 1);
        msg += ` Your armor weakens, oh my!`;
      } else if (monster.traits.includes('FREEZE')) {
        player.isFrozen = Math.floor(Math.random() * 3) + 2;
        msg += ` You are frozen in place!`;
      } else if (monster.traits.includes('POISON_STR')) {
        if (!player.hasRing('sustain_str') && player.strength > 3) {
          player.strength--;
          msg += ` You feel a sting in your arm and grow weaker!`;
        }
      } else if (monster.traits.includes('DRAIN_MAX_HP')) {
        player.maxHp = Math.max(1, player.maxHp - 1);
        msg += ` Your life force is drained!`;
      } else if (monster.traits.includes('DRAIN_EXP') && player.level > 1) {
        player.level--;
        msg += ` You feel your knowledge slipping away!`;
      } else if (monster.traits.includes('STEAL_GOLD') && player.gold > 0) {
        const stolen = Math.min(player.gold, Math.floor(Math.random() * 50) + 10);
        player.gold -= stolen;
        msg += ` The leprechaun stole ${stolen} gold pieces!`;
        this.teleportMonster(monster, game.floor);
      }

      game.setBanner(msg);

      // Check player death
      if (player.hp <= 0) {
        player.hp = 0;
        game.triggerGameOver(`killed by a ${monster.name.toLowerCase()}`);
      }
    } else {
      game.setBanner(`The ${monster.name.toLowerCase()} misses you.`);
    }
  }

  static moveMonsterTowards(monster, tx, ty, floor) {
    const dx = Math.sign(tx - monster.x);
    const dy = Math.sign(ty - monster.y);

    const candidates = [];
    if (dx !== 0 && dy !== 0) candidates.push({ x: monster.x + dx, y: monster.y + dy });
    if (dx !== 0) candidates.push({ x: monster.x + dx, y: monster.y });
    if (dy !== 0) candidates.push({ x: monster.x, y: monster.y + dy });

    for (const pos of candidates) {
      if (floor.isPassable(pos.x, pos.y) && !floor.getMonsterAt(pos.x, pos.y)) {
        monster.x = pos.x;
        monster.y = pos.y;
        break;
      }
    }
  }

  static teleportMonster(monster, floor) {
    const r = floor.rooms[Math.floor(Math.random() * floor.rooms.length)];
    monster.x = r.cx;
    monster.y = r.cy;
  }
}
