/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F010/regression
 * @covers F010/unit
 * @covers F115/unit
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
  'core.habit',
  'core.plan',
  'core.review',
  'core.thought',
  'core.evidence',
  'core.blocker',
  'core.milestone',
  'core.energy',
];

const TEMPLATE_TYPE_IDS = USER_TYPE_IDS.filter((id) => id !== 'core.energy');

describe('RecordType registry convergence', () => {
  it('derives every user-visible RecordType from the authoritative schema definitions', () => {
    const expected = RECORD_SCHEMA_DEFINITIONS
      .filter((definition) => definition.capabilities.userVisible && definition.captureMode !== 'internal')
      .map((definition) => definition.id);

    expect(DEFAULT_RECORD_TYPES.map((definition) => definition.id)).toEqual(expected);
    expect(DEFAULT_RECORD_TYPES.map((definition) => definition.id)).toEqual(USER_TYPE_IDS);
  });

  it('derives template-capable types without a second hand-maintained list', () => {
    expect(DEFAULT_TEMPLATE_RECORD_TYPES.map((definition) => definition.id)).toEqual(TEMPLATE_TYPE_IDS);
    TEMPLATE_TYPE_IDS.forEach((id) => {
      expect(getRecordTypeById(id)?.id).toBe(id);
      expect(getTemplateRecordTypeById(id)?.id).toBe(id);
    });
    expect(getTemplateRecordTypeById('core.energy')).toBeNull();
  });

  it('keeps internal Task history records out of all user capture registries', () => {
    expect(DEFAULT_RECORD_TYPES.some((definition) => definition.id === 'internal.task-series')).toBe(false);
    expect(DEFAULT_RECORD_TYPES.some((definition) => definition.id === 'internal.task-session')).toBe(false);
  });
});
