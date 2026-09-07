// DecorativeEditor：选中素材后的画布内编辑框。
// 在选中素材之上叠加一个可视化编辑框：可拖动移动、四角/四边缩放、顶部旋转手柄，
// 并带复制 / 删除 / 置顶 / 置底 快捷操作。所有操作直接发生在画布内，不做侧边操作栏。

import { sizeToPx } from '../editor/editorState.js';

const HANDLE_SIZE = 12; // 手柄尺寸(px)
const ROTATE_OFFSET = 26; // 旋转手柄离顶部边框的距离(px)

function Handles({ item, startResize, startRotate }) {
  const px = sizeToPx(item.w);
  const half = px / 2;
  const common = {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    background: '#fff',
    border: '2px solid #2e8b6a',
    borderRadius: 3,
    boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
    cursor: 'grab',
    zIndex: 1000,
  };
  // 四角 + 四边缩放锚点位置
  const anchors = [
    { pos: { left: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 }, cursor: 'nwse-resize' }, // 左上
    { pos: { left: half - HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 }, cursor: 'ns-resize' }, // 上中
    { pos: { left: px - HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 }, cursor: 'nesw-resize' }, // 右上
    { pos: { left: -HANDLE_SIZE / 2, top: half - HANDLE_SIZE / 2 }, cursor: 'ew-resize' }, // 左中
    { pos: { left: px - HANDLE_SIZE / 2, top: half - HANDLE_SIZE / 2 }, cursor: 'ew-resize' }, // 右中
    { pos: { left: -HANDLE_SIZE / 2, top: px - HANDLE_SIZE / 2 }, cursor: 'nesw-resize' }, // 左下
    { pos: { left: half - HANDLE_SIZE / 2, top: px - HANDLE_SIZE / 2 }, cursor: 'ns-resize' }, // 下中
    { pos: { left: px - HANDLE_SIZE / 2, top: px - HANDLE_SIZE / 2 }, cursor: 'nwse-resize' }, // 右下
  ];
  return (
    <>
      {/* 四角/四边缩放手柄 */}
      {anchors.map((a, i) => (
        <div
          key={i}
          onPointerDown={(e) => startResize(item.id, e)}
          style={{ ...common, ...a.pos, cursor: a.cursor }}
        />
      ))}
      {/* 顶部旋转手柄（圆形） */}
      <div
        onPointerDown={(e) => startRotate(item.id, e)}
        style={{
          position: 'absolute',
          left: half - 8,
          top: -HANDLE_SIZE / 2 - ROTATE_OFFSET,
          width: 16,
          height: 16,
          background: '#2e8b6a',
          border: '2px solid #fff',
          borderRadius: '50%',
          cursor: 'grab',
          zIndex: 1000,
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
      />
      {/* 旋转手柄到编辑框的连线 */}
      <div
        style={{
          position: 'absolute',
          left: half - 1,
          top: -HANDLE_SIZE / 2 - ROTATE_OFFSET + 8,
          width: 2,
          height: ROTATE_OFFSET - 8,
          background: '#2e8b6a',
          opacity: 0.6,
          zIndex: 999,
        }}
      />
    </>
  );
}

export default function DecorativeEditor({
  items,
  selectedId,
  startMove,
  startResize,
  startRotate,
  duplicateSelected,
  deleteSelected,
  bringToFront,
  sendToBack,
}) {
  const sel = items.find((it) => it.id === selectedId);
  if (!sel) return null;

  const px = sizeToPx(sel.w);
  const half = px / 2;

  // 操作条（画布内浮动小工具，跟随选中素材）
  const toolbarBtn = {
    flex: 1,
    padding: '4px 0',
    border: 'none',
    background: 'transparent',
    color: '#2e4a3e',
    fontSize: 12,
    cursor: 'pointer',
    lineHeight: 1.2,
    borderRadius: 4,
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: `${sel.x}%`,
        top: `${sel.y}%`,
        zIndex: 900,
        pointerEvents: 'none', // 编辑框本身不拦截，交给内部可交互区
      }}
    >
      {/* 编辑框主体（可拖动移动） */}
      <div
        onPointerDown={(e) => startMove(sel.id, e)}
        style={{
          position: 'absolute',
          left: -half,
          top: -half,
          width: px,
          height: px,
          transform: `rotate(${sel.rotation}deg)`,
          border: '2px solid #2e8b6a',
          background: 'rgba(46,139,106,0.06)',
          pointerEvents: 'auto',
          cursor: 'move',
          zIndex: 950,
        }}
      >
        <Handles item={sel} startResize={startResize} startRotate={startRotate} />
      </div>

      {/* 操作条：复制 / 删除 / 置顶 / 置底 */}
      <div
        style={{
          position: 'absolute',
          left: -half,
          top: -half - 44,
          width: px,
          display: 'flex',
          gap: 2,
          background: 'rgba(255,255,255,0.85)',
          border: '1px solid rgba(46,139,106,0.35)',
          borderRadius: 8,
          padding: '2px 4px',
          pointerEvents: 'auto',
          zIndex: 960,
          boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      >
        <button style={toolbarBtn} onClick={() => duplicateSelected()} title="复制">
          ⧉ 复制
        </button>
        <button style={toolbarBtn} onClick={() => deleteSelected()} title="删除">
          ✕ 删除
        </button>
        <button style={toolbarBtn} onClick={() => bringToFront()} title="置顶">
          ▲ 置顶
        </button>
        <button style={toolbarBtn} onClick={() => sendToBack()} title="置底">
          ▼ 置底
        </button>
      </div>
    </div>
  );
}
