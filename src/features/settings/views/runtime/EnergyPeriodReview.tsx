/** @jsxImportSource preact */
import { h } from 'preact';
import type { EnergyReviewLineModel } from '../models/energyViewModel';

interface Props {
  periodLabel: string;
  lines: EnergyReviewLineModel[];
}

export function EnergyPeriodReview({ periodLabel, lines }: Props) {
  return (
    <aside class="think-energy-review" aria-label="本周期精力复盘">
      <div class="think-energy-review__head"><strong>本周期</strong><span>{periodLabel}</span></div>
      <div class="think-energy-review__list">
        {lines.map((line) => (
          <div class="think-energy-review__row" key={`${line.key}-${line.text}`}>
            <span>{line.label}</span>
            <p>{line.text}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}
