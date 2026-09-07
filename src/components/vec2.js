/**
 * vec2.js — 纯向量工具（零依赖，不含任何渲染/材质逻辑）
 * 核心引擎只做运动模拟，不碰颜色与观感，所以这里是纯粹的数学生命线。
 */

export const v2 = (x = 0, y = 0) => ({ x, y });

export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a, s) => ({ x: a.x * s, y: a.y * s });

export const len2 = (a) => a.x * a.x + a.y * a.y;
export const len = (a) => Math.hypot(a.x, a.y);

export const norm = (a) => {
  const l = len(a);
  return l > 1e-8 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 };
};

export const clampLen = (a, maxL) => {
  const l = len(a);
  if (l <= maxL) return a;
  const s = maxL / (l || 1);
  return { x: a.x * s, y: a.y * s };
};

export const dot = (a, b) => a.x * b.x + a.y * b.y;

export const lerp = (a, b, t) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
