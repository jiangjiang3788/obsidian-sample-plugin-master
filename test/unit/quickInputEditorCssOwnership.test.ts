import fs from 'node:fs';
import path from 'node:path';

describe('QuickInputEditor CSS ownership', () => {
  const rootDir = path.resolve(__dirname, '../..');
  const editorLayoutCss = fs.readFileSync(path.join(rootDir, 'src/styles/features/quick-input-editor.css'), 'utf8');
  const editorControlsCss = fs.readFileSync(path.join(rootDir, 'src/styles/features/quick-input-editor-controls.css'), 'utf8');
  const modalOverrideCss = fs.readFileSync(path.join(rootDir, 'src/styles/overrides/quick-input-modal.css'), 'utf8');
  const mainCss = fs.readFileSync(path.join(rootDir, 'src/styles/main.css'), 'utf8');

  it('owns selectable-pill state independent of the QuickInput modal host', () => {
    expect(editorControlsCss).toContain('.think-quick-input-editor .think-quick-input-selectable-pill.is-selected');
    expect(editorControlsCss).toContain('.think-quick-input-editor .think-quick-input-selectable-pill[aria-pressed="true"]');
    expect(editorControlsCss).toContain('border-color: var(--think-accent);');
    expect(editorControlsCss).not.toContain('.modal.think-quick-input-modal .think-quick-input-selectable-pill');
    expect(editorLayoutCss).toContain('.think-quick-input-editor .think-qif-row');
    expect(mainCss).toContain('@import "./features/quick-input-editor-controls.css";');
  });

  it('keeps reusable editor controls out of the Obsidian modal host override', () => {
    expect(modalOverrideCss).not.toContain('.think-quick-input-selectable-pill');
    expect(modalOverrideCss).not.toContain('.think-native-input');
    expect(modalOverrideCss).not.toContain('.think-ob-tag-editor');
  });
});
