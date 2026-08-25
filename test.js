/* headless 自检：用 Node 验证 data.js + hex.js + game.js 的纯逻辑。
 * 运行：node test.js
 */
const fs = require('fs');
const vm = require('vm');
const dir = __dirname + '/js/';

for (const f of ['data.js', 'hex.js', 'game.js']) {
  vm.runInThisContext(fs.readFileSync(dir + f, 'utf8'), { filename: f });
}

const testCode = `
(function () {
  let failures = [];
  const check = (cond, msg) => { if (!cond) failures.push(msg); };

  // 数据
  check(Object.keys(UNITS).length === 16, '单位数=16，实际 ' + Object.keys(UNITS).length);
  check(Object.keys(TERRAINS).length >= 10, '地形数>=10');
  check(!!ATTACK_METHODS['反载具武器'], '攻击方式「反载具武器」存在');

  // 六边形
  check(HEX.distance({q:0,r:0},{q:1,r:0}) === 1, '距离(0,0)-(1,0)');
  check(HEX.distance({q:0,r:0},{q:3,r:3}) === 5, '距离(0,0)-(3,3)=5（offset布局）');
  check(HEX.neighbors(0,0).length === 6, '邻居数=6');
  const p = HEX.axialToPixel(5,3);
  const rt = HEX.pixelToAxial(p.x, p.y);
  check(rt.q === 5 && rt.r === 3, '像素往返(5,3)');

  // 几何：所有邻居的像素距离都等于 sqrt3*size（边对边贴合，无重叠无缝隙）
  const p0 = HEX.axialToPixel(0,0);
  let allAdjacent = true;
  for (const nb of HEX.neighbors(0,0)) {
    const pn = HEX.axialToPixel(nb.q, nb.r);
    const d = Math.hypot(pn.x-p0.x, pn.y-p0.y);
    if (Math.abs(d - HEX.SIZE*HEX.SQRT3) > 0.001) allAdjacent = false;
  }
  check(allAdjacent, '所有邻居像素距离 = sqrt3*size（边对边贴合）');
  // pointy-top 六边形水平跨度应等于 sqrt3*size（与邻居距离一致）
  const corners = HEX.hexCorners(0, 0, HEX.SIZE);
  const xs = corners.map(c => c.x), ys = corners.map(c => c.y);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  check(Math.abs(spanX - HEX.SIZE*HEX.SQRT3) < 0.001, '六边形水平跨度=sqrt3*size（'+spanX.toFixed(2)+'）');
  check(Math.abs(spanY - 2*HEX.SIZE) < 0.001, '六边形垂直跨度=2*size（'+spanY.toFixed(2)+'）');

  // 伤害黄金值
  const a = new Unit('基础步兵','player',0,0);
  const b = new Unit('基础步兵','enemy',1,0);
  let amin=Infinity,amax=-Infinity,cmin=Infinity,cmax=-Infinity;
  for (let i=0;i<2000;i++){
    const d = calcDamage(a,b,false); amin=Math.min(amin,d); amax=Math.max(amax,d);
    const c = calcDamage(b,a,true);  cmin=Math.min(cmin,c); cmax=Math.max(cmax,c);
  }
  check(amin>=35.99 && amax<=46.01, '攻击∈[36,46] 实际['+amin.toFixed(2)+','+amax.toFixed(2)+']');
  check(cmin>=26.99 && cmax<=34.51, '反击∈[27,34.5] 实际['+cmin.toFixed(2)+','+cmax.toFixed(2)+']');

  // 穿甲/主动性
  check(Math.abs(armorMult(0.4)-0.5)<0.001, '穿甲0.4→0.5');
  check(Math.abs(armorMult(1.0)-1.0)<0.001, '穿甲1.0→1.0');
  check(Math.abs(initiativeMult(0)-1.0)<0.001, '主动性0→1.0');
  check(Math.abs(initiativeMult(6)-2.0)<0.001, '主动性6→2.0');

  // 重坦 vs 中坦 穿甲
  const heavy = new Unit('重坦','player',0,0);
  const medium = new Unit('中坦','enemy',1,0);
  const ratio = heavy.finalAntiArmor() / medium.finalArmor();
  check(Math.abs(armorMult(ratio)-2.0)<0.001, '重坦vs中坦 深穿=2.0 (比值'+ratio.toFixed(2)+')');

  // 完整流程：地图初始化 + 移动范围 + 回合
  Game.init(LEVEL);
  check(Game.map.units.length === 10, '地图单位数=10，实际 '+Game.map.units.length);
  check(Game.map.width === 20 && Game.map.height === 15, '地图尺寸 20x15');
  check(Game.map.unitsOfSide('player').length === 5, '玩家单位=5');
  check(Game.map.unitsOfSide('enemy').length === 5, '敌方单位=5');
  const pu0 = Game.map.unitsOfSide('player')[0];
  const reach0 = Game.map.getReachable(pu0, pu0.finalMove());
  check(Object.keys(reach0).length >= 6, '基础步兵移动范围>=6，实际 '+Object.keys(reach0).length);
  check(Game.map.getTerrainDef(-1, 0).passable === false, '越界地形视为不可通行');
  check(Game.campaign.turn === 1 && Game.campaign.side === 'player', '初始为玩家回合第1轮');

  // 移动限制：一回合每个单位只能移动一次
  const mvUnit = Game.map.unitsOfSide('player')[0];
  const before = Game.map.getReachable(mvUnit, mvUnit.finalMove());
  check(Object.keys(before).length > 0, '移动前有可达格');
  const firstCell = Object.keys(before)[0].split(',').map(Number);
  Game.move(mvUnit, firstCell[0], firstCell[1]);
  check(mvUnit.hasMoved === true, '移动后 hasMoved=true');
  Game.select(mvUnit);
  check(Object.keys(Game.reachable).length === 0, '移动后重新选中无可达格（一回合只能移动一次）');

  // 棋谱日志：移动已记录
  check(GameLog.entries.length >= 1, '移动已写入棋谱日志');
  check(GameLog.entries[GameLog.entries.length-1].type === 'move', '最后一条日志类型为 move');

  // 棋谱日志：攻击已记录（独立 CombatSystem 场景）
  const fakeMap = { removeUnit() {}, getUnitAt() { return null; } };
  const A = new Unit('基础步兵', 'player', 5, 5);
  const B = new Unit('轻步兵', 'enemy', 6, 5);
  const cntBefore = GameLog.entries.length;
  new CombatSystem().attack(A, B, fakeMap);
  check(GameLog.entries.length === cntBefore + 1, '攻击已写入棋谱日志');
  check(GameLog.entries[cntBefore].type === 'attack', '日志类型为 attack');
  check(GameLog.entries[cntBefore].result && GameLog.entries[cntBefore].result.attackDamage > 0, '攻击日志含伤害结果');
  check(GameLog.entries[cntBefore].side === 'player', '攻击日志记录阵营');

  // 棋谱日志：士气按包围程度判定（offset 布局，动态取邻居）
  const mkLevel = (enemyCells, w, h) => ({
    size: { w: w || 7, h: h || 7 }, legend: { p: '平原' },
    terrain: Array.from({ length: h || 7 }, () => 'p'.repeat(w || 7)),
    buildings: [], objectives: [],
    units: [
      { id: '基础步兵', side: 'player', q: 3, r: 3 },
      ...enemyCells.map(c => ({ id: '轻步兵', side: 'enemy', q: c[0], r: c[1] })),
    ],
  });
  const N = HEX.neighbors(3, 3);          // offset 布局的 6 个邻居
  const C = i => [N[i].q, N[i].r];        // 第 i 个邻居坐标
  // 2 敌（相邻不对边：东+右上）→ 无（士气不变，不记录）
  const m2 = new Map(mkLevel([C(0), C(3)]));
  const u2 = m2.getUnitAt(3, 3);
  const logBefore2 = GameLog.entries.length;
  new CombatSystem().updateMorale(u2, m2);
  check(u2.moraleState === '无', '2敌 → 士气无，实际 ' + u2.moraleState);
  check(GameLog.entries.length === logBefore2, '士气无变化不写日志');
  // 3 敌夹击（不对边：东+右上+右下）→ 低落（仍可移动）
  const m3 = new Map(mkLevel([C(0), C(3), C(5)]));
  const u3 = m3.getUnitAt(3, 3);
  new CombatSystem().updateMorale(u3, m3);
  check(u3.moraleState === '低落', '3敌夹击(不对边) → 低落，实际 ' + u3.moraleState);
  check(u3.finalMove() > 0, '低落仍可移动');
  // 一对对边（东+西）夹击 → 低落（仍可移动）
  const mo = new Map(mkLevel([C(0), C(1)]));
  const uo = mo.getUnitAt(3, 3);
  new CombatSystem().updateMorale(uo, mo);
  check(uo.moraleState === '低落', '一对对边夹击 → 低落，实际 ' + uo.moraleState);
  check(uo.finalMove() > 0, '夹击仍可移动');
  // 两组对边包围 → 受困，保留 1 格移动
  const mo2 = new Map(mkLevel([C(0), C(1), C(2), C(5)]));
  const uo2 = mo2.getUnitAt(3, 3);
  new CombatSystem().updateMorale(uo2, mo2);
  check(uo2.moraleState === '受困', '两组对边包围 → 受困，实际 ' + uo2.moraleState);
  check(uo2.finalMove() === 1, '受困保留1格移动（finalMove=1），实际 ' + uo2.finalMove());
  // 6 敌完全包围 → 混乱（无法移动）+ 写入棋谱
  const m6 = new Map(mkLevel([C(0), C(1), C(2), C(3), C(4), C(5)]));
  const u6 = m6.getUnitAt(3, 3);
  const moraleCount = GameLog.entries.length;
  new CombatSystem().updateMorale(u6, m6);
  check(u6.moraleState === '混乱', '6敌完全包围 → 混乱，实际 ' + u6.moraleState);
  check(u6.finalMove() === 0, '混乱无法移动（finalMove=0）');
  check(GameLog.entries.length === moraleCount + 1, '士气变化已写入棋谱');
  check(GameLog.entries[moraleCount].type === 'morale', '日志类型为 morale');
  check(GameLog.entries[moraleCount].turn > 0, '士气日志带回合数');

  // 经济系统：初始资源 / 城镇 / 产出 / 生产
  Game.init(LEVEL);
  check(Game.resources.recruit === 300 && Game.resources.steel === 100, '初始资源 300/100');
  const myTowns = Game.map.buildings.filter(b => b.owner === 'player');
  check(myTowns.length === 3, '玩家拥有 3 个城镇，实际 ' + myTowns.length);
  const town = myTowns.find(b => b.type === '城市');
  check(!!town, '玩家拥有城市');
  const prodList = Game.townProducible(town);
  check(prodList.length >= 4, '城市可生产至少 4 种步兵，实际 ' + prodList.length);
  // 回合产出
  const rBefore = Game.resources.recruit, sBefore = Game.resources.steel;
  const inc = Game.collectIncome('player');
  check(Game.resources.recruit > rBefore && Game.resources.steel > sBefore, '城镇每回合产出征召令+钢铁');
  check(inc.r > 0 && inc.s > 0, '产出明细含征召令与钢铁');
  // 生产
  const spawnCells = Game.townSpawnCells(town, '基础步兵');
  check(spawnCells.length > 0, '城市有空邻格可部署');
  const unitsBefore = Game.map.units.length;
  const cost = UNITS['基础步兵'].cost;
  const rAfterProd = Game.resources.recruit - cost.recruit;
  const okProd = Game.produce(town, '基础步兵', spawnCells[0].q, spawnCells[0].r);
  check(okProd === true, '生产成功');
  check(Game.map.units.length === unitsBefore + 1, '新单位已生成');
  check(Game.map.getUnitAt(spawnCells[0].q, spawnCells[0].r) !== null, '新单位位于部署格');
  check(Game.resources.recruit === rAfterProd, '生产消耗征召令');
  // 资源不足无法生产
  Game.resources.recruit = 0; Game.resources.steel = 0;
  const okFail = Game.produce(town, '基础步兵', spawnCells[0].q, spawnCells[0].r);
  check(okFail === false, '资源不足无法生产');
  // 生产写日志
  const lastLog = GameLog.entries[GameLog.entries.length - 1];
  check(lastLog.type === 'produce', '生产已写入棋谱，实际 ' + lastLog.type);

  // 士气在移动后判定：单位移入 6 敌包围圈 → 混乱
  const N2 = HEX.neighbors(3, 3);   // offset 布局 (3,3) 的 6 个邻居
  const surroundLevel = {
    size: { w: 7, h: 7 }, legend: { p: '平原' },
    terrain: Array.from({ length: 7 }, () => 'p'.repeat(7)),
    buildings: [], objectives: [],
    units: [
      { id: '基础步兵', side: 'player', q: 1, r: 1 },
      ...N2.map(n => ({ id: '轻步兵', side: 'enemy', q: n.q, r: n.r })),
    ],
  };
  const sm = new Map(surroundLevel);
  const mover = sm.getUnitAt(1, 1);
  check(mover.moraleState === '无', '初始士气为无');
  sm.moveUnit(mover, 3, 3);   // 移动到 (3,3)，6 邻全敌
  check(mover.moraleState === '混乱', '移入6敌包围圈后士气=混乱，实际 ' + mover.moraleState);

  // 胜利条件：仅占领敌方建筑所在区域；消灭敌军不结束游戏
  const vicLevel = {
    size: { w: 7, h: 7 }, legend: { p: '平原' },
    terrain: Array.from({ length: 7 }, () => 'p'.repeat(7)),
    buildings: [{ type: '城市', owner: 'enemy', q: 5, r: 5 }],
    objectives: [{ type: 'capture', q: 5, r: 5, description: '占领敌方城市' }],
    units: [
      { id: '基础步兵', side: 'player', q: 1, r: 1 },
      { id: '轻步兵', side: 'enemy', q: 2, r: 1 },
    ],
  };
  const vicMap = new Map(vicLevel);
  const vicCamp = new Campaign(vicLevel, vicMap, new CombatSystem());
  check(vicCamp.checkVictory() === false, '未占领时未胜利');
  const vicEnemy = vicMap.getUnitAt(2, 1);
  vicMap.removeUnit(vicEnemy);   // 消灭唯一敌军
  check(vicMap.unitsOfSide('enemy').length === 0, '敌军已全灭');
  check(vicCamp.checkVictory() === false, '消灭敌军但不占领城市 → 不胜利');
  vicMap.getBuildingAt(5, 5).owner = 'player';   // 占领敌方城市
  check(vicCamp.checkVictory() === true, '占领敌方城市 → 胜利');

  // 棋谱：回合标题与过回合分隔
  Game.init(LEVEL);
  check(GameLog.entries[0].type === 'turn', '首条日志为回合标题，实际 ' + GameLog.entries[0].type);
  const tCount = GameLog.entries.length;
  Game.endTurn();   // 过回合（会触发敌方 AI）
  const turnTypes = GameLog.entries.slice(tCount).map(e => e.type);
  check(turnTypes.includes('turnEnd'), '过回合记录「结束」分隔');
  check(turnTypes.includes('turn'), '过回合记录新回合标题');
  check(turnTypes.some(t => t === 'move' || t === 'attack'), '敌方 AI 行动也记入棋谱');

  // 工厂可生产消耗钢铁的载具/火炮
  const factory = Game.map.buildings.find(b => b.owner === 'player' && b.type === '工厂');
  const factoryList = Game.townProducible(factory);
  check(factoryList.includes('中坦') && factoryList.includes('重型火炮'), '工厂可生产坦克/火炮');
  check(UNITS['中坦'].cost.steel > 0, '中坦消耗钢铁');

  // 敌方士气：每个单位移动后计算（敌方单位移入包围圈 → 混乱，写入棋谱）
  const enemySurroundLevel = {
    size: { w: 7, h: 7 }, legend: { p: '平原' },
    terrain: Array.from({ length: 7 }, () => 'p'.repeat(7)),
    buildings: [], objectives: [],
    units: [
      { id: '轻步兵', side: 'enemy', q: 1, r: 1 },
      ...N2.map(n => ({ id: '基础步兵', side: 'player', q: n.q, r: n.r })),
    ],
  };
  const esm = new Map(enemySurroundLevel);
  const eUnit = esm.getUnitAt(1, 1);
  check(eUnit.moraleState === '无', '敌方初始士气为无');
  const logBeforeMorale = GameLog.entries.length;
  esm.moveUnit(eUnit, 3, 3);   // 敌方单位移动 → 移动后立即判定士气（6 邻全为玩家）
  check(eUnit.moraleState === '混乱', '敌方单位移动后士气=混乱，实际 ' + eUnit.moraleState);
  const moraleLogs = GameLog.entries.slice(logBeforeMorale).filter(a => a.type === 'morale');
  check(moraleLogs.length >= 1, '敌方士气变化已写入棋谱');
  check(moraleLogs[0].side === 'enemy', '士气日志标记敌方阵营，实际 ' + moraleLogs[0].side);

  // 坦克消灭敌人后获得一半基础移动力（可二次移动）
  const bmLevel = {
    size: { w: 7, h: 7 }, legend: { p: '平原' },
    terrain: Array.from({ length: 7 }, () => 'p'.repeat(7)),
    buildings: [], objectives: [],
    units: [
      { id: '中坦', side: 'player', q: 3, r: 3 },
      { id: '轻步兵', side: 'enemy', q: 4, r: 3 },
    ],
  };
  Game.init(bmLevel);
  const tank = Game.map.getUnitAt(3, 3);
  const inf = Game.map.getUnitAt(4, 3);
  inf.hp = 30;   // 设为残血，确保一击消灭
  const bmResult = Game.attack(tank, inf);
  check(bmResult.defenderDestroyed === true, '坦克攻击消灭敌人');
  check(tank.bonusMove === Math.floor(tank.def().move / 2), '坦克获得一半基础移动力，实际 ' + tank.bonusMove);
  check(tank.hasMoved === false, '坦克可再次移动（hasMoved=false）');
  Game.select(tank);
  let maxDist = 0;
  for (const k in Game.reachable) {
    const [q, r] = k.split(',').map(Number);
    maxDist = Math.max(maxDist, HEX.distance({ q: 3, r: 3 }, { q, r }));
  }
  check(Object.keys(Game.reachable).length > 0, '坦克二次移动有可达格');
  check(maxDist <= tank.bonusMove, '二次移动范围不超过一半移动力（最大 ' + maxDist + ' ≤ ' + tank.bonusMove + '）');


  console.log('======================================');
  if (failures.length === 0) {
    console.log('自检全部通过。伤害范围 '+amin.toFixed(2)+'~'+amax.toFixed(2)+' / '+cmin.toFixed(2)+'~'+cmax.toFixed(2));
    console.log('======================================');
    process.exit(0);
  } else {
    console.log('失败 ' + failures.length + ' 项：');
    failures.forEach(f => console.log('  FAIL ' + f));
    console.log('======================================');
    process.exit(1);
  }
})();
`;

vm.runInThisContext(testCode, { filename: 'test.js' });
