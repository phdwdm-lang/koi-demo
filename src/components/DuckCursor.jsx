'use client';

import { useEffect, useRef } from 'react';

/**
 * DuckCursor：把系统鼠标指针替换为鸭子。
 * 鸭子跟随鼠标位置移动；头部（正脸/喙方向）始终朝向鼠标「移动方向」。
 * 阴影：用 CSS drop-shadow 给鸭子轮廓投射与「鱼影」统一的阴影——
 *      偏移 x:12 / y:30、模糊 blur:5、透明度 alpha:0.2、颜色深墨绿 rgba(26,61,48)。
 *      关键：阴影方向固定（世界坐标恒为右下 12/30，不随鸭子旋转），
 *      避免「鼠标控制阴影」的观感——通过每帧按当前旋转角反向补偿 drop-shadow 偏移实现。
 * - pointer-events:none，事件穿透到画布/控制台，不阻塞交互
 * - 页面已设置 cursor:none，系统光标被隐藏
 */
export default function DuckCursor({ size = 62 }) {
  const wrapRef = useRef(null);
  const imgRef = useRef(null);
  const pos = useRef({ x: -9999, y: -9999 });      // 当前显示位置（鸭子中心）
  const target = useRef({ x: -9999, y: -9999 });  // 鼠标目标位置
  const angle = useRef(0);                        // 当前旋转角（度，顺时针）
  const targetAngle = useRef(0);                  // 目标旋转角
  const onInteractive = useRef(false);            // 鼠标是否落在可交互内容上（此时隐藏鸭子，露出系统光标）

  // 与鱼影一致的世界坐标阴影偏移（右下）与透明度
  const SHADOW_DX = 12;
  const SHADOW_DY = 30;

  useEffect(() => {
    // 初始按「背景」处理：显示鸭子、隐藏系统光标，避免首屏出现双重光标
    document.documentElement.classList.add('koi-bg');
    let raf;
    let last = { x: -9999, y: -9999 };

    const onMove = (e) => {
      const nx = e.clientX, ny = e.clientY;
      target.current.x = nx;
      target.current.y = ny;
      const dx = nx - last.x, dy = ny - last.y;
      if (Math.hypot(dx, dy) > 2) {
        // 让鸭子正脸(喙在图片下方)朝向移动方向：rotate θ 把图片下方向(0,1)旋转为 (-sinθ, cosθ)
        // 令其 = (dx,dy)/len → θ = atan2(-dx, dy)
        targetAngle.current = Math.atan2(-dx, dy) * 180 / Math.PI;
        last = { x: nx, y: ny };
      }

      // 内容判定：卡片/面板/链接/按钮/导航/文本区等任何「非背景」实体 → 显示系统光标、隐藏鸭子；
      // 仅当落在「背景」（空白水面/画布）时才显示鸭子、隐藏系统光标（配合 html.koi-bg 的 cursor:none）
      const el = document.elementFromPoint(nx, ny);
      const onContent =
        !!el?.closest?.('a, button, [role="button"], input, textarea, select, label, [data-interactive], .bento-card, .glass-card, .card-right, article, nav, header, footer, aside') ||
        !!el?.closest?.('[class*="bg-\\[var(--theme"]');
      if (onContent !== onInteractive.current) {
        onInteractive.current = onContent;
        const wrap = wrapRef.current;
        if (wrap) wrap.style.opacity = onContent ? '0' : '1';
        document.documentElement.classList.toggle('koi-bg', !onContent);
      }
    };

    const loop = () => {
      pos.current.x += (target.current.x - pos.current.x) * 0.3;
      pos.current.y += (target.current.y - pos.current.y) * 0.3;
      let diff = targetAngle.current - angle.current;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      angle.current += diff * 0.22;

      const wrap = wrapRef.current;
      if (wrap) {
        const half = size / 2;
        wrap.style.transform = `translate(${pos.current.x - half}px, ${pos.current.y - half}px) rotate(${angle.current.toFixed(2)}deg)`;
      }

      // 阴影方向固定：把世界偏移(12,30) 通过 rotate(-θ) 转回元素局部坐标，抵消 wrap 旋转
      const rad = angle.current * Math.PI / 180;
      const c = Math.cos(rad), s = Math.sin(rad);
      const ox = SHADOW_DX * c + SHADOW_DY * s;
      const oy = -SHADOW_DX * s + SHADOW_DY * c;
      const img = imgRef.current;
      if (img) {
        img.style.filter = `drop-shadow(${ox.toFixed(2)}px ${oy.toFixed(2)}px 5px rgba(26,61,48,0.2))`;
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener('pointermove', onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.classList.remove('koi-bg');
    };
  }, [size]);

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'fixed',
        left: 0, top: 0,
        width: size, height: size,
        pointerEvents: 'none',
        zIndex: 99999,
        willChange: 'transform',
      }}
    >
      {/* 鸭子主体（随朝向旋转）+ 与鱼统一且方向固定的轮廓阴影 */}
      <img
        ref={imgRef}
        src="/duck-cursor.png"
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          userSelect: 'none',
          // 实际偏移在 loop 中每帧按旋转角反向补偿，保证世界坐标恒为 (12,30)
          filter: 'drop-shadow(12px 30px 5px rgba(26,61,48,0.2))',
        }}
      />
    </div>
  );
}
