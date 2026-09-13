/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F010/unit
 */
import {
  RECORD_SCHEMA_CONTRACTS,
  canonicalRecordFieldKey,
  getRecordFieldContract,
  getRecordSchemaDefinition,
  getTargetPersistedRecordFields,
} from '@/core/records/schema';

describe('Record Schema Contract R10 current-only', () => {
  it('covers every current persisted/domain record kind', () => {
    expect(RECORD_SCHEMA_CONTRACTS.map(schema => schema.recordType).sort()).toEqual([
      'blocker', 'energy', 'event', 'feeling', 'habit', 'milestone', 'plan', 'review',
      'task', 'task-series', 'task-session', 'thought',
    ]);
  });

  it('keeps Feeling/Thought as first-class types and reserves recordSubtype for Energy', () => {
    expect(getRecordFieldContract('thought', '记录子类型')).toBeNull();
    expect(getRecordFieldContract('feeling', '记录子类型')).toBeNull();
    expect(canonicalRecordFieldKey('energy', '记录子类型')).toBe('记录子类型');
    expect(getRecordFieldContract('energy', '记录子类型')?.allowedValues).toEqual(['snapshot', 'change', 'recovery', 'depletion', 'stop']);
  });

  it('persists only period granularity for Plan/Review', () => {
    for (const block of ['plan', 'review'] as const) {
      expect(getRecordFieldContract(block, '周期粒度')?.persistence).toBe('target');
      expect(getRecordFieldContract(block, '周期ID')).toBeNull();
      expect(getRecordFieldContract(block, '周期')).toBeNull();
    }
  });

  it('makes 图片 canonical for Habit without a pintu schema alias', () => {
    expect(getRecordFieldContract('habit', '图片')?.persistence).toBe('target');
    expect(getRecordFieldContract('habit', 'pintu')).toBeNull();
  });

  it('keeps Energy measurement facts but drops persisted derived/classification fields', () => {
    expect(getRecordFieldContract('energy', '精力值')?.persistence).toBe('target');
    expect(getRecordFieldContract('energy', '评分模式')?.role).toBe('measurement-provenance');
    expect(getRecordFieldContract('energy', '记录方式')?.role).toBe('measurement-provenance');
    expect(getRecordFieldContract('energy', '时间精度')?.role).toBe('measurement-provenance');
    expect(getRecordFieldContract('energy', '精力档位')).toBeNull();
    expect(getRecordFieldContract('energy', '分类')).toBeNull();
  });

  it('keeps Task/Session domain facts and removes creation/migration persistence metadata', () => {
    expect(getRecordFieldContract('task', '状态')?.persistence).toBe('target');
    expect(getRecordFieldContract('task', '模板ID')).toBeNull();
    expect(getRecordFieldContract('task', '迁移旧实际时长')).toBeNull();
    expect(getRecordFieldContract('task-session', '时长')?.persistence).toBe('target');
  });

  it('exposes only final persisted fields', () => {
    const target = getTargetPersistedRecordFields('plan').map(field => field.key);
    expect(target).toContain('周期粒度');
    expect(target).not.toContain('周期ID');
    expect(target).not.toContain('周期');
    expect(target).not.toContain('分类');
  });

  it('drives RecordType capabilities from the same contract vocabulary', () => {
    expect(getRecordSchemaDefinition('plan')?.capabilities.periodAware).toBe(true);
    expect(getRecordSchemaDefinition('thought')?.capabilities.subtypeAware).not.toBe(true);
    expect(getRecordSchemaDefinition('energy')?.capabilities.subtypeAware).toBe(true);
    expect(getRecordSchemaDefinition('task-session')?.capabilities.userVisible).toBe(false);
  });
});
