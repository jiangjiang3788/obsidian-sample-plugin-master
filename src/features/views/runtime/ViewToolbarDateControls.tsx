/** @jsxImportSource preact */
import { ThinkIcon, ThinkIconButton } from '@shared/ui/public';

export interface ViewToolbarDateControlsProps {
  dateLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function ViewToolbarDateControls({
  dateLabel,
  onPrevious,
  onNext,
  onToday,
}: ViewToolbarDateControlsProps) {
  return (
    <div class="tp-toolbar__date-group" aria-label="时间范围导航">
      <span
        class="tp-toolbar-date-display"
        role="status"
        aria-live="polite"
        title="当前时间范围"
      >
        {dateLabel}
      </span>
      <div class="tp-toolbar__date-actions">
        <ThinkIconButton
          size="sm"
          label="上一时间范围"
          icon={<ThinkIcon name="chevron-left" />}
          onClick={onPrevious}
        />
        <ThinkIconButton
          size="sm"
          label="下一时间范围"
          icon={<ThinkIcon name="chevron-right" />}
          onClick={onNext}
        />
        <ThinkIconButton
          size="sm"
          label="回到今天"
          icon={<ThinkIcon name="calendar" />}
          onClick={onToday}
        />
      </div>
    </div>
  );
}
