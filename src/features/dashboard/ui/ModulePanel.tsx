// views/ModulePanel.tsx


// 折叠组件：支持 Ctrl/⌘ + 点击标题一键折叠/展开全部模块
import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { ModuleConfig } from '@core/domain/schema';

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
      const ev = new CustomEvent('think-toggle-all', { detail: want });
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
    el.addEventListener('think-toggle-all', handler as any);
    return () => el.removeEventListener('think-toggle-all', handler as any);
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
