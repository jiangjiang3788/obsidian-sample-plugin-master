import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('CSS V4 business view convergence', () => {
  it('loads every migrated business-view feature stylesheet', () => {
    const main = read('src/styles/main.css');
    for (const fragment of [
      'features/view-shell.css',
      'features/progress.css',
      'features/heatmap.css',
      'features/statistics.css',
      'features/timeline.css',
      'features/excel.css',
      'features/block.css',
      'features/event-timeline.css',
    ]) {
      expect(main).toContain(fragment);
    }
  });

  it('keeps migrated business styles owned by the governed feature layer', () => {
    for (const file of [
      'src/shared/styles/layout.css',
      'src/shared/styles/heatmap.css',
      'src/shared/styles/statistics-view.css',
      'src/shared/styles/timeline.css',
      'src/shared/styles/block-view.css',
      'src/shared/styles/event-timeline.css',
      'src/shared/styles/excel-view-content-md.css',
    ]) {
      expect(fs.existsSync(path.join(ROOT, file))).toBe(false);
    }
  });

  it('removes fixed visual skin from the Progress components', () => {
    const source = [
      read('src/features/settings/views/runtime/ProgressView.tsx'),
      read('src/features/settings/views/runtime/ProgressGoalCard.tsx'),
    ].join('\n');

    expect(source).toContain('think-progress-card');
    expect(source).not.toMatch(/style\s*=\s*\{\{/);
    expect(source).not.toMatch(/#[0-9a-f]{3,8}/i);
  });

  it('uses the shared icon-button primitive in the module shell', () => {
    const source = read('src/features/settings/layout/ModulePanel.tsx');
    expect(source).toContain('ThinkIconButton');
    expect(source).not.toContain('sx={{');
    expect(source).not.toContain('AnyIconButton');
  });

  it('keeps migrated feature CSS free of important and fixed UI colors', () => {
    const files = [
      'src/styles/features/view-shell.css',
      'src/styles/features/progress.css',
      'src/styles/features/heatmap.css',
      'src/styles/features/statistics.css',
      'src/styles/features/timeline.css',
      'src/styles/features/excel.css',
      'src/styles/features/block.css',
      'src/styles/features/event-timeline.css',
    ];
    const source = files.map(read).join('\n');
    expect(source).not.toContain('!important');
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(source).not.toMatch(/\brgba?\(/i);
  });
});
