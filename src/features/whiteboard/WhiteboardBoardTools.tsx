/** @jsxImportSource preact */
import { h } from 'preact';
import { ThinkIconButton, ThinkInput } from '@shared/ui/public';
import type { WhiteboardFindController } from './WhiteboardFindController';
import { formatWhiteboardZoomPercent, WHITEBOARD_ZOOM_DEFAULT, WHITEBOARD_ZOOM_MAX, WHITEBOARD_ZOOM_MIN } from './WhiteboardZoomModel';

export interface WhiteboardBoardToolsProps {
  sourceCollapsed: boolean;
  onToggleSource: () => void;
  gridVisible: boolean;
  onToggleGrid: () => void;
  find: WhiteboardFindController;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onCenterBoard: () => void;
  onFitBoard: () => void;
  archiveCount: number;
  archiveOpen: boolean;
  onToggleArchive: () => void;
  onCreateWorkbench: () => void;
  selectionCount: number;
  onClearSelection: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  findPathLabel?: string;
  activeCanvasId?: string | null;
  activeCanvasTitle?: string | null;
  onExitCanvas?: () => void;
  onExitToRoot?: () => void;
}

export function WhiteboardBoardTools({
  sourceCollapsed,
  onToggleSource,
  gridVisible,
  onToggleGrid,
  find,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onCenterBoard,
  onFitBoard,
  archiveCount,
  archiveOpen,
  onToggleArchive,
  onCreateWorkbench,
  selectionCount,
  onClearSelection,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  findPathLabel,
  activeCanvasId = null,
  activeCanvasTitle = null,
  onExitCanvas,
  onExitToRoot,
}: WhiteboardBoardToolsProps) {
  return (
    <div class="think-whiteboard-board-tools">
      <div class="think-whiteboard-board-tools__left">
        <ThinkIconButton
          className="think-whiteboard-board-tools__source-toggle"
          size="sm"
          label={sourceCollapsed ? '展开记录栏' : '收起记录栏'}
          icon={<span aria-hidden="true">{sourceCollapsed ? '›' : '‹'}</span>}
          pressed={!sourceCollapsed}
          onClick={onToggleSource}
        />
        <ThinkIconButton
          className="think-whiteboard-board-tools__grid-toggle"
          size="sm"
          label={gridVisible ? '关闭白板网格' : '显示白板网格'}
          icon={<span aria-hidden="true">#</span>}
          pressed={gridVisible}
          onClick={onToggleGrid}
        />
        {activeCanvasId && (
          <div class="think-whiteboard-board-tools__nested-exit" data-whiteboard-active-canvas-id={activeCanvasId} aria-label={`当前工作台：${activeCanvasTitle ?? '当前工作台'}`}>
            <ThinkIconButton size="sm" label="返回上一级工作台" icon={<span aria-hidden="true">←</span>} onClick={() => onExitCanvas?.()} />
            <ThinkIconButton size="sm" label="退出到根白板" icon={<span aria-hidden="true">⌂</span>} onClick={() => onExitToRoot?.()} />
          </div>
        )}
      </div>
      <div class="think-whiteboard-board-tools__right">
        <ThinkIconButton size="sm" label="撤销白板操作" icon={<span aria-hidden="true">↶</span>} disabled={!canUndo} onClick={() => onUndo?.()} />
        <ThinkIconButton size="sm" label="重做白板操作" icon={<span aria-hidden="true">↷</span>} disabled={!canRedo} onClick={() => onRedo?.()} />
        <ThinkIconButton size="sm" label="新建工作台" icon={<span aria-hidden="true">▣</span>} onClick={onCreateWorkbench} />
        <ThinkIconButton size="sm" label={`归档箱${archiveCount > 0 ? `（${archiveCount}）` : ''}`} icon={<span aria-hidden="true">▱</span>} pressed={archiveOpen} onClick={onToggleArchive} />
        {selectionCount > 0 && <div class="think-whiteboard-board-selection" aria-live="polite"><span>已选 {selectionCount}</span><ThinkIconButton size="sm" label="清除白板选择" icon={<span aria-hidden="true">×</span>} onClick={onClearSelection} /></div>}
        <ThinkIconButton size="sm" label="回到画布中心" title={activeCanvasId ? `找回工作台「${activeCanvasTitle ?? '当前工作台'}」内容并恢复到 100%` : '找回根白板内容并恢复到 100%'} icon={<span aria-hidden="true">◎</span>} onClick={onCenterBoard} />
        <ThinkIconButton size="sm" label="适配当前画布内容" title={activeCanvasId ? `适配工作台「${activeCanvasTitle ?? '当前工作台'}」全部内容（最多 100%）` : '适配根白板全部内容（最多 100%）'} icon={<span aria-hidden="true">⤢</span>} onClick={onFitBoard} />
        <div class="think-whiteboard-zoom" aria-label="白板缩放">
          <ThinkIconButton size="sm" label="缩小白板" icon={<span aria-hidden="true">−</span>} disabled={zoom <= WHITEBOARD_ZOOM_MIN} onClick={onZoomOut} />
          <button
            type="button"
            class="think-whiteboard-zoom__value"
            aria-label={`重置白板缩放到 ${Math.round(WHITEBOARD_ZOOM_DEFAULT * 100)}%`}
            title="重置到 100%"
            onClick={onResetZoom}
          >{formatWhiteboardZoomPercent(zoom)}</button>
          <ThinkIconButton size="sm" label="放大白板" icon={<span aria-hidden="true">＋</span>} disabled={zoom >= WHITEBOARD_ZOOM_MAX} onClick={onZoomIn} />
        </div>
        <div class="think-whiteboard-find" role="search" aria-label="在白板中查找">
          <ThinkInput
            className="think-whiteboard-find__input"
            ref={find.inputRef}
            value={find.query}
            placeholder="查找白板卡片"
            aria-label="查找白板卡片"
            onInput={(event: Event) => find.setQuery((event.currentTarget as HTMLInputElement).value)}
            onKeyDown={((event: KeyboardEvent) => {
              if (event.key !== 'Enter' || find.matchIds.length === 0) return;
              event.preventDefault();
              find.step(event.shiftKey ? -1 : 1);
            }) as never}
          />
          {find.active && (
            <>
              <span class="think-whiteboard-find__count" aria-live="polite">
                {find.matchIds.length > 0 ? `${Math.min(find.index, find.matchIds.length - 1) + 1}/${find.matchIds.length}` : '0'}
              </span>
              {find.activeItemId && findPathLabel && <span class="think-whiteboard-find__path" title={findPathLabel}>{findPathLabel}</span>}
              <ThinkIconButton size="sm" label="上一个匹配" icon={<span aria-hidden="true">↑</span>} disabled={find.matchIds.length === 0} onClick={() => find.step(-1)} />
              <ThinkIconButton size="sm" label="下一个匹配" icon={<span aria-hidden="true">↓</span>} disabled={find.matchIds.length === 0} onClick={() => find.step(1)} />
              <ThinkIconButton size="sm" label="清除白板查找" icon={<span aria-hidden="true">×</span>} onClick={() => find.setQuery('')} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
