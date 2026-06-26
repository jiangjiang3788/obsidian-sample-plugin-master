import type { BlockTemplate, TemplateField } from '@/core/types/schema';

export type CoreBlockKey =
  | 'task'
  | 'plan'
  | 'review'
  | 'thought'
  | 'habit'
  | 'evidence'
  | 'blocker'
  | 'milestone';

export interface CoreBlockDefinition extends BlockTemplate {
  key: CoreBlockKey;
  system: true;
  version: number;
  description?: string;
}

export interface CoreBlockPatch {
  blockId: string;
  hidden?: boolean;
  displayName?: string;
  categoryKey?: string;
  fields?: TemplateField[];
  outputTemplate?: string;
  targetFile?: string;
  appendUnderHeader?: string;
}

export interface CoreBlockSettings {
  enabledCoreBlockIds: string[];
  patches: CoreBlockPatch[];
}
