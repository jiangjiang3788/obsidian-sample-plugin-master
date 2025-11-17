// src/state/storeRegistry.ts
import { AppStore } from '@/app/AppStore';
import { DataStore } from '@core/services/DataStore';
import { TimerService } from '@features/timer/TimerService';
// [新增] 导入 InputService 类型
import { InputService } from '@core/services/InputService';

/**
 * 这是一个简单的服务定位器，用于在应用启动时保存核心服务和Store的单一实例，
 * 以便 Preact 的 Hooks 和组件可以在没有深度 props 传递或 React Context 的情况下访问它们。
 */
export let appStore: AppStore;
export let dataStore: DataStore;
export let timerService: TimerService;
// [新增] 导出 inputService 全局实例
export let inputService: InputService;

export function registerStore(store: AppStore) {
    if (appStore) {
        // 在开发过程中，由于插件热重载，这里可能会出现警告，是正常现象。
        console.warn("ThinkPlugin: AppStore is being registered a second time.");
    }
    appStore = store;
}

export function registerDataStore(store: DataStore) {
    if (dataStore) {
        console.warn("ThinkPlugin: DataStore is being registered a second time.");
    }
    dataStore = store;
}

export function registerTimerService(service: TimerService) {
    if (timerService) {
        console.warn("ThinkPlugin: TimerService is being registered a second time.");
    }
    timerService = service;
}

// [新增] 用于注册 InputService 的函数
export function registerInputService(service: InputService) {
    if (inputService) {
        console.warn("ThinkPlugin: InputService is being registered a second time.");
    }
    inputService = service;
}
