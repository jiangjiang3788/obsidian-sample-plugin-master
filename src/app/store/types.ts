// src/app/store/types.ts
/**
 * Store 对外类型出口（冻结阶段）
 *
 * 目标：
 * - features/shared 层不允许直接 import app/store/slices/*
 * - 但允许使用 slice 暴露出的「状态类型」做类型标注
 *
 * 规则：
 * - 这里只 re-export type（不 export actions），避免外层拿到写入口
 */

export type { TimerState } from './slices/timer.slice';
