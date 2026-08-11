import type { CoreBlockKey } from '@/core/blocks/types';

export type RecordCaptureMode = 'template' | 'direct';
export type RecordTypeKey = CoreBlockKey | 'energy';

/**
 * Think OS 顶层记录类型。
 *
 * RecordType 与 Template 分离：
 * - template: 继续走现有 CoreBlock / GoalTemplate 主链；
 * - direct: 不需要 GoalTemplate，可直接产生目标绑定记录。
 */
export interface RecordTypeDefinition {
  id: string;
  key: RecordTypeKey;
  name: string;
  categoryKey: string;
  captureMode: RecordCaptureMode;
  goalBindable: boolean;
  periodAware: boolean;
  /** template 类型对应的稳定 CoreBlock id；direct 类型通常为空。 */
  coreBlockId?: string;
  /** direct 类型的默认落盘位置。 */
  targetFile?: string;
  appendUnderHeader?: string;
  description?: string;
}
