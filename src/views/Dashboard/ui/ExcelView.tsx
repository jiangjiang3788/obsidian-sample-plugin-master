// src/features/dashboard/ui/ExcelView.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { App } from 'obsidian';
import { Item, getAllFields, readField } from '@/lib/types/domain/schema';
import { makeObsUri } from '@/lib/utils/core/obsidian';

// 接口定义保持不变
interface ExcelViewProps {
  items: Item[];
  fields?: string[];
  app: App;
}

// 辅助函数保持不变
function toText(v: any): string {
  if (Array.isArray(v)) return v.join(', ');
  return v == null ? '' : String(v);
}

export function ExcelView({ items, fields, app }: ExcelViewProps) {
  const rawCols = (fields && fields.length) ? fields : getAllFields(items);
  const cols = Array.from(new Set(rawCols.map(c =>
    c === 'status' || c === 'category' ? 'categoryKey' : c
  )));

  /**
   * [修改] 单元格内容渲染函数
   * - 现在为所有 'content' 字段创建链接，无论其长度如何。
   * - 链接颜色设置为普通文本颜色，以更好地融入表格。
   * - 长于20个字符的内容仍然会被截断显示。
   */
  const renderCellContent = (item: Item, field: string) => {
    const value = readField(item, field);

    // 检查字段是否为 'content' 并且值是字符串
    if (field === 'content' && typeof value === 'string') {
      // 如果内容为空，则不显示任何内容
      if (!value) {
        return '';
      }
      
      // 决定显示的文本：如果超过20个字符，则截断；否则显示全文
      const displayText = value.length > 20 ? value.substring(0, 20) + '...' : value;
      const obsUri = makeObsUri(item, app);

      return (
        <a 
          href={obsUri} 
          target="_blank" 
          rel="noopener" 
          title={value} // 鼠标悬浮时显示完整内容
          // [新增] 内联样式，使链接颜色和普通文本一致
          style={{ color: 'var(--text-normal)', textDecoration: 'none' }}
        >
          {displayText}
        </a>
      );
    }
    
    // 对于其他所有字段，返回纯文本
    return toText(value);
  };

  return (
    <div>
      <table class="think-table" style="min-width:100%; white-space:nowrap;">
        <thead>
          <tr>{cols.map(c => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {items.map(it => (
            <tr key={it.id}>
              {cols.map(c => <td key={c}>{renderCellContent(it, c)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
