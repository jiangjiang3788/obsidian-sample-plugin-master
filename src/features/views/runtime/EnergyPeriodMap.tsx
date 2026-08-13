/** @jsxImportSource preact */
import { h } from 'preact';
import type { EnergyPeriodRenderModel } from '../models/energyViewModel';
import type { OpenRecordOriginHandler } from '@shared/types/public';
import { EnergyCalendarMap } from './EnergyCalendarMap';
import { EnergyDateTimeMap, EnergyDayMap } from './EnergyTimelineMap';

export type { EnergyMapSelection } from './EnergyMapTypes';
import type { EnergyMapSelection } from './EnergyMapTypes';

interface Props {
  period?: EnergyPeriodRenderModel | null;
  selectedKey?: string | null;
  onSelect?: (selection: EnergyMapSelection) => void;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
}

export function EnergyPeriodMap(props: Props) {
  const { period } = props;
  if (!period) return <div class="think-energy-period-map think-energy-period-map--empty think-viz-empty">本周期没有精力记录。</div>;
  if (period.mode === 'day-horizontal') return <EnergyDayMap {...props} period={period} />;
  if (period.mode === 'date-time') return <EnergyDateTimeMap {...props} period={period} />;
  return <EnergyCalendarMap {...props} period={period} />;
}
