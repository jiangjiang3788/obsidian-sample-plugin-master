import type { ThinkSettings } from '@/core/types/schema';
import { DEFAULT_CORE_BLOCKS, getEffectiveCoreBlocks } from '@/core/blocks';
import type { CoreBlockDefinition } from '@/core/blocks/types';
import type { RecordTypeDefinition } from './types';

export const ENERGY_RECORD_TYPE_ID = 'core.energy';

function fromCoreBlock(block: CoreBlockDefinition): RecordTypeDefinition {
  return {
    id: block.id,
    key: block.key,
    name: block.name,
    categoryKey: block.categoryKey,
    captureMode: 'template',
    goalBindable: true,
    periodAware: Boolean(block.periodPolicy?.enabled),
    coreBlockId: block.id,
    targetFile: block.targetFile,
    appendUnderHeader: block.appendUnderHeader,
    description: block.description,
  };
}

export const ENERGY_RECORD_TYPE: RecordTypeDefinition = {
  id: ENERGY_RECORD_TYPE_ID,
  key: 'energy',
  name: '精力',
  categoryKey: '精力',
  captureMode: 'direct',
  goalBindable: true,
  periodAware: false,
  targetFile: '01/目标精力.md',
  appendUnderHeader: '## {{goalPath}}',
  description: '目标绑定的精力状态记录；不创建 GoalTemplate，使用直接采集协议。',
};

/** 默认记录类型目录。Energy 不进入 DEFAULT_CORE_BLOCKS，因此不会进入 GoalTemplate Matrix。 */
export const DEFAULT_RECORD_TYPES: RecordTypeDefinition[] = [
  ...DEFAULT_CORE_BLOCKS.map(fromCoreBlock),
  ENERGY_RECORD_TYPE,
];

/**
 * 运行时记录类型目录：现有模板型记录尊重 CoreBlock 开关/补丁，direct 类型独立存在。
 */
export function getEffectiveRecordTypes(
  settings: Pick<ThinkSettings, 'coreBlockSettings' | 'inputSettings'>,
): RecordTypeDefinition[] {
  return [
    ...getEffectiveCoreBlocks(settings).map(fromCoreBlock),
    ENERGY_RECORD_TYPE,
  ];
}

export function getRecordTypeById(
  settings: Pick<ThinkSettings, 'coreBlockSettings' | 'inputSettings'>,
  recordTypeId: string,
): RecordTypeDefinition | null {
  return getEffectiveRecordTypes(settings).find((item) => item.id === recordTypeId) || null;
}

export function isDirectRecordType(recordType: Pick<RecordTypeDefinition, 'captureMode'>): boolean {
  return recordType.captureMode === 'direct';
}
