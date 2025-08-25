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
    // 如果点击的是可交互的 actions 区域，则不觸發折叠
    if ((e.target as HTMLElement).closest('.module-header-actions')) {
        return;
    }
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
        <div class="module-header-controls">
            <div class="module-header-actions">
                <span 
                    class="module-action-plus" 
                    title="快捷输入"
                    onClick={(e) => {
                        e.stopPropagation(); // 阻止事件冒泡到 module-header
                        // 您可以在此添加点击"+"号后的具体逻辑
                        console.log(`Action for "${title}" clicked.`);
                    }}
                >
                    +
                </span>
            </div>
            <div class="module-toggle">{collapsed ? '▶' : '▼'}</div>
        </div>
      </div>
      {!collapsed && <div class="module-content">{children}</div>}
    </div>
  );
}