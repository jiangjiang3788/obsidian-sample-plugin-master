import { devError } from '@core/public';

export type DisposeFn = () => void;

type DisposableTask = {
    name: string;
    dispose: DisposeFn;
};

/**
 * Disposables
 *
 * 目标：把 ServiceManager.cleanup() 里散落的 try/catch 和资源释放逻辑收敛成“资源表”。
 * - 默认按注册的“逆序”执行（LIFO），更符合资源创建/释放的依赖关系
 * - 单个资源清理失败不影响后续清理
 */
export class Disposables {
    private tasks: DisposableTask[] = [];

    add(dispose: DisposeFn): void;
    add(name: string, dispose: DisposeFn): void;
    add(nameOrDispose: string | DisposeFn, disposeMaybe?: DisposeFn): void {
        if (typeof nameOrDispose === 'function') {
            const autoName = `anonymous#${this.tasks.length + 1}`;
            this.tasks.push({ name: autoName, dispose: nameOrDispose });
            return;
        }
        if (typeof disposeMaybe !== 'function') {
            throw new Error('[Disposables] add(name, dispose) requires a dispose function');
        }
        this.tasks.push({ name: nameOrDispose, dispose: disposeMaybe });
    }

    /**
     * 清理全部资源。
     * 默认按注册逆序执行（LIFO）。
     */
    disposeAll(): void {
        const tasks = this.tasks;
        // 清理后不再重复执行
        this.tasks = [];

        // 逆序执行：后注册的资源通常依赖更“上层”，应更先释放。
        for (let i = tasks.length - 1; i >= 0; i--) {
            const task = tasks[i];
            try {
                task.dispose();
            } catch (error) {
                devError(`[Disposables] dispose failed: ${task.name}`, error);
            }
        }
    }

    /** Backward/ergonomic alias used by older callers/tests. */
    dispose(): void {
        this.disposeAll();
    }
}
