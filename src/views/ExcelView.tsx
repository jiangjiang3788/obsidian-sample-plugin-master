// views/ExcelView.tsx

import { h } from 'preact';
import { Item, getAllFields, readField } from '../config/schema';

interface ExcelViewProps {
  items: Item[];
  fields?: string[];
}

function toText(v: any): string {
  if (Array.isArray(v)) return v.join(', ');
  return v == null ? '' : String(v);
}

export function ExcelView({ items, fields }: ExcelViewProps) {
  const cols = (fields && fields.length) ? fields : getAllFields(items);

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
