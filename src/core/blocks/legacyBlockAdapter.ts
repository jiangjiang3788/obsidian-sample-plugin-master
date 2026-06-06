import type { BlockTemplate } from '@/core/types/schema';
import { CORE_BLOCK_IDS } from './defaultCoreBlocks';

const NAME_TO_CORE_BLOCK_ID: Record<string, string> = {
  任务: CORE_BLOCK_IDS.TASK,
  Task: CORE_BLOCK_IDS.TASK,
  task: CORE_BLOCK_IDS.TASK,
  计划: CORE_BLOCK_IDS.PLAN,
  Plan: CORE_BLOCK_IDS.PLAN,
  plan: CORE_BLOCK_IDS.PLAN,
  总结: CORE_BLOCK_IDS.REVIEW,
  Review: CORE_BLOCK_IDS.REVIEW,
  review: CORE_BLOCK_IDS.REVIEW,
  打卡: CORE_BLOCK_IDS.HABIT,
  Habit: CORE_BLOCK_IDS.HABIT,
  habit: CORE_BLOCK_IDS.HABIT,
  闪念: CORE_BLOCK_IDS.THOUGHT,
  思考: CORE_BLOCK_IDS.THOUGHT,
  '闪念/思考': CORE_BLOCK_IDS.THOUGHT,
  evidence: CORE_BLOCK_IDS.EVIDENCE,
  事件: CORE_BLOCK_IDS.EVIDENCE,
  '闪念/事件': CORE_BLOCK_IDS.EVIDENCE,
  阻碍项: CORE_BLOCK_IDS.BLOCKER,
  blocker: CORE_BLOCK_IDS.BLOCKER,
  里程碑: CORE_BLOCK_IDS.MILESTONE,
  milestone: CORE_BLOCK_IDS.MILESTONE,
};

export function inferCoreBlockIdFromLegacyBlock(block: Pick<BlockTemplate, 'id' | 'name' | 'categoryKey'>): string | null {
  if (String(block.id || '').startsWith('core.')) return block.id;
  return NAME_TO_CORE_BLOCK_ID[block.name] || NAME_TO_CORE_BLOCK_ID[block.categoryKey] || null;
}

export function buildLegacyCoreBlockMap(blocks: Array<Pick<BlockTemplate, 'id' | 'name' | 'categoryKey'>>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const block of blocks || []) {
    const coreId = inferCoreBlockIdFromLegacyBlock(block);
    if (coreId) map[block.id] = coreId;
  }
  return map;
}
