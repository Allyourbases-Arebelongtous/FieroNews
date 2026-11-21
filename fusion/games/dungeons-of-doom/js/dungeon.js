/**
 * Dungeon Generator & Spatial Fog-of-War System
 * Generates classic 3x3 zone layouts with corridors, doors, items, monsters, and stairs.
 */

class DungeonFloor {
  constructor(level, player) {
    this.level = level;
    this.cols = COLS;
    this.rows = ROWS - 2; // Rows 1 to 22 reserved for map, 0 for banner, 23 for status
    this.tiles = [];
    this.rooms = [];
    this.items = [];
    this.monsters = [];
    this.traps = [];
    this.stairsDown = null;
    this.stairsUp = null;
    this.explored = []; // Permanent player memory map
    this.visible = [];  // Current turn line of sight

    this.initGrids();
    this.generateFloor(player);
  }

  initGrids() {
    for (let y = 0; y < this.rows; y++) {
      this.tiles[y] = new Array(this.cols).fill(GLYPHS.EMPTY);
      this.explored[y] = new Array(this.cols).fill(false);
      this.visible[y] = new Array(this.cols).fill(false);
    }
  }

  generateFloor(player) {
    // 3x3 Room Zones
    const zoneW = Math.floor(this.cols / 3); // 26
    const zoneH = Math.floor(this.rows / 3); // 7
    const zoneNodes = [];

    for (let zy = 0; zy < 3; zy++) {
      zoneNodes[zy] = [];
      for (let zx = 0; zx < 3; zx++) {
        // Spawn a room in ~85% of zones; guarantee start (0,0) and end (2,2) have rooms
        const hasRoom = Math.random() < 0.85 || (zx === 0 && zy === 0) || (zx === 2 && zy === 2);
        if (hasRoom) {
          const roomW = Math.floor(Math.random() * Math.min(12, zoneW - 8)) + 6;
          const roomH = Math.floor(Math.random() * (zoneH - 4)) + 4; // 4 or 5
          const maxOffsetX = Math.max(1, zoneW - roomW - 2);
          const maxOffsetY = Math.max(1, zoneH - roomH - 1);
          const roomX = zx * zoneW + Math.floor(Math.random() * maxOffsetX) + 1;
          const roomY = zy * zoneH + Math.floor(Math.random() * maxOffsetY) + 1;

          const room = {
            id: zy * 3 + zx,
            zx, zy,
            isGone: false,
            x: roomX, y: roomY,
            w: roomW, h: roomH,
            cx: Math.floor(roomX + roomW / 2),
            cy: Math.floor(roomY + roomH / 2),
            doors: [],
            isDark: this.level > 1 && Math.random() < 0.25
          };

          this.carveRoom(room);
          this.rooms.push(room);
          zoneNodes[zy][zx] = room;
        } else {
          // "Gone room" corridor junction (classic Rogue technique): ensures zero dead ends or islands
          const jx = zx * zoneW + Math.floor(zoneW / 2);
          const jy = zy * zoneH + Math.floor(zoneH / 2);
          this.tiles[jy][jx] = GLYPHS.CORRIDOR;
          zoneNodes[zy][zx] = {
            id: zy * 3 + zx,
            zx, zy,
            isGone: true,
            x: jx, y: jy,
            w: 1, h: 1,
            cx: jx, cy: jy,
            doors: []
          };
        }
      }
    }

    // Connect all 3x3 zones with a guaranteed spanning tree + extra loops for rich exploration
    this.connectZones(zoneNodes);

    // Place Stairs
    this.placeStairs();

    // Place Player in the first room
    const startRoom = this.rooms[0];
    const spawnX = startRoom.cx;
    const spawnY = startRoom.cy;
    if (player) {
      player.x = spawnX;
      player.y = spawnY;
    }

    // Place Gold & Items
    this.populateTreasures();

    // Place Monsters
    this.populateMonsters();

    // Place Hidden Traps (Level 2+)
    this.placeTraps();

    // Update Initial Visibility
    this.updateVisibility(spawnX, spawnY);
  }

  carveRoom(room) {
    // Top & Bottom horizontal walls
    for (let x = room.x; x < room.x + room.w; x++) {
      this.tiles[room.y][x] = GLYPHS.WALL_H;
      this.tiles[room.y + room.h - 1][x] = GLYPHS.WALL_H;
    }
    // Left & Right vertical walls
    for (let y = room.y; y < room.y + room.h; y++) {
      this.tiles[y][room.x] = GLYPHS.WALL_V;
      this.tiles[y][room.x + room.w - 1] = GLYPHS.WALL_V;
    }
    // Floor interior
    for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
      for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
        this.tiles[y][x] = GLYPHS.FLOOR;
      }
    }
  }

  connectZones(zoneNodes) {
    // Build all candidate edges between orthogonally adjacent zones in the 3x3 grid
    const edges = [];
    for (let zy = 0; zy < 3; zy++) {
      for (let zx = 0; zx < 3; zx++) {
        if (zx < 2) {
          edges.push({ a: zoneNodes[zy][zx], b: zoneNodes[zy][zx + 1], orientation: 'H' });
        }
        if (zy < 2) {
          edges.push({ a: zoneNodes[zy][zx], b: zoneNodes[zy + 1][zx], orientation: 'V' });
        }
      }
    }

    // Shuffle edges for varied dungeon topologies
    for (let i = edges.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [edges[i], edges[j]] = [edges[j], edges[i]];
    }

    // Kruskal's Union-Find for a guaranteed spanning tree (100% connectivity across all 9 zones)
    const parent = Array.from({ length: 9 }, (_, i) => i);
    const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    const union = (x, y) => {
      const rx = find(x), ry = find(y);
      if (rx === ry) return false;
      parent[rx] = ry;
      return true;
    };

    const usedEdges = [];
    const unusedEdges = [];
    const degree = new Array(9).fill(0);

    for (const edge of edges) {
      if (union(edge.a.id, edge.b.id)) {
        usedEdges.push(edge);
        degree[edge.a.id]++;
        degree[edge.b.id]++;
      } else {
        unusedEdges.push(edge);
      }
    }

    // Add extra loop corridors so exploration has multiple routes and zero "gone" dead-end stubs
    for (const edge of unusedEdges) {
      const needsConnection =
        (edge.a.isGone && degree[edge.a.id] < 2) ||
        (edge.b.isGone && degree[edge.b.id] < 2) ||
        Math.random() < 0.55;
      if (needsConnection) {
        usedEdges.push(edge);
        degree[edge.a.id]++;
        degree[edge.b.id]++;
      }
    }

    // Dig every selected corridor
    for (const edge of usedEdges) {
      this.digCorridor(edge.a, edge.b, edge.orientation);
    }
  }

  carveCorridorTile(x, y) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return;
    const t = this.tiles[y][x];
    if (t === GLYPHS.EMPTY) {
      this.tiles[y][x] = GLYPHS.CORRIDOR;
    } else if (t === GLYPHS.WALL_H || t === GLYPHS.WALL_V) {
      this.tiles[y][x] = GLYPHS.DOOR;
    }
  }

  carveLineH(x1, x2, y) {
    const step = x1 <= x2 ? 1 : -1;
    for (let x = x1; ; x += step) {
      this.carveCorridorTile(x, y);
      if (x === x2) break;
    }
  }

  carveLineV(y1, y2, x) {
    const step = y1 <= y2 ? 1 : -1;
    for (let y = y1; ; y += step) {
      this.carveCorridorTile(x, y);
      if (y === y2) break;
    }
  }

  digCorridor(r1, r2, orientation) {
    if (orientation === 'H') {
      const p1 = r1.isGone ? { x: r1.cx, y: r1.cy } : { x: r1.x + r1.w - 1, y: r1.cy };
      const p2 = r2.isGone ? { x: r2.cx, y: r2.cy } : { x: r2.x, y: r2.cy };

      if (!r1.isGone) {
        this.tiles[p1.y][p1.x] = GLYPHS.DOOR;
        r1.doors.push(p1);
      }
      if (!r2.isGone) {
        this.tiles[p2.y][p2.x] = GLYPHS.DOOR;
        r2.doors.push(p2);
      }

      const startX = r1.isGone ? p1.x : p1.x + 1;
      const endX = r2.isGone ? p2.x : p2.x - 1;
      const midX = Math.floor((startX + endX) / 2);

      this.carveLineH(startX, midX, p1.y);
      this.carveLineV(p1.y, p2.y, midX);
      this.carveLineH(midX, endX, p2.y);
    } else {
      const p1 = r1.isGone ? { x: r1.cx, y: r1.cy } : { x: r1.cx, y: r1.y + r1.h - 1 };
      const p2 = r2.isGone ? { x: r2.cx, y: r2.cy } : { x: r2.cx, y: r2.y };

      if (!r1.isGone) {
        this.tiles[p1.y][p1.x] = GLYPHS.DOOR;
        r1.doors.push(p1);
      }
      if (!r2.isGone) {
        this.tiles[p2.y][p2.x] = GLYPHS.DOOR;
        r2.doors.push(p2);
      }

      const startY = r1.isGone ? p1.y : p1.y + 1;
      const endY = r2.isGone ? p2.y : p2.y - 1;
      const midY = Math.floor((startY + endY) / 2);

      this.carveLineV(startY, midY, p1.x);
      this.carveLineH(p1.x, p2.x, midY);
      this.carveLineV(midY, endY, p2.x);
    }
  }

  placeStairs() {
    // Stairs down in last room (unless level 26 where Amulet of Yendor rests)
    const endRoom = this.rooms[this.rooms.length - 1];
    if (this.level < 26) {
      this.stairsDown = { x: endRoom.cx, y: endRoom.cy };
      this.tiles[endRoom.cy][endRoom.cx] = GLYPHS.STAIRS_DOWN;
    } else {
      // Level 26: The Amulet of Yendor!
      this.items.push({
        id: 'amulet_of_yendor',
        name: 'The Amulet of Yendor',
        glyph: GLYPHS.AMULET,
        type: 'artifact',
        x: endRoom.cx,
        y: endRoom.cy
      });
    }

    // Stairs up in first room
    if (this.level > 1) {
      const startRoom = this.rooms[0];
      const upX = startRoom.x + 2;
      const upY = startRoom.y + 2;
      this.stairsUp = { x: upX, y: upY };
      this.tiles[upY][upX] = GLYPHS.STAIRS_UP;
    }
  }

  populateTreasures() {
    for (const room of this.rooms) {
      // Gold Generation: verified formula rnd(50 + 10 * level) + 2
      if (Math.random() < 0.75) {
        const goldVal = Math.floor(Math.random() * (50 + 10 * this.level)) + 2;
        const gx = Math.floor(Math.random() * (room.w - 2)) + room.x + 1;
        const gy = Math.floor(Math.random() * (room.h - 2)) + room.y + 1;
        if (this.tiles[gy][gx] === GLYPHS.FLOOR) {
          this.items.push({
            type: 'gold',
            name: `${goldVal} gold pieces`,
            amount: goldVal,
            glyph: GLYPHS.GOLD,
            x: gx, y: gy
          });
        }
      }

      // Random Magic Item or Equipment
      if (Math.random() < 0.45) {
        const ix = Math.floor(Math.random() * (room.w - 2)) + room.x + 1;
        const iy = Math.floor(Math.random() * (room.h - 2)) + room.y + 1;
        if (this.tiles[iy][ix] === GLYPHS.FLOOR) {
          const item = this.createRandomItem(ix, iy);
          if (item) this.items.push(item);
        }
      }
    }
  }

  createRandomItem(x, y) {
    const roll = Math.random();
    if (roll < 0.25) {
      // Potion
      const p = POTION_TYPES[Math.floor(Math.random() * POTION_TYPES.length)];
      return { type: 'potion', id: p.id, name: `Potion of ${p.name}`, desc: p.desc, glyph: GLYPHS.POTION, x, y };
    } else if (roll < 0.45) {
      // Scroll
      const s = SCROLL_TYPES[Math.floor(Math.random() * SCROLL_TYPES.length)];
      return { type: 'scroll', id: s.id, name: `Scroll of ${s.name}`, desc: s.desc, glyph: GLYPHS.SCROLL, x, y };
    } else if (roll < 0.60) {
      // Food
      return { type: 'food', id: 'ration', name: 'Some food', glyph: GLYPHS.FOOD, x, y };
    } else if (roll < 0.75) {
      // Wand
      const w = WAND_TYPES[Math.floor(Math.random() * WAND_TYPES.length)];
      return { type: 'wand', id: w.id, name: `Wand of ${w.name}`, charges: w.charges, desc: w.desc, glyph: GLYPHS.WAND, x, y };
    } else if (roll < 0.88) {
      // Weapon
      const wep = WEAPON_TYPES[Math.floor(Math.random() * WEAPON_TYPES.length)];
      const bonusHit = Math.floor(Math.random() * 2);
      const bonusDmg = Math.floor(Math.random() * 2);
      return { type: 'weapon', id: wep.id, name: `+${bonusHit},+${bonusDmg} ${wep.name}`, damage: wep.damage, bonusHit, bonusDmg, isRanged: wep.isRanged, glyph: wep.glyph, x, y };
    } else {
      // Armor or Ring
      if (Math.random() < 0.6) {
        const arm = ARMOR_TYPES[Math.floor(Math.random() * ARMOR_TYPES.length)];
        const bonusAC = Math.floor(Math.random() * 2);
        return { type: 'armor', id: arm.id, name: `+${bonusAC} ${arm.name}`, baseAC: arm.baseAC, bonusAC, glyph: arm.glyph, x, y };
      } else {
        const ring = RING_TYPES[Math.floor(Math.random() * RING_TYPES.length)];
        return {
          type: 'ring',
          id: ring.id,
          name: `Ring of ${ring.name}`,
          desc: ring.desc,
          bonusAC: ring.bonusAC || 0,
          bonusStr: ring.bonusStr || 0,
          bonusDmg: ring.bonusDmg || 0,
          bonusHit: ring.bonusHit || 0,
          glyph: GLYPHS.RING,
          x, y
        };
      }
    }
  }

  populateMonsters() {
    // Select monsters appropriate for this floor
    const available = Object.values(MONSTER_CATALOGUE).filter(m => m.minLevel <= this.level);
    for (const room of this.rooms) {
      if (Math.random() < 0.65) {
        const template = available[Math.floor(Math.random() * available.length)];
        const mx = Math.floor(Math.random() * (room.w - 2)) + room.x + 1;
        const my = Math.floor(Math.random() * (room.h - 2)) + room.y + 1;

        if (this.tiles[my][mx] === GLYPHS.FLOOR && !this.getMonsterAt(mx, my)) {
          // Calculate HP from dice (e.g. 1d8, 4d8)
          const hp = this.rollDice(template.hpDice);
          this.monsters.push({
            ...template,
            hp: hp,
            maxHp: hp,
            x: mx, y: my,
            isAsleep: Math.random() < 0.70,
            room: room
          });
        }
      }
    }
  }

  rollDice(diceStr) {
    if (!diceStr || !diceStr.includes('d')) return 8;
    const parts = diceStr.split('+');
    const [num, sides] = parts[0].split('d').map(Number);
    const mod = parts[1] ? Number(parts[1]) : 0;
    let total = mod;
    for (let i = 0; i < (num || 1); i++) {
      total += Math.floor(Math.random() * (sides || 8)) + 1;
    }
    return Math.max(1, total);
  }

  updateVisibility(px, py) {
    // Reset turn visibility
    for (let y = 0; y < this.rows; y++) {
      this.visible[y].fill(false);
    }

    // Always reveal immediate 1-tile radius around the player (so doors immediately reveal corridors outside)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = px + dx;
        const ny = py + dy;
        if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
          this.visible[ny][nx] = true;
          this.explored[ny][nx] = true;
        }
      }
    }

    // If player is inside (or at the doorway of) an illuminated room, illuminate the entire room
    const currentRoom = this.getRoomAt(px, py);
    if (currentRoom && !currentRoom.isDark) {
      for (let y = currentRoom.y; y < currentRoom.y + currentRoom.h; y++) {
        for (let x = currentRoom.x; x < currentRoom.x + currentRoom.w; x++) {
          this.visible[y][x] = true;
          this.explored[y][x] = true;
        }
      }
    }
  }

  getRoomAt(x, y) {
    for (const r of this.rooms) {
      if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) {
        return r;
      }
    }
    return null;
  }

  getMonsterAt(x, y) {
    return this.monsters.find(m => m.x === x && m.y === y && m.hp > 0);
  }

  getItemAt(x, y) {
    return this.items.find(i => i.x === x && i.y === y);
  }

  isPassable(x, y) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return false;
    const tile = this.tiles[y][x];
    return tile === GLYPHS.FLOOR || tile === GLYPHS.CORRIDOR || tile === GLYPHS.DOOR ||
           tile === GLYPHS.DOOR_OPEN || tile === GLYPHS.STAIRS_DOWN || tile === GLYPHS.STAIRS_UP;
  }

  placeTraps() {
    this.traps = [];
    if (this.level < 2) return;
    const trapCount = Math.floor(Math.random() * 3) + 1; // 1-3 traps per floor
    const trapTypes = ['bear', 'dart', 'teleport', 'sleep'];
    for (let i = 0; i < trapCount; i++) {
      const room = this.rooms[Math.floor(Math.random() * this.rooms.length)];
      if (room && !room.isGone) {
        const tx = Math.floor(Math.random() * (room.w - 2)) + room.x + 1;
        const ty = Math.floor(Math.random() * (room.h - 2)) + room.y + 1;
        const isStairs = (this.stairsDown && this.stairsDown.x === tx && this.stairsDown.y === ty) ||
                         (this.stairsUp && this.stairsUp.x === tx && this.stairsUp.y === ty);
        if (this.tiles[ty][tx] === GLYPHS.FLOOR && !this.getItemAt(tx, ty) && !isStairs) {
          const type = trapTypes[Math.floor(Math.random() * trapTypes.length)];
          this.traps.push({ x: tx, y: ty, type, isRevealed: false });
        }
      }
    }
  }

  getTrapAt(x, y) {
    return this.traps.find(t => t.x === x && t.y === y);
  }

  searchAdjacent(px, py) {
    const found = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = px + dx;
        const ny = py + dy;
        if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) continue;

        // Reveal hidden trap
        const trap = this.getTrapAt(nx, ny);
        if (trap && !trap.isRevealed) {
          trap.isRevealed = true;
          found.push(`${trap.type} trap`);
        }
      }
    }
    return found;
  }

  spawnMonsterNear(px, py) {
    const candidates = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = px + dx;
        const ny = py + dy;
        if (this.isPassable(nx, ny) && !this.getMonsterAt(nx, ny) && !(nx === px && ny === py)) {
          candidates.push({ x: nx, y: ny });
        }
      }
    }
    if (candidates.length === 0) return null;
    const pos = candidates[Math.floor(Math.random() * candidates.length)];
    const available = Object.values(MONSTER_CATALOGUE).filter(m => m.minLevel <= this.level);
    const spec = available[Math.floor(Math.random() * available.length)] || MONSTER_CATALOGUE['B'];
    const hp = this.rollDice(spec.hpDice);
    const mon = {
      name: spec.name,
      symbol: spec.symbol,
      hp,
      maxHp: hp,
      ac: spec.ac,
      damage: spec.damage,
      exp: spec.exp,
      traits: [...spec.traits],
      isAsleep: false,
      color: spec.color,
      x: pos.x,
      y: pos.y
    };
    this.monsters.push(mon);
    return mon;
  }
}
