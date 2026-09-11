import type { TemplateRecordTypeDefinition } from '@core/recordTypes/public';
import { sortRecordTypesByPresentation } from '@core/recordTypes/public';

/** GoalTemplate columns consume the global Record type presentation contract. */
export function orderGoalTemplateBlocks(blocks: TemplateRecordTypeDefinition[]): TemplateRecordTypeDefinition[] {
  return sortRecordTypesByPresentation(blocks, (block) => block.coreBlock);
}
