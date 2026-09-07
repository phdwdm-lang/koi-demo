// DecorativeLayer：渲染所有装饰素材（荷叶/荷花/花苞）。
// 叠加在鱼池底层 canvas 之上、RippleDistortion 之下（z-index:1）。
// 素材用百分比定位 + transform 实现位置/大小/旋转；顶部编辑框由 sibling 组件处理。

import { sizeToPx } from '../editor/editorState.js';

export default function DecorativeLayer({ items, selectedId, onSelect, onBodyPointerDown, preview = false, zIndex = 3 }) {
  // 按层级排序（z 越大越靠上），同一层按添加顺序
  const sorted = [...items].sort((a, b) => a.z - b.z);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: zIndex,
        pointerEvents: preview ? 'none' : 'none', // 装饰层本身不拦截；单个素材可点选
      }}
    >
      {sorted.map((it) => {
        const isSel = it.id === selectedId && !preview;
        const px = sizeToPx(it.w);
        return (
          <div
            key={it.id}
            data-decor-id={it.id}
            data-interactive
            onPointerDown={(e) => {
              if (preview) return;
              // 点击素材 → 选中。若已在编辑拖拽中则由编辑框处理，这里只负责选中。
              e.stopPropagation();
              onBodyPointerDown?.(e);
            }}
            onClick={(e) => {
              if (preview) return;
              e.stopPropagation();
              onSelect(it.id);
            }}
            style={{
              position: 'absolute',
              left: `${it.x}%`,
              top: `${it.y}%`,
              width: px,
              height: px,
              transform: `translate(-50%, -50%) rotate(${it.rotation}deg) ${it.flipX ? 'scaleX(-1)' : ''}`,
              opacity: it.opacity,
              zIndex: it.z,
              cursor: 'pointer',
              pointerEvents: isSel ? 'none' : 'auto', // 选中后由编辑框接管，避免素材自身与手柄冲突
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={it.src}
              alt=""
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                pointerEvents: 'none',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
