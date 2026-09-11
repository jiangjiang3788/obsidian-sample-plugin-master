/** @jsxImportSource preact */
import { h } from 'preact';
import type { WhiteboardArrangeMode } from './WhiteboardArrangeModel';

export type WhiteboardContextMenuState = { clientX: number; clientY: number; worldX: number; worldY: number; itemId: string | null; groupId?: string | null };
interface Props {
  state: WhiteboardContextMenuState | null;
  selectionCount: number;
  selectedItemCount?: number;
  selectedGroupCount?: number;
  currentItemCount?: number;
  currentGroupCount?: number;
  onClose: () => void;
  onCreateText: () => void;
  onCreateSticky: () => void;
  onCreateWorkbench: () => void;
  onCenter: () => void;
  onWrapSelection: () => void;
  onArrange: (mode: WhiteboardArrangeMode) => void;
  onArrangeCurrentLayer: () => void;
  onSemanticArrange: (scope: 'selection' | 'canvas') => void;
  onArchiveSelection?: () => void;
  onRemoveSelection?: () => void;
  onRemoveSelectionFromWorkbench?: () => void;
  canRemoveSelectionFromWorkbench?: boolean;
}
const action = (label: string, callback: () => void, disabled = false) => <button type="button" disabled={disabled} onClick={(event) => { event.preventDefault(); event.stopPropagation(); callback(); }}>{label}</button>;

export function WhiteboardContextMenu({ state, selectionCount, selectedItemCount = selectionCount, selectedGroupCount = 0, currentItemCount = 0, currentGroupCount = 0, onClose, onCreateText, onCreateSticky, onCreateWorkbench, onCenter, onWrapSelection, onArrange, onArrangeCurrentLayer, onSemanticArrange, onArchiveSelection, onRemoveSelection, onRemoveSelectionFromWorkbench, canRemoveSelectionFromWorkbench = false }: Props) {
  if (!state) return null;
  const hasNode = Boolean(state.itemId || state.groupId); const canArrangeNodes = selectionCount > 1; const canArrangeCards = selectedItemCount > 1 && selectedGroupCount === 0; const canWrap = selectedItemCount > 1 && selectedGroupCount === 0;
  return <div class="think-whiteboard-context-menu" role="menu" aria-label="白板右键菜单" style={`left:${state.clientX}px;top:${state.clientY}px;`} onPointerDown={((event: Event) => event.stopPropagation()) as never}>
    {hasNode ? <>
      <div class="think-whiteboard-context-menu__title">整理 {selectionCount} 个节点{selectedGroupCount > 0 ? ` · ${selectedItemCount} 卡片 · ${selectedGroupCount} 工作台` : ''}</div>
      {action('网格整理', () => onArrange('grid'), !canArrangeNodes)}
      {action('按连线整理', () => onArrange('graph'), !canArrangeCards)}
      {action('目标 × 类型 × 时间', () => onSemanticArrange('selection'), !canArrangeCards)}
      {action('用所选创建工作台', onWrapSelection, !canWrap)}
      <div class="think-whiteboard-context-menu__separator" />
      {action('左对齐', () => onArrange('align-left'), !canArrangeNodes)}
      {action('顶部对齐', () => onArrange('align-top'), !canArrangeNodes)}
      {action('水平等距', () => onArrange('distribute-horizontal'), !canArrangeNodes)}
      {action('垂直等距', () => onArrange('distribute-vertical'), !canArrangeNodes)}
      <div class="think-whiteboard-context-menu__separator" />
      {canRemoveSelectionFromWorkbench && onRemoveSelectionFromWorkbench ? action('移出工作台', onRemoveSelectionFromWorkbench, selectedItemCount < 1 || selectedGroupCount > 0) : null}
      {onArchiveSelection ? action(selectedItemCount > 1 ? `归档所选 ${selectedItemCount} 张` : '归档', onArchiveSelection, selectedItemCount < 1 || selectedGroupCount > 0) : null}
      {onRemoveSelection ? action(selectedItemCount > 1 ? `移出白板 ${selectedItemCount} 张` : '移出白板', onRemoveSelection, selectedItemCount < 1 || selectedGroupCount > 0) : null}
    </> : <>
      {action('添加文字标注', onCreateText)}
      {action('添加便签', onCreateSticky)}
      {action('新建工作台', onCreateWorkbench)}
      {action('网格整理当前层', onArrangeCurrentLayer, currentItemCount + currentGroupCount < 2)}
      {action('目标 × 类型 × 时间整理当前工作台', () => onSemanticArrange('canvas'), currentItemCount < 2)}
      <div class="think-whiteboard-context-menu__separator" />
      {action('回到当前画布中心 · 100%', onCenter)}
    </>}
    <button type="button" class="think-whiteboard-context-menu__close" aria-label="关闭菜单" onClick={onClose}>×</button>
  </div>;
}
