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
