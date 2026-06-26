export function isMobileLikeEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent)
    || (window.matchMedia?.('(pointer: coarse)').matches ?? false)
    || window.innerWidth <= 820;
}
