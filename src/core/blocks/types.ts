import type { TemplateField } from '@/core/recordInput/CaptureTemplate';
import type { RecordCoreBlock, RecordSchemaDefinition } from '@/core/records/schema';

export type CoreBlockKey = Extract<RecordCoreBlock,
  | 'task'
  | 'plan'
  | 'review'
  | 'thought'
  | 'habit'
  | 'evidence'
  | 'blocker'
  | 'milestone'>;

/** Derived capture view of the authoritative RecordSchemaDefinition. */
export type CoreBlockDefinition = RecordSchemaDefinition & {
  key: CoreBlockKey;
  coreBlock: CoreBlockKey;
  captureMode: 'template';
  coreBlockId: string;
};

export interface CoreBlockPatch {
  blockId: string;
  hidden?: boolean;
  displayName?: string;
  categoryKey?: string;
  fields?: TemplateField[];
  targetFile?: string;
  appendUnderHeader?: string;
}

export interface CoreBlockSettings {
  enabledCoreBlockIds: string[];
  patches: CoreBlockPatch[];
}
