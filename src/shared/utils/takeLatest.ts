// src/shared/utils/takeLatest.ts

/**
 * CancelledError
 * - 用于区分“用户取消/新请求打断”与真正的失败
 */
export class CancelledError extends Error {
    name = 'CancelledError';
    constructor(message: string = 'Cancelled') {
        super(message);
    }
}

/**
 * createTakeLatest
 * - 每次 run() 会取消上一次正在执行的任务
 * - 返回值是任务的 Promise
 * - cancel() 可用于 modal close / unload
 */
export function createTakeLatest(label?: string) {
    let current: AbortController | null = null;
    let disposed = false;

    const cancel = () => {
        if (current) {
            try { current.abort(); } catch {}
            current = null;
        }
    };

    const dispose = () => {
        disposed = true;
        cancel();
    };

    const run = async <T>(task: (signal: AbortSignal) => Promise<T>): Promise<T> => {
        if (disposed) throw new CancelledError(label ? `Disposed: ${label}` : 'Disposed');

        // takeLatest：取消上一个
        cancel();
        const controller = new AbortController();
        current = controller;

        try {
            return await task(controller.signal);
        } catch (err: any) {
            // 统一把 AbortError 转成 CancelledError
            if (err?.name === 'AbortError') {
                throw new CancelledError(label ? `Aborted: ${label}` : 'Aborted');
            }
            throw err;
        } finally {
            if (current === controller) current = null;
        }
    };

    return {
        run,
        cancel,
        dispose,
        get signal() {
            return current?.signal ?? null;
        },
    };
}
