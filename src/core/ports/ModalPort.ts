// src/core/ports/ModalPort.ts
// ---------------------------------------------------------------------------
// Phase0 P1: core -> platform boundary (Modal)
// ---------------------------------------------------------------------------
// Goal:
// - core/features/shared 不直接 new Obsidian Modal，也不 import 'obsidian'
// - 通过 ModalPort 由 platform 统一打开各类 modal
// ---------------------------------------------------------------------------

import type { InjectionToken } from 'tsyringe';
import type { Item } from '../types';

export interface NamePromptOptions {
  title: string;
  placeholder?: string;
  ctaText?: string;
  defaultValue?: string;
}

export interface CheckinManagerOpenArgs {
  date: string;
  items: Item[];
  onAddRecord?: () => void;
}

export interface ModalPort {
  openAiTextPrompt(): Promise<string | null>;

  openAiBatchConfirm(args: {
    title: string;
    items: string[];
    confirmText?: string;
    cancelText?: string;
  }): Promise<boolean>;

  openQuickInput(blockId?: string): void;

  openNamePrompt(options: NamePromptOptions): Promise<string | null>;

  openAiChat(): void;

  openCheckinManager(args?: CheckinManagerOpenArgs): void;
}

export const MODAL_PORT_TOKEN: InjectionToken<ModalPort> = 'ModalPort';
