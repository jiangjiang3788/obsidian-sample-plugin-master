import { detectThinkDeviceProfile, isThinkMobileLikeProfile } from '@shared/utils/public';

export function isMobileLikeEnvironment(): boolean {
  return isThinkMobileLikeProfile(detectThinkDeviceProfile());
}
