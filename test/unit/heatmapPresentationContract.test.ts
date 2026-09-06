import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (relativePath: string): string => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('heatmap presentation contract', () => {
  it('keeps heatmap section labels isolated from host heading styles', () => {
    const dayView = read('src/features/views/runtime/HeatmapDayView.tsx');
    const content = read('src/features/views/runtime/HeatmapViewContent.tsx');
    const css = read('src/styles/features/heatmap.css');

    expect(dayView).not.toContain('<h3');
    expect(content).not.toContain('<h3');
    expect(dayView).toContain('role="heading" aria-level={3}');
    expect(content).toContain('role="heading" aria-level={3}');
    expect(css).toContain('.think-os .heatmap-day-section-title');
    expect(css).toContain('font-size: var(--think-type-section-size)');
    expect(css).toContain('color: var(--think-text-primary)');
  });

  it('does not render aggregate check-in/record counts beside heatmap group labels', () => {
    const sources = [
      read('src/features/views/runtime/HeatmapDayView.tsx'),
      read('src/features/views/runtime/HeatmapViewContent.tsx'),
    ].join('\n');

    expect(sources).not.toContain('个打卡');
    expect(sources).not.toContain('条记录');
    expect(read('src/styles/features/heatmap.css')).not.toContain('.heatmap-goal-meta');
  });

  it('hides native scrollbar chrome across Think OS surfaces without disabling overflow', () => {
    const scope = read('src/styles/foundations/scope.css');

    expect(scope).toContain('Preserve scrolling mechanics while keeping Think OS view chrome visually quiet.');
    expect(scope).toContain('scrollbar-width: none !important');
    expect(scope).toContain('::-webkit-scrollbar');
    expect(scope).not.toMatch(/overflow\s*:\s*hidden/);
  });
});
