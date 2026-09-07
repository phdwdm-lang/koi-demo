// RippleControls：涟漪参数控制台。
// 调节 RippleDistortion 的全部可见参数：涟漪强度、旋涡、环数、色散、高光、色调、灰度、扩散、灵敏度等。
// 作为一个滑杆面板，实时联动上层 RippleDistortion 的 props。

import { useCallback, useMemo, useState } from 'react';

// 涟漪参数滑杆定义：value 为原生格式，便于直接传回 RippleDistortion。
const SLIDERS = [
  { key: 'strength', label: '涟漪强度', min: 0, max: 0.05, step: 0.001, fmt: (v) => v.toFixed(3) },
  { key: 'swirl', label: '旋涡', min: -2, max: 2, step: 0.01, fmt: (v) => v.toFixed(2) },
  { key: 'rings', label: '环数', min: 1, max: 8, step: 1, fmt: (v) => v.toFixed(0) },
  { key: 'dispersion', label: '色散', min: 0, max: 1, step: 0.01, fmt: (v) => v.toFixed(2) },
  { key: 'glint', label: '高光', min: 0, max: 1, step: 0.01, fmt: (v) => v.toFixed(2) },
  { key: 'spread', label: '扩散', min: 0, max: 40, step: 1, fmt: (v) => v.toFixed(0) },
  { key: 'brushSize', label: '笔触大小', min: 8, max: 120, step: 1, fmt: (v) => v.toFixed(0) },
  { key: 'tintAmount', label: '色调强度', min: 0, max: 1, step: 0.01, fmt: (v) => v.toFixed(2) },
  { key: 'grayscale', label: '灰度', min: 0, max: 1, step: 0.01, fmt: (v) => v.toFixed(2) },
];

const defaultRipple = {
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

function Slider({ def, value, onChange }) {
  const pct = ((value - def.min) / (def.max - def.min)) * 100;
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#2e4a3e',
          marginBottom: 4,
        }}
      >
        <span style={{ opacity: 0.85 }}>{def.label}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.6 }}>{def.fmt(value)}</span>
      </div>
      <input
        type="range"
        min={def.min}
        max={def.max}
        step={def.step}
        value={value}
        onChange={(e) => onChange(def.key, parseFloat(e.target.value))}
        style={{
          width: '100%',
          accentColor: '#2e8b6a',
          cursor: 'pointer',
        }}
      />
    </div>
  );
}

export default function RippleControls({ ripple, onChange, onReset }) {
  const [open, setOpen] = useState(true);

  const hasCustom = useMemo(
    () => Object.keys(defaultRipple).some((k) => ripple[k] !== defaultRipple[k]),
    [ripple]
  );

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 240,
        zIndex: 1200,
        fontFamily: '"Songti SC", "STSong", "SimSun", serif',
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: 'none',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          cursor: 'pointer',
          fontSize: 14,
          letterSpacing: 2,
          color: '#2e4a3e',
          fontWeight: 600,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>涟漪参数</span>
        {hasCustom && (
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#e07a5f', display: 'inline-block' }} />
        )}
        <span style={{ opacity: 0.6, fontSize: 12 }}>{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div
          style={{
            marginTop: 8,
            padding: '14px 14px 12px',
            background: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            borderRadius: 12,
          }}
        >
          {SLIDERS.map((def) => (
            <Slider key={def.key} def={def} value={ripple[def.key] ?? defaultRipple[def.key]} onChange={onChange} />
          ))}

          {/* 色调颜色选择 */}
          <div style={{ marginBottom: 10 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                color: '#2e4a3e',
                marginBottom: 4,
              }}
            >
              <span style={{ opacity: 0.85 }}>色调颜色</span>
            </div>
            <input
              type="color"
              value={ripple.tint}
              onChange={(e) => onChange('tint', e.target.value)}
              style={{
                width: '100%',
                height: 30,
                border: 'none',
                borderRadius: 6,
                background: 'transparent',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              onClick={() => onReset?.()}
              style={{
                flex: 1,
                padding: '6px 0',
                border: '1px solid rgba(46,139,106,0.4)',
                borderRadius: 8,
                background: 'transparent',
                color: '#2e4a3e',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              重置
            </button>
            <button
              onClick={() => setOpen(false)}
              style={{
                flex: 1,
                padding: '6px 0',
                border: 'none',
                borderRadius: 8,
                background: '#2e8b6a',
                color: '#fff',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              收起
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
