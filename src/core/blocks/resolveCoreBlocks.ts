import type { BlockTemplate, ThinkSettings } from '@/core/types/schema';
import { DEFAULT_CORE_BLOCKS, DEFAULT_CORE_BLOCK_SETTINGS } from './defaultCoreBlocks';
import type { CoreBlockDefinition, CoreBlockPatch, CoreBlockSettings } from './types';
import { buildLegacyCoreBlockMap } from './legacyBlockAdapter';

function applyPatch(block: CoreBlockDefinition, patch?: CoreBlockPatch): CoreBlockDefinition {
  if (!patch) return block;
  return {
    ...block,
    name: patch.displayName || block.name,
    categoryKey: patch.categoryKey || block.categoryKey,
    fields: patch.fields || block.fields,
    outputTemplate: patch.outputTemplate || block.outputTemplate,
    targetFile: patch.targetFile || block.targetFile,
    appendUnderHeader: patch.appendUnderHeader ?? block.appendUnderHeader,
  };
}

export function normalizeCoreBlockSettings(settings?: Partial<CoreBlockSettings> | null, legacyBlocks: BlockTemplate[] = []): CoreBlockSettings {
  const legacyBlockMap = { ...buildLegacyCoreBlockMap(legacyBlocks), ...(settings?.legacyBlockMap || {}) };
  return {
    enabledCoreBlockIds: settings?.enabledCoreBlockIds?.length ? settings.enabledCoreBlockIds : DEFAULT_CORE_BLOCK_SETTINGS.enabledCoreBlockIds,
    patches: settings?.patches || [],
    legacyBlockMap,
  };
}

export function getEffectiveCoreBlocks(settings: Pick<ThinkSettings, 'coreBlockSettings' | 'inputSettings'>): CoreBlockDefinition[] {
  const coreSettings = normalizeCoreBlockSettings(settings.coreBlockSettings, settings.inputSettings?.blocks || []);
  const patchesById = new Map(coreSettings.patches.map((patch) => [patch.blockId, patch]));
  const enabled = new Set(coreSettings.enabledCoreBlockIds);
  return DEFAULT_CORE_BLOCKS
    .filter((block) => enabled.has(block.id) && !patchesById.get(block.id)?.hidden)
    .map((block) => applyPatch(block, patchesById.get(block.id)));
}

export function getCoreBlockById(settings: Pick<ThinkSettings, 'coreBlockSettings' | 'inputSettings'>, blockId: string): CoreBlockDefinition | null {
  const coreSettings = normalizeCoreBlockSettings(settings.coreBlockSettings, settings.inputSettings?.blocks || []);
  const resolvedId = String(blockId || '').startsWith('core.') ? blockId : coreSettings.legacyBlockMap?.[blockId] || blockId;
  return getEffectiveCoreBlocks(settings).find((block) => block.id === resolvedId) || null;
}
