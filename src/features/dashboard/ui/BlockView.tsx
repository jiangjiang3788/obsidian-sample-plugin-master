// src/features/dashboard/ui/BlockView.tsx
import { h, JSX } from 'preact';
import { useContext } from 'preact/hooks'; // [REFACTOR] Import useContext hook.
import { Item, readField } from '@core/domain/schema';
import { getCategoryColor } from '@core/domain/categoryColorMap';
import { makeObsUri } from '@core/utils/obsidian';
import { TaskCheckbox } from '@shared/components/TaskCheckbox';
import { DashboardContext } from './DashboardContext'; // [REFACTOR] Import the context.

interface BlockViewProps {
  items: Item[];
  groupField?: string;
  showMeta?: boolean;
  fields?: string[];
  // [REFACTOR] onMarkItemDone prop is no longer needed.
}

const isDone = (k?: string) => /\/done$/i.test(k || '');

export function BlockView(props: BlockViewProps) {
  // [REFACTOR] Consume the context to get the required function.
  const { onMarkItemDone } = useContext(DashboardContext);
  
  const { showMeta = true } = props;
  const groupField = props.groupField || 'categoryKey';
  let items = props.items;

  let grouped: Record<string, Item[]> | null = null;
  let groupKeys: string[] = [];
  if (groupField) {
    grouped = {};
    for (const it of items) {
      const key = String(readField(it, groupField) ?? '(none)');
      if (!grouped[key]) {
        grouped[key] = [];
        groupKeys.push(key);
      }
      grouped[key].push(it);
    }
    groupKeys.sort();
  }

  const renderTaskLine = (item: Item) => {
    const done = isDone(item.categoryKey);
    return (
      <div style="margin-bottom:4px;line-height:1.5;">
        <TaskCheckbox
          done={done}
          // [REFACTOR] Use the function obtained from the context.
          onMarkDone={() => onMarkItemDone(item.id)}
        />
        <a
          href={makeObsUri(item)}
          target="_blank"
          rel="noopener"
          class={done ? 'task-done' : ''}
        >
          {item.title}
        </a>
        {item.icon && <span class="tag-pill">{item.icon}</span>}
        {item.tags.map(t => (
          <span class="tag-pill" key={t}>{t}</span>
        ))}
      </div>
    );
  };

  const renderBlock = (item: Item) => {
    const base = (item.categoryKey || '').split('/')[0] || '';
    return (
      <div style="display:grid; grid-template-columns:auto minmax(180px,1fr); align-items:start; gap:8px; margin-bottom:8px;">
        {showMeta && (
          <div style="font-size:90%;display:flex;flex-wrap:wrap;gap:4px;">
            <span class="tag-pill" style={`background:${getCategoryColor(item.categoryKey)};`}>{base}</span>
            {item.date && <span class="tag-pill">{item.date}</span>}
            {item.extra['图标'] && (<span class="tag-pill">{String(item.extra['图标'])}</span>)}
          </div>
        )}
        <div style="white-space:pre-wrap;line-height:1.5;">
          <a href={makeObsUri(item)} target="_blank" rel="noopener">{item.content}</a>
        </div>
      </div>
    );
  };

  const renderItem = (it: Item) => it.type === 'task' ? renderTaskLine(it) : renderBlock(it);

  return (
    <div>
      {grouped
        ? groupKeys.map(grp => (
          <div key={grp}>
            <h5>{grp}</h5>
            {grouped![grp].map(renderItem)}
          </div>
        ))
        : items.map(renderItem)}
    </div>
  );
}