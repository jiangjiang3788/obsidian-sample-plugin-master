import { cleanAiFieldValues, normalizeParsedBatch } from '@/core/ai/AiNaturalLanguageRecordParser';
import type { NaturalRecordBatch } from '@/core/public';

describe('AI domain normalization', () => {
  const snapshot = {
    blocks: [
      { id: 'core.task', name: '任务', categoryKey: '任务' },
      { id: 'core.habit', name: '打卡', categoryKey: '打卡' },
    ],
    goals: [
      { id: 'goal.self', path: '#照顾好自己', title: '#照顾好自己', themePath: '健康/身体' },
    ],
    goalPresets: [
      {
        id: 'goal-template.goal.self.core.habit.sleep',
        goalTemplateId: 'goal-template.goal.self.core.habit.sleep',
        goalId: 'goal.self',
        goalPath: '#照顾好自己',
        blockId: 'core.habit',
        categoryKey: '打卡',
        variantId: 'sleep',
        name: '睡眠打卡',
        isDefault: true,
        themePath: '健康/睡眠',
      },
    ],
  };

  it('removes system context fields from AI fieldValues', () => {
    expect(cleanAiFieldValues({
      内容: '睡觉 8 小时',
      goalId: 'goal.self',
      目标: '#照顾好自己',
      templateId: 'legacy',
      周期: '本周',
      themePath: '健康/睡眠',
    })).toEqual({ 内容: '睡觉 8 小时' });
  });

  it('fills target with Goal × Block × Template Variant from matched preset', () => {
    const batch: NaturalRecordBatch = {
      items: [{
        rawText: '',
        target: { blockId: 'core.habit', categoryKey: '打卡', goalPath: '#照顾好自己' },
        fieldValues: { 内容: '睡觉 8 小时', goalId: 'bad' },
      }],
    };

    const normalized = normalizeParsedBatch(batch, snapshot, '睡觉 8 小时');
    const item = normalized.items[0];
    expect(item.rawText).toBe('睡觉 8 小时');
    expect(item.target.goalTemplateId).toBe('goal-template.goal.self.core.habit.sleep');
    expect(item.target.templateVariantId).toBe('sleep');
    expect(item.target.goalId).toBe('goal.self');
    expect(item.target.blockId).toBe('core.habit');
    expect(item.target.themeId).toBe('健康/睡眠');
    expect(item.fieldValues).toEqual({ 内容: '睡觉 8 小时' });
  });

  it('treats blockId as the primary AI target and keeps categoryKey as optional compatibility text', () => {
    const batch: NaturalRecordBatch = {
      items: [{
        rawText: '',
        target: { blockId: 'core.habit', goalPath: '#照顾好自己' },
        fieldValues: { 内容: '喝水' },
      }],
    };

    const normalized = normalizeParsedBatch(batch, snapshot, '喝水');
    expect(normalized.items[0].target.blockId).toBe('core.habit');
    expect(normalized.items[0].target.categoryKey).toBe('打卡');
    expect(normalized.items[0].target.goalTemplateId).toBe('goal-template.goal.self.core.habit.sleep');
  });

  it('still recovers blockId from legacy categoryKey-only AI output', () => {
    const batch = {
      items: [{
        rawText: '',
        target: { categoryKey: '打卡', goalPath: '#照顾好自己' },
        fieldValues: { 内容: '喝水' },
      }],
    } as any as NaturalRecordBatch;

    const normalized = normalizeParsedBatch(batch, snapshot, '喝水');
    expect(normalized.items[0].target.blockId).toBe('core.habit');
    expect(normalized.items[0].target.categoryKey).toBe('打卡');
  });
});
