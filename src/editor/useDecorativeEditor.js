import { useCallback, useRef, useState } from 'react';
import {
  STORAGE_KEY,
  loadLayout,
  saveLayout,
  exportLayoutJSON,
  resetLayout,
} from './editorState.js';

// 装饰图层编辑器的核心状态 hook：集中管理素材列表与所有编辑操作。
// 拖拽状态用 useRef 存储，避免 useState + 事件监听器组合导致的闭包失效 bug。
export function useDecorativeEditor() {
  const [items, setItems] = useState(() => loadLayout());
  const [selectedId, setSelectedId] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  // 拖拽进行时的状态（不触发重渲染，事件回调里读取它即可获得最新值）
  const dragRef = useRef(null);

  // ---- 基础更新 ----
  const updateById = useCallback((id, patch) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  // ---- 选择 ----
  const select = useCallback((id) => {
    setSelectedId(id);
    setItems((prev) => prev.map((it) => ({ ...it, selected: it.id === id })));
  }, []);

  const deselect = useCallback(() => {
    setSelectedId(null);
    setItems((prev) => prev.map((it) => ({ ...it, selected: false })));
  }, []);

  // ---- 添加 / 复制 / 删除 ----
  const addItem = useCallback((src, extra = {}) => {
    const id = `decor-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setItems((prev) => {
      const maxZ = prev.reduce((m, it) => Math.max(m, it.z), 0);
      const item = {
        id,
        src,
        // 新素材放在画布中央附近随机偏移，避免与已有素材完全重叠
        x: 50 + (Math.random() - 0.5) * 40,
        y: 50 + (Math.random() - 0.5) * 40,
        w: 22,
        rotation: (Math.random() - 0.5) * 20,
        flipX: false,
        opacity: 1,
        selected: false,
        z: maxZ + 1,
        ...extra,
      };
      return [...prev, item];
    });
    setSelectedId(id);
    return id;
  }, []);

  const duplicateSelected = useCallback(() => {
    setItems((prev) => {
      const sel = prev.find((it) => it.id === selectedId);
      if (!sel) return prev;
      const maxZ = prev.reduce((m, it) => Math.max(m, it.z), 0);
      const copy = {
        ...sel,
        id: `decor-${Date.now()}-dup-${Math.random().toString(36).slice(2, 7)}`,
        x: Math.min(80, sel.x + 4),
        y: Math.min(80, sel.y + 4),
        selected: false,
        z: maxZ + 1,
      };
      return [...prev, copy];
    });
  }, [selectedId]);

  const deleteSelected = useCallback(() => {
    setItems((prev) => prev.filter((it) => it.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  // ---- 层级 ----
  const bringToFront = useCallback(() => {
    setItems((prev) => {
      const maxZ = prev.reduce((m, it) => Math.max(m, it.z), 0);
      return prev.map((it) => (it.id === selectedId ? { ...it, z: maxZ + 1 } : it));
    });
  }, [selectedId]);

  const sendToBack = useCallback(() => {
    setItems((prev) => {
      const minZ = prev.reduce((m, it) => Math.min(m, it.z), 9e9);
      return prev.map((it) => (it.id === selectedId ? { ...it, z: minZ - 1 } : it));
    });
  }, [selectedId]);

  // ---- 拖拽（移动/缩放/旋转）统一处理：事件回调统一用稳定函数，读 dragRef 拿最新值 ----
  const onDragMove = useCallback((e) => {
    const d = dragRef.current;
    if (!d) return;
    const vmin = Math.min(window.innerWidth, window.innerHeight);
    const { mode, id, startX, startY, orig, cx, cy, startAngle, origRot } = d;
    if (mode === 'move') {
      const dx = ((e.clientX - startX) / window.innerWidth) * 100;
      const dy = ((e.clientY - startY) / window.innerHeight) * 100;
      updateById(id, {
        x: Math.max(0, Math.min(100, orig.x + dx)),
        y: Math.max(0, Math.min(100, orig.y + dy)),
      });
    } else if (mode === 'resize') {
      const deltaV = ((e.clientX - startX) / vmin) * 100;
      updateById(id, { w: Math.max(8, Math.min(90, orig.w + deltaV)) });
    } else if (mode === 'rotate') {
      const ang = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
      let newRot = (origRot + (ang - startAngle)) % 360;
      if (newRot < 0) newRot += 360;
      updateById(id, { rotation: newRot });
    }
  }, [updateById]);

  const onDragEnd = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
  }, [onDragMove]);

  // 各手势入口：先把起始态写进 dragRef，再绑定事件。事件回调引用稳定，读 dragRef 拿最新值。
  const startMove = useCallback(
    (id, e) => {
      e.preventDefault();
      const target = items.find((it) => it.id === id);
      if (!target) return;
      dragRef.current = {
        mode: 'move',
        id,
        startX: e.clientX,
        startY: e.clientY,
        orig: { x: target.x, y: target.y },
      };
      window.addEventListener('pointermove', onDragMove);
      window.addEventListener('pointerup', onDragEnd);
    },
    [items, onDragMove, onDragEnd]
  );

  const startResize = useCallback(
    (id, e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = items.find((it) => it.id === id);
      if (!target) return;
      dragRef.current = { mode: 'resize', id, startX: e.clientX, startY: e.clientY, orig: { w: target.w } };
      window.addEventListener('pointermove', onDragMove);
      window.addEventListener('pointerup', onDragEnd);
    },
    [items, onDragMove, onDragEnd]
  );

  const startRotate = useCallback(
    (id, e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = items.find((it) => it.id === id);
      if (!target) return;
      const cx = (target.x / 100) * window.innerWidth;
      const cy = (target.y / 100) * window.innerHeight;
      const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
      dragRef.current = { mode: 'rotate', id, cx, cy, startAngle, origRot: target.rotation };
      window.addEventListener('pointermove', onDragMove);
      window.addEventListener('pointerup', onDragEnd);
    },
    [items, onDragMove, onDragEnd]
  );

  // ---- 保存 / 导出 / 重置 ----
  const save = useCallback(() => {
    const ok = saveLayout(items);
    if (ok) setSavedAt(Date.now());
    return ok;
  }, [items]);

  const exportJSON = useCallback(() => {
    const json = exportLayoutJSON(items);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'koi-decor-layout.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [items]);

  const reset = useCallback(() => {
    setItems(resetLayout());
    setSelectedId(null);
  }, []);

  return {
    items,
    selectedId,
    savedAt,
    select,
    deselect,
    updateById,
    addItem,
    duplicateSelected,
    deleteSelected,
    bringToFront,
    sendToBack,
    startMove,
    startResize,
    startRotate,
    save,
    exportJSON,
    reset,
  };
}

export { STORAGE_KEY };
