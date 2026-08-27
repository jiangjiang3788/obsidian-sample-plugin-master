/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F031/ui
 * @covers F040/regression
 * @covers F040/ui
 */
import fs from 'node:fs';
import path from 'node:path';

describe('GoalSelector cascade layout contract', () => {
  const css = fs.readFileSync(
    path.join(process.cwd(), 'src/styles/features/quick-input-editor-controls.css'),
    'utf8',
  );

  it('lays Goal hierarchy levels out as side-by-side columns instead of stacking them below each other', () => {
    expect(css).toMatch(/\.think-quick-input-goal-list\s*\{[\s\S]*?display:\s*flex;/);
    expect(css).toMatch(/\.think-quick-input-goal-list\s*\{[\s\S]*?align-items:\s*flex-start;/);
    expect(css).toMatch(/\.think-quick-input-goal-level\s*\{[\s\S]*?flex:\s*0 0 25%;/);
    expect(css).toMatch(/\.think-quick-input-goal-level\s*\{[\s\S]*?box-sizing:\s*border-box;/);
  });


  it('keeps four Goal columns inside the desktop field width before horizontal scrolling', () => {
    expect(css).toContain('flex: 0 0 25%;');
    expect(css).toContain('min-width: 0;');
    expect(css).toContain('margin-left: 0;');
  });

  it('keeps deeper levels as plain list columns separated by the existing border token', () => {
    expect(css).toContain('.think-quick-input-goal-level + .think-quick-input-goal-level');
    expect(css).toContain('border-left: 1px solid var(--think-border-subtle);');
  });
});
