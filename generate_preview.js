/* 生成六边形地图 SVG 预览，用于直观确认排列正确。
 * 运行：node generate_preview.js  → 输出 preview.svg（浏览器可直接打开）
 */
const fs = require('fs');
const vm = require('vm');
const dir = __dirname + '/js/';
for (const f of ['data.js', 'hex.js', 'game.js']) {
  vm.runInThisContext(fs.readFileSync(dir + f, 'utf8'), { filename: f });
}

// 计算包围盒
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (let r = 0; r < LEVEL.size.h; r++) {
  for (let q = 0; q < LEVEL.size.w; q++) {
    const p = HEX.axialToPixel(q, r);
    const c = HEX.hexCorners(p.x, p.y, HEX.SIZE);
    for (const pt of c) {
      minX = Math.min(minX, pt.x); minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x); maxY = Math.max(maxY, pt.y);
    }
  }
}
const pad = 10;
const W = Math.ceil(maxX - minX + pad * 2);
const H = Math.ceil(maxY - minY + pad * 2);
const ox = -minX + pad, oy = -minY + pad;

function polygon(q, r, fill, stroke, size) {
  const p = HEX.axialToPixel(q, r);
  const pts = HEX.hexCorners(p.x + ox, p.y + oy, size);
  const s = pts.map(pt => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
  return `  <polygon points="${s}" fill="${fill}" stroke="${stroke || '#333'}" stroke-width="1"/>`;
}

const lines = [];
lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
lines.push(`  <rect width="${W}" height="${H}" fill="#14141a"/>`);

// 地形
for (let r = 0; r < LEVEL.size.h; r++) {
  for (let q = 0; q < LEVEL.size.w; q++) {
    const t = getTerrain(Game && Game.map ? Game.map.getTerrainId(q, r) : LEVEL.terrain[r][q]);
    lines.push(polygon(q, r, t.color, '#444', HEX.SIZE - 1.5));
  }
}

// 建筑（城市）
for (const b of LEVEL.buildings) {
  lines.push(polygon(b.q, b.r, 'rgba(255,255,255,0.3)', '#e44', HEX.SIZE - 5));
}

// 单位
for (const u of LEVEL.units) {
  const p = HEX.axialToPixel(u.q, u.r);
  const col = u.side === 'player' ? '#3a6fd0' : '#c03a3a';
  lines.push(`  <circle cx="${(p.x + ox).toFixed(1)}" cy="${(p.y + oy).toFixed(1)}" r="28" fill="${col}" stroke="#fff" stroke-width="1.5"/>`);
}

lines.push('</svg>');
fs.writeFileSync(__dirname + '/preview.svg', lines.join('\n'), 'utf8');
console.log('已生成 preview.svg，尺寸 ' + W + 'x' + H);
