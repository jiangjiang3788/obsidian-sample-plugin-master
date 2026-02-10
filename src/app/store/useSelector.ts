// src/app/store/useSelector.ts
/**
 * useSelector - 推荐的读取 API
 * - 统一封装 Zustand selector 调用
 * - 支持可选 equalityFn，便于订阅收敛（避免不必要 rerender）
 */
import type { ZustandAppStore } from '@/app/store/useAppStore';
import { useZustandAppStore } from '@/app/AppStoreContext';

export function useSelector<T>(
  selector: (state: ZustandAppStore) => T,
  equalityFn?: (a: T, b: T) => boolean,
): T {
  return useZustandAppStore(selector, equalityFn);
}
