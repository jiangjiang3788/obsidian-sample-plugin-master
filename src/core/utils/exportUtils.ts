import type { RecordViewItem } from '@/core/records/RecordEntity';
import { BLOCK_EXPORT_DEFAULT_CONFIG, type ExportViewConfig } from '@/core/config/views';
import { createExportRuntimeContext, getExportConfig, type ExportViewRequest } from './export/model';
import { exportMarkdownTable, exportRecordList } from './export/recordRenderer';
import { exportEnergy, exportEisenhower, exportHeatmap, exportProgress, exportStatistics } from './export/summaryStrategies';
import { exportEventTimeline, exportTimeline } from './export/timeStrategies';

export type { ExportViewRequest } from './export/model';

/** 根据视图类型获取结构级导出策略。 */
export function getExportConfigByViewType(viewType: string): ExportViewConfig {
  // Keep the canonical registry lookup visible here: the convergence gate verifies
  // that export availability/config never drifts into a second per-view map.
  return getExportConfig(viewType);
}

/**
 * 统一导出入口：
 * - View 决定 WHAT / SHAPE（筛选后的 items、分组、当前字段、特殊视图结构）；
 * - Record Profile 决定一条记录的可读语义；
 * - relatedRecords 提供 TaskSession 等关联事实。
 */
export function exportViewToMarkdown(request: ExportViewRequest): string {
  const ctx = createExportRuntimeContext(request);
  switch (ctx.config.strategy) {
    case 'table': return exportMarkdownTable(ctx);
    case 'timeline': return exportTimeline(ctx);
    case 'event-timeline': return exportEventTimeline(ctx);
    case 'statistics': return exportStatistics(ctx);
    case 'heatmap': return exportHeatmap(ctx);
    case 'progress': return exportProgress(ctx);
    case 'energy': return exportEnergy(ctx);
    case 'eisenhower': return exportEisenhower(ctx);
    case 'records':
    default: return exportRecordList(ctx);
  }
}

/** 兼容旧调用；新代码应使用 exportViewToMarkdown() 以获得 View/关联 Record 上下文。 */
export function exportItemsToMarkdown(items: RecordViewItem[], config: ExportViewConfig = BLOCK_EXPORT_DEFAULT_CONFIG): string {
  return exportViewToMarkdown({ items, relatedRecords: items, config });
}
