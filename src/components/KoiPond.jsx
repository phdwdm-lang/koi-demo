'use client';

/**
 * KoiPond — 水彩锦鲤 · 国风荷塘背景（React 组件）
 *
 * 是由「material-demo.html」单文件 demo 剪裁而来：保留核心渲染与交互
 * （水彩背景 + 荷叶/荷花 + 水彩锦鲤 + 点击/拖动引导鱼群），剔除：
 *   1. 调试滑杆面板 / 素材布置编辑面板 / 障碍卡片（demo 专用工具）
 *   2. demo 里的 2D 涟漪（改用官方 RippleDistortion 做折射）
 *   3. 未被 drawFishKoi 调用的遗留代码（贴图鳍 / 程序化软鳍 / 素材拖拽）
 *
 * 组件把鱼池渲染进一个 <canvas>，并通过外部传入的 canvasRef 暴露出去，
 * 供 RippleDistortion 作为「动态纹理源」做 WebGL 折射 —— 鱼/荷叶会随
 * 指尖涟漪一起被扭动。
 */
import { useEffect } from 'react';
import {
  DEFAULT_PARAMS,
  createWorld,
  stepWorld,
  snapshotFish,
  setGoal,
  addFish,
  removeFish,
  setObstacles,
} from './index.js';

// 素材改为 public 绝对路径：当前 Turbopack 构建对 `import ... .png` 静态资源解析失效
// （图片无法加载，导致背景/荷叶/荷花都不显示），改成「复制到 public/ + 绝对 URL」即可正常加载。
const bgWatercolor = '/bg-koi-pond.png';
const leaf01 = '/lotus-leaf-01.png';
const leaf02 = '/lotus-leaf-02.png';
const leaf03 = '/lotus-leaf-03.png';
const leaf04 = '/lotus-leaf-04.png';
const bloom01 = '/lotus-bloom-01.png';
const bloom02 = '/lotus-bloom-02.png';
const bloom03 = '/lotus-bloom-03.png';
const bud01 = '/lotus-bud-01.png';
const bud02 = '/lotus-bud-02.png';

const KoiPond = ({ canvasRef, className = '', style }) => {
  useEffect(() => {
    const canvas = canvasRef?.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let DPR = 1;
    let world = null;
    let raf = 0;
    let last = performance.now();

    const ui = { fishScale: 0.3 }; // 鱼体量系数（默认，同 demo）
    // 投影配置：恒定右下偏移 + 大 blur + 低透明度 → 深水悬浮感（单层投影）
    globalThis.__koiShadow = { x: 12, y: 30, blur: 5, alpha: 0.2 };

    // ============ 素材加载（水彩贴图，懒加载：绘制时检查 naturalWidth）============
    const SPR = {
      leaves: [],
      blooms: [],
      buds: [],
    };
    const loadImage = (url) => {
      const im = new Image();
      im.src = url;
      return im;
    };
    SPR.leaves.push(...[leaf01, leaf02, leaf03, leaf04].map(loadImage));
    SPR.blooms.push(...[bloom01, bloom02, bloom03].map(loadImage));
    SPR.buds.push(...[bud01, bud02].map(loadImage));

    const bgImg = loadImage(bgWatercolor);

    // ============ 背景（预渲染到离屏画布，尺寸变化时重建一次）============
    const bgCanvas = document.createElement('canvas');

    // 素材内「主体中心」锚点（图内归一 0~1）与主体占图宽比例，用于按主体直径 D 缩放贴图。
    const SPRC = {
      leaf: { span: 0.94, ax: 0.5, ay: 0.46 },
      bloom: { span: 0.8, ax: 0.5, ay: 0.36 },
      bud: { span: 0.6, ax: 0.5, ay: 0.34 },
    };

    function drawPlantSprite(img, x, y, D, rot, alpha, kind, mirror) {
      if (!img || !img.naturalWidth) return;
      const C = SPRC[kind];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      if (mirror) ctx.scale(-1, 1);
      const s = D / (img.naturalWidth * C.span);
      const dw = img.naturalWidth * s;
      const dh = img.naturalHeight * s;
      let ax = C.ax;
      if (mirror) ax = 1 - ax;
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, -ax * dw, -C.ay * dh, dw, dh);
      ctx.restore();
    }

    // 按图形状生成投影：brightness(0) 变纯黑 + 半透明 + 右下偏移
    function drawPlantShadow(img, x, y, D, rot, kind, alpha, mirror) {
      if (!img || !img.naturalWidth) return;
      const C = SPRC[kind];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      if (mirror) ctx.scale(-1, 1);
      const s = D / (img.naturalWidth * C.span);
      const dw = img.naturalWidth * s;
      const dh = img.naturalHeight * s;
      let ax = C.ax;
      if (mirror) ax = 1 - ax;
      ctx.globalAlpha = alpha;
      ctx.filter = 'brightness(0)';
      ctx.drawImage(img, -ax * dw, -C.ay * dh, dw, dh);
      ctx.filter = 'none';
      ctx.restore();
    }

    function drawLilyPad(p) {
      const { pos, r, rot } = p;
      const idx = ((p.hue * 7) | 0) % SPR.leaves.length;
      const img = SPR.leaves[idx] || SPR.leaves[0];
      drawPlantShadow(img, pos.x + 6, pos.y + 8, r * 2, rot, 'leaf', 0.14, ((p.hue * 3) | 0) % 2 === 1);
      drawPlantSprite(img, pos.x, pos.y, r * 2, rot, 0.96, 'leaf', ((p.hue * 3) | 0) % 2 === 1);
    }

    function drawLotus(l) {
      const isBloom = l.type === 'bloom';
      const arr = isBloom ? SPR.blooms : SPR.buds;
      const img = arr[l.n % arr.length] || arr[0];
      const D = l.size * 2;
      drawPlantShadow(img, l.x + 5, l.y + 7, D, l.rot, isBloom ? 'bloom' : 'bud', 0.12, (l.n % 2) === 1);
      drawPlantSprite(img, l.x, l.y, D, l.rot, 0.98, isBloom ? 'bloom' : 'bud', (l.n % 2) === 1);
    }

    // ============ 尺寸 / 世界初始化 ============
    let decorLeaves = [];
    let lotuses = [];

    function buildBackground() {
      bgCanvas.width = Math.floor(W * DPR);
      bgCanvas.height = Math.floor(H * DPR);
      const b = bgCanvas.getContext('2d');
      b.setTransform(DPR, 0, 0, DPR, 0, 0);
      b.clearRect(0, 0, W, H);
      if (bgImg.complete && bgImg.naturalWidth) {
        const iw = bgImg.naturalWidth;
        const ih = bgImg.naturalHeight;
        const s = Math.max(W / iw, H / ih);
        const dw = iw * s;
        const dh = ih * s;
        b.drawImage(bgImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
      } else {
        const base = b.createLinearGradient(0, 0, 0, H);
        base.addColorStop(0, '#d9ede3');
        base.addColorStop(0.5, '#c9e3d7');
        base.addColorStop(1, '#cfe7db');
        b.fillStyle = base;
        b.fillRect(0, 0, W, H);
      }
      const vig = b.createRadialGradient(
        W * 0.5, H * 0.5, Math.min(W, H) * 0.35,
        W * 0.5, H * 0.5, Math.max(W, H) * 0.78
      );
      vig.addColorStop(0, 'rgba(255,255,255,0)');
      vig.addColorStop(1, 'rgba(40,90,70,0.10)');
      b.fillStyle = vig;
      b.fillRect(0, 0, W, H);
    }

    function buildDecor() {
      decorLeaves = [
        { pos: { x: W * 0.1, y: H * 0.16 }, r: 84, rot: 0.35, hue: 1 },
        { pos: { x: W * 0.88, y: H * 0.9 }, r: 90, rot: -0.28, hue: 3 },
        { pos: { x: W * 0.08, y: H * 0.88 }, r: 78, rot: 0.14, hue: 0 },
        { pos: { x: W * 0.9, y: H * 0.86 }, r: 74, rot: -0.6, hue: 2 },
        { pos: { x: W * 0.25, y: H * 0.62 }, r: 60, rot: 1.05, hue: 4 },
        { pos: { x: W * 0.77, y: H * 0.4 }, r: 52, rot: -1.15, hue: 2 },
        { pos: { x: W * 0.93, y: H * 0.48 }, r: 46, rot: 0.65, hue: 1 },
      ];
      lotuses = [
        { x: W * 0.3, y: H * 0.3, size: 30, rot: 0.3, type: 'bloom', n: 0 },
        { x: W * 0.8, y: H * 0.22, size: 28, rot: -0.55, type: 'bloom', n: 1 },
        { x: W * 0.18, y: H * 0.72, size: 32, rot: 0.9, type: 'bloom', n: 2 },
        { x: W * 0.66, y: H * 0.7, size: 22, rot: -0.4, type: 'bud', n: 3 },
        { x: W * 0.53, y: H * 0.13, size: 20, rot: 0.5, type: 'bud', n: 4 },
      ];
    }

    function resize() {
      DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      W = Math.floor(canvas.clientWidth || window.innerWidth);
      H = Math.floor(canvas.clientHeight || window.innerHeight);
      canvas.width = Math.floor(W * DPR);
      canvas.height = Math.floor(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      buildBackground();
      buildDecor();
      if (world) {
        world.w = W;
        world.h = H;
      }
    }

    // ============ 水彩锦鲤渲染 ============
    const PROF = [0.62, 0.82, 0.9, 0.86, 0.74, 0.6, 0.46, 0.34, 0.24, 0.16, 0.1, 0.06];
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

    function drawClosedCatmullRom(pts, closed) {
      if (pts.length < 2) return;
      const p = pts;
      const n = p.length;
      const get = (i) => (closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]);
      ctx.beginPath();
      ctx.moveTo(p[0].x, p[0].y);
      for (let i = 0; i < n; i++) {
        const p0 = get(i - 1);
        const p1 = get(i);
        const p2 = get(i + 1);
        const p3 = get(i + 2);
        const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
        const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
        ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p2.x, p2.y);
        if (!closed && i === n - 2) break;
      }
      ctx.closePath();
    }

    // 把曲线作为子路径追加到当前 path（供离屏剪影一次 fill）
    function appendCatmullRom(pts, closed, g = ctx) {
      if (pts.length < 2) return;
      const p = pts;
      const n = p.length;
      const get = (i) => (closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]);
      g.moveTo(p[0].x, p[0].y);
      for (let i = 0; i < n; i++) {
        const p0 = get(i - 1);
        const p1 = get(i);
        const p2 = get(i + 1);
        const p3 = get(i + 2);
        const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
        const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
        g.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p2.x, p2.y);
        if (!closed && i === n - 2) break;
      }
      g.closePath();
    }

    function drawFinEllipse(p, rot, w, h) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    let shadowBuf = null;

    function drawFishKoi(f, o = {}) {
      const j = f.joints;
      const a = f.angles;
      if (!j || j.length < 12) return;
      const scale = 0.22 * (ui.fishScale / 0.3);
      const shadow = !!o.shadow;
      const shiftX = shadow ? (o.shiftX ?? 4) : 0;
      const shiftY = shadow ? (o.shiftY ?? 8) : 0;
      const alpha = shadow ? (o.alpha ?? 0.3) : 1;
      const SH = globalThis.__koiShadow ?? { x: 4, y: 8, blur: 12, alpha: 0.3 };
      const SHADOW_C = 'rgba(26,61,48,1)';

      const KOI = { white: 'rgba(246,241,230,1)', red: 'rgba(228,91,44,1)', black: 'rgba(20,20,22,1)' };
      const bodyBase = shadow ? SHADOW_C : KOI.white;
      const finKey = shadow ? 'white' : (f.koi?.fin ?? 'white');
      const finColor = shadow
        ? SHADOW_C
        : finKey === 'red'
          ? KOI.red
          : finKey === 'black'
            ? KOI.black
            : KOI.white;
      const strokeColor = shadow ? SHADOW_C : 'rgba(255,255,255,0.70)';
      const baseWidths = [68, 81, 84, 83, 77, 64, 51, 38, 32, 19];
      const bodyWidth = baseWidths.map((w) => w * scale);
      const getPos = (i, angleOffset, lengthOffset, widths = bodyWidth) => {
        const w = (widths[i] ?? widths[widths.length - 1]) + lengthOffset;
        const ang = a[i] + angleOffset;
        return { x: j[i].x + Math.cos(ang) * w, y: j[i].y + Math.sin(ang) * w };
      };
      const relDiff = (x, y) => {
        let d = y - x;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        return d;
      };
      const headToMid1 = relDiff(a[0], a[6]);
      const headToMid2 = relDiff(a[0], a[7]);
      const headToTail = headToMid1 + relDiff(a[6], a[11]);

      ctx.save();
      ctx.translate(shiftX, shiftY);
      ctx.globalAlpha = alpha;
      if (shadow) {
        ctx.shadowColor = SHADOW_C;
        ctx.shadowBlur = o.blur ?? SH.blur;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = 2;
      ctx.strokeStyle = strokeColor;

      // 尾鳍轮廓
      const tailPts = [];
      for (let i = 8; i < 12; i++) {
        const tailWidth = 1.5 * headToTail * (i - 8) * (i - 8);
        tailPts.push({ x: j[i].x + Math.cos(a[i] - Math.PI / 2) * tailWidth, y: j[i].y + Math.sin(a[i] - Math.PI / 2) * tailWidth });
      }
      for (let i = 11; i >= 8; i--) {
        const tailWidth = clamp(headToTail * 6, -13, 13);
        tailPts.push({ x: j[i].x + Math.cos(a[i] + Math.PI / 2) * tailWidth, y: j[i].y + Math.sin(a[i] + Math.PI / 2) * tailWidth });
      }
      // 身体轮廓
      const outline = [];
      for (let i = 0; i < 10; i++) outline.push(getPos(i, Math.PI / 2, 0));
      outline.push(getPos(9, Math.PI, 0));
      for (let i = 9; i >= 0; i--) outline.push(getPos(i, -Math.PI / 2, 0));
      const w0 = bodyWidth[0];
      const archAng = 0.35;
      const archFwd = w0 * 0.35;
      const tipFwd = w0 * 0.5;
      outline.push(getPos(0, -archAng, archFwd));
      outline.push(getPos(0, 0, tipFwd));
      outline.push(getPos(0, archAng, archFwd));
      outline.push(getPos(0, Math.PI / 2, 0));
      outline.push(getPos(1, Math.PI / 2, 0));
      outline.push(getPos(2, Math.PI / 2, 0));
      // 阴影用「放大 1.16 的饱满身体轮廓」作底
      const wideWidths = bodyWidth.map((w) => w * 1.16);
      const outlineWide = [];
      for (let i = 0; i < 10; i++) outlineWide.push(getPos(i, Math.PI / 2, 0, wideWidths));
      outlineWide.push(getPos(9, Math.PI, 0, wideWidths));
      for (let i = 9; i >= 0; i--) outlineWide.push(getPos(i, -Math.PI / 2, 0, wideWidths));
      const ww0 = wideWidths[0];
      const wArchAng = 0.35;
      const wArchFwd = ww0 * 0.35;
      const wTipFwd = ww0 * 0.5;
      outlineWide.push(getPos(0, -wArchAng, wArchFwd, wideWidths));
      outlineWide.push(getPos(0, 0, wTipFwd, wideWidths));
      outlineWide.push(getPos(0, wArchAng, wArchFwd, wideWidths));
      outlineWide.push(getPos(0, Math.PI / 2, 0, wideWidths));
      outlineWide.push(getPos(1, Math.PI / 2, 0, wideWidths));
      outlineWide.push(getPos(2, Math.PI / 2, 0, wideWidths));
      // 胸/腹鳍（4 片椭圆）
      const fins = [
        [getPos(3, Math.PI / 3, 0), a[2] - Math.PI / 4, 160 * scale, 64 * scale],
        [getPos(3, -Math.PI / 3, 0), a[2] + Math.PI / 4, 160 * scale, 64 * scale],
        [getPos(7, Math.PI / 2, 0), a[6] - Math.PI / 4, 96 * scale, 32 * scale],
        [getPos(7, -Math.PI / 2, 0), a[6] + Math.PI / 4, 96 * scale, 32 * scale],
      ];
      const dP4 = j[4];
      const dP5 = j[5];
      const dP6 = j[6];
      const dP7 = j[7];
      const dC1 = { x: dP6.x + Math.cos(a[6] + Math.PI / 2) * headToMid2 * 16 * scale, y: dP6.y + Math.sin(a[6] + Math.PI / 2) * headToMid2 * 16 * scale };
      const dC2 = { x: dP5.x + Math.cos(a[5] + Math.PI / 2) * headToMid1 * 16 * scale, y: dP5.y + Math.sin(a[5] + Math.PI / 2) * headToMid1 * 16 * scale };

      if (shadow) {
        // 投影层：离屏实心同色剪影（身体+鳍+尾+背鳍），避免非零环绕抵消成白洞
        const sw = Math.floor(W * DPR);
        const sh = Math.floor(H * DPR);
        if (!shadowBuf) shadowBuf = document.createElement('canvas');
        if (shadowBuf.width !== sw || shadowBuf.height !== sh) {
          shadowBuf.width = sw;
          shadowBuf.height = sh;
        }
        const g = shadowBuf.getContext('2d');
        g.setTransform(DPR, 0, 0, DPR, 0, 0);
        g.clearRect(0, 0, W, H);
        g.fillStyle = SHADOW_C;
        g.beginPath();
        appendCatmullRom(outlineWide, true, g);
        g.fill();
        for (const [p, rot, w, h] of fins) {
          g.beginPath();
          g.ellipse(p.x, p.y, w * 0.5, h * 0.5, rot, 0, Math.PI * 2);
          g.fill();
        }
        g.beginPath();
        appendCatmullRom(tailPts, true, g);
        g.fill();
        const dk = 3.4;
        const kC1 = { x: dP6.x + (dC1.x - dP6.x) * dk, y: dP6.y + (dC1.y - dP6.y) * dk };
        const kC2 = { x: dP5.x + (dC2.x - dP5.x) * dk, y: dP5.y + (dC2.y - dP5.y) * dk };
        g.beginPath();
        g.moveTo(dP4.x, dP4.y);
        g.bezierCurveTo(dP5.x, dP5.y, dP6.x, dP6.y, dP7.x, dP7.y);
        g.bezierCurveTo(kC1.x, kC1.y, kC2.x, kC2.y, dP4.x, dP4.y);
        g.closePath();
        g.fill();
        ctx.save();
        ctx.filter = `blur(${o.blur ?? SH.blur}px)`;
        ctx.drawImage(shadowBuf, 0, 0, W, H);
        ctx.restore();
      } else {
        // 本体层
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = finColor;
        for (const [p, rot, w, h] of fins) drawFinEllipse(p, rot, w, h);
        ctx.restore();

        ctx.fillStyle = finColor;
        drawClosedCatmullRom(tailPts, true);
        ctx.fill();
        ctx.stroke();

        drawClosedCatmullRom(outline, true);
        ctx.fillStyle = bodyBase;
        ctx.fill();

        // 斑纹（clip 到身体轮廓内）
        ctx.save();
        ctx.clip();
        const spots = f.koi?.spots;
        if (spots?.length) {
          for (const sp of spots) {
            const idx = Math.max(0, Math.min(9, Math.floor(sp.u * 10)));
            const p = j[idx];
            const ang = a[idx];
            const nx = Math.cos(ang + Math.PI / 2);
            const ny = Math.sin(ang + Math.PI / 2);
            const w = bodyWidth[idx] ?? bodyWidth[0];
            const cx = p.x + nx * sp.v * w * 0.9;
            const cy = p.y + ny * sp.v * w * 0.9;
            const rx = w * sp.rx;
            const ry = w * sp.ry;
            const stamps = 2 + ((idx * 131 + Math.floor(sp.u * 997)) % 3);
            for (let s = 0; s < stamps; s++) {
              const jitterA = (s - (stamps - 1) / 2) * 0.35;
              const jitterR = 0.25 + s * 0.1;
              ctx.save();
              ctx.translate(
                cx + Math.cos(ang + jitterA) * rx * 0.25 * jitterR,
                cy + Math.sin(ang + jitterA) * ry * 0.25 * jitterR
              );
              ctx.rotate(ang + sp.rot + jitterA);
              ctx.beginPath();
              ctx.ellipse(0, 0, rx * (0.9 - s * 0.12), ry * (0.9 - s * 0.12), 0, 0, Math.PI * 2);
              ctx.fillStyle = sp.color === 'red' ? KOI.red : KOI.black;
              ctx.fill();
              ctx.restore();
            }
          }
        }
        ctx.restore();

        drawClosedCatmullRom(outline, true);
        ctx.strokeStyle = strokeColor;
        ctx.stroke();

        // 眼睛
        ctx.fillStyle = 'rgba(255,255,255,0.90)';
        const e1 = getPos(0, Math.PI / 2, -18 * scale);
        const e2 = getPos(0, -Math.PI / 2, -18 * scale);
        const er = 24 * scale * 0.42;
        ctx.beginPath();
        ctx.arc(e1.x, e1.y, er, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(e2.x, e2.y, er, 0, Math.PI * 2);
        ctx.fill();

        // 背鳍（贝塞尔三角）
        ctx.save();
        ctx.globalAlpha = 0.72;
        ctx.fillStyle = finColor;
        ctx.beginPath();
        ctx.moveTo(dP4.x, dP4.y);
        ctx.bezierCurveTo(dP5.x, dP5.y, dP6.x, dP6.y, dP7.x, dP7.y);
        ctx.bezierCurveTo(dC1.x, dC1.y, dC2.x, dC2.y, dP4.x, dP4.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    function drawFish(f) {
      ctx.save();
      const sh = globalThis.__koiShadow ?? { x: 12, y: 30, blur: 18, alpha: 0.15 };
      globalThis.__koiShadow = sh;
      if (sh.alpha > 0) {
        drawFishKoi(f, { shadow: true, shiftX: sh.x, shiftY: sh.y, alpha: sh.alpha, blur: sh.blur });
      }
      drawFishKoi(f, { shadow: false });
      ctx.restore();
    }

    function drawGoal() {
      if (!world.goal) return;
      const p = world.goal;
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 200);
      ctx.strokeStyle = 'rgba(255,238,180,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6 + pulse * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 16 + pulse * 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,238,180,0.3)';
      ctx.stroke();
    }

    // ============ 动画循环 ============
    function loop(now) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      stepWorld(world, dt, t);

      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(bgCanvas, 0, 0, W, H);
      drawGoal();
      const snaps = world.fish.map((f) => snapshotFish(f, t));
      for (const f of snaps) drawFish(f);
      // 【临时】移除所有荷花和荷叶（drawLilyPad / drawLotus），观察无植物的水域效果
      // for (const lp of decorLeaves) drawLilyPad(lp);
      // for (const l of lotuses) drawLotus(l);

      raf = requestAnimationFrame(loop);
    }

    // ============ 初始化 ============
    resize();
    world = createWorld(W, H, 4, {
      ...DEFAULT_PARAMS,
      count: 4,
      minSpeed: 32,
      maxSpeed: 172,
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
      chainMaxBend: Math.PI / 9,
    });
    window.__koiWorld = world;
    // 运行时调节句柄：供参数控制台实时改「鱼体大小 / 鱼数量」
    globalThis.__koiUi = ui;
    globalThis.__koiAPI = { addFish, removeFish, setObstacles: (rects) => setObstacles(world, rects) };
    // 供外部（如首页卡片障碍物）直接喂入矩形避让区
    window.__koiSetObstacles = (rects) => setObstacles(world, rects);

    // 点击/拖动 → 引导鱼群聚拢（涟漪由 RippleDistortion 负责）
    const ptFromEvent = (e) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const inCanvas = (p) => p.x >= 0 && p.y >= 0 && p.x <= W && p.y <= H;
    let down = false;
    // 鼠标/触点的「水下阴影」位置：始终跟随指针（不依赖是否按下），作为鼠标在水面投下的柔影
    const cursor = { on: false, x: 0, y: 0 };
    // 监听 window 而非 canvas：因为 RippleDistortion 的折射 canvas 会覆盖在鱼池 canvas 上，
    // 鼠标事件落在上层 canvas、不会穿透到下层；改用 window 监听 + 坐标边界判断，保证点击/拖动
    // 既能引导鱼群聚拢，又不会误触发 canvas 区域外的交互。
    const onDown = (e) => {
      const p = ptFromEvent(e);
      if (!inCanvas(p)) return;
      down = true;
      setGoal(world, { x: p.x, y: p.y });
    };
    const onMove = (e) => {
      const p = ptFromEvent(e);
      if (inCanvas(p)) {
        cursor.x = p.x;
        cursor.y = p.y;
        cursor.on = true;
      } else {
        cursor.on = false;
      }
      if (!down) return;
      setGoal(world, { x: p.x, y: p.y });
    };
    const onUp = () => {
      down = false;
    };
    const onTouchStart = (e) => {
      const t = e.touches[0];
      if (!t) return;
      const p = ptFromEvent(t);
      if (!inCanvas(p)) return;
      down = true;
      cursor.x = p.x;
      cursor.y = p.y;
      cursor.on = true;
      setGoal(world, { x: p.x, y: p.y });
    };
    const onTouchMove = (e) => {
      const t = e.touches[0];
      if (!t) return;
      const p = ptFromEvent(t);
      if (inCanvas(p)) {
        cursor.x = p.x;
        cursor.y = p.y;
        cursor.on = true;
      }
      if (!down) return;
      setGoal(world, { x: p.x, y: p.y });
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
    window.addEventListener('resize', resize);

    bgImg.onload = buildBackground;
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [canvasRef]);

  return (
    <canvas ref={canvasRef} className={className} style={{ width: '100%', height: '100%', display: 'block', ...style }} />
  );
};

export default KoiPond;
