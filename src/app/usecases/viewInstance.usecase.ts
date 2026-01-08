// src/app/usecases/viewInstance.usecase.ts
/**
 * ViewInstanceUseCase - 视图实例相关用例
 * 
 * 【S5 规范】⛔ 禁止 features 层直接使用！
 * 
 * 此文件已被 layout.usecase 取代。
 * features 层必须通过 useCases.layout.* 调用视图相关操作：
 * 
 * 迁移指引：
 * - addViewInstance()    → useCases.layout.addView()
 * - updateViewInstance() → useCases.layout.updateView()
 * - deleteViewInstance() → useCases.layout.deleteView()
 * - moveViewInstance()   → useCases.layout.moveView()
 * - duplicateViewInstance() → useCases.layout.duplicateView()
 * 
 * @deprecated 请使用 layout.usecase 代替
 * @internal 仅供内部参考，不应被 import
 */

import type { ViewInstance } from '@/core/types/schema';

const DEPRECATED_ERROR = `
[S5 规范] ViewInstanceUseCase 已禁用！

请使用 useCases.layout 代替：
  import { createLayoutUseCase } from '@/app/usecases/layout.usecase';
  const layoutUseCase = createLayoutUseCase();
  
  // 视图操作
  await layoutUseCase.addView(title, parentId);
  await layoutUseCase.updateView(id, updates);
  await layoutUseCase.deleteView(id);
  await layoutUseCase.moveView(id, direction);
  await layoutUseCase.duplicateView(id);

详见: src/app/ARCH_CONSTRAINTS.md
`;

/**
 * @deprecated 请使用 layout.usecase 代替
 */
export class ViewInstanceUseCase {
    constructor() {
        console.warn('[S5] ViewInstanceUseCase 已禁用，请使用 layout.usecase');
    }

    async addViewInstance(_title: string, _parentId: string | null = null): Promise<void> {
        throw new Error(DEPRECATED_ERROR);
    }

    async updateViewInstance(_id: string, _updates: Partial<ViewInstance>): Promise<void> {
        throw new Error(DEPRECATED_ERROR);
    }

    async deleteViewInstance(_id: string): Promise<void> {
        throw new Error(DEPRECATED_ERROR);
    }

    async moveViewInstance(_id: string, _direction: 'up' | 'down'): Promise<void> {
        throw new Error(DEPRECATED_ERROR);
    }

    async duplicateViewInstance(_id: string): Promise<void> {
        throw new Error(DEPRECATED_ERROR);
    }
}

/**
 * @deprecated 请使用 createLayoutUseCase() 代替
 */
export function createViewInstanceUseCase(): ViewInstanceUseCase {
    console.warn('[S5] createViewInstanceUseCase 已禁用，请使用 createLayoutUseCase');
    return new ViewInstanceUseCase();
}
