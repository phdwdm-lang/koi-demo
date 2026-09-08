// koiConfig.js — 锦鲤动效统一配置协议
// 把「素材布局 decor / 涟漪 ripple / 鱼 fish」三块参数收拢成一份标准 JSON，
// 供测试页微调后一键导出（复制给 AI），AI 再按此 JSON 拆分写入对应源码位置。
//
// 设计要点：
//  - 本模块只定义「默认值 + 协议结构」，不依赖任何 React / 渲染逻辑；
//  - 导出配置时由 App 组装当前值（decor=layouts、ripple=state、fish=运行时句柄）；
//  - AI 拿到 JSON 后：decor→editorState.defaultLayout、ripple→App DEFAULT_RIPPLE、
//    fish→KoiPond createWorld/ui/__koiShadow，而非全量整体替换。

export const CONFIG_VERSION = 1;

// ---------- 涟漪默认值（收敛自 App.jsx 原 DEFAULT_RIPPLE） ----------
export const DEFAULT_RIPPLE = {
  brushSize: 40,
  strength: 0.01,
  swirl: 0.65,
  rings: 3,
  grayscale: 0,
  spread: 10,
  dispersion: 0.2,
  glint: 0.2,
  tint: '#bbfffa',
  tintAmount: 0.15,
  trigger: 'both',
  quality: 'high',
};

// ---------- 鱼默认值（收敛自 KoiControls DEFAULT + KoiPond createWorld 覆盖值） ----------
export const DEFAULT_FISH = {
  count: 4,
  fishScale: 0.3,
  maxSpeed: 172,
  minSpeed: 32,
  maxForce: 220,
  turnRate: 4.4,
  fovDeg: 285,
  neighborRadius: 70,
  separationRadius: 90,
  wSep: 3.2,
  wAli: 0.7,
  wCoh: 0.3,
  wGoal: 2.45,
  wWander: 0.2,
  shadow: { x: 12, y: 30, blur: 5, alpha: 0.2 },
};

// ---------- 素材默认布局 ----------
// 供「正式动效 / KoiPondViewer」在未传入 config 时使用的一套成品布局（含荷叶/荷花/花苞）。
// 与编辑器 defaultLayout 视觉一致，但使用稳定 id、去掉 selected 字段，便于直接序列化。
export const DEFAULT_DECOR = [
  { id: 'decor-01', src: '/decor/leaf-04.png', x: 94.583, y: 83.35, w: 39.797, rotation: 332.743, flipX: false, opacity: 1, z: 1 },
  { id: 'decor-02', src: '/decor/leaf-05.png', x: 69.938, y: 47.04, w: 16.638, rotation: 12, flipX: false, opacity: 1, z: 1 },
  { id: 'decor-03', src: '/decor/bloom-03.png', x: 94.474, y: 92.68, w: 20, rotation: 352.142, flipX: false, opacity: 1, z: 3 },
  { id: 'decor-04', src: '/decor/bud-01.png', x: 9.87, y: 96.557, w: 12.119, rotation: 17.945, flipX: false, opacity: 1, z: 2 },
  { id: 'decor-05', src: '/decor/bud-02.png', x: 91.177, y: 96.911, w: 14, rotation: 337.241, flipX: false, opacity: 1, z: 5 },
  { id: 'decor-06', src: '/decor/leaf-03.png', x: 96.553, y: 93.509, w: 32.543, rotation: 356.189, flipX: false, opacity: 1, z: -1 },
  { id: 'decor-07', src: '/decor/leaf-05.png', x: 29.901, y: 30.321, w: 24.559, rotation: 12, flipX: false, opacity: 1, z: 6 },
  { id: 'decor-08', src: '/decor/bloom-04.png', x: 21.706, y: 62.732, w: 11.772, rotation: -0.579, flipX: false, opacity: 1, z: 8 },
  { id: 'decor-09', src: '/decor/leaf-04.png', x: 1.264, y: 27.498, w: 18.486, rotation: 35.315, flipX: false, opacity: 1, z: -3 },
  { id: 'decor-10', src: '/decor/leaf-01.png', x: 5.75, y: 92.166, w: 22, rotation: 12.558, flipX: false, opacity: 1, z: -2 },
  { id: 'decor-11', src: '/decor/leaf-02.png', x: 4.427, y: 85.78, w: 38.68, rotation: 9.229, flipX: false, opacity: 1, z: 11 },
  { id: 'decor-12', src: '/decor/bloom-02.png', x: 7.578, y: 91.676, w: 24.937, rotation: 357.301, flipX: false, opacity: 1, z: 12 },
  { id: 'decor-13', src: '/decor/leaf-05.png', x: 48.577, y: 69.757, w: 12.821, rotation: 1.841, flipX: false, opacity: 1, z: 13 },
  { id: 'decor-14', src: '/decor/bloom-04.png', x: 78.753, y: 14.694, w: 8, rotation: 4.696, flipX: false, opacity: 1, z: 14 },
];

// 汇总一份「完整可用」的配置：任一块为空时用对应默认值填充。
export function defaultConfig(overrides = {}) {
  return buildConfig({ decor: DEFAULT_DECOR, ripple: overrides.ripple, fish: overrides.fish });
}

// ---------- 汇总一份完整配置 ----------
// decor：素材项数组（editorState 布局，空则用默认）
// ripple：涟漪当前值覆盖对象（空则用默认）
// fish：鱼当前值覆盖对象（空则用默认）
export function buildConfig({ decor, ripple = {}, fish } = {}) {
  const f = (fish && typeof fish === 'object') ? fish : {};
  return {
    version: CONFIG_VERSION,
    decor: (Array.isArray(decor) && decor.length) ? decor : DEFAULT_DECOR,
    ripple: { ...DEFAULT_RIPPLE, ...(ripple || {}) },
    fish: {
      ...DEFAULT_FISH,
      ...f,
      shadow: { ...DEFAULT_FISH.shadow, ...(f.shadow || {}) },
    },
  };
}

// 序列化为可直接复制给 AI 的 JSON 字符串
export function toJSON(config) {
  return JSON.stringify(config, null, 2);
}

// 从运行时句柄读取「当前生效」的鱼参数（仅浏览器端调用）
// KoiPond 暴露：__koiWorld.params / __koiUi.fishScale / __koiShadow
export function readFishFromRuntime() {
  if (typeof window === 'undefined') return null;
  const w = window.__koiWorld;
  const ui = window.__koiUi;
  const sh = window.__koiShadow;
  if (!w || !ui) return null;
  const p = w.params || {};
  return {
    count: w.fish?.length ?? DEFAULT_FISH.count,
    fishScale: ui.fishScale ?? DEFAULT_FISH.fishScale,
    maxSpeed: p.maxSpeed ?? DEFAULT_FISH.maxSpeed,
    minSpeed: p.minSpeed ?? DEFAULT_FISH.minSpeed,
    maxForce: p.maxForce ?? DEFAULT_FISH.maxForce,
    turnRate: p.turnRate ?? DEFAULT_FISH.turnRate,
    fovDeg: p.fovDeg ?? DEFAULT_FISH.fovDeg,
    neighborRadius: p.neighborRadius ?? DEFAULT_FISH.neighborRadius,
    separationRadius: p.separationRadius ?? DEFAULT_FISH.separationRadius,
    wSep: p.wSep ?? DEFAULT_FISH.wSep,
    wAli: p.wAli ?? DEFAULT_FISH.wAli,
    wCoh: p.wCoh ?? DEFAULT_FISH.wCoh,
    wGoal: p.wGoal ?? DEFAULT_FISH.wGoal,
    wWander: p.wWander ?? DEFAULT_FISH.wWander,
    shadow: { ...DEFAULT_FISH.shadow, ...(sh || {}) },
  };
}
