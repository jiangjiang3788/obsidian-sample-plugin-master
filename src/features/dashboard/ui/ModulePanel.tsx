// src/features/dashboard/ui/ModulePanel.tsx
import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { EVENT_NAMES } from '@core/domain/constants';

interface ModulePanelProps {
  title: string;
  collapsed?: boolean;
  children: any;
}

export function ModulePanel({ title, collapsed: initialCollapsed, children }: ModulePanelProps) {
  const [collapsed, setCollapsed] = useState<boolean>(!!initialCollapsed);
  const rootRef = useRef<HTMLDivElement>(null);

  const toggleCollapsed = () => setCollapsed(v => !v);

  const onHeaderClick = (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      const want = !collapsed;
      const ev = new CustomEvent(EVENT_NAMES.TOGGLE_ALL_MODULES, { detail: want });
      document.querySelectorAll('.think-module').forEach(el => el.dispatchEvent(ev));
    } else {
      toggleCollapsed();
    }
  };

  useEffect(() => {
    const handler = (ev: any) => {
      setCollapsed(ev.detail);
    };
    const el = rootRef.current;
    if (!el) return;
    el.addEventListener(EVENT_NAMES.TOGGLE_ALL_MODULES, handler as any);
    return () => el.removeEventListener(EVENT_NAMES.TOGGLE_ALL_MODULES, handler as any);
  }, []);

  return (
    <div class="think-module" ref={rootRef}>
      <div class="module-header" onClick={onHeaderClick as any} title="点击折叠/展开；Ctrl/⌘ + 点击：全部折叠/展开">
        <span class="module-title">{title}</span>
        <span class="module-toggle">{collapsed ? '▶' : '▼'}</span>
      </div>
      {!collapsed && <div class="module-content">{children}</div>}
    </div>
  );
}