/* ============================================================
 * 游戏逻辑：单位/地图/战斗/回合/AI/胜负。
 * 数值与公式参考《单位设计.xlsx》与《策划案》。
 * ============================================================ */

// ---------------------------------------------------------------------------
// 数据查询与查找表
// ---------------------------------------------------------------------------
function getUnit(id) { return UNITS[id] || null; }
function getTerrain(id) { return TERRAINS[id] || TERRAINS['平原']; }

/** 通用区间查找：按顺序返回第一个命中区间的 mult */
function lookupInterval(rules, x) {
  for (const rule of rules) {
    let okMin = true, okMax = true;
    if (rule.min !== null && rule.min !== undefined) {
      okMin = rule.min_inclusive ? x >= rule.min : x > rule.min;
    }
    if (rule.max !== null && rule.max !== undefined) {
      okMax = rule.max_inclusive ? x <= rule.max : x < rule.max;
    }
    if (okMin && okMax) return rule.mult;
  }
  return 1.0;
}

function armorMult(ratio) { return lookupInterval(ARMOR_PEN_RULES, ratio); }
function initiativeMult(diff) { return lookupInterval(INITIATIVE_RULES, diff); }

function moraleDef(state) { return MORALE[state] || MORALE['无']; }

// '受困' 为运行时新增士气状态（对边夹击，保留 1 格移动），不在策划 xlsx 内；
// 若 data.js 重新生成后缺失，此处兜底补上。
if (!MORALE['受困']) {
  MORALE['受困'] = { mult: 0.6, random_add: -0.1, move_add: -998 };
}
function moraleMult(state) { return moraleDef(state).mult; }

/** 攻击方式 × 目标兵种 倍率 */
function attackEffectMult(method, targetCategory) {
  const row = ATTACK_METHODS[method];
  if (!row) return 1.0;
  return row[targetCategory] !== undefined ? row[targetCategory] : 1.0;
}

// ---------------------------------------------------------------------------
// 单位
// ---------------------------------------------------------------------------
class Unit {
  constructor(defId, side, q, r) {
    this.defId = defId;
    this.side = side;            // 'player' | 'enemy'
    this.q = q;
    this.r = r;
    this.level = 1;
    this.hp = this.def().hp;
    this.moraleState = '无';
    this.hasMoved = false;
    this.hasAttacked = false;
    this.hasCountered = false;
    this.bonusMove = 0;    // 消灭敌人后获得的额外移动力（坦克/装甲）
  }

  def() { return getUnit(this.defId); }
  alive() { return this.hp > 0; }
  maxHp() { return this.def().hp; }

  finalAttack() { return this.def().attack; }
  finalDefense() { return this.def().defense; }
  finalArmor() { return this.def().armor; }
  finalAntiArmor() { return this.def().anti_armor; }
  finalInitiative() { return this.def().initiative; }
  finalMove() {
    const ma = moraleDef(this.moraleState).move_add;
    if (ma <= -999) return 0;      // 混乱：完全无法移动
    if (ma === -998) return 1;     // 受困：对边夹击，保留 1 格移动力
    return Math.max(0, this.def().move + ma);
  }
  finalRange() { return { min: this.def().range_min, max: this.def().range_max }; }

  resetTurn() {
    this.hasMoved = false;
    this.hasAttacked = false;
    this.hasCountered = false;
    this.bonusMove = 0;
  }
}

// ---------------------------------------------------------------------------
// 伤害计算（纯函数，便于自检）
// ---------------------------------------------------------------------------
const ATTACK_FLOOR = 40;
const COUNTER_FLOOR = 30;

function calcDamage(attacker, defender, isCounter) {
  const atk = attacker.finalAttack();
  const def = defender.finalDefense();
  const atkMorale = moraleMult(attacker.moraleState);
  const defMorale = moraleMult(defender.moraleState);
  const effect = attackEffectMult(attacker.def().attack_method, defender.def().category);

  let initMult = 1.0;
  if (isCounter) {
    const diff = attacker.finalInitiative() - defender.finalInitiative();
    initMult = initiativeMult(diff);
  }

  let base = atk * atkMorale * effect * initMult - def * defMorale;
  const floor = isCounter ? COUNTER_FLOOR : ATTACK_FLOOR;
  base = Math.max(base, floor);

  // 穿甲
  const armor = defender.finalArmor();
  let armorM = 1.0;
  if (armor > 0) {
    const anti = attacker.finalAntiArmor();
    armorM = armorMult(anti / armor);
  }

  // 随机数（含攻方士气随机数基数影响）
  const randBase = 0.9 + moraleDef(attacker.moraleState).random_add;
  const random = randBase + 0.25 * Math.random();

  return base * armorM * random;
}

// ---------------------------------------------------------------------------
// 地图
// ---------------------------------------------------------------------------
class Map {
  constructor(level) {
    this.width = level.size.w;
    this.height = level.size.h;
    this.legend = level.legend;
    this.terrain = [];       // [r][q] -> 地形 id
    this.buildings = [];     // {type, owner, q, r}
    this.units = [];         // Unit[]
    this.unitIndex = {};     // "q,r" -> Unit
    this.buildingIndex = {}; // "q,r" -> building

    for (let r = 0; r < this.height; r++) {
      const line = level.terrain[r] || '';
      const row = [];
      for (let q = 0; q < this.width; q++) {
        const ch = line[q] || 'p';
        row.push(this.legend[ch] || '平原');
      }
      this.terrain.push(row);
    }

    for (const b of level.buildings) {
      const bld = { type: b.type, owner: b.owner, q: b.q, r: b.r, level: b.level || 1 };
      this.buildings.push(bld);
      this.buildingIndex[key(b.q, b.r)] = bld;
    }
    for (const u of level.units) {
      const unit = new Unit(u.id, u.side, u.q, u.r);
      this.units.push(unit);
      this.unitIndex[key(u.q, u.r)] = unit;
    }
  }

  getTerrainId(q, r) {
    if (!HEX.inBounds(q, r, this.width, this.height)) return '海洋';
    return this.terrain[r][q];
  }

  getTerrainDef(q, r) { return getTerrain(this.getTerrainId(q, r)); }

  getUnitAt(q, r) { return this.unitIndex[key(q, r)] || null; }
  getBuildingAt(q, r) { return this.buildingIndex[key(q, r)] || null; }

  unitsOfSide(side) { return this.units.filter(u => u.side === side && u.alive()); }

  /** 某格对某单位是否可通行（不检查单位占据） */
  terrainPassable(q, r, unit) {
    if (!HEX.inBounds(q, r, this.width, this.height)) return false;
    const t = this.getTerrainDef(q, r);
    if (!t.passable) return false;
    if (t.foot_only && unit.def().category !== '步兵') return false;
    return true;
  }

  /** 进入某格的移动消耗；不可进入返回 -1 */
  moveCostInto(q, r, unit) {
    if (!this.terrainPassable(q, r, unit)) return -1;
    const other = this.getUnitAt(q, r);
    if (other && other !== unit) return -1;
    return this.getTerrainDef(q, r).move_cost;
  }

  /** BFS 可达范围：返回 "q,r" -> 剩余移动力 */
  getReachable(unit, movePoints) {
    const result = {};
    if (movePoints <= 0) return result;
    const start = key(unit.q, unit.r);
    const best = { [start]: 0 };
    const queue = [{ q: unit.q, r: unit.r }];
    while (queue.length > 0) {
      const cur = queue.shift();
      const curCost = best[key(cur.q, cur.r)];
      for (const nb of HEX.neighbors(cur.q, cur.r)) {
        const c = this.moveCostInto(nb.q, nb.r, unit);
        if (c < 0) continue;
        const newCost = curCost + c;
        if (newCost > movePoints) continue;
        const k = key(nb.q, nb.r);
        if (best[k] !== undefined && best[k] <= newCost) continue;
        best[k] = newCost;
        queue.push(nb);
      }
    }
    for (const k in best) {
      if (k !== start) result[k] = best[k];
    }
    return result;
  }

  moveUnit(unit, q, r) {
    const from = { q: unit.q, r: unit.r };
    delete this.unitIndex[key(unit.q, unit.r)];
    unit.q = q;
    unit.r = r;
    this.unitIndex[key(q, r)] = unit;
    // 占领（统一处理，玩家与 AI 一致）
    const b = this.getBuildingAt(q, r);
    const captured = b && b.owner !== unit.side;
    if (captured) b.owner = unit.side;
    recordAction({ type: 'move', unit, from, to: { q, r }, side: unit.side, captured: captured ? b : null });
    // 移动后立即按新位置判定士气（玩家与 AI 一致）
    if (Game.combat) Game.combat.updateMorale(unit, this);
  }

  removeUnit(unit) {
    delete this.unitIndex[key(unit.q, unit.r)];
    const i = this.units.indexOf(unit);
    if (i >= 0) this.units.splice(i, 1);
  }

  addUnit(unit, q, r) {
    unit.q = q;
    unit.r = r;
    this.units.push(unit);
    this.unitIndex[key(q, r)] = unit;
  }
}

function key(q, r) { return q + ',' + r; }

// ---------------------------------------------------------------------------
// 战斗系统
// ---------------------------------------------------------------------------
class CombatSystem {
  canAttack(attacker, defender, map) {
    if (attacker.side === defender.side) return false;
    if (!defender.alive() || !attacker.alive()) return false;
    if (attacker.hasAttacked) return false;
    const d = HEX.distance({ q: attacker.q, r: attacker.r }, { q: defender.q, r: defender.r });
    const rg = attacker.finalRange();
    return d >= rg.min && d <= rg.max;
  }

  canCounter(attacker, defender) {
    if (!defender.alive()) return false;
    if (defender.hasCountered || defender.hasAttacked) return false;
    const d = HEX.distance({ q: defender.q, r: defender.r }, { q: attacker.q, r: attacker.r });
    const rg = defender.finalRange();
    return d >= rg.min && d <= rg.max;
  }

  /** 执行攻击（含反击），返回结果对象 */
  attack(attacker, defender, map) {
    const result = { attackDamage: 0, counterDamage: 0, defenderDestroyed: false, attackerDestroyed: false };

    const dmg = calcDamage(attacker, defender, false);
    defender.hp -= Math.round(dmg);
    result.attackDamage = dmg;
    attacker.hasAttacked = true;

    if (defender.hp <= 0) {
      defender.hp = 0;
      result.defenderDestroyed = true;
      map.removeUnit(defender);
    } else if (this.canCounter(attacker, defender)) {
      const cdmg = calcDamage(defender, attacker, true);
      attacker.hp -= Math.round(cdmg);
      result.counterDamage = cdmg;
      defender.hasCountered = true;
      if (attacker.hp <= 0) {
        attacker.hp = 0;
        result.attackerDestroyed = true;
        map.removeUnit(attacker);
      }
    }
    recordAction({ type: 'attack', attacker, defender, result, side: attacker.side });
    return result;
  }

  /** 士气（基于包围程度）：3~5 个敌夹击 → 低落；6 个邻格全为敌军（完全包围）→ 混乱（无法移动） */
  updateMorale(unit, map) {
    // 用 HEX.neighbors 获取 6 个邻居（offset 布局下奇偶行方向不同）
    const nbs = HEX.neighbors(unit.q, unit.r);
    const p0 = HEX.axialToPixel(unit.q, unit.r);
    // 每个方向的相对像素向量（用于判断"对边"：方向相反的两格）
    const vecs = nbs.map(nb => {
      const p = HEX.axialToPixel(nb.q, nb.r);
      return { dx: p.x - p0.x, dy: p.y - p0.y };
    });
    const enemyAt = [false, false, false, false, false, false];
    let enemyCount = 0;
    for (let i = 0; i < 6; i++) {
      const other = map.getUnitAt(nbs[i].q, nbs[i].r);
      if (other && other.side !== unit.side && other.alive()) {
        enemyAt[i] = true;
        enemyCount++;
      }
    }
    // 对边对数（0~3）：两两比较像素向量是否近似相反（夹角≈180°）
    const isOpposite = (a, b) => {
      const dot = a.dx * b.dx + a.dy * b.dy;
      const len = Math.hypot(a.dx, a.dy) * Math.hypot(b.dx, b.dy);
      return len > 0 && dot < 0 && -dot / len > 0.99;
    };
    let oppositePairs = 0;
    for (let i = 0; i < 6; i++) {
      for (let j = i + 1; j < 6; j++) {
        if (enemyAt[i] && enemyAt[j] && isOpposite(vecs[i], vecs[j])) oppositePairs++;
      }
    }

    const oldState = unit.moraleState;
    let newState = '无';
    if (enemyCount >= 6) {
      newState = '混乱';               // 完全包围 → 无法移动
    } else if (oppositePairs >= 2) {
      newState = '受困';               // 两组对边被围 → 保留 1 格移动
    } else if (oppositePairs === 1 || enemyCount >= 3) {
      newState = '低落';               // 一对对边夹击 / 3+ 敌 → 仅降士气
    }
    unit.moraleState = newState;

    if (unit.moraleState !== oldState) {
      let reason;
      if (newState === '混乱') reason = '被完全包围（6格都是敌军）';
      else if (newState === '受困') reason = '被两组对边敌军包围（四面受敌）';
      else if (oppositePairs === 1) reason = '被对边敌军夹击';
      else reason = '被' + enemyCount + '个敌军夹击';
      recordAction({ type: 'morale', unit, from: oldState, to: newState, side: unit.side, reason });
    }
  }
}

// ---------------------------------------------------------------------------
// 关卡 / 回合 / AI / 胜负
// ---------------------------------------------------------------------------
class Campaign {
  constructor(level, map, combat) {
    this.level = level;
    this.map = map;
    this.combat = combat;
    this.turn = 1;
    this.side = 'player';
    this.over = false;
  }

  turnLimit() { return this.level.turn_limit || 15; }

  objectiveMet(obj) {
    if (obj.type === 'capture') {
      // 占领指定坐标的建筑所在区域（玩家占领即达成）
      const b = this.map.getBuildingAt(obj.q, obj.r);
      return !!b && b.owner === 'player';
    }
    if (obj.type === 'eliminate') {
      return this.map.unitsOfSide('enemy').length === 0;
    }
    return false;
  }

  checkVictory() {
    return this.level.objectives.every(o => this.objectiveMet(o));
  }

  checkDefeat() {
    if (this.map.unitsOfSide('player').length === 0) return true;
    if (this.turn > this.turnLimit() && !this.checkVictory()) return true;
    return false;
  }

  evaluate() {
    if (this.over) return;
    if (this.checkVictory()) { this.over = true; return 'victory'; }
    if (this.checkDefeat()) { this.over = true; return 'defeat'; }
    return null;
  }

  /** 玩家结束回合 → 敌方 AI → 回玩家 */
  playerEndTurn() {
    if (this.over || this.side !== 'player') return;
    recordAction({ type: 'turnEnd', side: 'player', turn: this.turn });   // 棋谱：回合结束分隔
    this.side = 'enemy';
    this.enemyTurn();
    if (this.evaluate()) return;
    this.side = 'player';
    this.turn++;
    this.startPlayerTurn();
    recordAction({ type: 'turn', side: 'player', turn: this.turn });      // 棋谱：新回合标题
    this.evaluate();
  }

  startPlayerTurn() {
    for (const u of this.map.units) u.resetTurn();
    Game.collectIncome('player');    // 城镇每回合产出
  }

  /** 敌方简单 AI：就近移动 + 能打就打 */
  enemyTurn() {
    for (const unit of this.map.unitsOfSide('enemy')) {
      if (!unit.alive() || this.over) continue;
      unit.resetTurn();
      let target = this.nearestUnit(unit, 'player');
      if (!target) continue;

      if (this.combat.canAttack(unit, target, this.map)) {
        this.combat.attack(unit, target, this.map);
        target = this.nearestUnit(unit, 'player');
        if (!target) continue;
        continue;
      }

      // 移动靠近
      const reachable = this.map.getReachable(unit, unit.finalMove());
      let best = { q: unit.q, r: unit.r };
      let bestDist = HEX.distance({ q: unit.q, r: unit.r }, { q: target.q, r: target.r });
      for (const k in reachable) {
        const [q, r] = k.split(',').map(Number);
        const d = HEX.distance({ q, r }, { q: target.q, r: target.r });
        if (d < bestDist) { bestDist = d; best = { q, r }; }
      }
      if (best.q !== unit.q || best.r !== unit.r) {
        this.map.moveUnit(unit, best.q, best.r);
        if (this.combat.canAttack(unit, target, this.map)) {
          this.combat.attack(unit, target, this.map);
        }
      }
    }
  }

  nearestUnit(unit, side) {
    let best = null, bestDist = Infinity;
    for (const other of this.map.unitsOfSide(side)) {
      if (!other.alive()) continue;
      const d = HEX.distance({ q: unit.q, r: unit.r }, { q: other.q, r: other.r });
      if (d < bestDist) { bestDist = d; best = other; }
    }
    return best;
  }
}

// ---------------------------------------------------------------------------
// 全局 Game 状态（供 render.js 使用）
// ---------------------------------------------------------------------------
const Game = {
  map: null,
  combat: null,
  campaign: null,
  selected: null,          // 选中的单位
  reachable: {},           // 当前选中单位的可达格
  attackable: [],          // 当前选中单位可攻击的敌方单位
  resources: { recruit: 0, steel: 0 },   // 经济资源
  productionTown: null,    // 选中的生产基地（城镇）
  deploying: false,        // 是否处于部署模式
  deployCells: [],         // 可部署的空邻格
  deployUnitId: '',        // 待部署的单位 id

  init(level) {
    GameLog.clear();
    this.map = new Map(level);
    this.combat = new CombatSystem();
    this.campaign = new Campaign(level, this.map, this.combat);
    this.selected = null;
    this.reachable = {};
    this.attackable = [];
    const res = level.resources || {};
    this.resources = { recruit: res.recruit || 0, steel: res.steel || 0 };
    this.productionTown = null;
    this.deploying = false;
    this.deployCells = [];
    this.deployUnitId = '';
    recordAction({ type: 'turn', side: 'player', turn: 1 });   // 棋谱回合标题
  },

  isPlayerTurn() { return this.campaign.side === 'player' && !this.campaign.over; },

  select(unit) {
    this.selected = unit;
    if (unit) {
      // 一回合每个单位只能移动一次；坦克/装甲消灭敌人后可用 bonusMove 再移动（半程移动力）
      const canMove = !unit.hasMoved && (!unit.hasAttacked || unit.bonusMove > 0);
      const mp = canMove ? (unit.bonusMove > 0 ? unit.bonusMove : unit.finalMove()) : 0;
      this.reachable = mp > 0 ? this.map.getReachable(unit, mp) : {};
      this.attackable = this.map.units
        .filter(u => u.side !== unit.side && u.alive() && this.combat.canAttack(unit, u, this.map));
    } else {
      this.reachable = {};
      this.attackable = [];
    }
  },

  deselect() { this.select(null); },

  move(unit, q, r) {
    this.map.moveUnit(unit, q, r);   // 移动与占领统一在 moveUnit 处理并记录
    unit.hasMoved = true;
  },

  attack(attacker, defender) {
    const result = this.combat.attack(attacker, defender, this.map);
    attacker.hasAttacked = true;
    // 坦克/装甲单位消灭敌人后，获得一半基础移动力（可再次移动）
    if (result.defenderDestroyed && attacker.def().category === '载具' && attacker.alive()) {
      attacker.bonusMove = Math.floor(attacker.def().move / 2);
      attacker.hasMoved = false;
      recordAction({ type: 'bonusmove', unit: attacker, move: attacker.bonusMove, side: attacker.side });
    }
    return result;
  },

  // ---------------------------------------------------------------------
  // 经济系统：产出 / 生产
  // ---------------------------------------------------------------------
  /** 结算某阵营城镇的每回合产出 */
  collectIncome(side) {
    let r = 0, s = 0;
    for (const b of this.map.buildings) {
      if (b.owner !== side) continue;
      const def = BUILDINGS[b.type];
      if (!def) continue;
      const lv = (def.levels || {})[b.level];
      const inc = lv ? (lv.income || 0) : 0;
      if (def.produces === 'recruit') r += inc;
      else if (def.produces === 'steel') s += inc;
    }
    this.resources.recruit += r;
    this.resources.steel += s;
    if (r || s) recordAction({ type: 'income', side, recruit: r, steel: s });
    return { r, s };
  },

  /** 城镇可生产的单位 id 列表 */
  townProducible(building) {
    const def = BUILDINGS[building.type];
    return def ? (def.can_produce || []) : [];
  },

  /** 城镇周围可部署新单位的空邻格 */
  townSpawnCells(building, unitId) {
    const probe = new Unit(unitId, 'player', 0, 0);
    const cells = [];
    for (const nb of HEX.neighbors(building.q, building.r)) {
      if (!HEX.inBounds(nb.q, nb.r, this.map.width, this.map.height)) continue;
      if (this.map.getUnitAt(nb.q, nb.r) === null && this.map.terrainPassable(nb.q, nb.r, probe)) {
        cells.push(nb);
      }
    }
    return cells;
  },

  /** 生产单位：消耗资源并在指定格生成 */
  produce(building, unitId, q, r) {
    const def = UNITS[unitId];
    if (!def) return false;
    const cost = def.cost || { recruit: 0, steel: 0 };
    if (this.resources.recruit < cost.recruit || this.resources.steel < cost.steel) return false;
    if (!HEX.inBounds(q, r, this.map.width, this.map.height)) return false;
    if (this.map.getUnitAt(q, r) !== null) return false;
    this.resources.recruit -= cost.recruit;
    this.resources.steel -= cost.steel;
    const unit = new Unit(unitId, 'player', q, r);
    this.map.addUnit(unit, q, r);
    recordAction({ type: 'produce', unit, building, side: 'player', cost });
    return true;
  },

  endTurn() {
    this.deselect();
    this.deploying = false;
    this.deployCells = [];
    this.productionTown = null;
    this.campaign.playerEndTurn();
  },
};

// ---------------------------------------------------------------------------
// 动作日志（棋谱）：记录移动/攻击，供右侧窗口显示
// ---------------------------------------------------------------------------
const GameLog = {
  entries: [],     // 动作记录列表
  onAdd: null,     // 回调：function(action)；action 为 null 表示清空

  add(action) {
    action.turn = Game.campaign ? Game.campaign.turn : 0;
    action.step = this.entries.length + 1;
    this.entries.push(action);
    if (typeof this.onAdd === 'function') this.onAdd(action);
  },

  clear() {
    this.entries = [];
    if (typeof this.onAdd === 'function') this.onAdd(null);
  },
};

function recordAction(action) { GameLog.add(action); }

// ---------------------------------------------------------------------------
// 示例关卡（参考策划案西班牙战场「秘密行军」，缩小为 15×10）
// ---------------------------------------------------------------------------
const LEVEL = {
  id: 'demo_01',
  name: '秘密行军',
  size: { w: 20, h: 15 },
  turn_limit: 15,
  legend: { p: '平原', f: '森林', h: '丘陵', m: '山地', w: '海洋' },
  terrain: [
    'pppppppppppppppppppp',
    'pppppppppppppppppppp',
    'ppppffpppppppppppppp',
    'pppfffpppppppppphhpp',
    'ppppfppppppppppphhpp',
    'pppppppppppppppppppp',
    'pppppppppppppppppppp',
    'pppppppppppppppppppp',
    'pppppppppppppppppppp',
    'ppppppppppppppppsspp',
    'ppppppppppppppppsspp',
    'pppppppppppppppppppp',
    'pppppppppppppppppppp',
    'pppppppppppppppppppp',
    'pppppppppppppppppppp',
  ],
  resources: { recruit: 300, steel: 100 },
  buildings: [
    { type: '城市', owner: 'player', q: 2, r: 3 },
    { type: '工厂', owner: 'player', q: 7, r: 2 },
    { type: '农村', owner: 'player', q: 8, r: 13 },
    { type: '城市', owner: 'enemy', q: 17, r: 5 },
  ],
  units: [
    { id: '基础步兵', side: 'player', q: 4, r: 11 },
    { id: '基础步兵', side: 'player', q: 5, r: 10 },
    { id: '轻步兵', side: 'player', q: 6, r: 11 },
    { id: '重步兵', side: 'player', q: 5, r: 12 },
    { id: '中坦', side: 'player', q: 7, r: 12 },
    { id: '基础步兵', side: 'enemy', q: 17, r: 6 },
    { id: '轻步兵', side: 'enemy', q: 18, r: 5 },
    { id: '轻步兵', side: 'enemy', q: 16, r: 5 },
    { id: '机枪装甲车', side: 'enemy', q: 18, r: 6 },
    { id: '轻型火炮', side: 'enemy', q: 17, r: 4 },
  ],
  objectives: [
    { type: 'capture', q: 17, r: 5, description: '占领敌方城市' },
  ],
};
