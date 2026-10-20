/** @covers F089/unit */
import { readFileSync } from 'node:fs';

const read = (name: string) => readFileSync(name, 'utf8');

describe('Timeline desktop/iOS/Android responsive geometry', () => {
  it('keeps the time axis and summary on the same CSS width token', () => {
    expect(read('src/features/views/runtime/components/timeline/TimelineTimeAxis.tsx')).toContain('var(--timeline-time-axis-width, ${width}px)');
    expect(read('src/features/views/runtime/components/timeline/TimelineOverallSummary.tsx')).toContain('var(--timeline-time-axis-width, ${width}px)');
  });

  it('targets the real view container, not the viewport or the querying node itself', () => {
    const css = read('src/styles/features/timeline.css');
    expect(css).toContain('container: think-timeline / inline-size');
    expect(css).toContain('@container think-timeline (max-width: 480px)');
    expect(css).toContain('--timeline-time-axis-width: 66px');
    const heatmap = read('src/styles/features/heatmap.css');
    expect(heatmap).toContain('container: think-heatmap / inline-size');
    expect(heatmap).toContain('@container think-heatmap (max-width: 400px)');
  });
});


describe('Timeline colored-block visibility across desktop, iOS and Android', () => {
  it('uses a solid goal-color indicator and an opaque tinted fill for all task statuses', () => {
    const css = read('src/styles/features/timeline.css');
    // The marker survives CSS color-mix fallback and is not opacity-dependent.
    expect(css).toContain('border-inline-start: 3px solid var(--timeline-goal-color, var(--think-data-neutral))');
    expect(css).toContain('background: var(--think-bg-surface-2);');
    expect(css).toContain('var(--timeline-fill-strength), var(--think-bg-canvas)');
    expect(css).toContain('--timeline-fill-strength: 24%'); // open
    expect(css).toContain('--timeline-fill-strength: 38%'); // done
    expect(css).toContain('--timeline-fill-strength: 26%'); // planned
    expect(css).not.toContain('14%, transparent);');
  });

  it('preserves a solid fill in the Goal allocation bar without color-mix', () => {
    const css = read('src/styles/features/timeline-goal-allocation.css');
    expect(css).toContain('background: var(--timeline-goal-allocation-color, #718096);');
    expect(css).toContain('opacity: 0.50;');
  });

  it('exposes zero vs nonzero rendered block counts without changing interactions', () => {
    const view = read('src/features/views/runtime/TimelineView/TimelineDailyView.tsx');
    expect(view).toContain('data-timeline-rendered-blocks={dayColumns.reduce((count, column) => count + column.blocks.length, 0)}');
  });
});


describe('Mobile timeline scrolling and Android WebView compatibility', () => {
  it('uses a bounded, touch-native vertical scroller and disables native iOS selection', () => {
    const css = read('src/styles/features/timeline.css');
    expect(css).toContain('max-height: 68vh');
    expect(css).toContain('-webkit-overflow-scrolling: touch');
    expect(css).toContain('-webkit-user-select: none');
    expect(css).toContain('-webkit-touch-callout: none');
  });

  it('always mounts mobile timeline even if IntersectionObserver is stalled', () => {
    const tsx = read('src/app/dashboard/ViewportDeferredView.tsx');
    expect(tsx).toContain("viewType === 'TimelineView' && detectThinkDeviceProfile().isMobileLike");
    expect(tsx).toContain('if (eagerMobileTimeline)');
  });

  it('gives four distinct key-hour colors and keeps Android line colors without color-mix', () => {
    const css = read('src/styles/features/timeline.css');
    for (const hour of [3, 6, 9, 12]) {
      expect(css).toContain(`.think-time-grid__tick--key-${hour}`);
    }
    expect(css).toContain('--timeline-tick-color: var(--think-viz-guide-strong');
    expect(css).toContain('@supports (color: color-mix(in srgb, white 50%, black))');
    const grid = read('src/shared/ui/timeline/TimeRulerGrid.tsx');
    expect(grid).toContain('timelineKeyHour(tick.minute)');
  });
});
