import { detectThinkDeviceProfile, isThinkMobileLikeProfile } from '@shared/public';

export function isMobileLikeEnvironment(): boolean {
  return isThinkMobileLikeProfile(detectThinkDeviceProfile());
}
