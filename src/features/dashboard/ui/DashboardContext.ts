// src/features/dashboard/ui/DashboardContext.ts
import { createContext } from 'preact';

/**
 * 定义 Dashboard Context 中值的结构
 */
export interface DashboardContextValue {
  onMarkItemDone: (itemId: string) => void;
}

/**
 * 创建 Context 对象。
 * 提供一个默认值，如果组件不在 Provider 内部使用，它会抛出错误，
 * 这是一种很好的调试实践。
 */
export const DashboardContext = createContext<DashboardContextValue>({
  onMarkItemDone: () => {
    throw new Error('DashboardContext: onMarkItemDone was called outside of a DashboardContext.Provider');
  },
});