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
