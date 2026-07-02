/** @jsxImportSource preact */
import { h } from 'preact';
import { App, Modal } from 'obsidian';

import {
  createServices,
  getVaultName,
  mountWithServices,
  resolveVaultResourcePath,
  type Services,
  unmountPreact,
} from '@/app/public';
import { QuickInputModalContent } from '@features/quickinput/modal/QuickInputModalContent';
import { isMobileLikeEnvironment } from '@features/quickinput/modal/quickInputEnvironment';
import type { Item, QuickInputSaveData } from '@core/types/public';
import type { RecordInputSource, RecordSubmitResult } from '@core/recordInput/public';

import { prepareThinkModal } from './modalPreact';
import { setupQuickInputKeyboardDetection } from './quickInputKeyboard';
import { showQuickInputNotice } from './quickInputNotice';

interface QuickInputEditOptions {
  mode?: 'create' | 'edit';
  editItem?: Item;
  source?: Extract<RecordInputSource, 'quickinput' | 'view_quick_create' | 'timer' | 'unknown'>;
  onSubmitSuccess?: (result: RecordSubmitResult, draft: QuickInputSaveData) => void | Promise<void>;
}

/**
 * Obsidian adapter for the QuickInput feature.
 *
 * The feature-owned UI lives in src/features/quickinput/modal. This class only
 * owns Obsidian Modal lifecycle, resource-path injection, and keyboard/outside
 * click guards.
 */
export class QuickInputModal extends Modal {
  private static activeModal: QuickInputModal | null = null;
  private services: Services;
  private cleanupKeyboardDetection: (() => void) | null = null;
  private cleanupOutsideClickGuard: (() => void) | null = null;

  constructor(
    app: App,
    private blockId: string,
    private context?: Record<string, unknown>,
    private themeId?: string,
    private onSave?: (data: QuickInputSaveData) => void,
    private allowBlockSwitch: boolean = true,
    private options?: QuickInputEditOptions,
  ) {
    super(app);
    this.services = createServices();
  }

  // ✅ 方法一：官方 API（Obsidian ≥ 0.15.0）
  shouldCloseOnClickOutside(): boolean {
    return false;
  }

  onOpen() {
    if (QuickInputModal.activeModal && QuickInputModal.activeModal !== this) {
      try {
        QuickInputModal.activeModal.close();
      } catch {
        // ignore stale modal close errors
      }
    }
    QuickInputModal.activeModal = this;
    prepareThinkModal(this, 'think-quick-input-modal');
    const mobileLike = isMobileLikeEnvironment();
    this.modalEl.toggleClass('think-quick-input-modal--mobile', mobileLike);
    this.modalEl.toggleClass('think-quick-input-modal--desktop', !mobileLike);
    if (mobileLike) {
      this.setupKeyboardDetection();
    }

    mountWithServices(
      this.contentEl,
      <QuickInputModalContent
        getResourcePath={(path) => resolveVaultResourcePath(this.app, path)}
        initialBlockId={this.blockId}
        context={this.context}
        initialThemeId={this.themeId}
        onSave={this.onSave}
        closeModal={() => this.close()}
        allowBlockSwitch={this.allowBlockSwitch}
        mode={this.options?.mode || 'create'}
        editItem={this.options?.editItem}
        source={this.options?.source}
        vaultName={getVaultName(this.app)}
        onSubmitSuccess={this.options?.onSubmitSuccess}
        showNotice={showQuickInputNotice}
      />,
      this.services,
    );

    // ✅ 方法二：强制拦截遮罩层点击（所有版本通用，双保险）
    // 使用 setTimeout 确保 DOM 已完全挂载
    setTimeout(() => {
      const bg = this.modalEl.closest('.modal-container')?.querySelector('.modal-bg');
      if (bg) {
        const stopOutsideClose = (e: Event) => {
          e.stopPropagation();
          e.preventDefault();
        };
        bg.addEventListener('click', stopOutsideClose, true);
        this.cleanupOutsideClickGuard = () => bg.removeEventListener('click', stopOutsideClose, true);
      }
    }, 0);
  }

  private setupKeyboardDetection() {
    this.cleanupKeyboardDetection = setupQuickInputKeyboardDetection({
      contentEl: this.contentEl,
      modalEl: this.modalEl,
    });
  }

  onClose() {
    try {
      this.cleanupOutsideClickGuard?.();
      this.cleanupKeyboardDetection?.();
    } finally {
      this.cleanupOutsideClickGuard = null;
      this.cleanupKeyboardDetection = null;
      if (QuickInputModal.activeModal === this) {
        QuickInputModal.activeModal = null;
      }
    }
    unmountPreact(this.contentEl);
  }
}
