/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F010/regression
 * @covers F010/unit
 * @covers F115/unit
 * @covers F153/unit
 * @covers F153/regression
 */
import {
  DEFAULT_RECORD_TYPES,
  DEFAULT_TEMPLATE_RECORD_TYPES,
  getRecordTypeById,
  getTemplateRecordTypeById,
} from '@core/recordTypes/public';
import { RECORD_SCHEMA_DEFINITIONS } from '@/core/records/schema';

const USER_TYPE_IDS = [
  'core.task',
  'core.energy',
  'core.habit',
  'core.event',
  'core.feeling',
  'core.thought',
  'core.review',
  'core.plan',
  'core.blocker',
  'core.milestone',
];

const TEMPLATE_TYPE_IDS = USER_TYPE_IDS.filter((id) => id !== 'core.energy');

describe('RecordType registry convergence', () => {
  it('derives every user-visible RecordType from schema definitions, then applies presentation order', () => {
    const schemaVisibleIds = RECORD_SCHEMA_DEFINITIONS
      .filter((definition) => definition.capabilities.userVisible && definition.captureMode !== 'internal')
      .map((definition) => definition.id);
    const runtimeIds = DEFAULT_RECORD_TYPES.map((definition) => definition.id);

    expect(new Set(runtimeIds)).toEqual(new Set(schemaVisibleIds));
    expect(runtimeIds).toEqual(USER_TYPE_IDS);
  });

  it('derives template-capable types without a second hand-maintained list', () => {
    expect(DEFAULT_TEMPLATE_RECORD_TYPES.map((definition) => definition.id)).toEqual(TEMPLATE_TYPE_IDS);
    TEMPLATE_TYPE_IDS.forEach((id) => {
      expect(getRecordTypeById(id)?.id).toBe(id);
      expect(getTemplateRecordTypeById(id)?.id).toBe(id);
    });
    expect(getTemplateRecordTypeById('core.energy')).toBeNull();
  });

  it('keeps internal Task history records out of user capture registries', () => {
    expect(DEFAULT_RECORD_TYPES.some((definition) => definition.id === 'internal.task-series')).toBe(false);
    expect(DEFAULT_RECORD_TYPES.some((definition) => definition.id === 'internal.task-session')).toBe(false);
  });
});
