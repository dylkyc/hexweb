/* ============================================================
 * 渲染 + 交互 + 面板 + 自检（示例关卡 LEVEL 见 game.js）
 * ============================================================ */

// ---------------------------------------------------------------------------
// 渲染
// ---------------------------------------------------------------------------
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

const COLOR_PLAYER = '#3a6fd0';
const COLOR_ENEMY = '#c03a3a';
const COLOR_SELECT = 'rgba(255,255,80,0.55)';
const COLOR_MOVE = 'rgba(90,230,90,0.45)';
const COLOR_ATTACK = 'rgba(240,80,60,0.55)';

// 视图状态：平移偏移 + 缩放（世界坐标 → 屏幕坐标：screen = world * zoom + view）
const view = { x: 0, y: 0, zoom: 1 };
const MIN_ZOOM = 0.3, MAX_ZOOM = 4;

function setupCanvas() {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let r = 0; r < LEVEL.size.h; r++) {
    for (let q = 0; q < LEVEL.size.w; q++) {
      const p = HEX.axialToPixel(q, r);
      minX = Math.min(minX, p.x - HEX.SIZE);
      minY = Math.min(minY, p.y - HEX.SIZE);
      maxX = Math.max(maxX, p.x + HEX.SIZE);
      maxY = Math.max(maxY, p.y + HEX.SIZE);
    }
  }
  const pad = 24;
  canvas.width = Math.ceil(maxX - minX + pad * 2);
  canvas.height = Math.ceil(maxY - minY + pad * 2);
  // 初始视图：完整显示地图
  view.zoom = 1;
  view.x = -minX + pad;
  view.y = -minY + pad;
}

/** 轴向坐标 → 屏幕坐标（含视图变换） */
function px(q, r) {
  const p = HEX.axialToPixel(q, r);
  return { x: p.x * view.zoom + view.x, y: p.y * view.zoom + view.y };
}

/** 屏幕坐标（canvas 内像素，含 CSS 缩放）→ 轴向坐标 */
function screenToAxial(sx, sy) {
  const wx = (sx - view.x) / view.zoom;
  const wy = (sy - view.y) / view.zoom;
  return HEX.pixelToAxial(wx, wy);
}

function drawHex(cx, cy, size, fill, stroke) {
  const pts = HEX.hexCorners(cx, cy, size * view.zoom);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < 6; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}

/** 兵种名分行：每行最多 3 字（4 字 2+2，5-6 字 3+2/3+3） */
function splitName(name) {
  if (name.length <= 3) return [name];
  if (name.length === 4) return [name.slice(0, 2), name.slice(2)];
  return [name.slice(0, 3), name.slice(3)];
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 地形
  for (let r = 0; r < Game.map.height; r++) {
    for (let q = 0; q < Game.map.width; q++) {
      const c = px(q, r);
      const t = Game.map.getTerrainDef(q, r);
      drawHex(c.x, c.y, HEX.SIZE - 1.5, t.color, '#2a2a2a');
    }
  }

  // 建筑
  for (const b of Game.map.buildings) {
    const c = px(b.q, b.r);
    const col = b.owner === 'player' ? COLOR_PLAYER : COLOR_ENEMY;
    drawHex(c.x, c.y, HEX.SIZE - 6, 'rgba(255,255,255,0.28)', col);
    ctx.fillStyle = col;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.type === '城市' ? '城' : b.type[0], c.x, c.y);
  }

  // 高亮
  if (Game.selected) {
    const sc = px(Game.selected.q, Game.selected.r);
    drawHex(sc.x, sc.y, HEX.SIZE - 2, COLOR_SELECT, null);
    for (const k in Game.reachable) {
      const [q, r] = k.split(',').map(Number);
      const c = px(q, r);
      drawHex(c.x, c.y, HEX.SIZE - 2, COLOR_MOVE, null);
    }
    for (const u of Game.attackable) {
      const c = px(u.q, u.r);
      drawHex(c.x, c.y, HEX.SIZE - 2, COLOR_ATTACK, null);
    }
  }
  // 部署模式：绿色可部署格
  if (Game.deploying) {
    for (const c of Game.deployCells) {
      const pc = px(c.q, c.r);
      drawHex(pc.x, pc.y, HEX.SIZE - 2, COLOR_MOVE, null);
    }
  }

  // 单位
  const z = view.zoom;
  for (const u of Game.map.units) {
    if (!u.alive()) continue;
    const c = px(u.q, u.r);
    const col = u.side === 'player' ? COLOR_PLAYER : COLOR_ENEMY;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 28 * z, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 名称分行（每行最多 3 字），圆内上部
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.max(7, 8 * z)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = splitName(u.def().name);
    const startY = c.y - 7 * z + (lines.length === 1 ? 2 * z : 0);
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], c.x, startY + i * 9 * z);
    }
    // HP 圆内下部
    ctx.font = `${Math.max(7, 9 * z)}px sans-serif`;
    ctx.fillText(u.hp + '/' + u.maxHp(), c.x, c.y + 15 * z);
  }
}

// ---------------------------------------------------------------------------
// 面板
// ---------------------------------------------------------------------------
function updateInfo() {
  const c = Game.campaign;
  const info = document.getElementById('info');
  info.textContent = `回合 ${c.turn}/${c.turnLimit()}  ·  ${c.side === 'player' ? '玩家回合' : '敌方回合'}`;
  document.getElementById('endTurn').disabled = !Game.isPlayerTurn();
}

function updateUnitPanel() {
  const el = document.getElementById('unitPanel');
  const u = Game.selected;
  if (!u) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  const d = u.def();
  el.innerHTML =
    `<b>${d.name}</b>（${d.category}）<br>` +
    `HP ${u.hp}/${u.maxHp()}　攻击 ${d.attack}　防御 ${d.defense}<br>` +
    `移动 ${u.finalMove()}　射程 ${d.range_min}-${d.range_max}　装甲 ${d.armor}　反装甲 ${d.anti_armor}<br>` +
    `攻击方式 ${d.attack_method}　士气 ${u.moraleState}`;
}

function showResult(text) {
  const ov = document.getElementById('overlay');
  ov.style.display = 'flex';
  document.getElementById('resultText').textContent = text;
}

function refreshUI() {
  render();
  updateInfo();
  updateUnitPanel();
  updateEcon();
}

// ---------------------------------------------------------------------------
// 经济面板（左侧）：资源 / 城镇 / 生产
// ---------------------------------------------------------------------------
function updateEcon() {
  // 资源
  const res = document.getElementById('econRes');
  res.innerHTML = `征召令 <b>${Game.resources.recruit}</b><br>钢铁 <b>${Game.resources.steel}</b>`;

  // 我方城镇列表
  const towns = document.getElementById('econTowns');
  const myTowns = Game.map.buildings.filter(b => b.owner === 'player');
  let th = '';
  for (const b of myTowns) {
    const def = BUILDINGS[b.type];
    const inc = def && def.levels && def.levels[b.level] ? def.levels[b.level].income : 0;
    const prod = def ? def.produces : '';
    const mark = Game.productionTown === b ? ' ▶' : '';
    th += `<button class="town-btn" data-town="${b.q},${b.r}">${b.type} L${b.level}（${prod === 'recruit' ? '征召' : prod === 'steel' ? '钢铁' : '其他'} +${inc}）${mark}</button>`;
  }
  towns.innerHTML = th || '<span class="muted">暂无我方城镇</span>';
  towns.querySelectorAll('.town-btn').forEach(btn => {
    btn.onclick = () => selectTown(btn.dataset.town);
  });

  updateProdPanel();
}

function selectTown(coord) {
  const [q, r] = coord.split(',').map(Number);
  const b = Game.map.getBuildingAt(q, r);
  if (!b || b.owner !== 'player') return;
  Game.productionTown = b;
  Game.deploying = false;
  Game.deployCells = [];
  refreshUI();
}

function updateProdPanel() {
  const el = document.getElementById('econProd');
  const b = Game.productionTown;
  if (!b) { el.innerHTML = '<span class="muted">点击上方城镇查看可生产单位</span>'; return; }
  const list = Game.townProducible(b);
  if (list.length === 0) { el.innerHTML = `<span class="muted">${b.type} 无法生产单位</span>`; return; }
  let html = `<div class="prod-head">${b.type} L${b.level} 可生产：</div>`;
  for (const uid of list) {
    const def = UNITS[uid];
    const cost = def.cost || { recruit: 0, steel: 0 };
    const affordable = Game.resources.recruit >= cost.recruit && Game.resources.steel >= cost.steel;
    html += `<button class="prod-btn${affordable ? '' : ' unaffordable'}" data-unit="${uid}">${def.name}<br><span class="prod-cost">征召${cost.recruit} 钢${cost.steel}</span></button>`;
  }
  el.innerHTML = html;
  el.querySelectorAll('.prod-btn').forEach(btn => {
    btn.onclick = () => startDeploy(b, btn.dataset.unit);
  });
}

function startDeploy(building, unitId) {
  const cells = Game.townSpawnCells(building, unitId);
  if (cells.length === 0) {
    showDialog('城镇周围没有空位可以部署');
    return;
  }
  Game.deploying = true;
  Game.deployCells = cells;
  Game.deployUnitId = unitId;
  showDialog(`点击绿色格子部署「${UNITS[unitId].name}」（点击其他地方取消）`);
  refreshUI();
}

// ---------------------------------------------------------------------------
// 棋谱：渲染动作日志（移动/攻击/士气/产出/生产），消灭与占领单独醒目强调
// ---------------------------------------------------------------------------
function appendLog(list, text, cls) {
  const div = document.createElement('div');
  div.className = cls ? 'log-entry ' + cls : 'log-entry';
  div.textContent = text;
  list.appendChild(div);
  list.scrollTop = list.scrollHeight;
}

function renderLog(action) {
  const list = document.getElementById('logList');
  if (action === null) { list.innerHTML = ''; return; }
  const sideName = action.side === 'player' ? '我方' : '敌方';
  const prefix = `[回合${action.turn}] `;

  // 回合切换：醒目分隔标题
  if (action.type === 'turn') {
    appendLog(list, `━━━ 回合 ${action.turn} · 玩家回合 ━━━`, 'log-turn');
    return;
  }
  if (action.type === 'turnEnd') {
    appendLog(list, `── 回合 ${action.turn} 结束 · 敌方行动 ──`, 'log-turn');
    return;
  }

  if (action.type === 'move') {
    appendLog(list, prefix + `第${action.step}步 ${sideName}：${action.unit.def().name} → (${action.to.q},${action.to.r})`, '');
    // 区域被占领：单独一条醒目日志
    if (action.captured) {
      appendLog(list, prefix + `🏁 占领！${sideName} 占领了${action.captured.type}（${action.captured.q},${action.captured.r}）`, 'log-capture');
    }
    return;
  }

  if (action.type === 'attack') {
    const r = action.result;
    let text = prefix + `第${action.step}步 ${sideName}：${action.attacker.def().name} 攻 ${action.defender.def().name} → ${Math.round(r.attackDamage)}伤害`;
    if (r.counterDamage > 0) text += `（反击${Math.round(r.counterDamage)}）`;
    appendLog(list, text, '');
    // 单位被消灭：单独一条醒目日志
    if (r.defenderDestroyed) {
      appendLog(list, prefix + `💀 消灭！${(action.defender.side === 'player' ? '我方' : '敌方')}的${action.defender.def().name} 被消灭`, 'log-kill');
    }
    if (r.attackerDestroyed) {
      appendLog(list, prefix + `💀 阵亡！${(action.attacker.side === 'player' ? '我方' : '敌方')}的${action.attacker.def().name} 被反击消灭`, 'log-kill');
    }
    return;
  }

  let text = prefix;
  if (action.type === 'morale') {
    text += `士气 ${sideName}：${action.unit.def().name} ${action.from} → ${action.to}（${action.reason}）`;
  } else if (action.type === 'income') {
    text += `💰 产出 ${action.recruit ? '征召+' + action.recruit : ''}${action.steel ? ' 钢铁+' + action.steel : ''}`;
  } else if (action.type === 'produce') {
    text += `🏭 ${action.building.type} 生产 ${action.unit.def().name} → (${action.unit.q},${action.unit.r})`;
  } else if (action.type === 'bonusmove') {
    text += `⚡ ${sideName}：${action.unit.def().name} 消灭敌军，获得 ${action.move} 格额外移动`;
  }
  appendLog(list, text, action.type === 'morale' ? 'log-morale' : '');
}

// ---------------------------------------------------------------------------
// 交互
// ---------------------------------------------------------------------------

/** 悬浮提示：单位完整信息 HTML */
function unitInfoHtml(u) {
  const d = u.def();
  const side = u.side === 'player' ? '我方' : '敌方';
  const col = u.side === 'player' ? '#6fa0ff' : '#ff7070';
  return `<b style="color:${col}">${d.name}</b>（${d.category}·${side}）<br>` +
    `HP ${u.hp}/${u.maxHp()}　攻击 ${d.attack}　防御 ${d.defense}<br>` +
    `移动 ${u.finalMove()}　射程 ${d.range_min}-${d.range_max}　装甲 ${d.armor}　反装甲 ${d.anti_armor}<br>` +
    `攻击方式 ${d.attack_method}　士气 ${u.moraleState}`;
}

const tooltip = document.getElementById('tooltip');

// 拖动平移状态
let dragging = false, dragStart = null, dragMoved = false;

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    dragging = true;
    dragMoved = false;
    dragStart = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    canvas.style.cursor = 'grabbing';
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (dragging) {
    const dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) dragMoved = true;
    view.x = dragStart.vx + dx;
    view.y = dragStart.vy + dy;
    render();
    return;
  }
  // 悬浮提示
  const rect = canvas.getBoundingClientRect();
  const sx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const sy = (e.clientY - rect.top) * (canvas.height / rect.height);
  const hex = screenToAxial(sx, sy);
  const unit = HEX.inBounds(hex.q, hex.r, Game.map.width, Game.map.height)
    ? Game.map.getUnitAt(hex.q, hex.r) : null;
  if (unit && unit.alive()) {
    tooltip.style.display = 'block';
    tooltip.innerHTML = unitInfoHtml(unit);
    const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
    let tx = e.clientX + 14, ty = e.clientY + 14;
    if (tx + tw > window.innerWidth) tx = e.clientX - tw - 14;
    if (ty + th > window.innerHeight) ty = e.clientY - th - 14;
    tooltip.style.left = tx + 'px';
    tooltip.style.top = ty + 'px';
  } else {
    tooltip.style.display = 'none';
  }
});

canvas.addEventListener('mouseup', () => {
  dragging = false;
  canvas.style.cursor = 'grab';
});

canvas.addEventListener('mouseleave', () => {
  dragging = false;
  dragMoved = false;
  canvas.style.cursor = 'grab';
  tooltip.style.display = 'none';
});

// 滚轮缩放（以鼠标位置为中心）
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);
  const wx = (mx - view.x) / view.zoom;   // 鼠标下的世界坐标
  const wy = (my - view.y) / view.zoom;
  const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  view.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.zoom * factor));
  view.x = mx - wx * view.zoom;           // 保持鼠标下的点不动
  view.y = my - wy * view.zoom;
  render();
}, { passive: false });

canvas.addEventListener('click', (e) => {
  const wasDrag = dragMoved;
  dragMoved = false;
  if (wasDrag) return;       // 拖动后松手不算点击
  if (!Game.isPlayerTurn()) return;
  const rect = canvas.getBoundingClientRect();
  const sx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const sy = (e.clientY - rect.top) * (canvas.height / rect.height);
  const hex = screenToAxial(sx, sy);
  if (!HEX.inBounds(hex.q, hex.r, Game.map.width, Game.map.height)) return;

  const clickedUnit = Game.map.getUnitAt(hex.q, hex.r);
  const sel = Game.selected;

  // 部署模式：点击绿色部署格生产单位，点击其他取消
  if (Game.deploying) {
    const isDeploy = Game.deployCells.some(c => c.q === hex.q && c.r === hex.r);
    if (isDeploy) {
      const ok = Game.produce(Game.productionTown, Game.deployUnitId, hex.q, hex.r);
      Game.deploying = false;
      Game.deployCells = [];
      if (!ok) showDialog('资源不足，无法生产');
    } else {
      Game.deploying = false;
      Game.deployCells = [];
    }
    refreshUI();
    return;
  }

  if (sel) {
    if (clickedUnit) {
      if (clickedUnit === sel) {
        Game.deselect();
      } else if (clickedUnit.side === 'player') {
        Game.select(clickedUnit);
      } else if (Game.attackable.includes(clickedUnit)) {
        doAttack(sel, clickedUnit);
      }
      refreshUI();
      return;
    }
    // 点击空格：移动
    const k = key(hex.q, hex.r);
    if (Game.reachable[k] !== undefined) {
      Game.move(sel, hex.q, hex.r);
      Game.select(sel);          // 重新计算可达/可攻击
      if (Game.campaign.evaluate()) finish();
    } else {
      Game.deselect();
    }
    refreshUI();
    return;
  }

  // 未选中：点己方单位选中
  if (clickedUnit && clickedUnit.side === 'player') {
    Game.select(clickedUnit);
  }
  refreshUI();
});

function doAttack(attacker, defender) {
  const result = Game.attack(attacker, defender);
  let msg = `攻击造成 ${Math.round(result.attackDamage)} 伤害`;
  if (result.defenderDestroyed) msg += '，敌方被消灭';
  if (result.counterDamage > 0) msg += `；敌方反击 ${Math.round(result.counterDamage)} 伤害`;
  if (result.attackerDestroyed) msg += '，我方被消灭';
  showDialog(msg);
  Game.select(attacker.alive() ? attacker : null);
  if (Game.campaign.evaluate()) finish();
}

document.getElementById('endTurn').addEventListener('click', () => {
  if (!Game.isPlayerTurn()) return;
  Game.endTurn();
  if (Game.campaign.evaluate()) finish();
  refreshUI();
});

function finish() {
  const result = Game.campaign.evaluate();
  if (result === 'victory') showResult('🎉 胜利！占领了城市并消灭敌军。');
  else if (result === 'defeat') showResult('💀 失败…单位全灭或超过回合限制。');
}

function showDialog(text) {
  const dlg = document.getElementById('dialog');
  dlg.textContent = text;
  dlg.style.display = 'block';
  clearTimeout(showDialog._t);
  showDialog._t = setTimeout(() => { dlg.style.display = 'none'; }, 2200);
}

document.getElementById('restart').addEventListener('click', () => {
  document.getElementById('overlay').style.display = 'none';
  Game.init(LEVEL);
  refreshUI();
});

// 顶栏「重新开始」：随时快速重开
document.getElementById('restartBtn').addEventListener('click', () => {
  document.getElementById('overlay').style.display = 'none';
  Game.init(LEVEL);
  refreshUI();
});

// ---------------------------------------------------------------------------
// 启动
// ---------------------------------------------------------------------------
/** 生成地图图例（关卡用到的地形 + 建筑），数据驱动自 TERRAINS/LEVEL */
function buildLegend() {
  const el = document.getElementById('legend');
  const seen = new Set();
  const items = [];
  const add = (id, color, note) => {
    if (seen.has(id)) return;
    seen.add(id);
    items.push(`<span class="legend-item"><span class="swatch" style="background:${color}"></span>${id}<span class="legend-note">${note}</span></span>`);
  };
  for (const ch in LEVEL.legend) {
    const id = LEVEL.legend[ch];
    const t = TERRAINS[id] || {};
    const note = t.move_cost < 0 ? '不可通行'
      : '移动' + (t.move_cost || 1) + (t.defense_bonus ? ' 防御+' + t.defense_bonus : '');
    add(id, t.color || '#888', note);
  }
  for (const b of LEVEL.buildings) {
    // 建筑类型可能不对应 TERRAINS 键（如「城市」对应「市中心」），取近似色
    const t = TERRAINS[b.type] || TERRAINS['市中心'] || {};
    add(b.type, t.color || '#b04a3a', '可占领');
  }
  el.innerHTML = items.join('');
}

function boot() {
  setupCanvas();
  GameLog.onAdd = renderLog;   // 棋谱回调
  Game.init(LEVEL);
  refreshUI();
  buildLegend();
  selfCheck();
}

window.addEventListener('DOMContentLoaded', boot);

// ---------------------------------------------------------------------------
// 自检（console 输出）
// ---------------------------------------------------------------------------
function selfCheck() {
  const failures = [];
  const check = (cond, msg) => { if (!cond) failures.push(msg); };

  // 六边形
  check(HEX.distance({ q: 0, r: 0 }, { q: 1, r: 0 }) === 1, '距离(0,0)-(1,0)');
  check(HEX.distance({ q: 0, r: 0 }, { q: 3, r: 3 }) === 6, '距离(0,0)-(3,3)');
  check(HEX.neighbors(0, 0).length === 6, '邻居数=6');
  const rt = HEX.pixelToAxial(HEX.axialToPixel(5, 3).x, HEX.axialToPixel(5, 3).y);
  check(rt.q === 5 && rt.r === 3, '像素往返(5,3)');

  // 伤害黄金值
  const a = new Unit('基础步兵', 'player', 0, 0);
  const b = new Unit('基础步兵', 'enemy', 1, 0);
  let amin = Infinity, amax = -Infinity, cmin = Infinity, cmax = -Infinity;
  for (let i = 0; i < 2000; i++) {
    const d = calcDamage(a, b, false);
    amin = Math.min(amin, d); amax = Math.max(amax, d);
    const c = calcDamage(b, a, true);
    cmin = Math.min(cmin, c); cmax = Math.max(cmax, c);
  }
  check(amin >= 35.99 && amax <= 46.01, `攻击伤害∈[36,46] 实际[${amin.toFixed(2)},${amax.toFixed(2)}]`);
  check(cmin >= 26.99 && cmax <= 34.51, `反击伤害∈[27,34.5] 实际[${cmin.toFixed(2)},${cmax.toFixed(2)}]`);

  // 穿甲/主动性
  check(Math.abs(armorMult(0.4) - 0.5) < 0.001, '穿甲 0.4→0.5');
  check(Math.abs(initiativeMult(0) - 1.0) < 0.001, '主动性 0→1.0');

  console.log('[selfCheck] ' + (failures.length === 0
    ? `全部通过（伤害 ${amin.toFixed(1)}~${amax.toFixed(1)} / ${cmin.toFixed(1)}~${cmax.toFixed(1)}）`
    : '失败：' + failures.join('；')));
}
