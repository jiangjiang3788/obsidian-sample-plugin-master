// src/features/settings/LayoutSettingsWidget.tsx
/** @jsxImportSource preact */
/**
 * LayoutSettingsWidget
 * - 复用 LayoutSettings 页面的完整 UI（LayoutEditorPanel）
 * - 用 FloatingPanel 以“悬浮窗”形式打开（与模块设置保持一致）
 *
 * 重要：renderFn 里不能直接调用 hooks。
 * FloatingWidgetManager 的 renderFn 会在 Provider 树之外先执行一次，
 * 因此必须返回“组件节点”，由 Preact 在 ServicesProvider 内部再执行 hooks。
 */

import { h } from 'preact';
import { useZustandAppStore } from '@/app/public';
import type { Layout } from '@core/public';
import FloatingPanel from '@/shared/ui/primitives/FloatingPanel';
import { closeFloatingWidget, openFloatingWidget } from '@/shared/ui/widgets/FloatingWidgetManager';
import { LayoutEditorPanel } from '@/features/settings/components/LayoutEditorPanel';

function LayoutSettingsWidgetInner({ layoutId, widgetId }: { layoutId: string; widgetId: string }) {
  const layout = useZustandAppStore((s) => (s.settings.layouts || []).find((l: Layout) => l.id === layoutId)) as
    | Layout
    | undefined;

  return (
    <FloatingPanel
      id={widgetId}
      title={`布局设置: ${layout?.name ?? layoutId}`}
      defaultPosition={{ x: window.innerWidth / 2 - 420, y: window.innerHeight / 2 - 300 }}
      minWidth={620}
      maxWidth="92vw"
      maxHeight="88vh"
      onClose={() => closeFloatingWidget(widgetId)}
    >
      <LayoutEditorPanel layoutId={layoutId} />
    </FloatingPanel>
  );
}

export function openLayoutSettingsWidget(layoutId: string) {
  const widgetId = `layout-settings-${layoutId}`;

  // renderFn 必须只返回 vnode，不要在这里调用 hooks
  return openFloatingWidget(widgetId, () => <LayoutSettingsWidgetInner layoutId={layoutId} widgetId={widgetId} />);
}
