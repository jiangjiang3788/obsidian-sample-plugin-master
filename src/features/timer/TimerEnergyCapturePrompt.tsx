/** @jsxImportSource preact */
import { useEffect, useRef, useState } from 'preact/hooks';
import { ThinkButton, ThinkRange } from '@shared/ui/public';
import type { TimerEnergyCaptureRequest } from './TimerService';

const QUICK_SCORES = [20, 40, 60, 80, 100] as const;

interface TimerEnergyCapturePromptProps {
  request: TimerEnergyCaptureRequest;
  onSubmit: (score: number) => void;
  onSkip: () => void;
}

function initialScore(request: TimerEnergyCaptureRequest): number {
  const baseline = Number(request.baselineScore);
  return Number.isFinite(baseline) ? Math.max(0, Math.min(100, Math.round(baseline))) : 60;
}

export function TimerEnergyCapturePrompt({ request, onSubmit, onSkip }: TimerEnergyCapturePromptProps) {
  const [score, setScore] = useState(() => initialScore(request));
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setScore(initialScore(request));
    queueMicrotask(() => rootRef.current?.focus());
  }, [request]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target instanceof HTMLInputElement && target.type === 'range') return;

      const quickIndex = Number(event.key) - 1;
      if (Number.isInteger(quickIndex) && quickIndex >= 0 && quickIndex < QUICK_SCORES.length) {
        event.preventDefault();
        onSubmit(QUICK_SCORES[quickIndex]);
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSubmit(score);
        return;
      }
      if (event.key.length === 1 || event.key === 'Escape') {
        event.preventDefault();
        onSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [score, onSubmit, onSkip]);

  const title = request.phase === 'start' ? '开始精力' : '结束精力';

  return (
    <div
      ref={rootRef}
      className="think-timer-energy-capture"
      role="dialog"
      aria-label={title}
      tabIndex={-1}
    >
      <div className="think-timer-energy-capture__head">
        <strong>{title}</strong>
        <button type="button" className="think-timer-energy-capture__skip" onClick={onSkip}>跳过</button>
      </div>

      <div className="think-timer-energy-capture__quick" role="group" aria-label="精力快捷评分">
        {QUICK_SCORES.map((value, index) => (
          <button
            type="button"
            key={value}
            className={`think-timer-energy-capture__quick-button${score === value ? ' is-active' : ''}`}
            onClick={() => onSubmit(value)}
            title={`快捷键 ${index + 1}`}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="think-timer-energy-capture__slider">
        <ThinkRange
          min="0"
          max="100"
          step="1"
          value={score}
          aria-label="精力评分"
          onInput={(event) => setScore(Number(event.currentTarget.value))}
        />
        <strong>{score}</strong>
        <ThinkButton size="sm" onClick={() => onSubmit(score)}>记录</ThinkButton>
      </div>
    </div>
  );
}
