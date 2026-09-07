/**
 * chain.js — Forward IK 脊椎链（鱼身骨架）
 *
 * 思想来自 krvnishka/koi-pond 的 chain.ts：
 * 头部作为锚点固定，后续关节沿「上一节方向」逐步推进，
 * 每个关节相对上一节的角度差被 maxBend 钳制，从而形成平滑的 S 形鱼身弯曲。
 *
 * 这一层只计算「身体在空间里的关节位置和朝向」，不关心鱼长什么样。
 * 材质层拿到 joints + angles 后，自己去盖颜色、贴鳍、加图案。
 */
import { v2, sub, len } from "./vec2.js";

const ang = (v) => Math.atan2(v.y, v.x);
const fromAng = (a) => ({ x: Math.cos(a), y: Math.sin(a) });

// 把角度 wrap 到 [-PI, PI]
function wrapPi(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export class Chain {
  constructor(jointCount, segLen, maxBend) {
    this.segLen = segLen;
    this.maxBend = maxBend;
    this.joints = [];
    this.angles = [];
    for (let i = 0; i < jointCount; i++) this.joints.push(v2(0, 0));
    for (let i = 0; i < jointCount; i++) this.angles.push(0);
  }

  /** 头部被外力推动后，重新解算整条脊椎 */
  resolve(headTarget) {
    const j = this.joints;

    // 头部锚点
    j[0].x = headTarget.x;
    j[0].y = headTarget.y;

    // 从第二节开始，沿上一节方向推进，弯曲角被 maxBend 钳制
    let prevDir = sub(j[0], j[1]);
    if (len(prevDir) < 1e-6) prevDir = v2(1, 0);
    let prevAngle = ang(prevDir);

    for (let i = 1; i < j.length; i++) {
      let desiredAngle = prevAngle;
      const curDir = sub(j[i - 1], j[i]);
      if (len(curDir) > 1e-6) desiredAngle = ang(curDir);

      const diff = wrapPi(desiredAngle - prevAngle);
      const clamped = prevAngle + clamp(diff, -this.maxBend, this.maxBend);
      const d = fromAng(clamped);

      j[i].x = j[i - 1].x - d.x * this.segLen;
      j[i].y = j[i - 1].y - d.y * this.segLen;

      prevAngle = clamped;
    }

    // 预计算每个关节的朝向（指向头部）
    for (let i = 1; i < j.length; i++) this.angles[i] = ang(sub(j[i - 1], j[i]));
    this.angles[0] = this.angles[1] ?? 0;
  }
}
