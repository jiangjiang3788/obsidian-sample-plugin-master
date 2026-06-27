import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('CSS V5 final convergence', () => {
  it('removes every legacy shared CSS file and import', () => {
    const legacyDir = path.join(ROOT, 'src/shared/styles');
    const cssFiles = fs.readdirSync(legacyDir).filter((name) => name.endsWith('.css'));
    expect(cssFiles).toEqual([]);
    expect(read('src/styles/main.css')).not.toContain('../shared/styles/');
  });

  it('loads the final task, group and quick-input contracts', () => {
    const main = read('src/styles/main.css');
    for (const fragment of [
      'components/task-row.css',
      'components/grouped-container.css',
      'features/task-execution.css',
      'overrides/quick-input-modal.css',
    ]) {
      expect(main).toContain(fragment);
    }
  });

  it('keeps fixed UI colors inside token files only', () => {
    const audit = JSON.parse(read('reports/css/css-audit-current.json'));
    expect(audit.summary.hardcodedColorsOutsideTokens).toBe(0);
    expect(audit.summary.important).toBeLessThanOrEqual(12);
    expect(audit.summary.cssLines).toBeLessThanOrEqual(7000);
  });

  it('keeps runtime geometry inline while removing TaskRow fixed skin', () => {
    const row = read('src/shared/ui/items/TaskRow.tsx');
    expect(row).not.toContain("style={{ background: 'none'");
    expect(row).toContain('task-row-title');

    const contextMenu = read('src/shared/ui/views/TaskExecutionContextMenu.tsx');
    expect(contextMenu).toContain("style={{ left: `${menu.x}px`, top: `${menu.y}px` }}");
  });

  it('uses governed keyboard and table-cell state names', () => {
    expect(read('src/platform/modals/quickInputKeyboard.ts')).toContain('think-quick-input-keyboard-detected');
    expect(read('src/shared/ui/views/TableViewCell.tsx')).toContain('think-table-cell-item');
    expect(read('src/styles/overrides/quick-input-modal.css')).not.toContain('.keyboard-detected');
  });

  it('ships the final design and visual-regression documents', () => {
    expect(read('docs/CSS_DESIGN_SPEC.md')).toContain('Button');
    expect(read('docs/CSS_VISUAL_REGRESSION.md')).toContain('Light');
    expect(read('docs/CSS_FINAL_ARCHITECTURE.md')).toContain('src/styles/main.css');
  });
});
