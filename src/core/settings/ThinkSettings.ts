import type { AiSettings } from '@/core/types/ai-schema';
import { DEFAULT_AI_SETTINGS } from '@/core/types/ai-schema';
import type { GoalSettings } from '@/core/goal/types';
import { DEFAULT_GOAL_SETTINGS } from '@/core/goal/types';
import type { CoreBlockSettings } from '@/core/blocks/types';
import { DEFAULT_CORE_BLOCK_SETTINGS } from '@/core/blocks/defaultCoreBlocks';
import type { EnergySettings } from '@/core/energy/types';
import { DEFAULT_ENERGY_SETTINGS } from '@/core/energy/types';
import type { InputSettings } from '@/core/recordInput/CaptureTemplate';
import type { Group, Layout, ViewInstance } from '@/core/view/ViewConfig';

export interface ThinkSettings {
  groups: Group[];
  viewInstances: ViewInstance[];
  layouts: Layout[];
  inputSettings: InputSettings;
  goalSettings?: GoalSettings;
  coreBlockSettings?: CoreBlockSettings;
  energySettings?: EnergySettings;
  floatingTimerEnabled: boolean;
  aiSettings?: AiSettings;
  devConsoleStackEnabled?: boolean;
  categoryColors?: Record<string, string>;
}

export const DEFAULT_SETTINGS: ThinkSettings = {
  groups: [],
  viewInstances: [],
  layouts: [],
  inputSettings: { blocks: [] },
  goalSettings: DEFAULT_GOAL_SETTINGS,
  coreBlockSettings: DEFAULT_CORE_BLOCK_SETTINGS,
  energySettings: DEFAULT_ENERGY_SETTINGS,
  floatingTimerEnabled: true,
  aiSettings: DEFAULT_AI_SETTINGS,
  devConsoleStackEnabled: false,
};
