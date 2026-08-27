/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F131/regression
 */
import { applyThinkDeviceProfileAttributes, detectThinkDeviceProfile } from '@/shared/utils/deviceProfile';

function makeWindow(width: number, options: { coarse?: boolean; throwMatchMedia?: boolean } = {}) {
  return {
    innerWidth: width,
    navigator: { userAgent: 'Mozilla/5.0', platform: 'Linux x86_64', maxTouchPoints: 0 },
    matchMedia: (_query: string) => {
      if (options.throwMatchMedia) throw new Error('模拟 matchMedia 不可用');
      return { matches: Boolean(options.coarse) };
    },
  } as any;
}

describe('移动设备识别防复发规则', () => {
  it('820 像素仍按移动式交互处理，821 像素的普通桌面不误判为移动端', () => {
    expect(detectThinkDeviceProfile(makeWindow(820)).isMobileLike).toBe(true);
    expect(detectThinkDeviceProfile(makeWindow(821)).isMobileLike).toBe(false);
  });

  it('matchMedia 异常时安全回退，不让设备检测拖垮整个界面', () => {
    const profile = detectThinkDeviceProfile(makeWindow(430, { throwMatchMedia: true }));
    expect(profile.viewport).toBe('narrow');
    expect(profile.isMobileLike).toBe(true);
  });

  it('应用设备属性时同步更新 data 属性与移动/桌面 class，重复调用不会留下旧平台 class', () => {
    const element = document.createElement('div');
    applyThinkDeviceProfileAttributes(element, {
      platform: 'ios', pointer: 'coarse', viewport: 'narrow', viewportWidth: 390, hasVisualViewport: true, isMobileLike: true,
    });
    expect(element.getAttribute('data-think-platform')).toBe('ios');
    expect(element.classList.contains('think-os--mobile')).toBe(true);
    expect(element.classList.contains('think-os--ios')).toBe(true);

    applyThinkDeviceProfileAttributes(element, {
      platform: 'desktop', pointer: 'fine', viewport: 'wide', viewportWidth: 1440, hasVisualViewport: false, isMobileLike: false,
    });
    expect(element.classList.contains('think-os--mobile')).toBe(false);
    expect(element.classList.contains('think-os--desktop')).toBe(true);
    expect(element.classList.contains('think-os--ios')).toBe(false);
  });
});
