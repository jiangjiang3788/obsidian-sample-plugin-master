/**
 * useFormState - 表单状态管理 Hook
 * 提供统一的表单状态管理功能
 */

import { useState } from 'preact/hooks';

export interface FormStateOptions<T> {
  onFieldChange?: (field: keyof T, value: any, state: T) => void;
  validateOnChange?: boolean;
}

export function useFormState<T extends Record<string, any>>(
  initialState: T,
  options: FormStateOptions<T> = {}
) {
  const [state, setState] = useState<T>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isDirty, setIsDirty] = useState(false);
  
  const { onFieldChange, validateOnChange = false } = options;

  /**
   * 更新单个字段
   */
  const updateField = <K extends keyof T>(field: K, value: T[K]) => {
    const newState = { ...state, [field]: value };
    setState(newState);
    setIsDirty(true);
    
    // 清除该字段的错误
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    onFieldChange?.(field, value, newState);
  };

  /**
   * 批量更新多个字段
   */
  const updateMultiple = (updates: Partial<T>) => {
    const newState = { ...state, ...updates };
    setState(newState);
    setIsDirty(true);
    
    // 清除更新字段的错误
    const updatedFields = Object.keys(updates) as Array<keyof T>;
    if (updatedFields.some(field => errors[field])) {
      setErrors(prev => {
        const newErrors = { ...prev };
        updatedFields.forEach(field => {
          if (newErrors[field]) {
            delete newErrors[field];
          }
        });
        return newErrors;
      });
    }
  };

  /**
   * 重置表单状态
   */
  const reset = (newInitialState?: T) => {
    const resetState = newInitialState || initialState;
    setState(resetState);
    setErrors({});
    setIsDirty(false);
  };

  /**
   * 设置字段错误
   */
  const setFieldError = (field: keyof T, error: string | null) => {
    setErrors(prev => {
      if (error === null) {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      }
      return { ...prev, [field]: error };
    });
  };

  /**
   * 批量设置错误
   */
  const setFieldErrors = (newErrors: Partial<Record<keyof T, string>>) => {
    setErrors(newErrors);
  };

  /**
   * 清除所有错误
   */
  const clearErrors = () => {
    setErrors({});
  };

  /**
   * 获取字段错误
   */
  const getFieldError = (field: keyof T): string | undefined => {
    return errors[field];
  };

  /**
   * 检查是否有任何错误
   */
  const hasErrors = (): boolean => {
    return Object.keys(errors).length > 0;
  };

  /**
   * 验证表单（需要传入验证函数）
   */
  const validate = (validationFn: (state: T) => Partial<Record<keyof T, string>>) => {
    const validationErrors = validationFn(state);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  return {
    // 状态
    state,
    errors,
    isDirty,
    
    // 状态操作
    setState,
    updateField,
    updateMultiple,
    reset,
    
    // 错误管理
    setFieldError,
    setFieldErrors,
    clearErrors,
    getFieldError,
    hasErrors,
    validate
  };
}

/**
 * 专门用于时间相关表单的 Hook
 */
export function useTimeFormState(initialData: {
  startTime: string;
  endTime: string;
  duration: string;
}) {
  const [lastChanged, setLastChanged] = useState<'startTime' | 'endTime' | 'duration' | null>(null);
  
  const formState = useFormState(initialData, {
    onFieldChange: (field) => {
      setLastChanged(field as 'startTime' | 'endTime' | 'duration');
    }
  });

  return {
    ...formState,
    lastChanged,
    setLastChanged
  };
}
