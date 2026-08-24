import type { AiSettings } from '@/core/types/ai-schema';
import { DEFAULT_AI_SETTINGS } from '@/core/types/ai-schema';
import type { GoalSettings } from '@/core/goal/types';
import { DEFAULT_GOAL_SETTINGS } from '@/core/goal/types';
import type { EnergySettings } from '@/core/energy/types';
import { DEFAULT_ENERGY_SETTINGS } from '@/core/energy/types';
import type { Group, Layout, ViewInstance } from '@/core/view/ViewConfig';

export interface ThinkSettings {
  groups: Group[];
  viewInstances: ViewInstance[];
  layouts: Layout[];
  goalSettings?: GoalSettings;
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
  goalSettings: DEFAULT_GOAL_SETTINGS,
  energySettings: DEFAULT_ENERGY_SETTINGS,
  floatingTimerEnabled: true,
  aiSettings: DEFAULT_AI_SETTINGS,
  devConsoleStackEnabled: false,
};
