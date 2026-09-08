// KoiPondViewer — 正式动效（可嵌入/组件）纯渲染入口。
// 读取一份统一 config（{version, decor[], ripple{}, fish{}}），只做「观赏」，不含任何编辑面板 / 编辑状态 hook。
// 用法：<KoiPondViewer config={...} />，未传 config 时回落 koiConfig 默认值（defaultConfig()）。
// 与 App.jsx 的 ?mode=view 相同，但自持内部 canvas，便于直接嵌入用户网站或作为 npm 组件发布。
import { useRef } from 'react';
import KoiPond from './KoiPond.jsx';
import RippleDistortion from './RippleDistortion.jsx';
import DecorativeLayer from './DecorativeLayer.jsx';
import { buildConfig } from '../config/koiConfig.js';
import koiConfig from '../koi.config.js';

// 标题与说明文字（与 App.jsx HEADER_TEXT 保持一致，随涟漪一起被折射）
const HEADER_TEXT = {
  title: '锦鲤戏游',
  subs: [
    '水彩荷塘 · 移动 / 点击水面，看鱼被涟漪扭动',
    '点击荷叶可移动 / 缩放 / 旋转，复制后点「保存」留档',
  ],
};

export default function KoiPondViewer({
  config,
  title = HEADER_TEXT.title,
  headerSubs = HEADER_TEXT.subs,
  zIndex = 3,
  className = '',
  style,
}) {
  const canvasRef = useRef(null);
  // 收拢配置：传入的 config 优先（缺失字段回落默认）；未传则读 koi.config.js（正式动效唯一配置来源）
  const cfg = config ? buildConfig(config) : koiConfig;
  const { decor, ripple, fish } = cfg;

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* 鱼池底层 canvas：作为 RippleDistortion 的动态纹理源（画到其中，供折射采样） */}
      <KoiPond
        canvasRef={canvasRef}
        className="koi-pond-canvas"
        fish={fish}
        titleShadowText={title}
        headerSubs={headerSubs}
      />
      {/* 装饰层：荷叶/荷花/花苞（preview → 不可选、不拦截，纯净观赏） */}
      <DecorativeLayer items={decor} preview zIndex={zIndex} />
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
    </div>
  );
}
