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

export const THINK_SETTINGS_SCHEMA_VERSION = 5;

export interface ThinkSettings {
  schemaVersion: number;
  groups: Group[];
  viewInstances: ViewInstance[];
  layouts: Layout[];
  inputSettings: InputSettings;
  goalSettings?: GoalSettings;
  coreBlockSettings?: CoreBlockSettings;
  energySettings?: EnergySettings;
  floatingTimerEnabled: boolean;
  activeThemePaths?: string[];
  aiSettings?: AiSettings;
  devConsoleStackEnabled?: boolean;
  categoryColors?: Record<string, string>;
}

export const DEFAULT_SETTINGS: ThinkSettings = {
  schemaVersion: THINK_SETTINGS_SCHEMA_VERSION,
  groups: [],
  viewInstances: [],
  layouts: [],
  inputSettings: { blocks: [], themes: [] },
  goalSettings: DEFAULT_GOAL_SETTINGS,
  coreBlockSettings: DEFAULT_CORE_BLOCK_SETTINGS,
  energySettings: DEFAULT_ENERGY_SETTINGS,
  floatingTimerEnabled: true,
  activeThemePaths: [],
  aiSettings: DEFAULT_AI_SETTINGS,
  devConsoleStackEnabled: false,
};
