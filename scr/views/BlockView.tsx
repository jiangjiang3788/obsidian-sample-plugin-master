// scr/views/BlockView.tsx
// 主要改动：使用公共 TaskCheckbox 组件，删除重复逻辑
import { h, JSX } from 'preact';
import { Item, readField } from '../config/schema';
import { getCategoryColor } from '../config/categoryColorMap';
import { DataStore } from '../data/store';
import { makeObsUri } from '../utils/obsidian';
import { TaskCheckbox } from './common/TaskCheckbox';   // ★ 新增

interface BlockViewProps {
  items: Item[];
  groupField?: string;
  showMeta?: boolean;
  fields?: string[];
}

export function BlockView(props: BlockViewProps) {
  const { groupField, showMeta = true, fields } = props;
  let items = props.items;

  /* ------------------------- 分组逻辑保持不变 ------------------------- */
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

  /* ------------------------- 渲染任务 / Block ------------------------- */

  const renderTaskLine = (item: Item) => {
    const isDone = item.status === 'done';
    return (
      <div style="margin-bottom:4px;line-height:1.5;">
        <TaskCheckbox
          done={isDone}
          onMarkDone={() => DataStore.instance.markItemDone(item.id)}
        />
        <a
          href={makeObsUri(item.id)}
          target="_blank"
          rel="noopener"
          class={isDone ? 'task-done' : ''}
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

  const renderBlock = (item: Item) => (
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
            style={`background:${getCategoryColor(item.category)};`}
          >
            {item.category}
          </span>
          {item.date && <span class="tag-pill">{item.date}</span>}
          {item.extra['图标'] && (
            <span class="tag-pill">{item.extra['图标']}</span>
          )}
        </div>
      )}
      <div style="white-space:pre-wrap;line-height:1.5;">
        <a href={makeObsUri(item.id)} target="_blank" rel="noopener">
          {item.content}
        </a>
      </div>
    </div>
  );

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
文件: G:\vikahz\.obsidian\plugins\obsidian-sample-plugin-master\src\views\CalendarView.tsx 
// scr/views/CalendarView.tsx - 日历视图组件 (占位实现)
import { render, h } from 'preact';  // 使用 Preact 渲染 JSX 组件
export function CalendarView(props: any) {
  return <div>（Calendar 日视图暂未实现）</div>;
} 
文件: G:\vikahz\.obsidian\plugins\obsidian-sample-plugin-master\src\views\ChartView.tsx 
// scr/views/ChartView.tsx - 图表视图组件 (占位实现)
import { render } from 'preact';  // 使用 Preact 渲染 JSX 组件
export function ChartView(props: any) {
  return <div>（Chart 图表视图暂未实现）</div>;
}