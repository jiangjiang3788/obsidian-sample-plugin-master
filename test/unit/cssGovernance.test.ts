import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
function read(relativePath: string): string { return fs.readFileSync(path.join(ROOT, relativePath), 'utf8'); }
function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

describe('CSS governance', () => {
  it('keeps Settings static sx within the migration budget', () => {
    const settingsFiles = walk(path.join(ROOT, 'src/features/settings')).filter((file) => /\.(?:ts|tsx)$/.test(file));
    const count = settingsFiles.reduce((total, file) => total + (fs.readFileSync(file, 'utf8').match(/\bsx\s*=\s*\{\{/g)?.length ?? 0), 0);
    expect(count).toBeLessThanOrEqual(132);
  });

  it('keeps legacy shared CSS removed', () => {
    for (const file of [
      'src/shared/styles/settings.css','src/shared/styles/statistics.css','src/shared/styles/layout.css',
      'src/shared/styles/heatmap.css','src/shared/styles/statistics-view.css','src/shared/styles/timeline.css',
      'src/shared/styles/block-view.css','src/shared/styles/event-timeline.css','src/shared/styles/excel-view-content-md.css',
    ]) expect(fs.existsSync(path.join(ROOT, file))).toBe(false);
    const legacyDir = path.join(ROOT, 'src/shared/styles');
    expect(fs.readdirSync(legacyDir).filter((name) => name.endsWith('.css'))).toEqual([]);
    expect(read('src/styles/main.css')).not.toContain('../shared/styles/');
  });

  it('loads the governed component, feature and override style layers', () => {
    const main = read('src/styles/main.css');
    for (const fragment of [
      'components/modal.css','components/simple-select.css','components/native-controls.css','components/task-row.css','components/grouped-container.css',
      'features/settings.css','features/settings-editors.css','features/layout-editor.css','features/view-shell.css','features/progress.css',
      'features/heatmap.css','features/statistics.css','features/timeline.css','features/excel.css','features/block.css','features/event-timeline.css',
      'features/energy-task-list.css','overrides/obsidian-modal.css','overrides/quick-input-modal.css',
    ]) expect(main).toContain(fragment);
  });

  it('keeps fixed visual colors inside token files and feature CSS governed', () => {
    const audit = JSON.parse(read('reports/css/css-audit-current.json'));
    expect(audit.summary.hardcodedColorsOutsideTokens).toBe(0);
    expect(audit.summary.important).toBeLessThanOrEqual(12);
    expect(audit.summary.cssLines).toBeLessThanOrEqual(8500);
    expect(audit.summary.cssFiles).toBeLessThanOrEqual(72);
    const migrated = [
      'src/styles/features/view-shell.css','src/styles/features/progress.css','src/styles/features/heatmap.css','src/styles/features/statistics.css',
      'src/styles/features/timeline.css','src/styles/features/excel.css','src/styles/features/block.css','src/styles/features/event-timeline.css',
    ].map(read).join('\n');
    expect(migrated).not.toContain('!important');
    expect(migrated).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(migrated).not.toMatch(/\brgba?\(/i);
  });

  it('keeps large feature CSS behind thin facade imports', () => {
    for (const file of ['src/styles/features/settings-editors.css','src/styles/features/statistics.css','src/styles/features/excel.css','src/styles/features/view-shell.css']) {
      const source = read(file);
      expect(source).toContain('@import');
      expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(12);
    }
  });

  it('keeps UI ownership and state contracts explicit', () => {
    expect(read('src/features/settings/components/LayoutEditorPanel.tsx')).toContain('think-layout-editor');
    expect(read('src/platform/obsidian/modals/CheckinManagerModal.tsx')).toContain('think-checkin-modal-host');
    expect(read('src/shared/ui/primitives/Modal.tsx')).toContain('ThinkIconButton');
    const progress = [read('src/features/views/runtime/ProgressView.tsx'), read('src/features/views/runtime/ProgressGoalCard.tsx')].join('\n');
    expect(progress).toContain('think-progress-section');
    expect(progress).toContain('think-progress-card');
    expect(progress).not.toMatch(/style\s*=\s*\{\{/);
    expect(progress).not.toMatch(/#[0-9a-f]{3,8}/i);
    expect(fs.existsSync(path.join(ROOT, 'src/features/settings/layout/ModulePanel.tsx'))).toBe(false);
    const moduleSettings = read('src/features/settings/layout/ModuleSettingsModal.tsx');
    expect(moduleSettings).toContain("from '@shared/ui/public'");
    expect(moduleSettings).not.toContain('AnyIconButton');
  });

  it('keeps runtime-only geometry and governed state class names', () => {
    const row = read('src/features/views/runtime/components/items/TaskRow.tsx');
    expect(row).not.toContain("style={{ background: 'none'");
    expect(row).toContain('task-row-title');
    expect(read('src/features/views/runtime/EnergyTaskList.tsx')).toContain("style={`left:${menu.x}px;top:${menu.y}px;`}");
    expect(read('src/platform/obsidian/modals/quickInputKeyboard.ts')).toContain('think-quick-input-keyboard-detected');
    expect(read('src/features/views/runtime/TableViewCell.tsx')).toContain('think-table-cell-item');
    expect(read('src/styles/overrides/quick-input-modal.css')).not.toContain('.keyboard-detected');
  });

  it('ships the current CSS design contract', () => {
    expect(read('docs/CSS_DESIGN_SPEC.md')).toContain('Button');
    expect(read('docs/CSS_DESIGN_SPEC.md')).toContain('src/styles');
  });
});
