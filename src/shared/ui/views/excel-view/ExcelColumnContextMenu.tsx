/** @jsxImportSource preact */
import { h } from 'preact';
import type { ExcelColumnMenuModel, ExcelColumnMenuState } from './ExcelColumnToolbarModel';

export interface ExcelColumnContextMenuProps {
  menu: ExcelColumnMenuState;
  menuModel: ExcelColumnMenuModel;
  onRemoveField(field: string): void;
  onMoveFieldToStart(field: string): void;
  onMoveFieldToEnd(field: string): void;
  onToggleInfo(): void;
}

export function ExcelColumnContextMenu({
  menu,
  menuModel,
  onRemoveField,
  onMoveFieldToStart,
  onMoveFieldToEnd,
  onToggleInfo,
}: ExcelColumnContextMenuProps) {
  return (
    <div
      class="excel-column-context-menu"
      style={{ left: `${menu.x}px`, top: `${menu.y}px` }}
      role="menu"
      onMouseDown={(event: MouseEvent) => event.stopPropagation()}
      onClick={(event: MouseEvent) => event.stopPropagation()}
    >
      <div class="excel-column-context-menu-title">{menuModel.label}</div>
      <button type="button" role="menuitem" disabled={!menuModel.canRemove} onClick={() => onRemoveField(menuModel.field)}>隐藏此列</button>
      <button type="button" role="menuitem" disabled={!menuModel.canMoveToStart} onClick={() => onMoveFieldToStart(menuModel.field)}>移到最前</button>
      <button type="button" role="menuitem" disabled={!menuModel.canMoveToEnd} onClick={() => onMoveFieldToEnd(menuModel.field)}>移到最后</button>
      <button type="button" role="menuitem" onClick={onToggleInfo}>查看字段说明</button>
      {menu.showInfo ? (
        <div class="excel-column-context-info">
          <div><span>名称</span><strong>{menuModel.label}</strong></div>
          {menuModel.group ? <div><span>分组</span><strong>{menuModel.group}</strong></div> : null}
          <div><span>字段键</span><code>{menuModel.field}</code></div>
        </div>
      ) : null}
    </div>
  );
}
