/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F013/integration
 * @covers F014/integration
 * @covers F035/integration
 * @covers F036/integration
 * @covers F041/integration
 * @covers F026/integration
 * @covers F030/integration
 */
import { describe, expect, it } from '@jest/globals';

import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { GoalTemplateResolver } from '@/core/services/GoalTemplateResolver';
import { resolveQuickInputRecordTypeRuntime } from '@/features/quickinput/editor/quickInputRecordTypeModel';
import { buildGenericRecordDraft } from '@/core/records/RecordDraft';
import { encodeRecordDraft } from '@/core/records/codec/MarkdownRecordCodec';
import type { TemplateField } from '@/core/recordInput/CaptureTemplate';
import { parseRecordBlock } from '@/core/utils/parser';
import { queryRecordItems } from '@/core/query/RecordQuery';

const field = (key: string, type: TemplateField['type'] = 'text'): TemplateField => ({
  id: `r9.${key}`, key, label: key, type,
});


function goalTemplateSettings(): ThinkSettings {
  return {
    groups: [],
    viewInstances: [],
    layouts: [],
    floatingTimerEnabled: true,
    goalSettings: {
      goals: [
        { path: '产品化/目标中心', status: 'active', metrics: [], createdAt: '', updatedAt: '' },
        { path: '产品化/目标中心/插件', status: 'active', metrics: [], createdAt: '', updatedAt: '' },
      ],
      goalTemplates: [
        {
          goalPath: '产品化/目标中心',
          recordTypeId: 'core.task',
          enabled: true,
          defaultValues: { priority: 'high' },
        },
      ],
    },
  } as ThinkSettings;
}

describe('integration: Goal template -> Quick Input RecordType runtime', () => {
  it('resolves one direct Goal x RecordType template through the same runtime used by Quick Input', () => {
    const settings = goalTemplateSettings();
    const goal = settings.goalSettings!.goals[0]!;

    const direct = GoalTemplateResolver.resolve({
      settings,
      recordTypeId: 'core.task',
      goalPath: goal.path,
      requireDirectGoalTemplate: true,
    });
    expect(direct.status).toBe('available');
    expect(direct.templateSourceType).toBe('goal-template');
    expect(direct.template?.fields.find((row) => row.key === 'priority')?.defaultValue).toBe('high');

    const quickInput = resolveQuickInputRecordTypeRuntime({
      settings,
      isEnergyDirect: false,
      currentRecordTypeId: 'core.task',
      selectedGoal: goal,
      selectedGoalPath: goal.path,
      requireDirectGoalTemplate: true,
    });
    expect(quickInput.status).toBe('available');
    expect(quickInput.templateId).toBe(direct.templateId);
    expect(quickInput.templateSourceType).toBe('goal-template');
  });

  it('does not inherit the parent Goal template for a child Goal during create eligibility', () => {
    const settings = goalTemplateSettings();
    const child = settings.goalSettings!.goals[1]!;

    const result = resolveQuickInputRecordTypeRuntime({
      settings,
      isEnergyDirect: false,
      currentRecordTypeId: 'core.task',
      selectedGoal: child,
      selectedGoalPath: child.path,
      requireDirectGoalTemplate: true,
    });

    expect(result.status).toBe('missing-goal-template');
    expect(result.template).toBeNull();
  });
});

describe('integration: template -> Record -> query', () => {
  it('round-trips first-class Feeling and custom fields through codec/parser/query', () => {
    const draft = buildGenericRecordDraft('feeling', {
      goalPath: '了解自我',
      情绪: '紧张',
      清晰度: '4',
      内容: '我发现自己在等待结果时会反复检查。',
    }, [field('情绪'), field('清晰度', 'number'), field('内容', 'textarea')]);

    const markdown = encodeRecordDraft({ recordId: 'rec.01JWF7T20074QW3VAKQMEWSBDP', draft });
    const lines = markdown.split(/\r?\n/);
    const parsed = parseRecordBlock('Feelings.md', lines, 0, lines.length - 1, '记录');

    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      id: 'rec.01JWF7T20074QW3VAKQMEWSBDP',
      recordType: 'feeling',
      content: '我发现自己在等待结果时会反复检查。',
    });
    expect(parsed).not.toHaveProperty('recordSubtype');
    expect(parsed?.extra).toMatchObject({ 情绪: '紧张', 清晰度: 4 });
    expect(markdown).not.toContain('分类::');
    expect(markdown).not.toContain('记录子类型::');

    const result = queryRecordItems([parsed as RecordViewItem], {
      filterGroups: [[{ field: 'extra.清晰度', op: '>', value: 3 }]],
      keyword: '反复检查',
    });
    expect(result.map(record => record.id)).toEqual(['rec.01JWF7T20074QW3VAKQMEWSBDP']);
  });
});
