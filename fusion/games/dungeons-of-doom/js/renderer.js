/**
 * Canvas Text Grid Renderer
 * Renders an authentic 80x24 character grid matching classic DOS terminal aesthetics.
 */

class TextGridRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cols = COLS; // 80
    this.rows = ROWS; // 24

    // Character cell metrics
    this.cellW = this.canvas.width / this.cols;  // 960 / 80 = 12px
    this.cellH = this.canvas.height / this.rows; // 576 / 24 = 24px

    this.charGrid = [];
    this.colorGrid = [];
    this.initGrids();
  }

  initGrids() {
    for (let y = 0; y < this.rows; y++) {
      this.charGrid[y] = new Array(this.cols).fill(' ');
      this.colorGrid[y] = new Array(this.cols).fill(COLORS.TEXT_DEFAULT);
    }
  }

  clear() {
    this.ctx.fillStyle = COLORS.BG;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    for (let y = 0; y < this.rows; y++) {
      this.charGrid[y].fill(' ');
      this.colorGrid[y].fill(COLORS.TEXT_DEFAULT);
    }
  }

  setChar(x, y, char, color = COLORS.TEXT_DEFAULT) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return;
    this.charGrid[y][x] = char || ' ';
    this.colorGrid[y][x] = color;
  }

  setString(x, y, str, color = COLORS.TEXT_DEFAULT) {
    if (y < 0 || y >= this.rows || !str) return;
    for (let i = 0; i < str.length; i++) {
      if (x + i >= this.cols) break;
      this.charGrid[y][x + i] = str[i];
      this.colorGrid[y][x + i] = color;
    }
  }

  render(game) {
    this.clear();

    const floor = game.floor;
    const player = game.player;

    // --- ROW 0: Message Banner ---
    let bannerText = game.bannerMessage || '';
    if (game.awaitingMore) {
      bannerText += ' More';
    }
    this.setString(0, 0, bannerText, game.awaitingMore ? COLORS.GOLD : COLORS.BANNER);

    // --- ROWS 1 to 22: Dungeon Map ---
    if (floor) {
      const isBlind = player && player.blindTurns > 0;
      const canSeeInvis = player && player.canSeeInvisible();
      const hasMagicDetect = player && player.detectMagicTurns > 0;
      const hasMonDetect = player && player.detectMonstersTurns > 0;
      const isHallucinating = player && player.hallucinationTurns > 0;

      for (let y = 0; y < floor.rows; y++) {
        const screenY = y + 1; // Map starts on row 1
        for (let x = 0; x < floor.cols; x++) {
          const isVisible = floor.visible[y][x];
          const isExplored = floor.explored[y][x];

          // Blindness restricts sight to immediate 1-tile radius
          if (isBlind) {
            const dist = Math.max(Math.abs(x - player.x), Math.abs(y - player.y));
            if (dist > 1) continue;
          } else if (!isExplored && !hasMonDetect && !hasMagicDetect) {
            continue; // Unexplored tiles remain pitch black
          }

          const tile = floor.tiles[y][x];
          let glyph = tile;
          let color = isVisible ? COLORS.TEXT_DEFAULT : COLORS.FOG_DIMMED;

          if (tile === GLYPHS.WALL_H || tile === GLYPHS.WALL_V) {
            color = isVisible ? COLORS.WALL : COLORS.FOG_DIMMED;
          } else if (tile === GLYPHS.FLOOR) {
            color = isVisible ? COLORS.FLOOR : COLORS.FOG_DIMMED;
          } else if (tile === GLYPHS.CORRIDOR) {
            color = isVisible ? COLORS.CORRIDOR : COLORS.FOG_DIMMED;
          } else if (tile === GLYPHS.DOOR || tile === GLYPHS.DOOR_OPEN) {
            color = isVisible ? COLORS.DOOR : COLORS.FOG_DIMMED;
          } else if (tile === GLYPHS.STAIRS_DOWN || tile === GLYPHS.STAIRS_UP) {
            color = isVisible ? COLORS.AMULET : COLORS.FOG_DIMMED;
          }

          // Render Revealed Traps
          const trap = floor.getTrapAt ? floor.getTrapAt(x, y) : null;
          if (trap && trap.isRevealed && (isVisible || isExplored)) {
            glyph = GLYPHS.TRAP;
            color = isVisible ? COLORS.TRAP : COLORS.FOG_DIMMED;
          }

          // Render Item on tile (if visible or detected via Magic Detection)
          if (isVisible || (hasMagicDetect && isExplored)) {
            const item = floor.getItemAt(x, y);
            if (item) {
              glyph = item.glyph;
              color = item.type === 'gold' ? COLORS.GOLD :
                      item.type === 'potion' ? COLORS.POTION :
                      item.type === 'scroll' ? COLORS.SCROLL :
                      item.type === 'food' ? COLORS.FOOD :
                      item.type === 'wand' ? COLORS.WAND :
                      item.type === 'ring' ? COLORS.RING :
                      item.type === 'armor' ? COLORS.ARMOR :
                      item.type === 'weapon' ? COLORS.WEAPON :
                      item.type === 'artifact' ? COLORS.AMULET : COLORS.TEXT_DEFAULT;
            }
          }

          // Render Monster on tile (if visible or detected via Monster Detection)
          if (isVisible || hasMonDetect) {
            const monster = floor.getMonsterAt(x, y);
            if (monster) {
              // Invisibility check (Phantoms invisible beyond 1 tile unless detected or wearing Ring of See Invisible)
              const isMonInvis = monster.traits && monster.traits.includes('INVISIBLE') && !canSeeInvis;
              const dist = player ? Math.max(Math.abs(monster.x - player.x), Math.abs(monster.y - player.y)) : 99;

              if (isMonInvis && dist > 1 && !hasMonDetect) {
                // Keep background tile/item glyph
              } else {
                if (isHallucinating) {
                  const rndLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                  glyph = rndLetters[Math.floor(Math.random() * rndLetters.length)];
                } else {
                  glyph = monster.symbol;
                }
                color = monster.color || COLORS.MONSTER_DEFAULT;
              }
            }
          }

          this.setChar(x, screenY, glyph, color);
        }
      }

      // Render Player Avatar (always visible on top of tile)
      if (player && player.hp > 0) {
        this.setChar(player.x, player.y + 1, GLYPHS.PLAYER, COLORS.PLAYER);
      }
    }

    // --- ROW 23: Bottom Status Bar (HUD) ---
    if (player) {
      // Verified format: Level:1  Hits:12(12)  Str:16(16)  Gold:0  Armor:5  Exp:1/0  Status  5:19
      const lvlStr = `Level:${floor ? floor.level : 1}`;
      const hitsStr = `Hits:${player.hp}(${player.maxHp})`;
      const effStr = player.getEffectiveStrength ? player.getEffectiveStrength() : player.strength;
      const maxStr = player.getEffectiveMaxStrength ? player.getEffectiveMaxStrength() : player.maxStrength;
      const strStr = `Str:${effStr}(${maxStr})`;
      const goldStr = `Gold:${player.gold}`;
      const armStr = `Armor:${player.getArmorClass()}`;
      const expStr = `Exp:${player.level}/${player.exp}`;
      const timeStr = game.formatTurnTime();

      // Dynamic status condition
      let statusTag = '';
      if (player.hungerTurns <= 150) statusTag = 'Faint';
      else if (player.hungerTurns <= 300) statusTag = 'Weak';
      else if (player.hungerTurns <= 450) statusTag = 'Hungry';
      else if (player.blindTurns > 0) statusTag = 'Blind';
      else if (player.confusionTurns > 0) statusTag = 'Confused';
      else if (player.hasteTurns > 0) statusTag = 'Haste';
      else if (player.hallucinationTurns > 0) statusTag = 'Halluc';

      const hudLine = `${lvlStr.padEnd(8)} ${hitsStr.padEnd(12)} ${strStr.padEnd(12)} ${goldStr.padEnd(8)} ${armStr.padEnd(8)} ${expStr.padEnd(9)} ${statusTag.padEnd(8)} ${timeStr.padStart(6)}`;
      this.setString(0, 23, hudLine, COLORS.HUD);
    }

    // Flush Grid Buffer to HTML5 Canvas
    this.flush();
  }

  flush() {
    this.ctx.font = `bold ${Math.floor(this.cellH * 0.82)}px 'Consolas', 'Courier New', monospace`;
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'center';

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const char = this.charGrid[y][x];
        if (char === ' ') continue;

        const color = this.colorGrid[y][x];
        this.ctx.fillStyle = color;
        const posX = x * this.cellW + this.cellW / 2;
        const posY = y * this.cellH + this.cellH / 2;
        this.ctx.fillText(char, posX, posY);
      }
    }
  }
}
