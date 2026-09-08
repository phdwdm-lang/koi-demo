import { useRef, useState, useCallback, useMemo } from 'react';
import KoiPond from './components/KoiPond.jsx';
import RippleDistortion from './components/RippleDistortion.jsx';
import KoiControls from './components/KoiControls.jsx';
import DuckCursor from './components/DuckCursor.jsx';
import DecorativeLayer from './components/DecorativeLayer.jsx';
import DecorativeEditor from './components/DecorativeEditor.jsx';
import RippleControls from './components/RippleControls.jsx';
import SaveBar from './components/SaveBar.jsx';
import KoiPondViewer from './components/KoiPondViewer.jsx';
import { useDecorativeEditor } from './editor/useDecorativeEditor.js';
import { DEFAULT_RIPPLE, buildConfig, toJSON, readFishFromRuntime } from './config/koiConfig.js';



// 标题与说明文字（DOM 本体 + KoiPond 画布投影共用同一数据源，保证两者对齐）
const HEADER_TEXT = {
  title: '锦鲤戏游',
  subs: [
    '水彩荷塘 · 移动 / 点击水面，看鱼被涟漪扭动',
    '点击荷叶可移动 / 缩放 / 旋转，复制后点「保存」留档',
  ],
};

export default function App() {
  const canvasRef = useRef(null);
  const [ripple, setRipple] = useState(DEFAULT_RIPPLE);
  // 形态开关：?mode=view → 纯动效（无任何编辑面板、禁用画布编辑）；默认/?mode=edit → 编辑器。
  // 供部署方把「测试页」与「正式动效」用同一份代码区分。
  const initialMode = useMemo(() => {
    if (typeof window === 'undefined') return 'edit';
    const m = new URLSearchParams(window.location.search).get('mode');
    return m === 'view' ? 'view' : 'edit';
  }, []);
  const [viewMode, setViewMode] = useState(initialMode === 'view');

  const editor = useDecorativeEditor();

  const updateRipple = useCallback((key, value) => {
    setRipple((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetRipple = useCallback(() => setRipple(DEFAULT_RIPPLE), []);

  // 导出统一配置：把当前 decor/ripple/fish 组装成一份标准 JSON，复制到剪贴板给 AI。
  // decor 用 editor.items；ripple 用 state；fish 从 KoiPond 运行时句柄读取。
  const exportConfig = useCallback(async () => {
    const fish = readFishFromRuntime();
    if (!fish) return false;
    const config = buildConfig({ decor: editor.items, ripple, fish });
    const text = toJSON(config);
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // Clipboard 不可用时回退为下载文件
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'koi-config.json';
      a.click();
      URL.revokeObjectURL(url);
      return true;
    }
  }, [editor.items, ripple]);

  // 点击画布空白处 → 取消选中素材
  const handleCanvasPointerDown = useCallback(() => {
    editor.deselect();
  }, [editor]);

  // 切换观赏模式：进入时清除素材选中态
  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => {
      const next = !prev;
      if (next) editor.deselect();
      return next;
    });
  }, [editor]);

  // view 形态下喂给 KoiPondViewer 的统一配置：与「导出配置」同一来源，保证正式动效 = 当前测试页效果。
  const viewModeConfig = useMemo(() => {
    const fish = readFishFromRuntime();
    return buildConfig({ decor: editor.items, ripple, fish });
  }, [editor.items, ripple]);

  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: '#cfe8dc',
        cursor: viewMode ? 'auto' : 'none',
      }}
      onPointerDown={handleCanvasPointerDown}
    >
      {viewMode ? (
        /* 正式动效：读 config 的纯观赏入口（与发布组件 KoiPondViewer 同一实现），不含任何编辑面板 */
        <KoiPondViewer config={viewModeConfig} />
      ) : (
        <>
      {/* 鱼池底层 canvas：作为 RippleDistortion 的动态纹理源（画到其中，供折射采样） */}
      {/* titleShadowText/headerSubs：把标题与说明文字投影画进鱼池 canvas，随涟漪一起被折射（与鱼影同款右下偏移） */}
      <KoiPond
        canvasRef={canvasRef}
        className="koi-pond-canvas"
        titleShadowText={HEADER_TEXT.title}
        headerSubs={HEADER_TEXT.subs}
      />

      {/* 装饰图层：荷叶/荷花/花苞（z-index 1，位于水面之上、涟漪/鱼之下） */}
      <DecorativeLayer
        items={editor.items}
        selectedId={editor.selectedId}
        onSelect={editor.select}
        onBodyPointerDown={() => {}}
        preview={viewMode}
      />

      {/* 选中素材的画布内编辑框（观赏模式下隐藏） */}
      {!viewMode && (
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
      )}

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

      {/* 标题与说明文字改由 KoiPond 画进鱼池 canvas（本体+投影），随涟漪一起被折射；DOM 层不再渲染标题，避免清晰层盖住折射结果 */}

      {/* 涟漪参数控制台（实时联动 RippleDistortion）——观赏模式隐藏 */}
      {!viewMode && (
        <RippleControls ripple={ripple} onChange={updateRipple} onReset={resetRipple} />
      )}

      {/* 装饰素材编辑工具条：保存 / 导出 / 恢复默认 / 素材库——观赏模式隐藏 */}
      {!viewMode && (
        <SaveBar
          onSave={editor.save}
          onExport={editor.exportJSON}
          onReset={editor.reset}
          onAddItem={(src) => editor.addItem(src)}
          onExportConfig={exportConfig}
          savedAt={editor.savedAt}
        />
      )}

      {/* 鱼参数控制台（保留原有临时调试工具）——观赏模式隐藏 */}
      {!viewMode && <KoiControls />}

      {/* 观赏模式切换按钮：仅编辑态显示；view（正式动效）不提供编辑入口 */}
      {!viewMode && (
      <button
        onClick={toggleViewMode}
        data-interactive
        title={viewMode ? '退出观赏模式，进入编辑' : '进入观赏模式'}
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 2000,
          width: 44,
          height: 44,
          borderRadius: 50,
          border: '1px solid rgba(46,139,106,0.35)',
          background: viewMode ? 'rgba(46,139,106,0.85)' : 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 6px 18px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          fontSize: 20,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: viewMode ? '#fff' : '#2e4a3e',
          transition: 'background 0.2s, color 0.2s',
        }}
      >
        {viewMode ? '✏' : '👁'}
      </button>
      )}

      {/* 将系统鼠标替换为鸭子，头部朝向鼠标移动方向（仅编辑态；正式动效用系统光标） */}
      {!viewMode && <DuckCursor />}
        </>
      )}
    </main>
  );
}
