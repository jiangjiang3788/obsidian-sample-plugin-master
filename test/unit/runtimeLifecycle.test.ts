/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F001/unit
 * @covers F002/unit
 */
import { isDisposed, markDisposed, resetDisposedForTests } from '@/app/runtime/lifecycleState';
import { Disposables } from '@/app/runtime/disposables';

describe('runtime lifecycle', () => {
  beforeEach(() => resetDisposedForTests());

  it('tracks disposed state', () => {
    expect(isDisposed()).toBe(false);
    markDisposed();
    expect(isDisposed()).toBe(true);
  });

  it('disposes callbacks in LIFO order and isolates individual failures', () => {
    const disposables = new Disposables();
    const calls: string[] = [];
    disposables.add(() => calls.push('a'));
    disposables.add(() => { calls.push('b'); throw new Error('fail'); });
    disposables.add(() => calls.push('c'));
    expect(() => disposables.dispose()).not.toThrow();
    expect(calls).toEqual(['c', 'b', 'a']);
  });
});
