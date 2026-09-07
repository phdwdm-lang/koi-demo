// 素材布局数据模型 + 默认布局 + localStorage 持久化 + JSON 序列化。

// 素材项结构：
// {
//   id: string,          // 唯一 id
//   src: string,          // 素材图 URL(/decor/xxx.png)
//   x: number,            // 中心点 x（视口百分比 0~100）
//   y: number,            // 中心点 y（视口百分比 0~100）
//   w: number,            // 宽（视口百分比，相对 min(vw,vh) 的尺寸单元）
//   rotation: number,     // 旋转角（度）
//   flipX: boolean,       // 水平翻转
//   opacity: number,      // 透明度 0~1
//   selected: boolean,    // 当前是否选中
//   z: number,            // 层级（越大越靠上）
// }

export const STORAGE_KEY = 'koi-demo.decor.v1';

// 素材图渲染用视口相对尺寸：用 min(vw,vh) 作基准，保证不同屏幕比例下素材大小一致。
export function useVmin() {
  if (typeof window === 'undefined') return 100;
  return Math.min(window.innerWidth, window.innerHeight);
}

// 把 0~100 的「尺寸单元」换算为像素（基准 = vmin）
export function sizeToPx(v) {
  return (v / 100) * useVmin();
}

// 默认素材库（id -> 可用素材）
export const DECOR_MATERIALS = [
  { key: 'leaf-01', src: '/decor/leaf-01.png', kind: 'leaf' },
  { key: 'leaf-02', src: '/decor/leaf-02.png', kind: 'leaf' },
  { key: 'leaf-03', src: '/decor/leaf-03.png', kind: 'leaf' },
  { key: 'leaf-04', src: '/decor/leaf-04.png', kind: 'leaf' },
  { key: 'leaf-05', src: '/decor/leaf-05.png', kind: 'leaf' },
  { key: 'leaf-side-01', src: '/decor/leaf-side-01.png', kind: 'leaf' },
  { key: 'leaf-side-02', src: '/decor/leaf-side-02.png', kind: 'leaf' },
  { key: 'leaf-side-03', src: '/decor/leaf-side-03.png', kind: 'leaf' },
  { key: 'bloom-01', src: '/decor/bloom-01.png', kind: 'flower' },
  { key: 'bloom-02', src: '/decor/bloom-02.png', kind: 'flower' },
  { key: 'bloom-03', src: '/decor/bloom-03.png', kind: 'flower' },
  { key: 'bloom-04', src: '/decor/bloom-04.png', kind: 'flower' },
  { key: 'bud-01', src: '/decor/bud-01.png', kind: 'bud' },
  { key: 'bud-02', src: '/decor/bud-02.png', kind: 'bud' },
  { key: 'bud-03', src: '/decor/bud-03.png', kind: 'bud' },
];

let idCounter = 0;
export function nextId(prefix = 'decor') {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

// 预置一个好看的默认布局（错落摆放：底部几片大荷叶 + 侧叶 + 几朵花/花苞）
function defaultLayout() {
  const make = (src, x, y, w, rotation, extra = {}) => ({
    id: nextId(),
    src,
    x,
    y,
    w,
    rotation,
    flipX: false,
    opacity: 1,
    selected: false,
    z: 1,
    ...extra,
  });
  return [
    // 底层：大荷叶铺排（z 低，位于水面）
    make('/decor/leaf-04.png', 20, 78, 42, -8),
    make('/decor/leaf-01.png', 55, 82, 46, 6),
    make('/decor/leaf-05.png', 84, 74, 34, 12),
    make('/decor/leaf-side-01.png', 36, 60, 30, -16),
    make('/decor/leaf-side-02.png', 68, 60, 28, 14),
    // 中层：花与花苞（z 略高于叶，随摆位）
    make('/decor/bloom-01.png', 30, 34, 22, -4, { z: 3 }),
    make('/decor/bloom-03.png', 72, 30, 20, 8, { z: 3 }),
    make('/decor/bud-01.png', 50, 44, 16, 2, { z: 2 }),
    make('/decor/bud-02.png', 88, 40, 14, -10, { z: 2 }),
  ];
}

// 读布局：优先 localStorage，否则用默认布局
export function loadLayout() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch (e) {
    // 忽略解析错误，回落到默认
  }
  return defaultLayout();
}

// 保存布局到 localStorage
export function saveLayout(items) {
  try {
    const clean = items.map((it) => ({
      id: it.id,
      src: it.src,
      x: it.x,
      y: it.y,
      w: it.w,
      rotation: it.rotation,
      flipX: it.flipX,
      opacity: it.opacity,
      z: it.z,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    return true;
  } catch (e) {
    return false;
  }
}

// 导出布局 JSON（供下载或固话到源码）
export function exportLayoutJSON(items) {
  const clean = items.map((it, i) => ({
    id: it.id,
    src: it.src,
    x: it.x,
    y: it.y,
    w: it.w,
    rotation: it.rotation,
    flipX: it.flipX,
    opacity: it.opacity,
    z: it.z,
    order: i,
  }));
  return JSON.stringify({ version: 1, items: clean }, null, 2);
}

// 恢复默认布局
export function resetLayout() {
  return defaultLayout();
}
