/**
 * boids.js — 鱼群行为模拟（纯逻辑，不含任何渲染/材质）
 *
 * 思想来自 krvnishka/koi-pond 的 sim/boids.ts，属于「高级 Boids」：
 *  - FOV 视野锥：鱼只注意前方视野内的同伴
 *  - 距离衰减权重：越近的邻居影响越大
 *  - 反平方分离力：超近距离强排斥，防止鱼重叠
 *  - 转向限制 turnRate：转弯是平滑弧线而非瞬移
 *  - 速度向巡航速度逼近：每条鱼有自己偏好的速度
 *  - 边缘软规避 + 硬反弹保险
 */
import { v2, add, sub, mul, len2, norm, clampLen, dot } from "./vec2.js";

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

function rotate(v, ang) {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

function steerTowards(currentVel, desiredVel, maxForce) {
  return clampLen(sub(desiredVel, currentVel), maxForce);
}

/* 把当前方向朝目标方向最多转 maxAng，形成优美弧线 */
function turnTowardDir(currentVel, desiredDir, maxAng) {
  const cv2 = len2(currentVel);
  if (cv2 < 1e-8) return norm(desiredDir);

  const curDir = norm(currentVel);
  const dd = norm(desiredDir);
  const d = clamp(curDir.x * dd.x + curDir.y * dd.y, -1, 1);
  const a = Math.acos(d);
  if (a < 1e-6) return dd;

  const cross = curDir.x * dd.y - curDir.y * dd.x;
  const sign = cross < 0 ? -1 : 1;
  return rotate(curDir, sign * Math.min(maxAng, a));
}

/* 边缘软规避：靠近边缘就往中心拉 */
function steerFromEdges(pos, w, h, margin) {
  let fx = 0;
  let fy = 0;
  if (pos.x < margin) fx += (margin - pos.x) / margin;
  else if (pos.x > w - margin) fx -= (pos.x - (w - margin)) / margin;
  if (pos.y < margin) fy += (margin - pos.y) / margin;
  else if (pos.y > h - margin) fy -= (pos.y - (h - margin)) / margin;
  return { x: fx, y: fy };
}

/* 硬反弹保险（边缘规避失效时的兜底） */
function bounceIfHit(f, w, h, pad = 2) {
  if (f.pos.x < pad) { f.pos.x = pad; f.vel.x = Math.abs(f.vel.x); }
  else if (f.pos.x > w - pad) { f.pos.x = w - pad; f.vel.x = -Math.abs(f.vel.x); }
  if (f.pos.y < pad) { f.pos.y = pad; f.vel.y = Math.abs(f.vel.y); }
  else if (f.pos.y > h - pad) { f.pos.y = h - pad; f.vel.y = -Math.abs(f.vel.y); }
}

/**
 * 障碍物矩形规避：鱼会「绕开」矩形区域而非穿过。
 * 返回 {x,y,w} —— x,y 为远离矩形的归一化方向（已乘接近强度），w 为强度。
 * 距离 > margin 返回 null（暂不需要规避）。
 * 用于「网页背景」场景：矩形的物理来源是页面上的内容 DIV。
 */
function avoidRect(pos, rect, margin) {
  // 到矩形最近点（把鱼夹进矩形边界，得到最近边/角）
  const cx = clamp(pos.x, rect.x, rect.x + rect.w);
  const cy = clamp(pos.y, rect.y, rect.y + rect.h);
  const dx = pos.x - cx, dy = pos.y - cy;
  const d = Math.hypot(dx, dy);
  let nx, ny, strength;
  if (d >= margin) return null;
  if (d > 1e-6) {
    // 矩形外：沿「离矩形」法线推出，越近越强
    nx = dx / d; ny = dy / d;
    strength = (margin - d) / margin;
  } else {
    // 已进入矩形内：沿最近边界强力推出（兜底，防止穿越）
    const dl = pos.x - rect.x, dr = rect.x + rect.w - pos.x;
    const dtp = pos.y - rect.y, db = rect.y + rect.h - pos.y;
    const m = Math.min(dl, dr, dtp, db);
    if (m === dl) { nx = -1; ny = 0; }
    else if (m === dr) { nx = 1; ny = 0; }
    else if (m === dtp) { nx = 0; ny = -1; }
    else { nx = 0; ny = 1; }
    strength = 1;
  }
  return { x: nx * strength, y: ny * strength, w: strength };
}

/**
 * 推进整个世界一步。
 * @param world  当前世界状态
 * @param dt     帧间隔（秒）
 * @param params 模拟参数
 * @param time   绝对时间（秒），用于游荡扰动
 */
export function step(world, dt, params, time) {
  const { fish } = world;

  // 点击目标随时间衰减
  world.goalStrength = Math.max(0, world.goalStrength - dt * 0.8);
  if (world.goalStrength === 0) world.goal = null;

  // 涟漪老化
  for (const rp of world.ripples) rp.age += dt;
  world.ripples = world.ripples.filter((r) => r.age < 1.2);

  const rN = params.neighborRadius;
  const rN2 = rN * rN;
  const rS = params.separationRadius;
  const rS2 = rS * rS;
  const cosHalfFov = Math.cos(((params.fovDeg * Math.PI) / 180) * 0.5);
  const maxTurn = params.turnRate * dt;

  for (let i = 0; i < fish.length; i++) {
    const f = fish[i];

    let sumW = 0;
    let center = v2(0, 0);
    let avgVel = v2(0, 0);
    let sep = v2(0, 0);

    const fwd = len2(f.vel) > 1e-6 ? norm(f.vel) : v2(1, 0);

    for (let j = 0; j < fish.length; j++) {
      if (i === j) continue;
      const o = fish[j];
      const dx = o.pos.x - f.pos.x;
      const dy = o.pos.y - f.pos.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > rN2 || d2 < 1e-9) continue;

      const d = Math.sqrt(d2);

      // FOV 视野锥过滤
      const dirTo = { x: dx / d, y: dy / d };
      if (fwd.x * dirTo.x + fwd.y * dirTo.y < cosHalfFov) continue;

      // 距离衰减权重
      const w = 1 - d / rN;
      sumW += w;
      center.x += o.pos.x * w;
      center.y += o.pos.y * w;
      avgVel.x += o.vel.x * w;
      avgVel.y += o.vel.y * w;

      // 分离：反平方力，超近距离强排斥
      if (d2 < rS2) {
        const inv = 1 / (d2 + 8);
        sep.x -= dx * inv;
        sep.y -= dy * inv;
      }
    }

    let acc = v2(0, 0);

    // 分离 / 对齐 / 聚合
    if (sumW > 0) {
      center.x /= sumW; center.y /= sumW;
      avgVel.x /= sumW; avgVel.y /= sumW;

      const desiredS = mul(norm(sep), params.maxSpeed);
      const desiredA = mul(norm(avgVel), params.maxSpeed);
      const desiredC = mul(norm(sub(center, f.pos)), params.maxSpeed);

      acc = add(acc, mul(steerTowards(f.vel, desiredS, params.maxForce), params.wSep));
      acc = add(acc, mul(steerTowards(f.vel, desiredA, params.maxForce), params.wAli));
      acc = add(acc, mul(steerTowards(f.vel, desiredC, params.maxForce), params.wCoh));
    }

    // 点击目标（趋近食物）权重
    if (world.goal) {
      const desiredG = mul(norm(sub(world.goal, f.pos)), params.maxSpeed);
      acc = add(acc, mul(steerTowards(f.vel, desiredG, params.maxForce), params.wGoal * world.goalStrength));
    }

    // 游走扰动，让鱼群不呆板
    if (params.wWander > 0) {
      const wv = v2(Math.cos(time * 1.1 + f.phase), Math.sin(time * 1.1 + f.phase));
      acc = add(acc, mul(wv, params.wWander * params.maxForce));
    }

    // 边缘规避
    {
      const margin = 140;
      const edge = steerFromEdges(f.pos, world.w, world.h, margin);
      if (edge.x !== 0 || edge.y !== 0) {
        const edgeSteer = steerTowards(f.vel, mul(norm(edge), params.maxSpeed), params.maxForce);
        acc = add(acc, mul(edgeSteer, 1.15));
      }
    }

    // 障碍物避让：鱼绕开矩形区域（网页背景里避开内容 DIV）。
    // 用「预测位置(鱼头正前方)」做前瞻绕行，保证鱼在进入障碍前就提前转向、不穿越。
    {
      const obstacles = world.obstacles || [];
      if (obstacles.length) {
        const margin = params.obstacleMargin ?? 100;     // 预测点避让半径
        const weight = params.obstacleWeight ?? 3.2;     // 避让力权重
        const lookAhead = params.obstacleLookAhead ?? 70; // 向前预测距离
        const px = f.pos.x + fwd.x * lookAhead;
        const py = f.pos.y + fwd.y * lookAhead;
        for (const ob of obstacles) {
          // ① 前瞻：预测点接近障碍即提前转向避让（略弱，负责远处的绕行动作）
          const ap = avoidRect({ x: px, y: py }, ob, margin);
          if (ap) {
            const desired = mul(norm(v2(ap.x, ap.y)), params.maxSpeed);
            acc = add(acc, mul(steerTowards(f.vel, desired, params.maxForce), weight * ap.w * 0.9));
          }
          // ② 近身：实际头部接近障碍时强力推出（负责「不穿越」的兜底，方向独立不抵消）
          const a = avoidRect(f.pos, ob, margin * 0.6);
          if (a) {
            const desired = mul(norm(v2(a.x, a.y)), params.maxSpeed);
            acc = add(acc, mul(steerTowards(f.vel, desired, params.maxForce), weight * a.w));
          }
        }
      }
    }

    // 积分
    const nextVel = add(f.vel, mul(acc, dt));

    // 速度控制：向「偏好游速」逼近，限制在 [minSpeed, maxSpeed]。
    // 每条鱼有 speedRatio（0.55~0.9），目标 = params.maxSpeed * speedRatio，
    // 这样拖 maxSpeed 滑杆能让整群一起变速，同时保留个体差异。
    const speedNow = Math.sqrt(len2(nextVel));
    const ratio = f.speedRatio ?? (f.cruise / (params.maxSpeed || 1));
    const target = clamp(params.maxSpeed * ratio, params.minSpeed, params.maxSpeed);
    const k = 1 - Math.exp(-dt * 1.8);
    const speed = clamp(speedNow + (target - speedNow) * k, params.minSpeed, params.maxSpeed);

    // 转向限制，让弧线更优美
    const desiredDir = len2(nextVel) > 1e-8 ? norm(nextVel) : fwd;
    const limitedDir = turnTowardDir(f.vel, desiredDir, maxTurn);

    f.vel = mul(limitedDir, speed);
    f.pos = add(f.pos, mul(f.vel, dt));

    bounceIfHit(f, world.w, world.h, 2);

    // 解算脊椎骨架：头部略向前引，让身体柔和跟随
    const forward = norm(f.vel);
    const headTarget = add(f.pos, mul(forward, params.chainHeadLead));
    f.chain.resolve(headTarget);
  }
}
