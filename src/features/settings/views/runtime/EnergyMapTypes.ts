import type { EnergyPeriodDayModel, EnergyPeriodSampleModel } from '../models/energyViewModel';

export type EnergyMapSelection =
  | { kind: 'sample'; sample: EnergyPeriodSampleModel }
  | { kind: 'day'; day: EnergyPeriodDayModel };
