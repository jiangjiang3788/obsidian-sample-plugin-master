import type { QuickInputConfig } from '@core/services/public';
import type { ThemeDefinition } from '@core/types/public';
import { getItemThemePath } from '@core/utils/public';

import { openCreateModal } from './openCreateModal';
import type { HeatmapCreateParams } from './types';

function resolveHeatmapThemeId(
  themesByPath: Map<string, ThemeDefinition> | undefined,
  themePath?: string,
  item?: HeatmapCreateParams['item'],
): string | undefined {
  if (!themesByPath) return undefined;
  if (themePath && themePath !== '__default__') {
    return themesByPath.get(themePath)?.id;
  }
  const itemThemePath = getItemThemePath(item);
  if (itemThemePath) {
    return themesByPath.get(itemThemePath)?.id;
  }
  return undefined;
}

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
    item.pintu,
    item.image,
    item.extra?.['图片'],
    item.extra?.['评图'],
    item.extra?.pintu,
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

function buildGoalContext(params: HeatmapCreateParams): Record<string, unknown> | null {
  if (!params.goalPath && !params.goalId && !params.templateId && !params.templateVariantId) return null;
  return {
    ...(params.goalPath ? { goalPath: params.goalPath } : {}),
    ...(params.goalId ? { goalId: params.goalId } : {}),
    ...(params.templateId ? { templateId: params.templateId, goalTemplateId: params.templateId } : {}),
    ...(params.templateVariantId
      ? { templateVariantId: params.templateVariantId, goalTemplateVariantId: params.templateVariantId }
      : {}),
  };
}

function addGoalContextAliases(context: Record<string, unknown>, params: HeatmapCreateParams): void {
  if (params.goalPath) {
    context['目标'] = params.goalPath;
    context.goalPath = params.goalPath;
  }
  if (params.goalId) {
    context['目标ID'] = params.goalId;
    context.goalId = params.goalId;
  }
  if (params.templateId) {
    context['模板ID'] = params.templateId;
    context.templateId = params.templateId;
    context.goalTemplateId = params.templateId;
  }
  if (params.templateVariantId) {
    context.templateVariantId = params.templateVariantId;
    context.goalTemplateVariantId = params.templateVariantId;
  }
}

function buildHeatmapCreateConfig(params: HeatmapCreateParams): QuickInputConfig | null {
  const resolvedBlockId = params.sourceBlockId || params.item?.templateId || params.item?.categoryKey;
  if (!resolvedBlockId) return null;

  const themeId = resolveHeatmapThemeId(params.themesByPath, params.themePath, params.item);
  const themePath = params.themePath && params.themePath !== '__default__'
    ? params.themePath
    : getItemThemePath(params.item);

  const context: Record<string, unknown> = {
    日期: params.date,
    __recordUiContext: {
      kind: 'heatmap_create',
      timeContext: { date: params.date },
      themeContext: themePath ? { themePath } : null,
      goalContext: buildGoalContext(params),
    },
    ...(params.item ? { 内容: params.item.content || '' } : {}),
    ...buildHeatmapRatingContext(params.item),
  };

  if (themePath) {
    context['主题'] = themePath;
    context.themePath = themePath;
  }
  addGoalContextAliases(context, params);

  return {
    blockId: resolvedBlockId,
    context,
    themeId,
  };
}

export function openCreateFromHeatmap(params: HeatmapCreateParams): boolean {
  const config = buildHeatmapCreateConfig(params);
  if (!config) {
    params.notice?.('当前热力图没有可用于新增的模板，请先为该热力图配置 sourceBlockId，或保证该主题下至少已有一条记录可供推断模板。');
    return false;
  }
  return openCreateModal(params.app, config, 'view_quick_create');
}
