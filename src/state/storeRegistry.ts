// src/state/storeRegistry.ts
import { AppStore } from './AppStore';

/**
 * 这是一个简单的服务定位器，用于在应用启动时保存 AppStore 的单一实例，
 * 以便 Preact 的 useStore hook 可以在没有 React Context 的情况下访问它。
 */
export let appStore: AppStore;

export function registerStore(store: AppStore) {
    if (appStore) {
        // 在开发过程中，由于插件热重载，这里可能会出现警告，是正常现象。
        console.warn("ThinkPlugin: AppStore is being registered a second time.");
    }
    appStore = store;
}