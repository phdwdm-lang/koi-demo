// SaveBar：底部工具条 —— 保存 / 导出JSON / 恢复默认 / 素材库(添加素材)。
// 保存：把全画布素材位置/大小/旋转写入 localStorage。导出：下载 JSON。

import { useState } from 'react';
import { DECOR_MATERIALS } from '../editor/editorState.js';

export default function SaveBar({ onSave, onExport, onExportConfig, onReset, onAddItem, savedAt, children }) {
  const [libOpen, setLibOpen] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [exportFlash, setExportFlash] = useState(false);

  const handleSave = () => {
    onSave();
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1200);
  };

  // 导出完整配置：复制 JSON 到剪贴板给 AI，成功后闪现反馈
  const handleExportConfig = async () => {
    const ok = await onExportConfig?.();
    if (ok) {
      setExportFlash(true);
      setTimeout(() => setExportFlash(false), 1600);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 16,
        transform: 'translateX(-50%)',
        zIndex: 1300,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: '"Songti SC", "STSong", "SimSun", serif',
      }}
    >
      {/* 主工具条 */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '6px 8px',
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: 14,
          boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
        }}
      >
        <ToolBtn onClick={() => setLibOpen((o) => !o)}>＋ 素材</ToolBtn>
        <ToolBtn onClick={handleSave} accent={saveFlash}>
          {saveFlash ? '✓ 已保存' : '💾 保存'}
        </ToolBtn>
        <ToolBtn onClick={onExport}>⤓ 导出 JSON</ToolBtn>
        <ToolBtn onClick={handleExportConfig} accent={exportFlash} title="复制完整配置(素材+涟漪+鱼)到剪贴板，发给 AI 配置">
          {exportFlash ? '✓ 已复制' : '⧉ 导出配置'}
        </ToolBtn>
        <ToolBtn onClick={onReset}>↺ 恢复默认</ToolBtn>
        {children}
      </div>

      {/* 素材库弹层：点选即可添加到画布中央 */}
      {libOpen && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 64,
            transform: 'translateX(-50%)',
            width: 460,
            maxHeight: '60vh',
            overflowY: 'auto',
            padding: 14,
            background: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 14,
            boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: '#2e4a3e',
              opacity: 0.8,
              letterSpacing: 1,
              marginBottom: 10,
            }}
          >
            点击素材添加到画布中央
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {DECOR_MATERIALS.map((m, i) => (
              <button
                key={m.key}
                onClick={() => onAddItem(m.src)}
                title={m.key}
                style={{
                  border: 'none',
                  background: 'rgba(240,244,242,0.9)',
                  borderRadius: 8,
                  padding: 6,
                  cursor: 'pointer',
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={m.src}
                  alt={m.key}
                  draggable={false}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ToolBtn({ onClick, accent, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: 'none',
        borderRadius: 9,
        padding: '7px 12px',
        fontSize: 13,
        letterSpacing: 1,
        cursor: 'pointer',
        background: accent ? '#2e8b6a' : 'rgba(46,139,106,0.1)',
        color: accent ? '#fff' : '#2e4a3e',
        fontWeight: 600,
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {children}
    </button>
  );
}
