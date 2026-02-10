import { Disposables } from '@/app/runtime/disposables';

describe('Disposables', () => {
  it('disposes in LIFO order and swallows individual failures', () => {
    const d = new Disposables();
    const calls: string[] = [];

    d.add(() => {
      calls.push('a');
    });
    d.add(() => {
      calls.push('b');
      throw new Error('fail');
    });
    d.add(() => {
      calls.push('c');
    });

    expect(() => d.dispose()).not.toThrow();
    expect(calls).toEqual(['c', 'b', 'a']);
  });
});
