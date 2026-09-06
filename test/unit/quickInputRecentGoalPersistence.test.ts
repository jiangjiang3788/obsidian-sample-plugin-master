/**
 * @covers F042/unit
 */
import fs from 'node:fs';
import path from 'node:path';

describe('QuickInput recent Goal persistence boundary', () => {
  it('does not persist settings on every Goal selector click', () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), 'src/features/quickinput/editor/QuickInputEditorContainer.tsx'),
      'utf8',
    );
    expect(source).not.toContain('rememberRecentGoalPath(nextSelection.goalPath)');
  });

  it('remembers the Goal only after a successful create submit', () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), 'src/features/quickinput/modal/useQuickInputSubmit.ts'),
      'utf8',
    );
    expect(source).toContain("feedbackResult.status === 'success' && operationMode === 'create'");
    expect(source).toContain('useCases.settings.rememberRecentGoalPath(createdGoalPath)');
  });
});
