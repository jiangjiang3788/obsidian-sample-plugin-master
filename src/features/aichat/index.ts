// src/features/aichat/index.ts
/**
 * AI Chat Feature - 对外导出
 *
 * NOTE:
 * - Previously exported './AiChatModal' which does not exist.
 * - Re-export the container as the modal entrypoint.
 */
export { AiChatModalContainer as AiChatModal } from './AiChatModalContainer';
export type { AiChatModalContainerProps } from './AiChatModalContainer';
