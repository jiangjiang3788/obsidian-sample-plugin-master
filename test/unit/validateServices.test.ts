/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F001/error
 * @covers F001/unit
 */
import { validateServices } from '@/app/services.types';

describe('validateServices', () => {
  it('throws with a helpful message when required services are missing', () => {
    expect(() => validateServices({} as any, 'test')).toThrow(/uiPort/);
  });
});
