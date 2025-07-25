
// views/BlockView.tsx

import { Item, readField } from '../config/schema';
import { getCategoryColor } from '../config/categoryColorMap';
import { DataStore } from '../data/store';
import { h, JSX } from 'preact';
import './styles.css';
import { makeObsUri } from '../utils/obsidian';

interface BlockViewProps {
  items: Item[];
  groupField?: string;
  showMeta?: boolean;
  fields?: string[];
}

export function BlockView(props: BlockViewProps) {
  const { groupField, showMeta = true, fields } = props;
  let { items } = props;

  let filteredItems = items;
  if (fields && fields.length > 0) {
    filteredItems = items.filter(item =>
      fields.some(field => {
        const val = readField(item, field);
        return val !== null && val !== undefined && String(val).trim() !== '';
      })
    );
  }

  let grouped: Record<string, Item[]> | null = null;
  let groupKeys: string[] = [];
  if (groupField) {
    grouped = {};
    for (const item of filteredItems) {
      const key = String(readField(item, groupField) ?? '(none)');
      if (!grouped[key]) {
        grouped[key] = [];
        groupKeys.push(key);
      }
      grouped[key].push(item);
    }
    groupKeys.sort();
  }

  const renderCheckbox = (item: Item) => {
    if (item.type !== 'task') return null;
    const isDone = item.status === 'done';
    return (
      <input
        type="checkbox"
        class={`task-checkbox ${isDone ? 'done' : ''}`}
        checked={isDone}
        onClick={isDone ? (e) => e.preventDefault() : undefined}
        onChange={async (e) => {
          if ((e.target as HTMLInputElement).checked && !isDone) {
            await DataStore.instance.markItemDone(item.id);
          }
        }}
      />
    );
  };

  const renderBlockItem = (item: Item) => {
    if (fields && fields.length > 0) {
      const hasTitle     = fields.includes('title');
      const hasContent   = fields.includes('content');
      const metaFields   = ['category', 'date', 'icon'];
      const hasMetaField = fields.some(f => metaFields.includes(f));
      const useCardLayout = hasMetaField && (hasTitle || hasContent);

      if (useCardLayout) {
        const metaPills: JSX.Element[] = [];
        fields.forEach(f => {
          if (!metaFields.includes(f)) return;
          const val = readField(item, f);
          if (val == null || String(val).trim() === '') return;

          if (f === 'category') {
            metaPills.push(
              <span class="tag-pill" style={`background:${getCategoryColor(item.category)};`} key="cat">
                {item.category}
              </span>
            );
          } else if (f === 'date') {
            metaPills.push(<span class="tag-pill" key="date">{item.date}</span>);
          } else if (f === 'icon') {
            metaPills.push(<span class="tag-pill" key="icon">{item.icon}</span>);
          }
        });

        const topLine = () => {
          if (hasTitle) {
            const titleNode = !hasContent ? (
              <a href={`${makeObsUri(item.id)}`} target="_blank" rel="noopener">{item.title}</a>
            ) : (
              <span>{item.title}</span>
            );
            return (
              <div style="line-height:1.5;margin-bottom:2px;">
                {renderCheckbox(item)}
                {titleNode}
              </div>
            );
          }
          if (hasContent) {
            return (
              <div style="line-height:1.5;margin-bottom:2px;">
                {renderCheckbox(item)}
                <a href={`${makeObsUri(item.id)}`} target="_blank" rel="noopener" style="white-space:pre-wrap;">
                  {item.content}
                </a>
              </div>
            );
          }
          return null;
        };

        const bottomLine = hasTitle && hasContent ? (
          <div style="white-space:pre-wrap;line-height:1.5;">
            <a href={`${makeObsUri(item.id)}`} target="_blank" rel="noopener">
              {item.content}
            </a>
          </div>
        ) : null;

        return (
          <div
            style="
              display:grid;
              grid-template-columns:auto minmax(180px,1fr);
              gap:8px;
              align-items:start;
              margin-bottom:8px;
            "
          >
            <div style="font-size:90%;display:flex;flex-wrap:wrap;gap:4px;">{metaPills}</div>
            <div>
              {topLine()}
              {bottomLine}
            </div>
          </div>
        );
      }

      const rowElems: JSX.Element[] = [];
      let checkboxRendered = false;

      fields.forEach((field, idx) => {
        const val = readField(item, field);

        if (!checkboxRendered && item.type === 'task' && (field === 'title' || field === 'content')) {
          rowElems.push(renderCheckbox(item) as JSX.Element);
          checkboxRendered = true;
        }

        if (field === 'content') {
          rowElems.push(
            <a href={`${makeObsUri(item.id)}`} target="_blank" rel="noopener" style="white-space:pre-wrap;" key={idx}>
              {item.content}
            </a>
          );
        } else if (field === 'title') {
          if (!fields.includes('content')) {
            rowElems.push(
              <a href={`${makeObsUri(item.id)}`} target="_blank" rel="noopener" key={idx}>
                {item.title}
              </a>
            );
          } else {
            rowElems.push(<span key={idx}>{item.title}</span>);
          }
        } else if (field === 'tags') {
          rowElems.push(
            <span key="tags">
              {item.tags.map((tag) => (
                <span class="tag-pill" key={tag}>{tag}</span>
              ))}
            </span>
          );
        } else if (field === 'category') {
          rowElems.push(
            <span class="tag-pill" style={`background:${getCategoryColor(item.category)};`} key={idx}>
              {item.category}
            </span>
          );
        } else if (field === 'icon') {
          if (item.icon) rowElems.push(<span class="tag-pill" key={idx}>{item.icon}</span>);
        } else {
          if (val == null) return;
          const text = Array.isArray(val) ? val.join(', ') : String(val);
          rowElems.push(<span class="tag-pill" key={idx}>{text}</span>);
        }
      });

      return <div style="margin-bottom:8px;line-height:1.5;">{rowElems.map((el, i) => <span key={i}>{el}</span>)}</div>;
    }

    if (item.type === 'task') {
      const isDone = item.status === 'done';
      return (
        <div style="margin-bottom:4px;line-height:1.5;">
          {renderCheckbox(item)}
          <a href={`${makeObsUri(item.id)}`} target="_blank" rel="noopener" class={isDone ? 'task-done' : ''}>
            {item.title}
          </a>
          {item.icon && <span class="tag-pill">{item.icon}</span>}
          {item.tags.map((tag) => (
            <span class="tag-pill" key={tag}>{tag}</span>
          ))}
        </div>
      );
    } else {
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
              <span class="tag-pill" style={`background:${getCategoryColor(item.category)};`}>{item.category}</span>
              {item.date && <span class="tag-pill">{item.date}</span>}
              {item.extra['图标'] && <span class="tag-pill">{item.extra['图标']}</span>}
            </div>
          )}
          <div style="white-space:pre-wrap;line-height:1.5;">
            <a href={`${makeObsUri(item.id)}`} target="_blank" rel="noopener">
              {item.content}
            </a>
          </div>
        </div>
      );
    }
  };

  return (
    <div>
      {grouped
        ? groupKeys.map((grp) => (
            <div>
              <h5>{grp}</h5>
              {grouped![grp].map((it) => renderBlockItem(it))}
            </div>
          ))
        : filteredItems.map((it) => renderBlockItem(it))}
    </div>
  );
}
