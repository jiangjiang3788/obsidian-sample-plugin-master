export type ThinkDevicePlatform = 'desktop' | 'ios' | 'android';
export type ThinkPointerKind = 'fine' | 'coarse';
export type ThinkViewportKind = 'narrow' | 'medium' | 'wide';

export interface ThinkDeviceProfile {
  platform: ThinkDevicePlatform;
  pointer: ThinkPointerKind;
  viewport: ThinkViewportKind;
  viewportWidth: number;
  hasVisualViewport: boolean;
  isMobileLike: boolean;
}

type MatchMediaLike = (query: string) => { matches: boolean };

export interface ThinkDeviceProfileWindowLike {
  innerWidth?: number;
  visualViewport?: unknown;
  navigator?: {
    userAgent?: string;
    platform?: string;
    maxTouchPoints?: number;
  };
  matchMedia?: MatchMediaLike;
}

export type ThinkDeviceProfileAttributes = {
  'data-think-platform': ThinkDevicePlatform;
  'data-think-pointer': ThinkPointerKind;
  'data-think-viewport': ThinkViewportKind;
  'data-think-visual-viewport': 'true' | 'false';
};

function safeMatch(win: ThinkDeviceProfileWindowLike | undefined, query: string): boolean {
  try {
    return Boolean(win?.matchMedia?.(query).matches);
  } catch {
    return false;
  }
}

function getRuntimeWindow(): ThinkDeviceProfileWindowLike | undefined {
  return typeof window === 'undefined' ? undefined : window;
}

function detectPlatform(userAgent: string, platform = '', maxTouchPoints = 0): ThinkDevicePlatform {
  if (/Android/i.test(userAgent)) return 'android';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  // iPadOS can present a desktop-like Mac user agent while still exposing touch.
  if (/Mac/i.test(platform) && maxTouchPoints > 1) return 'ios';
  return 'desktop';
}

function detectViewport(width: number): ThinkViewportKind {
  if (width <= 640) return 'narrow';
  if (width <= 1024) return 'medium';
  return 'wide';
}

export function detectThinkDeviceProfile(win: ThinkDeviceProfileWindowLike | undefined = getRuntimeWindow()): ThinkDeviceProfile {
  const userAgent = String(win?.navigator?.userAgent || '');
  const platformName = String(win?.navigator?.platform || '');
  const maxTouchPoints = Number(win?.navigator?.maxTouchPoints || 0);
  const viewportWidth = Math.max(0, Number(win?.innerWidth || 0));
  const platform = detectPlatform(userAgent, platformName, maxTouchPoints);
  const pointer: ThinkPointerKind = safeMatch(win, '(pointer: coarse)') || maxTouchPoints > 0 ? 'coarse' : 'fine';
  const viewport = detectViewport(viewportWidth || 1024);
  const isMobileLike = platform !== 'desktop' || pointer === 'coarse' || viewportWidth <= 820;

  return {
    platform,
    pointer,
    viewport,
    viewportWidth,
    hasVisualViewport: Boolean(win?.visualViewport),
    isMobileLike,
  };
}

export function isThinkMobileLikeProfile(profile: ThinkDeviceProfile): boolean {
  return profile.isMobileLike;
}

export function getThinkDeviceProfileAttributes(
  profile: ThinkDeviceProfile = detectThinkDeviceProfile(),
): ThinkDeviceProfileAttributes {
  return {
    'data-think-platform': profile.platform,
    'data-think-pointer': profile.pointer,
    'data-think-viewport': profile.viewport,
    'data-think-visual-viewport': profile.hasVisualViewport ? 'true' : 'false',
  };
}

export function applyThinkDeviceProfileAttributes(
  element: Element,
  profile: ThinkDeviceProfile = detectThinkDeviceProfile((element.ownerDocument?.defaultView as ThinkDeviceProfileWindowLike | null) || undefined),
): ThinkDeviceProfile {
  const attrs = getThinkDeviceProfileAttributes(profile);
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  element.classList.toggle('think-os--mobile', profile.isMobileLike);
  element.classList.toggle('think-os--desktop', !profile.isMobileLike);
  element.classList.toggle('think-os--android', profile.platform === 'android');
  element.classList.toggle('think-os--ios', profile.platform === 'ios');
  return profile;
}
