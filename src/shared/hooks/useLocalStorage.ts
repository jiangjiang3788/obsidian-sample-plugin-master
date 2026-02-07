import { useState } from 'preact/hooks';
import { devWarn } from '@core/public';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // 从 localStorage 获取初始值
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      devWarn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // 封装 setState 以同步到 localStorage
  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      devWarn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}
