import type { TemplateRecordTypeDefinition } from '@core/recordTypes/public';

export const GOAL_TEMPLATE_BLOCK_ORDER = ['打卡', '任务', '事件', '思考', '总结', '计划', '阻碍项', '里程碑'];
const GOAL_TEMPLATE_BLOCK_ID_ORDER = ['core.habit', 'core.task', 'core.evidence', 'core.thought', 'core.review', 'core.plan', 'core.blocker', 'core.milestone'];

export function orderGoalTemplateBlocks(blocks: TemplateRecordTypeDefinition[]): TemplateRecordTypeDefinition[] {
  const order = new Map<string, number>();
  GOAL_TEMPLATE_BLOCK_ORDER.forEach((name, index) => order.set(name, index));
  GOAL_TEMPLATE_BLOCK_ID_ORDER.forEach((id, index) => order.set(id, index));
  return [...blocks].sort((left, right) => {
    const leftRank = order.get(left.id) ?? order.get(left.name) ?? 999;
    const rightRank = order.get(right.id) ?? order.get(right.name) ?? 999;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return String(left.name || left.id).localeCompare(String(right.name || right.id), 'zh-CN');
  });
}
