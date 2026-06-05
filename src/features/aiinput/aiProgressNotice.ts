import { devWarn } from '@core/public';

import type { AiInputUiPort } from './aiInputRuntime';
import { nowMs } from './aiInputRuntime';

export type AiProgressMode = 'parse' | 'speed-test';

export interface AiProgressNoticeOptions {
    traceId: string;
    fastMode?: boolean;
    mode: AiProgressMode;
    model: string;
    endpointHost: string;
}

export interface AiProgressNoticeHandle {
    hide(): void;
    elapsedSeconds(): number;
}

export function buildAiWaitingMessage(options: {
    fastMode?: boolean;
    mode: AiProgressMode;
    seconds: number;
    model: string;
    endpointHost: string;
}): string {
    const prefix = options.mode === 'speed-test'
        ? 'AI 接口测速中'
        : options.fastMode
            ? 'AI 快速解析中'
            : 'AI 正在解析';

    const estimate = options.mode === 'speed-test'
        ? '通常 3-12 秒；超过 10 秒说明接口首包偏慢'
        : options.fastMode
            ? '预计 10-25 秒；接口慢时会更久'
            : '预计 15-50 秒；当前主要等待接口首包';

    let line = '正在连接模型服务...';
    if (options.seconds >= 45) {
        line = '已经很久了，基本可以判断是接口/模型排队偏慢。';
    } else if (options.seconds >= 30) {
        line = '还在等服务端首包，插件本地还没有开始解析响应。';
    } else if (options.seconds >= 20) {
        line = '模型可能在排队或代理转发较慢，再坚持一下。';
    } else if (options.seconds >= 12) {
        line = '接口首包偏慢，但请求还活着。';
    } else if (options.seconds >= 6) {
        line = '正在等待服务端首包，这一步通常最耗时。';
    }

    return `${prefix} ${options.seconds}s\n${line}\n${estimate}\n${options.model} @ ${options.endpointHost}`;
}

export function startAiProgressNotice(ui: AiInputUiPort, options: AiProgressNoticeOptions): AiProgressNoticeHandle {
    const startedAt = nowMs();
    let lastSecond = -1;
    const handle = ui.notice(buildAiWaitingMessage({
        fastMode: options.fastMode,
        mode: options.mode,
        seconds: 0,
        model: options.model,
        endpointHost: options.endpointHost,
    }), 0);

    const update = () => {
        const seconds = Math.floor((nowMs() - startedAt) / 1000);
        if (seconds === lastSecond) return;
        lastSecond = seconds;

        const message = buildAiWaitingMessage({
            fastMode: options.fastMode,
            mode: options.mode,
            seconds,
            model: options.model,
            endpointHost: options.endpointHost,
        });
        try {
            handle?.setMessage?.(message);
        } catch {
            // no-op
        }

        if (seconds > 0 && seconds % 10 === 0) {
            devWarn(`[AiInput][${options.traceId}] 等待 AI 接口中：${seconds}s`, {
                mode: options.mode,
                fastMode: !!options.fastMode,
                model: options.model,
                endpointHost: options.endpointHost,
            });
        }
    };

    update();
    const timer = window.setInterval(update, 1000);

    return {
        hide(): void {
            window.clearInterval(timer);
            handle?.hide?.();
        },
        elapsedSeconds(): number {
            return Math.floor((nowMs() - startedAt) / 1000);
        },
    };
}
