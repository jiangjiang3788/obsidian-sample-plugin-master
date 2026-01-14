// src/features/settings/EditTaskModal.tsx
//
// 说明：
// - 这个组件被迁移到了 shared/ui/modals，以移除 shared -> features 的依赖 tunnel。
// - 保留此转发文件是为了兼容历史 import（可在最后阶段统一删除）。

export { EditTaskModal } from '@shared/ui/modals/EditTaskModal';
export type { EditTaskModalProps } from '@shared/ui/modals/EditTaskModal';
