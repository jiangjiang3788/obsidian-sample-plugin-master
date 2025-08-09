// src/features/dashboard/ui/ExcelView.tsx
// 默认字段改为包含 categoryKey；若传入 fields 里含有 status/category，会在这里替换为 categoryKey

import { h } from 'preact';
import { Item, getAllFields, readField } from '@core/domain/schema';

interface ExcelViewProps {
  items: Item[];
  fields?: string[];
}

function toText(v: any): string {
  if (Array.isArray(v)) return v.join(', ');
  return v == null ? '' : String(v);
}

export function ExcelView({ items, fields }: ExcelViewProps) {
  // 1) 默认使用 schema 的字段集合（已包含 categoryKey）
  // 2) 如果外部传入了 fields，兼容性替换其中的 status/category -> categoryKey，并去重
  const rawCols = (fields && fields.length) ? fields : getAllFields(items);
  const cols = Array.from(new Set(rawCols.map(c =>
    c === 'status' || c === 'category' ? 'categoryKey' : c
  )));

  return (
    <div>
      <table class="think-table" style="min-width:100%; white-space:nowrap;">
        <thead>
          <tr>{cols.map(c => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {items.map(it => (
            <tr key={it.id}>
              {cols.map(c => <td key={c}>{toText(readField(it, c))}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}