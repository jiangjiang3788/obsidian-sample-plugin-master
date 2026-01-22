// src/features/quickinput/QuickInputModal.tsx
/**
 * Compatibility re-export (4.5)
 * ---------------------------------------------------------------
 * QuickInputModal 属于“共享 UI/Modal”，已迁移到 shared/ui/modals。
 * 这里保留旧路径，以避免历史 import 立即破坏。
 *
 * ✅ 新代码请直接 import:
 * - UI:   @shared/ui/modals/QuickInputModal
 * - Type: @core/public (QuickInputSaveData)
 */

export { QuickInputModal } from '@shared/ui/modals/QuickInputModal';
export type { QuickInputSaveData } from '@core/public';
