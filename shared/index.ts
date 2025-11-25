// 导出通用组件
export { FieldManager } from './ui/composites/FieldManager';
export type { FieldManagerProps } from './ui/composites/FieldManager';

export { FormField } from './ui/composites/FormField';
export type { FormFieldProps } from './ui/composites/FormField';

// 导出通用模式
export { useSaveHandler, useSaveHandlerWithConfirm, useSaveHandlerWithValidation } from './patterns/ModalSavePattern';
export type { SaveOptions } from './patterns/ModalSavePattern';

// 导出通用 Hooks
export { useFormState, useTimeFormState } from './hooks/useFormState';
export type { FormStateOptions } from './hooks/useFormState';
