'use client';

/**
 * KoiControls — 锦鲤参数控制台（临时调试工具）
 *
 * 通过 KoiPond 暴露的运行时句柄实时调整鱼群行为/视觉参数：
 *   - window.__koiWorld   世界对象（world.params 每帧被 step 读取，改即实时生效）
 *   - globalThis.__koiUi  { fishScale }  鱼体大小（绘制时每帧读取）
 *   - globalThis.__koiShadow { x,y,blur,alpha }  深水投影
 *   - globalThis.__koiAPI { addFish, removeFish }  运行时增减鱼数量
 *
 * 调整完成后可「复制配置」或「下载 JSON」，得到一份可直接固化的参数集
 * （用户把这份配置发给 AI，即可把参数写死进 KoiPond.jsx 初始值）。
 */
import { useEffect, useState } from 'react';

// 默认值（与 KoiPond.jsx 初始 createWorld / ui / __koiShadow 一致）
const DEFAULT = {
  count: 4,
  fishScale: 0.3,
  maxSpeed: 172,
  minSpeed: 32,
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
  shadow: { x: 12, y: 30, blur: 5, alpha: 0.2 },
};

// 滑块定义：[key, label, min, max, step]
const SLIDERS = [
  ['count', '鱼数量 count', 1, 30, 1],
  ['fishScale', '鱼体大小 fishScale', 0.1, 0.9, 0.01],
  ['maxSpeed', '巡游速度 maxSpeed', 40, 260, 4],
  ['minSpeed', '最低速度 minSpeed', 20, 120, 4],
  ['maxForce', '转向力 maxForce', 60, 700, 10],
  ['turnRate', '转向速率 turnRate', 1, 10, 0.1],
  ['fovDeg', '视野角 fovDeg', 60, 360, 5],
  ['neighborRadius', '感知半径 neighborRadius', 30, 200, 5],
  ['separationRadius', '分离半径 separationRadius', 15, 120, 5],
  ['wSep', '分离权重 wSep', 0, 4, 0.1],
  ['wAli', '对齐权重 wAli', 0, 3, 0.05],
  ['wCoh', '聚合权重 wCoh', 0, 3, 0.05],
  ['wGoal', '目标权重 wGoal', 0, 3, 0.05],
  ['wWander', '游走扰动 wWander', 0, 1, 0.05],
  ['shadowAlpha', '投影浓度 shadow.alpha', 0, 0.5, 0.01],
  ['shadowBlur', '投影模糊 shadow.blur', 0, 40, 1],
];

const cls = { fontFamily: '"Songti SC", "STSong", "SimSun", serif', color: '#2e4a3e' };

export default function KoiControls() {
  const [values, setValues] = useState(null);
  const [open, setOpen] = useState(true);
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState('');

  // 等待 KoiPond 挂载、暴露运行时句柄后初始化参数
  useEffect(() => {
    const wait = () => {
      const w = window.__koiWorld;
      const ui = window.__koiUi;
      if (w && ui) {
        setReady(true);
        setValues({
          count: w.fish.length,
          fishScale: ui.fishScale,
          maxSpeed: w.params.maxSpeed,
          minSpeed: w.params.minSpeed,
          maxForce: w.params.maxForce,
          turnRate: w.params.turnRate,
          fovDeg: w.params.fovDeg,
          neighborRadius: w.params.neighborRadius,
          separationRadius: w.params.separationRadius,
          wSep: w.params.wSep,
          wAli: w.params.wAli,
          wCoh: w.params.wCoh,
          wGoal: w.params.wGoal,
          wWander: w.params.wWander,
          shadowAlpha: window.__koiShadow.alpha,
          shadowBlur: window.__koiShadow.blur,
        });
        return true;
      }
      return false;
    };
    if (wait()) return;
    const t = setInterval(() => {
      if (wait()) clearInterval(t);
    }, 200);
    return () => clearInterval(t);
  }, []);

  // 应用某个参数到运行时句柄
  const apply = (key, value) => {
    if (values == null) return;
    const next = { ...values, [key]: value };
    setValues(next);
    const w = window.__koiWorld;
    const ui = window.__koiUi;
    if (!w || !ui) return;
    if (key === 'count') {
      const api = window.__koiAPI;
      while (w.fish.length < value && api) api.addFish(w);
      while (w.fish.length > value && api) api.removeFish(w);
    } else if (key === 'fishScale') {
      ui.fishScale = value;
    } else if (key === 'shadowAlpha') {
      window.__koiShadow.alpha = value;
    } else if (key === 'shadowBlur') {
      window.__koiShadow.blur = value;
    } else {
      w.params[key] = value;
    }
  };

  const buildConfig = () => ({
    count: values.count,
    fishScale: values.fishScale,
    maxSpeed: values.maxSpeed,
    minSpeed: values.minSpeed,
    maxForce: values.maxForce,
    turnRate: Number(values.turnRate.toFixed(2)),
    fovDeg: values.fovDeg,
    neighborRadius: values.neighborRadius,
    separationRadius: values.separationRadius,
    wSep: values.wSep,
    wAli: values.wAli,
    wCoh: values.wCoh,
    wGoal: values.wGoal,
    wWander: values.wWander,
    shadow: {
      x: DEFAULT.shadow.x,
      y: DEFAULT.shadow.y,
      blur: values.shadowBlur,
      alpha: Number(values.shadowAlpha.toFixed(2)),
    },
  });

  const reset = () => {
    const d = {
      count: DEFAULT.count,
      fishScale: DEFAULT.fishScale,
      maxSpeed: DEFAULT.maxSpeed,
      minSpeed: DEFAULT.minSpeed,
      maxForce: DEFAULT.maxForce,
      turnRate: DEFAULT.turnRate,
      fovDeg: DEFAULT.fovDeg,
      neighborRadius: DEFAULT.neighborRadius,
      separationRadius: DEFAULT.separationRadius,
      wSep: DEFAULT.wSep,
      wAli: DEFAULT.wAli,
      wCoh: DEFAULT.wCoh,
      wGoal: DEFAULT.wGoal,
      wWander: DEFAULT.wWander,
      shadowAlpha: DEFAULT.shadow.alpha,
      shadowBlur: DEFAULT.shadow.blur,
    };
    // 先应用 count，再应用其余
    setValues(d);
    setMsg('');
    Object.entries(d).forEach(([k, v]) => {
      const w = window.__koiWorld;
      if (!w) return;
      if (k === 'fishScale') window.__koiUi.fishScale = v;
      else if (k === 'shadowAlpha') window.__koiShadow.alpha = v;
      else if (k === 'shadowBlur') window.__koiShadow.blur = v;
      else if (k === 'count') {
        const api = window.__koiAPI;
        while (w.fish.length < v && api) api.addFish(w);
        while (w.fish.length > v && api) api.removeFish(w);
      } else w.params[k] = v;
    });
  };

  const copy = async () => {
    const text = JSON.stringify(buildConfig(), null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setMsg('已复制配置 JSON 到剪贴板');
    } catch (e) {
      setMsg('复制失败（Clipboard 不可用）：' + e.message);
    }
    setTimeout(() => setMsg(''), 2500);
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(buildConfig(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'koi-config.json';
    a.click();
    URL.revokeObjectURL(url);
    setMsg('已下载 koi-config.json');
    setTimeout(() => setMsg(''), 2500);
  };

  if (!ready || !values) {
    return (
      <aside style={{ ...cls, position: 'fixed', top: 16, right: 16, zIndex: 40, fontSize: 12, padding: 10, background: 'rgba(255,255,255,0.7)', borderRadius: 12 }}>
        控制台加载中…
      </aside>
    );
  }

  return (
    <aside
      style={{
        ...cls,
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 40,
        width: 300,
        maxHeight: '90vh',
        overflow: 'auto',
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,0.6)',
        borderRadius: 16,
        boxShadow: '0 12px 40px rgba(20,60,45,0.18)',
        padding: '12px 16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong style={{ fontSize: 14, letterSpacing: 1 }}>锦鲤参数控制台</strong>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#2e4a3e', fontSize: 14 }}
        >
          {open ? '收起 ▲' : '展开 ▼'}
        </button>
      </div>

      {open && (
        <>
          {SLIDERS.map(([key, label, min, max, step]) => (
            <div key={key} style={{ marginBottom: 8 }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.85, marginBottom: 2 }}>
                <span>{label}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {key === 'fishScale' ? values[key].toFixed(2) : key === 'turnRate' ? values[key].toFixed(1) : values[key]}
                </span>
              </label>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={values[key]}
                onChange={(e) => apply(key, Number(e.target.value))}
                style={{ width: '100%', accentColor: '#2e8b6a' }}
              />
            </div>
          ))}

          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <button onClick={copy} style={btn}>复制配置</button>
            <button onClick={download} style={btn}>下载 JSON</button>
            <button onClick={reset} style={btn}>重置默认</button>
          </div>
          {msg && <div style={{ marginTop: 8, fontSize: 11, color: '#7a8f84' }}>{msg}</div>}
          <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.5, opacity: 0.7 }}>
            调好后点「复制配置」，把 JSON 发给 AI，即可把参数写死进 KoiPond.jsx。
          </div>
        </>
      )}
    </aside>
  );
}

const btn = {
  flex: 1,
  padding: '6px 0',
  border: '1px solid rgba(46,78,62,0.25)',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.6)',
  color: '#2e4a3e',
  fontFamily: 'inherit',
  fontSize: 12,
  cursor: 'pointer',
};
