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
  const make = (src, x, y, w, rotation, z, extra = {}) => ({
    id: nextId(),
    src,
    x,
    y,
    w,
    rotation,
    flipX: false,
    opacity: 1,
    selected: false,
    z,
    ...extra,
  });
  // 默认布局固化自用户导出的 koi-decor-layout.json（顺序 = order 递增）
  return [
    make('/decor/leaf-04.png', 94.583, 83.350, 39.797, 332.743, 1),
    make('/decor/leaf-05.png', 69.938, 47.040, 16.638, 12, 1),
    make('/decor/bloom-03.png', 94.474, 92.680, 20, 352.142, 3),
    make('/decor/bud-01.png', 9.870, 96.557, 12.119, 17.945, 2),
    make('/decor/bud-02.png', 91.177, 96.911, 14, 337.241, 5),
    make('/decor/leaf-03.png', 96.553, 93.509, 32.543, 356.189, -1),
    make('/decor/leaf-05.png', 29.901, 30.321, 24.559, 12, 6),
    make('/decor/bloom-04.png', 21.706, 62.732, 11.772, -0.579, 8),
    make('/decor/leaf-04.png', 1.264, 27.498, 18.486, 35.315, -3),
    make('/decor/leaf-01.png', 5.750, 92.166, 22, 12.558, -2),
    make('/decor/leaf-02.png', 4.427, 85.780, 38.680, 9.229, 11),
    make('/decor/bloom-02.png', 7.578, 91.676, 24.937, 357.301, 12),
    make('/decor/leaf-05.png', 48.577, 69.757, 12.821, 1.841, 13),
    make('/decor/bloom-04.png', 78.753, 14.694, 8, 4.696, 14),
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
