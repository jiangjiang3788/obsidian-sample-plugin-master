// src/features/dashboard/ui/ModulePanel.tsx
import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { ModuleConfig } from '@core/domain/schema';
// [REFACTOR] 导入常量
import { EVENT_NAMES } from '@core/domain/constants';

interface ModulePanelProps {
  module: ModuleConfig;
  children: any;
}

export function ModulePanel({ module, children }: ModulePanelProps) {
  const [collapsed, setCollapsed] = useState<boolean>(!!module.collapsed);
  const rootRef = useRef<HTMLDivElement>(null);

  const toggleCollapsed = () => setCollapsed(v => !v);

  const onHeaderClick = (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      // 广播事件给所有模块
      const want = !collapsed;
      // [REFACTOR] 使用常量作为事件名
      const ev = new CustomEvent(EVENT_NAMES.TOGGLE_ALL_MODULES, { detail: want });
      document.querySelectorAll('.think-module').forEach(el => el.dispatchEvent(ev));
    } else {
      toggleCollapsed();
    }
  };

  useEffect(() => {
    const handler = (ev: any) => {
      const want: boolean = ev.detail;
      setCollapsed(want);
    };
    const el = rootRef.current;
    if (!el) return;
    // [REFACTOR] 使用常量作为事件名
    el.addEventListener(EVENT_NAMES.TOGGLE_ALL_MODULES, handler as any);
    return () => el.removeEventListener(EVENT_NAMES.TOGGLE_ALL_MODULES, handler as any);
  }, []);

  return (
    <div class="think-module" ref={rootRef}>
      <div class="module-header" onClick={onHeaderClick as any} title="点击折叠/展开；Ctrl/⌘ + 点击：全部折叠/展开">
        <span class="module-title">{module.title}</span>
        <span class="module-toggle">{collapsed ? '▶' : '▼'}</span>
      </div>
      {!collapsed && <div class="module-content">{children}</div>}
    </div>
  );
}