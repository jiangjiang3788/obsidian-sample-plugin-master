import { buildRecordOutputPlan, buildRecordPersistencePlan } from '@core/public';
import type { RecordSubmitIssue, SubmitUpdateRecordParams } from '@core/public';
import { issue } from './issues';

function normalizePlanText(value: unknown): string {
  return String(value ?? '').trim();
}

// CLOSEOUT-GUARD: 提交前一致性校验。
// 目的：防止 UI 实时预览的保存位置与实际提交时重新计算的位置不一致。
// 规则：只要 targetFile / targetHeader / writeMode / originalPath 发生偏移，就取消保存，不写新记录、不删旧记录。
export function buildPlanConsistencyIssues(params: {
  expectedOutputPlan?: SubmitUpdateRecordParams['expectedOutputPlan'];
  expectedPersistencePlan?: SubmitUpdateRecordParams['expectedPersistencePlan'];
  actualOutputPlan: ReturnType<typeof buildRecordOutputPlan>;
  actualPersistencePlan: ReturnType<typeof buildRecordPersistencePlan>;
}): RecordSubmitIssue[] {
  const issues: RecordSubmitIssue[] = [];
  const expectedOutput = params.expectedOutputPlan;
  const expectedPersistence = params.expectedPersistencePlan;

  if (expectedOutput) {
    const expectedPath = normalizePlanText(expectedOutput.targetFilePath);
    const actualPath = normalizePlanText(params.actualOutputPlan.targetFilePath);
    const expectedHeader = normalizePlanText(expectedOutput.targetHeader);
    const actualHeader = normalizePlanText(params.actualOutputPlan.targetHeader);

    if (expectedPath !== actualPath || expectedHeader !== actualHeader) {
      issues.push(issue(
        'record_output_plan_changed_before_submit',
        `保存位置预览和实际保存计划不一致：预览为 ${expectedPath || '未知位置'}${expectedHeader ? ` → ${expectedHeader}` : ''}，实际为 ${actualPath || '未知位置'}${actualHeader ? ` → ${actualHeader}` : ''}。为避免误写入，已取消本次保存，请重新打开面板后再试。`,
      ));
    }
  }

  if (expectedPersistence) {
    const expectedOriginalPath = normalizePlanText(expectedPersistence.originalPath);
    const actualOriginalPath = normalizePlanText(params.actualPersistencePlan.originalPath);
    if (
      expectedPersistence.pathChanged !== params.actualPersistencePlan.pathChanged
      || expectedPersistence.writeMode !== params.actualPersistencePlan.writeMode
      || expectedOriginalPath !== actualOriginalPath
    ) {
      issues.push(issue(
        'record_persistence_plan_changed_before_submit',
        `保存策略预览和实际保存策略不一致：预览为 ${expectedPersistence.writeMode}${expectedPersistence.pathChanged ? '，路径变化' : '，路径不变'}；实际为 ${params.actualPersistencePlan.writeMode}${params.actualPersistencePlan.pathChanged ? '，路径变化' : '，路径不变'}。为避免误保存，已取消本次保存。`,
      ));
    }
  }

  return issues;
}
