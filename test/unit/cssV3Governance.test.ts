import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

describe('CSS V3 governance contracts', () => {
  it('keeps Settings static sx below the V3 migration budget', () => {
    const settingsFiles = walk(path.join(ROOT, 'src/features/settings'))
      .filter((file) => /\.(?:ts|tsx)$/.test(file));
    const count = settingsFiles.reduce((total, file) => {
      return total + (fs.readFileSync(file, 'utf8').match(/\bsx\s*=\s*\{\{/g)?.length ?? 0);
    }, 0);

    expect(count).toBeLessThanOrEqual(132);
  });

  it('keeps legacy Settings and Statistics CSS removed after V5 convergence', () => {
    for (const file of ['src/shared/styles/settings.css', 'src/shared/styles/statistics.css']) {
      expect(fs.existsSync(path.join(ROOT, file))).toBe(false);
    }
  });

  it('loads the V3 feature and modal style layers from the main entry', () => {
    const main = read('src/styles/main.css');
    for (const fragment of [
      'components/modal.css',
      'components/simple-select.css',
      'components/native-controls.css',
      'features/settings.css',
      'features/settings-editors.css',
      'features/layout-editor.css',
      'overrides/obsidian-modal.css',
    ]) {
      expect(main).toContain(fragment);
    }
  });

  it('uses scoped Settings and Obsidian modal contracts', () => {
    expect(read('src/features/settings/components/LayoutEditorPanel.tsx')).toContain('think-layout-editor');
    expect(read('src/platform/modals/CheckinManagerModal.tsx')).toContain('think-checkin-modal-host');
    expect(read('src/shared/ui/primitives/Modal.tsx')).toContain('ThinkIconButton');
  });
});
