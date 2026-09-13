/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F072/error
 * @covers F072/regression
 * @covers F072/unit
 * @covers F074/unit
 */
import { cleanAiFieldValues, normalizeParsedBatch } from '@/core/ai/AiNaturalLanguageRecordParser';
import type { NaturalRecordBatch } from '@/core/public';

const goalPath = '照顾好自己/健康/睡眠';
const snapshot = {
  recordTypes: [{ id: 'core.task', name: '任务' }, { id: 'core.habit', name: '打卡' }],
  goals: [{ path: goalPath }],
  goalPresets: [{ id: 'goal-template.sleep.habit', goalTemplateId: 'goal-template.sleep.habit', goalPath, recordTypeId: 'core.habit' }],
};

describe('AI domain normalization', () => {
  it('removes current system context fields from AI fieldValues', () => {
    expect(cleanAiFieldValues({ 内容: '睡觉 8 小时', 目标: goalPath, goalPath, templateId: 'x', 周期: '本周' })).toEqual({ 内容: '睡觉 8 小时' });
  });

  it('fills target with Goal path × Record Type × optional template reference', () => {
    const batch: NaturalRecordBatch = { items: [{ rawText: '', target: { recordTypeId: 'core.habit', goalPath }, fieldValues: { 内容: '睡觉 8 小时' } }] };
    const item = normalizeParsedBatch(batch, snapshot, '睡觉 8 小时').items[0];
    expect(item.rawText).toBe('睡觉 8 小时');
    expect(item.target.goalTemplateId).toBe('goal-template.sleep.habit');
    expect(item.target.goalPath).toBe(goalPath);
    expect(item.target.recordTypeId).toBe('core.habit');
    expect(item.fieldValues).toEqual({ 内容: '睡觉 8 小时' });
  });

  it('does not infer a Record Type from retired Category semantics', () => {
    const batch = { items: [{ rawText: '', target: { recordTypeId: '', goalPath }, fieldValues: { 内容: '喝水' } }] } as NaturalRecordBatch;
    const item = normalizeParsedBatch(batch, snapshot, '喝水').items[0];
    // Goal-only preset may still supply its own exact Record Type. There is no category fallback.
    expect(item.target.recordTypeId).toBe('core.habit');
    expect(item.target).not.toHaveProperty('categoryKey');
  });

  it('keeps every user template Record Type on the shared natural-record normalization path', () => {
    const recordTypes = [
      ['core.task', '任务'],
      ['core.habit', '打卡'],
      ['core.plan', '计划'],
      ['core.review', '总结'],
      ['core.feeling', '感受'],
      ['core.thought', '思考'],
      ['core.event', '事件'],
      ['core.blocker', '阻碍项'],
      ['core.milestone', '里程碑'],
    ] as const;
    const matrixSnapshot = {
      recordTypes: recordTypes.map(([id, name]) => ({ id, name })),
      goals: [{ path: goalPath }],
      goalPresets: recordTypes.map(([recordTypeId]) => ({
        id: `goal-template.matrix.${recordTypeId}`,
        goalTemplateId: `goal-template.matrix.${recordTypeId}`,
        goalPath,
        recordTypeId,
      })),
    };

    for (const [recordTypeId, label] of recordTypes) {
      const batch: NaturalRecordBatch = {
        items: [{ rawText: '', target: { recordTypeId, goalPath }, fieldValues: { 内容: `${label}矩阵测试` } }],
      };
      const item = normalizeParsedBatch(batch, matrixSnapshot, `${label}矩阵测试`).items[0];
      expect(item.target.recordTypeId).toBe(recordTypeId);
      expect(item.target.goalPath).toBe(goalPath);
      expect(item.target.goalTemplateId).toBe(`goal-template.matrix.${recordTypeId}`);
      expect(item.fieldValues).toEqual({ 内容: `${label}矩阵测试` });
    }
  });
});
