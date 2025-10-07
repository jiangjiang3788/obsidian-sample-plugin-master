/**
 * @file Features Layer Barrel File
 * ----------------------------------------------------------------
 * 功能模块层的统一导出文件
 * 将所有功能模块统一导出，便于外部引用
 */

// 导出各个功能模块
export * as dashboard from './dashboard';
export * as quickInput from './quick-input';
export * as settings from './settings';
export * as timer from './timer';
export * as logic from './logic';

// 导出特定的常用组件和类型
export { FloatingTimerWidget } from './timer/FloatingTimerWidget';
