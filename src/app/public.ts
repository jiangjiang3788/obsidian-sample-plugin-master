// src/app/public.ts
/**
 * App Public API（冻结阶段唯一出口）
 *
 * 目的：
 * - features/shared/views 层只能通过这里拿到「UI 需要的能力」
 * - 避免直接依赖 app 内部实现（AppStoreContext / store / usecases / createServices 等）
 *
 * 冻结策略：
 * - 旧代码仍然可能直接 import 内部模块（历史遗留）
 * - 新代码一律改走本出口；并通过 ESLint 边界规则阻止继续扩散
 */

// ============== UI Hooks & Provider ==============
export {
  ServicesProvider,
  useZustandAppStore,
  useDataStore,
  useInputService,
  useUseCases,
} from './AppStoreContext';

export type { Services } from './services.types';

// ============== Services Factory (for Modals/Widgets bootstrap) ==============
export { createServices } from './createServices';
export { validateServices } from './services.types';

// ============== UI Mount Helpers (reduce repeated bootstrap code) ==============
export { mountWithServices, unmountPreact } from './ui/mountWithServices';

// ============== UseCases (types + DI token) ==============
export { USECASES_TOKEN } from './usecases';
export type { UseCases } from './usecases';

// ============== Store (read-only helpers + DI token) ==============
export {
  STORE_TOKEN,
  getZustandState,
  subscribeZustandStore,
} from './store/useAppStore';

export type { AppStoreInstance, ZustandAppStore } from './store/useAppStore';

// ============== Store public types ==============
export type { TimerState } from './store/types';

// ============== UI Contracts (types only) ==============

/**
 * TimerController
 *
 * shared/UI 层可依赖的最小 Timer 能力合同。
 *
 * 目的：
 * - shared 层不再 import features/timer（避免 shared 变成绕过边界的通道）
 * - UI 只关心「要做什么」，不关心 Timer 的实现落在哪个 feature
 *
 * 注意：
 * - 这是一个纯 TypeScript 合同（interface），运行期不会产生依赖/循环引用。
 */
export interface TimerController {
  startOrResume(taskId: string): Promise<void>;
}


// ============== Runtime UI (moved from shared/ui to app/ui) ==============
export { QuickInputEditor, finalizeQuickInputFormData } from './ui/components/QuickInputEditor';
export type { QuickInputEditorState, QuickInputEditorProps } from './ui/components/QuickInputEditor';
export { QuickInputModal } from './ui/modals/QuickInputModal';
export { default as FloatingPanel } from './ui/primitives/FloatingPanel';
export {
  openFloatingWidget,
  closeFloatingWidget,
  closeAllFloatingWidgets,
  isFloatingWidgetOpen,
} from './ui/widgets/FloatingWidgetManager';

// ============== Store Selectors (recommended read API) ==============
export * from './store/selectors';
export { FloatingWidget } from './ui/widgets/FloatingWidget';