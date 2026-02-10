import { validateServices } from '@/app/services.types';

describe('validateServices', () => {
  it('throws with a helpful message when required services are missing', () => {
    expect(() => validateServices({} as any, 'test')).toThrow(/uiPort/);
  });
});
