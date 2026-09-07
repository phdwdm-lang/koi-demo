import { useRef } from 'react';
import KoiPond from './components/KoiPond.jsx';
import RippleDistortion from './components/RippleDistortion.jsx';
import KoiControls from './components/KoiControls.jsx';
import DuckCursor from './components/DuckCursor.jsx';

export default function App() {
  const canvasRef = useRef(null);
  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: '#cfe8dc',
        cursor: 'none',
      }}
    >
      {/* 鱼池底层 canvas：作为 RippleDistortion 的动态纹理源（画到其中，供折射采样） */}
      <KoiPond canvasRef={canvasRef} className="koi-pond-canvas" />

      {/* 官方 RippleDistortion：每帧采样鱼池 canvas，移动/点击生成涟漪，鱼/荷叶随波扭动 */}
      <RippleDistortion
        sourceRef={canvasRef}
        src=""
        brushSize={40}
        strength={0.01}
        swirl={0.65}
        rings={3}
        grayscale={false}
        spread={10}
        dispersion={0.2}
        glint={0.2}
        tint="#bbfffa"
        tintAmount={0.15}
        trigger="both"
        quality="high"
        style={{ position: 'absolute', inset: 0, zIndex: 2 }}
      />

      {/* 标题说明（不拦截鼠标，指针会落到 canvas 上） */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 3,
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
      </div>

      {/* 参数控制台（临时调试工具：可实时调鱼参数并保存配置） */}
      <KoiControls />

      {/* 将系统鼠标替换为鸭子，头部朝向鼠标移动方向 */}
      <DuckCursor />
    </main>
  );
}
