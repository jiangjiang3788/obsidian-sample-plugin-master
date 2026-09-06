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
  blocks: [{ id: 'core.task', name: '任务', categoryKey: '任务' }, { id: 'core.habit', name: '打卡', categoryKey: '打卡' }],
  goals: [{ path: goalPath }],
  goalPresets: [{ id: 'goal-template.sleep.habit', goalTemplateId: 'goal-template.sleep.habit', goalPath, blockId: 'core.habit', categoryKey: '打卡' }],
};

describe('AI domain normalization', () => {
  it('removes current system context fields from AI fieldValues', () => {
    expect(cleanAiFieldValues({ 内容: '睡觉 8 小时', 目标: goalPath, goalPath, templateId: 'x', 周期: '本周' })).toEqual({ 内容: '睡觉 8 小时' });
  });

  it('fills target with Goal path × Block × optional template reference', () => {
    const batch: NaturalRecordBatch = { items: [{ rawText: '', target: { blockId: 'core.habit', categoryKey: '打卡', goalPath }, fieldValues: { 内容: '睡觉 8 小时' } }] };
    const item = normalizeParsedBatch(batch, snapshot, '睡觉 8 小时').items[0];
    expect(item.rawText).toBe('睡觉 8 小时');
    expect(item.target.goalTemplateId).toBe('goal-template.sleep.habit');
    expect(item.target.goalPath).toBe(goalPath);
    expect(item.target.blockId).toBe('core.habit');
    expect(item.fieldValues).toEqual({ 内容: '睡觉 8 小时' });
  });

  it('uses blockId as primary target and categoryKey as helper text', () => {
    const batch: NaturalRecordBatch = { items: [{ rawText: '', target: { blockId: 'core.habit', goalPath }, fieldValues: { 内容: '喝水' } }] };
    const item = normalizeParsedBatch(batch, snapshot, '喝水').items[0];
    expect(item.target.blockId).toBe('core.habit');
    expect(item.target.categoryKey).toBe('打卡');
    expect(item.target.goalTemplateId).toBe('goal-template.sleep.habit');
  });

  it('recovers blockId from categoryKey-only AI output', () => {
    const batch = { items: [{ rawText: '', target: { categoryKey: '打卡', goalPath }, fieldValues: { 内容: '喝水' } }] } as any as NaturalRecordBatch;
    const item = normalizeParsedBatch(batch, snapshot, '喝水').items[0];
    expect(item.target.blockId).toBe('core.habit');
    expect(item.target.categoryKey).toBe('打卡');
  });

  it('keeps every user template RecordType on the shared natural-record normalization path', () => {
    const recordTypes = [
      ['core.task', '任务'],
      ['core.habit', '打卡'],
      ['core.plan', '计划'],
      ['core.review', '总结'],
      ['core.thought', '思考'],
      ['core.evidence', '事件'],
      ['core.blocker', '阻碍项'],
      ['core.milestone', '里程碑'],
    ] as const;
    const matrixSnapshot = {
      blocks: recordTypes.map(([id, categoryKey]) => ({ id, name: categoryKey, categoryKey })),
      goals: [{ path: goalPath }],
      goalPresets: recordTypes.map(([blockId, categoryKey]) => ({
        id: `goal-template.matrix.${blockId}`,
        goalTemplateId: `goal-template.matrix.${blockId}`,
        goalPath,
        blockId,
        categoryKey,
      })),
    };

    for (const [blockId, categoryKey] of recordTypes) {
      const batch: NaturalRecordBatch = {
        items: [{ rawText: '', target: { blockId, goalPath }, fieldValues: { 内容: `${categoryKey}矩阵测试` } }],
      };
      const item = normalizeParsedBatch(batch, matrixSnapshot, `${categoryKey}矩阵测试`).items[0];
      expect(item.target.blockId).toBe(blockId);
      expect(item.target.categoryKey).toBe(categoryKey);
      expect(item.target.goalPath).toBe(goalPath);
      expect(item.target.goalTemplateId).toBe(`goal-template.matrix.${blockId}`);
      expect(item.fieldValues).toEqual({ 内容: `${categoryKey}矩阵测试` });
    }
  });

});
