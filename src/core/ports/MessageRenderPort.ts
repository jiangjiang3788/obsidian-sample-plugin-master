// src/core/ports/MessageRenderPort.ts
import type { InjectionToken } from 'tsyringe';

export type MessageContentType = 'markdown' | 'plain';

export interface RenderMessageArgs {
  containerEl: HTMLElement;
  content: string;
  contentType?: MessageContentType;
  sourcePath?: string;
  cls?: string;
}

export interface MessageRenderPort {
  renderMessage(args: RenderMessageArgs): Promise<void>;
  clear(containerEl: HTMLElement): void;
}

export const MESSAGE_RENDER_PORT_TOKEN: InjectionToken<MessageRenderPort> =
  Symbol('MessageRenderPort');
