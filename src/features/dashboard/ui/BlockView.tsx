// src/features/dashboard/ui/BlockView.tsx

/** @jsxImportSource preact */

import { h } from 'preact';
import { Item, readField } from '@core/domain/schema';
import { getCategoryColor } from '@core/domain/categoryColorMap';
import { makeObsUri } from '@core/utils/obsidian';
import { TaskCheckbox } from '@shared/components/TaskCheckbox';
import { DataStore } from '@core/services/dataStore';
import { getFieldLabel } from '@core/domain/fields';
import { useRef, useState, useEffect } from 'preact/hooks';

interface BlockViewProps {
  items: Item[];
  groupField?: string;
  fields?: string[];
}

const isDone = (k?: string) => /\/(done|cancelled)$/i.test(k || '');

const FieldRenderer = ({ item, fieldKey }: { item: Item; fieldKey: string }) => {
    const value = readField(item, fieldKey);
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return null;
    const label = getFieldLabel(fieldKey);
    const displayValue = Array.isArray(value) ? value.join(', ') : String(value);

    return (
        <span class="tag-pill" title={`${label}: ${displayValue}`}>
            {displayValue}
        </span>
    );
};

export function BlockView(props: BlockViewProps) {
  const { items, groupField = 'categoryKey', fields = [] } = props;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setIsNarrow(entry.contentRect.width < 450);
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const onMarkItemDone = (itemId: string) => {
    DataStore.instance.markItemDone(itemId);
  };
  
  const grouped: Record<string, Item[]> = {};
  for (const it of items) {
    const key = String(readField(it, groupField) ?? '(未分类)');
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(it);
  }
  const groupKeys = Object.keys(grouped).sort((a,b) => a.localeCompare(b, 'zh-CN'));

  const renderTaskLine = (item: Item) => {
    const done = isDone(item.categoryKey);
    return (
      <div style="margin-bottom:6px; line-height:1.5; display:flex; align-items:flex-start; gap: 4px;">
        <TaskCheckbox done={done} onMarkDone={() => onMarkItemDone(item.id)} />
        <div style="flex:1;">
            <a href={makeObsUri(item)} target="_blank" rel="noopener" class={done ? 'task-done' : ''} style={{ color: 'var(--text-normal)' }}>
                {item.icon && <span style="margin-right: 4px;">{item.icon}</span>}
                {item.title}
            </a>
            <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top: 2px;">
                {fields.map(fieldKey => <FieldRenderer key={fieldKey} item={item} fieldKey={fieldKey} />)}
            </div>
        </div>
      </div>
    );
  };

  const renderBlock = (item: Item) => {
    const baseCategory = (item.categoryKey || '').split('/')[0] || '';
    const customFields = fields.filter(f => f !== 'title' && f !== 'content');
    
    // 窄布局 (< 450px)：自定义字段区自动换行
    if (isNarrow) {
        return (
            <div style="margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; flex-direction: row; flex-wrap: wrap; align-items: flex-start; gap: 6px;">
                    <span class="tag-pill" style={`background:${getCategoryColor(item.categoryKey)};`}>{baseCategory}</span>
                    {customFields.map(fieldKey => <FieldRenderer key={fieldKey} item={item} fieldKey={fieldKey} />)}
                </div>
                {fields.includes('title') && (
                    <div style="font-weight: 500; color: var(--text-normal);">
                        <a href={makeObsUri(item)} target="_blank" rel="noopener">{item.title}</a>
                    </div>
                )}
                {fields.includes('content') && (
                    <div style="white-space: pre-wrap; line-height: 1.6; color: var(--text-muted);">
                        <a href={makeObsUri(item)} target="_blank" rel="noopener" style={{color: 'inherit'}}>{item.content}</a>
                    </div>
                )}
            </div>
        );
    }

    // 宽布局 (>= 450px)：自定义字段区不换行，无限宽度
    return (
      <div style="display: flex; gap: 10px; margin-bottom: 12px;">
            {/* [MODIFIED] 左栏：不再限制宽度，由内容自由撑开 */}
            <div style="flex-shrink: 0;">
                {/* [MODIFIED] 内部：强制不换行 */}
                <div style="display: flex; flex-direction: row; flex-wrap: nowrap; align-items: flex-start; gap: 6px;">
                    <span class="tag-pill" style={`background:${getCategoryColor(item.categoryKey)};`}>{baseCategory}</span>
                    {customFields.map(fieldKey => <FieldRenderer key={fieldKey} item={item} fieldKey={fieldKey} />)}
                </div>
            </div>
            <div style="flex-grow: 1; min-width: 0;">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    {fields.includes('title') && (
                        <div style="font-weight: 500; color: var(--text-normal);">
                            <a href={makeObsUri(item)} target="_blank" rel="noopener">{item.title}</a>
                        </div>
                    )}
                    {fields.includes('content') && (
                        <div style="white-space: pre-wrap; line-height: 1.6; color: var(--text-muted);">
                            <a href={makeObsUri(item)} target="_blank" rel="noopener" style={{color: 'inherit'}}>{item.content}</a>
                        </div>
                    )}
                </div>
            </div>
      </div>
    );
  };

  const renderItem = (it: Item) => it.type === 'task' ? renderTaskLine(it) : renderBlock(it);

  return (
    <div ref={containerRef}>
      {groupKeys.map(key => (
        <div key={key} style="margin-bottom: 1.2em;">
          <h5 style="margin-bottom: 0.8em;">{key}</h5>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            {grouped[key].map(renderItem)}
          </div>
        </div>
      ))}
    </div>
  );
}