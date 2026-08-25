/* ============================================================
 * 六边形几何工具（flat-top，轴向坐标 q, r）
 * 只做坐标/距离/邻居的数学，不持有地图数据。
 * ============================================================ */

const HEX = {
  SIZE: 40,              // 六边形外接圆半径（像素）
  SQRT3: Math.sqrt(3),

  /** 轴向坐标 -> 像素坐标（offset 布局：奇数行右移半个格宽 → 矩形轮廓） */
  axialToPixel(q, r) {
    return {
      x: this.SIZE * this.SQRT3 * q + (r & 1 ? this.SIZE * this.SQRT3 * 0.5 : 0),
      y: this.SIZE * 1.5 * r,
    };
  },

  /** 像素坐标 -> 轴向坐标（含取整） */
  pixelToAxial(x, y) {
    const rf = y / (this.SIZE * 1.5);
    const r = Math.round(rf);
    const qf = (x - (r & 1 ? this.SIZE * this.SQRT3 * 0.5 : 0)) / (this.SIZE * this.SQRT3);
    return this.axialRound(qf, rf);
  },

  /** 浮点轴向 -> 最近整数轴向（cube rounding） */
  axialRound(qf, rf) {
    const x = qf, z = rf, y = -x - z;
    let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
    const dx = Math.abs(rx - x), dy = Math.abs(ry - y), dz = Math.abs(rz - z);
    if (dx > dy && dx > dz) rx = -ry - rz;
    else if (dy > dz) ry = -rx - rz;
    else rz = -rx - ry;
    return { q: rx, r: rz };
  },

  /** 两轴向坐标之间的六边形距离（格数，offset 布局 odd-r） */
  distance(a, b) {
    const ac = a.q - Math.floor((a.r - (a.r & 1)) / 2);
    const bc = b.q - Math.floor((b.r - (b.r & 1)) / 2);
    const dc = ac - bc;
    const dr = a.r - b.r;
    return (Math.abs(dc) + Math.abs(dr) + Math.abs(dc + dr)) / 2;
  },

  /** 六邻居（offset 布局：奇数行与偶数行方向不同） */
  neighbors(q, r) {
    const dirs = (r & 1)
      ? [[1, 0], [-1, 0], [0, -1], [1, -1], [0, 1], [1, 1]]   // 奇数行
      : [[1, 0], [-1, 0], [0, -1], [-1, -1], [0, 1], [-1, 1]]; // 偶数行
    return dirs.map(d => ({ q: q + d[0], r: r + d[1] }));
  },

  /** 是否在网格边界内 */
  inBounds(q, r, w, h) {
    return q >= 0 && q < w && r >= 0 && r < h;
  },

  /** 六边形 6 个顶点（用于 Canvas 绘制），center 为像素中心
   *  pointy-top（尖顶朝上）：顶点角度 30° 偏移，与 axialToPixel 的 pointy-top 公式匹配 */
  hexCorners(cx, cy, size) {
    size = size || this.SIZE;
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i - 30);
      pts.push({ x: cx + size * Math.cos(a), y: cy + size * Math.sin(a) });
    }
    return pts;
  },
};
