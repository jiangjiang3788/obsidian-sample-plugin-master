// src/shared/hooks/usePersistentState.ts
/** @jsxImportSource preact */
import { useState, useEffect } from 'preact/hooks';

/**
 * 一个自定义 Hook，行为类似 useState，但会自动将状态持久化到 localStorage。
 * @param key - localStorage 中存储该状态所用的键。
 * @param defaultValue - 当 localStorage 中没有找到对应键时使用的默认值。
 * @returns 一个类似 useState 返回值的数组 `[state, setState]`。
 */
export function usePersistentState<T>(key: string, defaultValue: T): [T, (value: T | ((prevState: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const storedValue = localStorage.getItem(key);
      if (storedValue !== null) {
        return JSON.parse(storedValue);
      }
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}”:`, error);
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      // 当 state 为 undefined 或 null 时，从 localStorage 中移除该项，行为更可预测
      if (state === undefined || state === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(state));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key “${key}”:`, error);
    }
  }, [key, state]);

  return [state, setState];
}