/** @jsxImportSource preact */
import { h } from 'preact';
import type { WhiteboardGroup } from '@core/whiteboard/public';
import { ThinkIconButton } from '@shared/ui/public';

interface WhiteboardCanvasBreadcrumbsProps {
  path: readonly WhiteboardGroup[];
  canGoBack: boolean;
  canGoForward: boolean;
  onEnter: (groupId: string | null) => void;
  onParent: () => void;
  onBack: () => void;
  onForward: () => void;
  onFitContent: () => void;
}

export function WhiteboardCanvasBreadcrumbs({ path, canGoBack, canGoForward, onEnter, onParent, onBack, onForward, onFitContent }: WhiteboardCanvasBreadcrumbsProps) {
  if (path.length === 0 && !canGoBack && !canGoForward) return null;
  return (
    <div class="think-whiteboard-breadcrumbs" aria-label="工作台层级导航">
      <div class="think-whiteboard-breadcrumbs__history" aria-label="子画布浏览历史">
        <ThinkIconButton size="sm" label="返回上次画布" icon={<span aria-hidden="true">←</span>} disabled={!canGoBack} onClick={onBack} />
        <ThinkIconButton size="sm" label="前进到下次画布" icon={<span aria-hidden="true">→</span>} disabled={!canGoForward} onClick={onForward} />
        <ThinkIconButton size="sm" label="返回父工作台" icon={<span aria-hidden="true">↑</span>} disabled={path.length === 0} onClick={onParent} />
      </div>
      <div class="think-whiteboard-breadcrumbs__path">
        <button type="button" class="think-whiteboard-breadcrumbs__item" aria-label="退出到根白板" aria-current={path.length === 0 ? 'page' : undefined} onClick={() => onEnter(null)}>白板</button>
        {path.map((group, index) => (
          <span class="think-whiteboard-breadcrumbs__segment" key={group.id}>
            <span aria-hidden="true">›</span>
            <button type="button" class="think-whiteboard-breadcrumbs__item" data-whiteboard-breadcrumb-group-id={group.id} aria-current={index === path.length - 1 ? 'page' : undefined} onClick={() => onEnter(group.id)}>{group.title}</button>
          </span>
        ))}
      </div>
      {path.length > 0 && <ThinkIconButton className="think-whiteboard-breadcrumbs__fit" size="sm" label="适配当前工作台内容" icon={<span aria-hidden="true">⤢</span>} onClick={onFitContent} />}
    </div>
  );
}
