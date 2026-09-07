/**
 * index.js — 核心引擎入口
 *
 * 职责：
 *  1. 提供默认模拟参数 DEFAULT_PARAMS
 *  2. 生成世界（createWorld）：鱼的初始骨架、荷叶布局、麒麟图案数据（纯数据）
 *  3. 暴露 step 推进模拟
 *  4. 暴露 snapshotFish：把一条鱼的骨架/朝向/图案「快照」成普通对象，
 *     供任何材质层读取去绘制 —— 材质层完全不碰引擎内部，只读这份快照。
 *
 * 设计要点：引擎只输出「骨架几何数据 + 图案纯数据」，不输出任何颜色或绘制，
 * 因此想换成锦鲤图案、水墨风、贴图、甚至纯几何线框都只需写一个绘制函数。
 */
import { v2 } from "./vec2.js";
import { Chain } from "./chain.js";
import { step } from "./boids.js";

/* 可复现的伪随机（源自 koi-pond src/sim/rng.ts） */
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* 生成一条锦鲤的「图案纯数据」：白底 + 红/黑斑 + 鳍色（源自 koi-pond src/sim/gen.ts）。
   引擎只输出数据，材质层按各自风格解读绘制。 */
function makeKoiPattern(seed) {
  const rnd = mulberry32(seed);
  const fin = rnd() < 0.65 ? "white" : rnd() < 0.88 ? "red" : "black";
  const spots = [];
  const spotCount = 20 + Math.floor(rnd() * 10);
  for (let i = 0; i < spotCount; i++) {
    const u = Math.min(0.95, Math.max(0.05, rnd() ** 0.7));
    const v = (rnd() * 2 - 1) * 0.75;
    const rx = 0.7 + rnd() * 0.75;
    const ry = 0.6 + rnd() * 0.85;
    const rot = (rnd() * 2 - 1) * 0.9;
    const color = rnd() < 0.65 ? "red" : "black";
    spots.push({ u, v, rx, ry, rot, color });
  }
  return { base: "white", fin, spots };
}

/* 默认模拟参数（可全部由外部覆盖） */
export const DEFAULT_PARAMS = {
  count: 20,

  // 鱼群感知
  neighborRadius: 70,
  separationRadius: 35,

  // 运动
  minSpeed: 55,
  maxSpeed: 140,
  maxForce: 220,
  turnRate: Math.PI * 1.4,
  fovDeg: 270,

  // 三条规则的权重
  wSep: 1.6,
  wAli: 0.7,
  wCoh: 0.6,
  wGoal: 0.9,
  wWander: 0.15,

  // 脊椎骨架
  jointCount: 12,
  chainSegLen: 16,
  chainMaxBend: Math.PI / 8,
  chainHeadLead: 16,

  // 障碍物避让（网页背景，鱼绕开内容 DIV）
  obstacleMargin: 100,       // 预测点避让半径（px）
  obstacleWeight: 3.2,       // 避让力权重
  obstacleLookAhead: 70,     // 向前预测距离（px）
};

/* 从参数里取「生成鱼需要用到的字段」，避免生成逻辑过度耦合 */
function picking(p) {
  return {
    jointCount: p.jointCount ?? 12,
    chainSegLen: p.chainSegLen,
    chainMaxBend: p.chainMaxBend,
    maxSpeed: p.maxSpeed,
  };
}

/* 生成一条鱼的初始状态（位置/朝向/相位/骨架/图案数据/个体游速比例） */
function makeFish(w, h, p) {
  const pos = v2(Math.random() * w, Math.random() * h);
  const a = Math.random() * Math.PI * 2;
  // 个体游速比例：0.55~0.9，让每条鱼的偏好速度有差异。
  // 目标速度 = 参数 maxSpeed * speedRatio，因此拖 maxSpeed 滑杆能让整群一起变速。
  const speedRatio = 0.55 + Math.random() * 0.35;
  const cruise = p.maxSpeed * speedRatio;

  const chain = new Chain(p.jointCount, p.chainSegLen, p.chainMaxBend);
  return {
    pos,
    vel: v2(Math.cos(a) * cruise, Math.sin(a) * cruise),
    phase: Math.random() * Math.PI * 2,
    chain,
    cruise,
    speedRatio,
    // 图案纯数据 —— 材质层按需解读，风格由材质决定
    pattern: {
      index: Math.floor(Math.random() * 4),      // 配色方案编号
      spots: [],
    },
    // 锦鲤图案（koi-pond 风格：白底 + 红/黑斑 + 鳍色），材质层按 drawFishKoi 解读
    koi: makeKoiPattern((Math.random() * 1e9) | 0),
  };
}

/* 生成非重叠的荷叶布局（纯位置/尺寸数据，材质层负责画） */
function makePads(w, h, count = 6) {
  const pads = [];
  const gap = 24;
  for (let i = 0; i < count * 20 && pads.length < count; i++) {
    const r = 50 + Math.random() * 55;
    const x = 20 + r + Math.random() * (w - 2 * (20 + r));
    const y = 20 + r + Math.random() * (h - 2 * (20 + r));
    const ok = pads.every((p) => {
      const dx = x - p.pos.x;
      const dy = y - p.pos.y;
      return dx * dx + dy * dy > (r + p.r + gap) ** 2;
    });
    if (!ok) continue;
    pads.push({ pos: v2(x, y), r, rot: (Math.random() - 0.5) * Math.PI, hue: Math.random() });
  }
  return pads;
}

/* 创建世界 */
export function createWorld(w, h, count = DEFAULT_PARAMS.count, params = DEFAULT_PARAMS) {
  const p = picking(params);
  const fish = [];
  for (let i = 0; i < count; i++) fish.push(makeFish(w, h, p));
  return {
    w,
    h,
    fish,
    pads: makePads(w, h),
    ripples: [],
    goal: null,
    goalStrength: 0,
    obstacles: [],           // 障碍物矩形集合（鱼会绕开的区域），由 setObstacles 驱动
    params,
  };
}

/* 添加一条鱼（用于运行时动态增减数量） */
export function addFish(world, params = world.params) {
  const p = picking(params);
  world.fish.push(makeFish(world.w, world.h, p));
}

/* 移除一条鱼 */
export function removeFish(world) {
  world.fish.length = Math.max(0, world.fish.length - 1);
}

/* 在指定位置产生涟漪（纯数据，材质层才渲染） */
export function spawnRipple(world, p) {
  world.ripples.push({ center: { x: p.x, y: p.y }, age: 0 });
}

/* 设置点击目标（食物点） */
export function setGoal(world, p) {
  world.goal = { x: p.x, y: p.y };
  world.goalStrength = 1;
}

/**
 * 设置障碍物矩形集合（世界坐标，单位与窗口一致）。
 * 鱼会在这些矩形周围绕行，不会从矩形内部穿过。
 * rects: [{x, y, w, h}, ...]。调用后引擎在每次 step 时对每条鱼施加避让力。
 */
export function setObstacles(world, rects) {
  world.obstacles = (rects || []).map((r) => ({ x: r.x, y: r.y, w: r.w, h: r.h }));
}

/**
 * 把一条鱼的骨架快照成「材质无关」的普通对象。
 * 所有坐标都是世界坐标；材质层可直接读 joints/angles 去绘制身体和附肢。
 */
export function snapshotFish(f, time) {
  const { joints, angles } = f.chain;
  const sp = Math.hypot(f.vel.x, f.vel.y);
  const dir = sp > 1e-6 ? { x: f.vel.x / sp, y: f.vel.y / sp } : { x: 1, y: 0 };

  return {
    id: f.pattern.index,
    // 头部锚点与朝向
    head: { x: joints[0].x, y: joints[0].y },
    dir,
    speed: sp,
    phase: f.phase,
    // 身体骨架（含尾部）
    joints: joints.map((j) => ({ x: j.x, y: j.y })),
    angles: angles.slice(),
    // 尾巴摆动的相对量（材质层可据此连尾鳍）。
    // 注意：angles 是未 wrap 的累计绝对角，跨 ±180° 会出现 -3°→357° 的跳变，
    // 必须 wrap 到 [-PI, PI]，否则尾鳍会因 bend 接近 ±360° 而绕圈乱甩（表现为"抽搐"）。
    tailBend: (() => {
      if (angles.length < 2) return 0;
      let a = angles[angles.length - 1] - angles[0];
      while (a > Math.PI) a -= Math.PI * 2;
      while (a < -Math.PI) a += Math.PI * 2;
      return a;
    })(),
    // 图案纯数据（配色索引 / 斑点），交给材质层解读
    pattern: f.pattern,
    // 锦鲤图案（koi-pond 风格），供 drawFishKoi 读取绘制
    koi: f.koi,
    time,
  };
}

/* 统一的参数/世界步进屋 */
export function stepWorld(world, dt, time) {
  step(world, dt, world.params, time);
}
