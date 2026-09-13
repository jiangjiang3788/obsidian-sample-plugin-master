import type { TemplateRecordTypeDefinition } from '@core/recordTypes/public';
import { sortRecordTypesByPresentation } from '@core/recordTypes/public';

/** GoalTemplate columns consume the global Record type presentation contract. */
export function orderGoalTemplateRecordTypes(recordTypes: TemplateRecordTypeDefinition[]): TemplateRecordTypeDefinition[] {
  return sortRecordTypesByPresentation(recordTypes, (recordType) => recordType.recordType);
}
