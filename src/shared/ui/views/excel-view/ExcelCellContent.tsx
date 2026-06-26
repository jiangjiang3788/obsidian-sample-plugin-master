/** @jsxImportSource preact */
import { h } from 'preact';
import { MarkdownContent } from '../../markdown/MarkdownContent';
import { truncateExcelCellText } from './value';
import type { ExcelCellModel } from './types';
import type { MessageRenderPort } from '@core/public';

export interface ExcelCellContentProps {
  cell: ExcelCellModel;
  contentText: string;
  showFullMarkdownContent: boolean;
  messageRenderPort?: MessageRenderPort;
  onMarkdownClick: (event: MouseEvent) => void;
  onMarkdownDoubleClick: (event: MouseEvent) => void;
}

export function ExcelCellContent({
  cell,
  contentText,
  showFullMarkdownContent,
  messageRenderPort,
  onMarkdownClick,
  onMarkdownDoubleClick,
}: ExcelCellContentProps) {
  if (showFullMarkdownContent) {
    return (
      <MarkdownContent
        renderPort={messageRenderPort}
        content={contentText}
        contentType="markdown"
        sourcePath={cell.item.file?.path || ''}
        className="excel-view-cell-md"
        onClick={onMarkdownClick}
        onDblClick={onMarkdownDoubleClick}
      />
    );
  }

  if (cell.canonicalField === 'content' && contentText) {
    return <span class="excel-view-content-link">{truncateExcelCellText(contentText)}</span>;
  }

  return <span class="excel-view-cell-value">{cell.displayValue}</span>;
}
