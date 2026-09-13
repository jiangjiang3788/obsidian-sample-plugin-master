/** @jsxImportSource preact */
import { h, Fragment } from 'preact';
import { useState } from 'preact/hooks';
import type { WhiteboardEdge, WhiteboardItem, WhiteboardPosition } from '@core/whiteboard/public';
import { ThinkButton, ThinkInput } from '@shared/ui/public';
import { getWhiteboardConnectionPreviewPath, getWhiteboardEdgeGeometry, getWhiteboardPointEdgeGeometry, resolveWhiteboardItemPosition } from './WhiteboardEdgeGeometry';

export interface WhiteboardEdgeLayerProps {
  boardId: string;
  items: WhiteboardItem[];
  edges: WhiteboardEdge[];
  dragPreview?: { itemId: string; position: WhiteboardPosition } | null;
  onRemoveEdge: (edgeId: string) => void | Promise<void>;
  onUpdateEdgeLabel?: (edgeId: string, label: string) => void | Promise<void>;
  removingEdgeId?: string | null;
  connectionPreview?: { start: { x: number; y: number }; end: { x: number; y: number } } | null;
  presentationItemPoints?: ReadonlyMap<string, { x: number; y: number }> | null;
}

function safeMarkerId(boardId: string): string {
  const suffix = boardId.replace(/[^a-zA-Z0-9_-]/g, '-');
  return `think-whiteboard-arrow-${suffix || 'board'}`;
}

export function WhiteboardEdgeLayer({
  boardId, items, edges, dragPreview = null, onRemoveEdge, onUpdateEdgeLabel, removingEdgeId = null, connectionPreview = null, presentationItemPoints = null,
}: WhiteboardEdgeLayerProps) {
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const itemById = new Map(items.map((item) => [item.id, item]));
  const markerId = safeMarkerId(boardId);
  const renderable = edges.flatMap((edge) => {
    const from = itemById.get(edge.fromItemId); const to = itemById.get(edge.toItemId); if (!from || !to) return [];
    const fromPresentation = presentationItemPoints?.get(edge.fromItemId) ?? null;
    const toPresentation = presentationItemPoints?.get(edge.toItemId) ?? null;
    const geometry = fromPresentation && toPresentation
      ? getWhiteboardPointEdgeGeometry(fromPresentation, toPresentation)
      : getWhiteboardEdgeGeometry(resolveWhiteboardItemPosition(from, dragPreview), resolveWhiteboardItemPosition(to, dragPreview));
    return [{ edge, geometry }];
  });
  const beginEdit = (edge: WhiteboardEdge) => { setDraft(edge.label ?? ''); setEditingEdgeId(edge.id); };
  const finishEdit = (edgeId: string, value = draft) => { void onUpdateEdgeLabel?.(edgeId, value); setEditingEdgeId(null); };

  return (
    <Fragment>
      <svg class="think-whiteboard-edge-layer" aria-hidden="true">
        <defs><marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth" viewBox="0 0 8 8"><path class="think-whiteboard-edge__arrow" d="M 0 0 L 8 4 L 0 8 z" /></marker></defs>
        {renderable.map(({ edge, geometry }) => <path key={edge.id} class="think-whiteboard-edge__path" data-whiteboard-edge-id={edge.id} d={geometry.pathD} markerEnd={`url(#${markerId})`} />)}
        {connectionPreview && <path class="think-whiteboard-edge__path think-whiteboard-edge__path--preview" data-whiteboard-edge-preview="true" d={getWhiteboardConnectionPreviewPath(connectionPreview.start, connectionPreview.end)} markerEnd={`url(#${markerId})`} />}
      </svg>
      <div class="think-whiteboard-edge-controls" aria-label="白板连线操作">
        {renderable.map(({ edge, geometry }) => (
          <div key={edge.id} class="think-whiteboard-edge__control" style={`left:${geometry.midpointX}px;top:${geometry.midpointY}px;`} data-whiteboard-edge-control-id={edge.id}>
            {editingEdgeId === edge.id ? <ThinkInput autoFocus className="think-whiteboard-edge__label-input" value={draft} maxLength={200} aria-label="连线标注"
              onPointerDown={((event: Event) => event.stopPropagation()) as never} onInput={((event: Event) => setDraft((event.currentTarget as HTMLInputElement).value)) as never}
              onBlur={((event: FocusEvent) => finishEdit(edge.id, (event.currentTarget as HTMLInputElement).value)) as never} onKeyDown={((event: KeyboardEvent) => { if (event.key === 'Enter') { event.preventDefault(); finishEdit(edge.id, (event.currentTarget as HTMLInputElement).value); } else if (event.key === 'Escape') { event.preventDefault(); setEditingEdgeId(null); } }) as never} />
              : <button type="button" class={`think-whiteboard-edge__label${edge.label ? ' has-label' : ''}`} aria-label={edge.label ? `编辑连线标注：${edge.label}` : '添加连线标注'} title="双击或点击编辑连线标注"
                onPointerDown={((event: Event) => event.stopPropagation()) as never} onClick={((event: Event) => { event.preventDefault(); event.stopPropagation(); beginEdit(edge); }) as never}>{edge.label || '+ 标注'}</button>}
            <ThinkButton className="think-whiteboard-edge__remove" size="sm" variant="ghost" aria-label="删除连线" title="删除这条连线" disabled={removingEdgeId === edge.id}
              onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.preventDefault(); event.stopPropagation(); void onRemoveEdge(edge.id); }}>{removingEdgeId === edge.id ? '…' : '×'}</ThinkButton>
          </div>
        ))}
      </div>
    </Fragment>
  );
}
