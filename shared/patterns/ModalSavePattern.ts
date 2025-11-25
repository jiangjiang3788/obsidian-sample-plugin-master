/**
 * ModalSavePattern - 模态框保存处理模式
 * 提供统一的保存逻辑和错误处理
 */

import { Notice } from 'obsidian';

export interface SaveOptions {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * 创建统一的保存处理函数
 * @param saveAction 保存操作函数
 * @param options 保存选项配置
 * @returns 保存处理函数
 */
export function useSaveHandler(
  saveAction: () => Promise<void>,
  options: SaveOptions = {}
) {
  const {
    successMessage = '保存成功',
    errorMessage = '保存失败',
    onSuccess,
    onError
  } = options;
  
  return async () => {
    try {
      await saveAction();
      new Notice(`✅ ${successMessage}`);
      onSuccess?.();
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      const message = errorObj.message || '未知错误';
      new Notice(`❌ ${errorMessage}: ${message}`);
      console.error(`${errorMessage}:`, errorObj);
      onError?.(errorObj);
    }
  };
}

/**
 * 创建带有确认的保存处理函数
 * @param saveAction 保存操作函数
 * @param confirmMessage 确认消息
 * @param options 保存选项配置
 * @returns 保存处理函数
 */
export function useSaveHandlerWithConfirm(
  saveAction: () => Promise<void>,
  confirmMessage: string = '确定要保存更改吗？',
  options: SaveOptions = {}
) {
  const saveHandler = useSaveHandler(saveAction, options);
  
  return async () => {
    if (confirm(confirmMessage)) {
      await saveHandler();
    }
  };
}

/**
 * 创建表单验证与保存的组合处理函数
 * @param validateFn 验证函数，返回错误消息或 null
 * @param saveAction 保存操作函数
 * @param options 保存选项配置
 * @returns 保存处理函数
 */
export function useSaveHandlerWithValidation<T>(
  validateFn: (data: T) => string | null,
  saveAction: (data: T) => Promise<void>,
  options: SaveOptions = {}
) {
  return async (data: T) => {
    const validationError = validateFn(data);
    if (validationError) {
      new Notice(`❌ 验证失败: ${validationError}`);
      return;
    }
    
    const saveHandler = useSaveHandler(() => saveAction(data), options);
    await saveHandler();
  };
}
