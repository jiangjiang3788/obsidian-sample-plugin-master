/** @jsxImportSource preact */
import type { ViewInstance } from '@core/types/public';
import { ThinkButton, ThinkIcon } from '@shared/ui/public';

export interface FreeformLayoutToolbarProps {
  editing: boolean;
  compactFallback: boolean;
  viewToAdd: string;
  availableViews: ViewInstance[];
  onToggleEditing: () => void;
  onReset: () => void;
  onViewToAddChange: (viewId: string) => void;
  onAddExistingView: () => void;
  onCreateAndAddView: () => void;
}

export function FreeformLayoutToolbar({
  editing,
  compactFallback,
  viewToAdd,
  availableViews,
  onToggleEditing,
  onReset,
  onViewToAddChange,
  onAddExistingView,
  onCreateAndAddView,
}: FreeformLayoutToolbarProps) {
  return (
    <div class="think-freeform-toolbar think-toolbar think-toolbar--compact">
      <ThinkButton
        size="sm"
        variant="secondary"
        aria-pressed={editing}
        disabled={compactFallback}
        leadingIcon={<ThinkIcon name={editing ? 'check' : 'pencil'} />}
        onClick={onToggleEditing}
      >
        {editing ? '完成布局编辑' : '编辑自由布局'}
      </ThinkButton>
      <ThinkButton
        size="sm"
        variant="ghost"
        disabled={!editing}
        leadingIcon={<ThinkIcon name="rotate-ccw" />}
        onClick={onReset}
      >
        重置模板
      </ThinkButton>
      {editing && (
        <div class="think-freeform-add-controls">
          <select
            class="think-select think-freeform-view-select"
            aria-label="选择要加入当前布局的视图"
            value={viewToAdd}
            onChange={(event) => onViewToAddChange((event.target as HTMLSelectElement).value)}
          >
            <option value="">添加已有视图…</option>
            {availableViews.map((view) => (
              <option key={view.id} value={view.id}>{view.title}</option>
            ))}
          </select>
          <ThinkButton
            size="sm"
            variant="secondary"
            disabled={!viewToAdd}
            leadingIcon={<ThinkIcon name="plus" />}
            onClick={onAddExistingView}
          >
            添加
          </ThinkButton>
          <ThinkButton
            size="sm"
            variant="ghost"
            leadingIcon={<ThinkIcon name="file-plus" />}
            onClick={onCreateAndAddView}
          >
            新建视图
          </ThinkButton>
        </div>
      )}
      <span class="think-freeform-toolbar-hint">
        {compactFallback
          ? '当前为窄屏或触控设备，已自动降级为只读列表；桌面宽屏可编辑自由布局。'
          : editing
            ? '点击卡片选中；方向键移动，Shift+方向键缩放，PageUp 置顶，L 锁定，C 折叠，Esc 取消选择。'
            : '查看模式下不会误拖动；折叠状态按当前布局独立保存。'}
      </span>
    </div>
  );
}
