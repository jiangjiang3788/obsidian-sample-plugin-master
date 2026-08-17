import type { QuickInputConfig } from '@core/services/public';

import { openCreateModal } from './openCreateModal';
import type { HeatmapCreateParams } from './types';

function firstNonEmptyText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      const option = value as Record<string, unknown>;
      const nested = firstNonEmptyText(option.value, option.label, option.path, option.title);
      if (nested) return nested;
      continue;
    }
    const text = String(value).trim();
    if (text) return text;
  }
  return undefined;
}

function buildHeatmapRatingContext(item?: HeatmapCreateParams['item']): Record<string, unknown> {
  if (!item) return {};
  const score = firstNonEmptyText(item.rating, item.extra?.['评分'], item.extra?.rating);
  const visual = firstNonEmptyText(
    item.image,
    item.extra?.['图片'],
    item.extra?.image,
  );
  if (!score && !visual) return {};
  return {
    评分: {
      value: visual || score || '',
      label: score || visual || '',
    },
  };
}

function buildHeatmapCreateConfig(params: HeatmapCreateParams): QuickInputConfig | null {
  const resolvedBlockId = params.sourceBlockId || (params.item?.coreBlock ? `core.${params.item.coreBlock}` : null);
  if (!resolvedBlockId) return null;

  const goalPath = firstNonEmptyText(params.goalPath, params.item?.goalPath);
  const context: Record<string, unknown> = {
    日期: params.date,
    __recordUiContext: {
      kind: 'heatmap_create',
      timeContext: { date: params.date },
      goalContext: goalPath ? { goalPath } : null,
    },
    ...(params.item ? { 内容: params.item.content || '' } : {}),
    ...buildHeatmapRatingContext(params.item),
  };

  if (goalPath) {
    context['目标'] = goalPath;
    context.goalPath = goalPath;
  }

  return { blockId: resolvedBlockId, context };
}

export function openCreateFromHeatmap(params: HeatmapCreateParams): boolean {
  const config = buildHeatmapCreateConfig(params);
  if (!config) {
    params.notice?.('当前热力图没有可用于新增的核心 Block，请先配置 sourceBlockId。');
    return false;
  }
  return openCreateModal(params.app, config, 'view_quick_create');
}
