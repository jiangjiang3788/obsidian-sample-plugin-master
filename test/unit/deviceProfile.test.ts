import { detectThinkDeviceProfile, getThinkDeviceProfileAttributes, isThinkMobileLikeProfile } from '@shared/public';

function makeWindowLike(options: {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
  width?: number;
  coarse?: boolean;
  visualViewport?: boolean;
}) {
  return {
    innerWidth: options.width ?? 1024,
    visualViewport: options.visualViewport ? {} : undefined,
    navigator: {
      userAgent: options.userAgent ?? '',
      platform: options.platform ?? '',
      maxTouchPoints: options.maxTouchPoints ?? 0,
    },
    matchMedia: (query: string) => ({
      matches: query.includes('pointer: coarse') ? Boolean(options.coarse) : false,
    }),
  };
}

describe('Think device profile', () => {
  it('detects Android as mobile-like coarse platform', () => {
    const profile = detectThinkDeviceProfile(makeWindowLike({
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel)',
      width: 412,
      coarse: true,
      visualViewport: true,
    }));

    expect(profile.platform).toBe('android');
    expect(profile.pointer).toBe('coarse');
    expect(profile.viewport).toBe('narrow');
    expect(isThinkMobileLikeProfile(profile)).toBe(true);
    expect(getThinkDeviceProfileAttributes(profile)).toMatchObject({
      'data-think-platform': 'android',
      'data-think-pointer': 'coarse',
      'data-think-viewport': 'narrow',
      'data-think-visual-viewport': 'true',
    });
  });

  it('detects iPadOS desktop user agent by Mac platform plus touch points', () => {
    const profile = detectThinkDeviceProfile(makeWindowLike({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)',
      platform: 'MacIntel',
      maxTouchPoints: 5,
      width: 820,
    }));

    expect(profile.platform).toBe('ios');
    expect(profile.pointer).toBe('coarse');
    expect(profile.isMobileLike).toBe(true);
  });

  it('keeps wide desktop as fine pointer desktop profile', () => {
    const profile = detectThinkDeviceProfile(makeWindowLike({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      platform: 'Win32',
      width: 1440,
    }));

    expect(profile.platform).toBe('desktop');
    expect(profile.pointer).toBe('fine');
    expect(profile.viewport).toBe('wide');
    expect(profile.isMobileLike).toBe(false);
  });
});
