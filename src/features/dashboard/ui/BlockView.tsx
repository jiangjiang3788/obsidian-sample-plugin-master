// src/features/dashboard/ui/BlockView.tsx

/** @jsxImportSource preact */

import { h } from 'preact';

import { Item, readField } from '@core/domain/schema';

import { getCategoryColor } from '@core/domain/categoryColorMap';

import { makeObsUri } from '@core/utils/obsidian';

import { TaskCheckbox } from '@shared/components/TaskCheckbox';

import { DataStore } from '@core/services/dataStore';

import { getFieldLabel } from '@core/domain/fields';



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

            <strong style={{ opacity: 0.7, marginRight: '4px' }}>{label}:</strong> {displayValue}

        </span>

    );

};



export function BlockView(props: BlockViewProps) {

  // 直接从 DataStore 单例调用方法，不再需要 Context

  const onMarkItemDone = (itemId: string) => {

    DataStore.instance.markItemDone(itemId);

  };

  

  const { items, groupField = 'categoryKey', fields = [] } = props;



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

            {fields.length > 0 && (

                <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top: 2px;">

                    {fields.map(fieldKey => <FieldRenderer key={fieldKey} item={item} fieldKey={fieldKey} />)}

                </div>

            )}

        </div>

      </div>

    );

  };



  const renderBlock = (item: Item) => {

    const baseCategory = (item.categoryKey || '').split('/')[0] || '';

    return (

      <div style="margin-bottom:10px; border-left: 2px solid #ddd; padding-left: 10px;">

        <div style="white-space:pre-wrap; line-height:1.6; margin-bottom: 4px;">

          <a href={makeObsUri(item)} target="_blank" rel="noopener" style={{ color: 'var(--text-normal)' }}>{item.content}</a>

        </div>

        <div style="display:flex; flex-wrap:wrap; gap:4px; font-size: 0.85em;">

            <span class="tag-pill" style={`background:${getCategoryColor(item.categoryKey)};`}>{baseCategory}</span>

            {fields.map(fieldKey => <FieldRenderer key={fieldKey} item={item} fieldKey={fieldKey} />)}

        </div>

      </div>

    );

  };



  const renderItem = (it: Item) => it.type === 'task' ? renderTaskLine(it) : renderBlock(it);



  return (

    <div>

      {groupKeys.map(key => (

        <div key={key} style="margin-bottom: 1.2em;">

          <h5 style="margin-bottom: 0.6em; border-bottom: 1px solid var(--background-modifier-border); padding-bottom: 4px;">{key}</h5>

          <div style="display: flex; flex-direction: column; gap: 4px;">

            {grouped[key].map(renderItem)}

          </div>

        </div>

      ))}

    </div>

  );

}