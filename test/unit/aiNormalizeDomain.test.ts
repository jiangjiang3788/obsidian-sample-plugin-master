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
});
