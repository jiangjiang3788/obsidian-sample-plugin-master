import { isDisposed, markDisposed, resetDisposedForTests } from '@/app/runtime/lifecycleState';

describe('lifecycleState', () => {
  beforeEach(() => {
    resetDisposedForTests();
  });

  it('starts as not disposed', () => {
    expect(isDisposed()).toBe(false);
  });

  it('markDisposed flips the flag', () => {
    markDisposed();
    expect(isDisposed()).toBe(true);
  });
});
