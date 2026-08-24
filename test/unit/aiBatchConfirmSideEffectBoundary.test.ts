import fs from 'node:fs';
import path from 'node:path';

describe('AI batch confirmation side-effect boundary', () => {
  const rootDir = path.resolve(__dirname, '../..');
  const modalSource = fs.readFileSync(path.join(rootDir, 'src/platform/obsidian/modals/AiBatchConfirmModal.tsx'), 'utf8');
  const actionsSource = fs.readFileSync(path.join(rootDir, 'src/platform/obsidian/modals/useAiBatchConfirmActions.ts'), 'utf8');
  const footerSource = fs.readFileSync(path.join(rootDir, 'src/platform/obsidian/modals/AiBatchConfirmFooter.tsx'), 'utf8');
  const sidebarSource = fs.readFileSync(path.join(rootDir, 'src/platform/obsidian/modals/AiBatchConfirmSidebar.tsx'), 'utf8');

  it('does not feed live editor state back into editor initialization props', () => {
    expect(modalSource).toContain('context={currentRecord.editorContext}');
    expect(modalSource).toContain('handleEditorStateChange(currentRecord.id, state)');
    expect(actionsSource).toContain('draftStateByRecordIdRef.current.set(recordId, state);');
    expect(actionsSource).not.toContain('setRecords((prev) =>');
  });

  it('uses one click transaction path and does not switch records inside save-all', () => {
    expect(footerSource).not.toContain('onPointerDown');
    expect(footerSource).not.toContain('onMouseDown');
    expect(sidebarSource).not.toContain('onPointerDown');
    expect(sidebarSource).not.toContain('onMouseDown');
    expect(actionsSource).not.toContain('setCurrentIndex(i)');
  });

  it('keys the editor by record so record changes have deterministic lifecycle boundaries', () => {
    expect(modalSource).toContain('key={currentRecord.id}');
  });
});
