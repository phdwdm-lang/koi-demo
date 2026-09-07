import { useRef, useState, useCallback } from 'react';
import KoiPond from './components/KoiPond.jsx';
import RippleDistortion from './components/RippleDistortion.jsx';
import KoiControls from './components/KoiControls.jsx';
import DuckCursor from './components/DuckCursor.jsx';
import DecorativeLayer from './components/DecorativeLayer.jsx';
import DecorativeEditor from './components/DecorativeEditor.jsx';
import RippleControls from './components/RippleControls.jsx';
import SaveBar from './components/SaveBar.jsx';
import { useDecorativeEditor } from './editor/useDecorativeEditor.js';

// 涟漪参数默认值（与 RippleControls/defaultRipple 保持一致）
const DEFAULT_RIPPLE = {
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

export default function App() {
  const canvasRef = useRef(null);
  const [ripple, setRipple] = useState(DEFAULT_RIPPLE);

  const editor = useDecorativeEditor();

  const updateRipple = useCallback((key, value) => {
    setRipple((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetRipple = useCallback(() => setRipple(DEFAULT_RIPPLE), []);

  // 点击画布空白处 → 取消选中素材
  const handleCanvasPointerDown = useCallback(() => {
    editor.deselect();
  }, [editor]);

  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: '#cfe8dc',
        cursor: 'none',
      }}
      onPointerDown={handleCanvasPointerDown}
    >
      {/* 鱼池底层 canvas：作为 RippleDistortion 的动态纹理源（画到其中，供折射采样） */}
      <KoiPond canvasRef={canvasRef} className="koi-pond-canvas" />

      {/* 装饰图层：荷叶/荷花/花苞（z-index 1，位于水面之上、涟漪/鱼之下） */}
      <DecorativeLayer
        items={editor.items}
        selectedId={editor.selectedId}
        onSelect={editor.select}
        onBodyPointerDown={() => {}}
      />

      {/* 选中素材的画布内编辑框 */}
      <DecorativeEditor
        items={editor.items}
        selectedId={editor.selectedId}
        startMove={editor.startMove}
        startResize={editor.startResize}
        startRotate={editor.startRotate}
        duplicateSelected={editor.duplicateSelected}
        deleteSelected={editor.deleteSelected}
        bringToFront={editor.bringToFront}
        sendToBack={editor.sendToBack}
      />

      {/* 官方 RippleDistortion：每帧采样鱼池 canvas，移动/点击生成涟漪，鱼/荷叶随波扭动 */}
      <RippleDistortion
        sourceRef={canvasRef}
        src=""
        brushSize={ripple.brushSize}
        strength={ripple.strength}
        swirl={ripple.swirl}
        rings={ripple.rings}
        grayscale={ripple.grayscale === 1}
        spread={ripple.spread}
        dispersion={ripple.dispersion}
        glint={ripple.glint}
        tint={ripple.tint}
        tintAmount={ripple.tintAmount}
        trigger="both"
        quality={ripple.quality}
        style={{ position: 'absolute', inset: 0, zIndex: 2 }}
      />

      {/* 标题说明（不拦截鼠标，指针会落到 canvas 上） */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 4,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: '12vh',
          textAlign: 'center',
          fontFamily: '"Songti SC", "STSong", "SimSun", serif',
          color: '#2e4a3e',
        }}
      >
        <h1 style={{ fontSize: 34, fontWeight: 600, letterSpacing: 8, opacity: 0.85, margin: 0 }}>
          锦鲤戏游
        </h1>
        <p style={{ marginTop: 12, fontSize: 14, letterSpacing: 3, opacity: 0.6 }}>
          水彩荷塘 · 移动 / 点击水面，看鱼被涟漪扭动
        </p>
        <p style={{ marginTop: 6, fontSize: 12, letterSpacing: 2, opacity: 0.5 }}>
          点击荷叶可移动 / 缩放 / 旋转，复制后点「保存」留档
        </p>
      </div>

      {/* 涟漪参数控制台（实时联动 RippleDistortion） */}
      <RippleControls ripple={ripple} onChange={updateRipple} onReset={resetRipple} />

      {/* 装饰素材编辑工具条：保存 / 导出 / 恢复默认 / 素材库 */}
      <SaveBar
        onSave={editor.save}
        onExport={editor.exportJSON}
        onReset={editor.reset}
        onAddItem={(src) => editor.addItem(src)}
        savedAt={editor.savedAt}
      />

      {/* 鱼参数控制台（保留原有临时调试工具） */}
      <KoiControls />

      {/* 将系统鼠标替换为鸭子，头部朝向鼠标移动方向 */}
      <DuckCursor />
    </main>
  );
}
