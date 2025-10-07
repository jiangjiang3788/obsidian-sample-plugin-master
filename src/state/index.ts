// src/state/index.ts

/**
 * @file State Management Barrel File
 * ----------------------------------------------------------------
 * 状态管理层的统一导出文件。
 * 提供应用状态管理的所有公共接口。
 */

// 导出主要的 Store
export { AppStore } from './AppStore';

// 导出 Store 注册相关函数和全局实例
export {
    registerStore,
    registerDataStore,
    registerTimerService,
    registerInputService,
    appStore,
    dataStore,
    timerService,
    inputService
} from './storeRegistry';
