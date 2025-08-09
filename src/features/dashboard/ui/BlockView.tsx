// src/features/dashboard/ui/BlockView.tsx
// 默认按 categoryKey 分组；颜色/标签基于 categoryKey
import { h, JSX } from 'preact';
import { Item, readField } from '@core/domain/schema';
import { getCategoryColor } from '@core/domain/categoryColorMap';
import { DataStore } from '@core/services/dataStore';
import { makeObsUri } from '@core/utils/obsidian';
import { TaskCheckbox } from '@shared/components/TaskCheckbox';

interface BlockViewProps {
  items: Item[];
  groupField?: string;   // ← 未传则默认 categoryKey
  showMeta?: boolean;
  fields?: string[];
}

const isDone = (k?: string) => /\/done$/i.test(k || '');

export function BlockView(props: BlockViewProps) {
  const { showMeta = true } = props;
  const groupField = props.groupField || 'categoryKey';
  let items = props.items;

  /* ------------------------- 分组 ------------------------- */
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

  /* ------------------------- 渲染 ------------------------- */

  const renderTaskLine = (item: Item) => {
    const done = isDone(item.categoryKey);
    return (
      <div style="margin-bottom:4px;line-height:1.5;">
        <TaskCheckbox
          done={done}
          onMarkDone={() => DataStore.instance.markItemDone(item.id)}
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
          <span class="tag-pill" key={t}>
            {t}
          </span>
        ))}
      </div>
    );
  };

  const renderBlock = (item: Item) => {
    const base = (item.categoryKey || '').split('/')[0] || '';
    return (
      <div
        style="
          display:grid;
          grid-template-columns:auto minmax(180px,1fr);
          align-items:start;
          gap:8px;
          margin-bottom:8px;
        "
      >
        {showMeta && (
          <div style="font-size:90%;display:flex;flex-wrap:wrap;gap:4px;">
            <span
              class="tag-pill"
              style={`background:${getCategoryColor(item.categoryKey)};`}
            >
              {base}
            </span>
            {item.date && <span class="tag-pill">{item.date}</span>}
            {item.extra['图标'] && (
              <span class="tag-pill">{String(item.extra['图标'])}</span>
            )}
          </div>
        )}
        <div style="white-space:pre-wrap;line-height:1.5;">
          <a href={makeObsUri(item)} target="_blank" rel="noopener">
            {item.content}
          </a>
        </div>
      </div>
    );
  };

  const renderItem = (it: Item) =>
    it.type === 'task' ? renderTaskLine(it) : renderBlock(it);

  /* ------------------------- 输出 ------------------------- */
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