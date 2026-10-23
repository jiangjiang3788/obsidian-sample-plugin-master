/** @jsxImportSource preact */
import { h } from 'preact';
import { App, Modal, Notice } from 'obsidian';

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
import type { RecordViewItem, QuickInputSaveData } from '@core/types/public';
import { getCreateEligibleGoalPaths, resolveRecordGoalPath } from '@core/recordInput/public';
import type { RecordInputSource, RecordSubmitResult } from '@core/recordInput/public';
import { normalizeGoalPath } from '@core/goal/public';
import { getRecordTypeById } from '@core/recordTypes/public';

import { prepareThinkModal } from './modalPreact';
import { setupQuickInputKeyboardDetection } from './quickInputKeyboard';
import { showQuickInputNotice } from './quickInputNotice';
import { recordThinkDiagnostic } from '../ThinkDiagnostics';

interface QuickInputEditOptions {
  mode?: 'create' | 'edit';
  editItem?: RecordViewItem;
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
  private static lastOpenSignature = '';
  private static lastOpenAt = 0;
  private services: Services;
  private cleanupKeyboardDetection: (() => void) | null = null;
  private cleanupOutsideClickGuard: (() => void) | null = null;
  private outsideClickGuardTimer: number | null = null;
  private outsideClickCloseEnabled = false;
  private hasUnsavedDraft = false;

  constructor(
    app: App,
    private recordTypeId: string,
    private context?: Record<string, unknown>,
    private onSave?: (data: QuickInputSaveData) => void,
    private allowRecordTypeSwitch: boolean = true,
    private options?: QuickInputEditOptions,
  ) {
    super(app);
    this.services = createServices();
  }


  private getOpenSignature(): string {
    const context = this.context || {};
    return [
      this.options?.mode || 'create',
      this.recordTypeId,
      this.options?.editItem?.id || '',
      this.options?.source || '',
      String(context.goalPath || ''),
      String(context.goalTemplateId || ''),
    ].join('|');
  }

  /**
   * Ignore an accidental second launch of the exact same QuickInput within one
   * double-click window. Different records/contexts still replace the active modal.
   */
  open(): void {
    const now = Date.now();
    const signature = this.getOpenSignature();
    // Opening the same capture again must not silently close an unsaved draft,
    // even when a voice keyboard or another command repeats the action later.
    if (QuickInputModal.activeModal && QuickInputModal.activeModal !== this
      && QuickInputModal.activeModal.getOpenSignature() === signature) return;
    if (QuickInputModal.activeModal?.hasUnsavedDraft) {
      new Notice('快捷输入中还有未保存的文字，请先保存或取消当前记录。');
      return;
    }
    if (signature === QuickInputModal.lastOpenSignature && now - QuickInputModal.lastOpenAt < 450) {
      return;
    }
    QuickInputModal.lastOpenSignature = signature;
    QuickInputModal.lastOpenAt = now;
    super.open();
  }

  private getCreateAvailabilityFailure(): string | null {
    if ((this.options?.mode || 'create') !== 'create') return null;
    const recordType = getRecordTypeById(this.recordTypeId);
    if (!recordType || recordType.captureMode === 'direct') return null;

    const settings = this.services.zustandStore.getState().settings;
    const goalPath = normalizeGoalPath(resolveRecordGoalPath({ context: this.context })) || '';
    const eligibleGoalPaths = getCreateEligibleGoalPaths(settings, recordType.id);

    if (!goalPath) {
      return eligibleGoalPaths.length > 0
        ? null
        : `「${recordType.name}」还没有配置任何目标模板。`;
    }

    const direct = eligibleGoalPaths.includes(goalPath);
    if (direct) return null;
    const goalName = goalPath.split('/').filter(Boolean).pop() || goalPath;
    return `「${goalName}」还没有配置「${recordType.name}」模板。`;
  }

  // ✅ 方法一：官方 API（Obsidian ≥ 0.15.0）
  shouldCloseOnClickOutside(): boolean {
    return this.outsideClickCloseEnabled;
  }

  onOpen() {
    const openedAt = performance.now();
    const unavailable = this.getCreateAvailabilityFailure();
    if (unavailable) {
      this.services.uiPort.notice(unavailable);
      queueMicrotask(() => this.close());
      return;
    }

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
        initialRecordTypeId={this.recordTypeId}
        context={this.context}
        onSave={this.onSave}
        closeModal={() => this.close()}
        allowRecordTypeSwitch={this.allowRecordTypeSwitch}
        mode={this.options?.mode || 'create'}
        editItem={this.options?.editItem}
        source={this.options?.source}
        vaultName={getVaultName(this.app)}
        onSubmitSuccess={this.options?.onSubmitSuccess}
        showNotice={showQuickInputNotice}
        onDiagnostic={(action, durationMs, outcome) => recordThinkDiagnostic(action, durationMs, outcome)}
        onDirtyChange={(dirty) => { this.hasUnsavedDraft = dirty; }}
        onOutsideClickCloseChange={(enabled) => { this.outsideClickCloseEnabled = enabled; }}
      />,
      this.services,
    );

    // ✅ 方法二：强制拦截遮罩层点击（所有版本通用，双保险）
    // 使用 setTimeout 确保 DOM 已完全挂载
    this.outsideClickGuardTimer = window.setTimeout(() => {
      this.outsideClickGuardTimer = null;
      if (QuickInputModal.activeModal !== this) return;
      const bg = this.modalEl.closest('.modal-container')?.querySelector('.modal-bg');
      if (bg) {
        let dismissedKeyboardOnPointerDown = false;
        const handleOutsidePointerDown = (event: Event) => {
          dismissedKeyboardOnPointerDown = false;
          const active = document.activeElement;
          if (!(active instanceof HTMLElement) || !this.contentEl.contains(active)) return;
          if (!['INPUT', 'TEXTAREA'].includes(active.tagName) && !active.isContentEditable) return;
          dismissedKeyboardOnPointerDown = true;
          event.stopPropagation();
          active.blur(); // commit IME; a backdrop tap must not abandon the draft
        };
        const handleOutsideClick = (e: Event) => {
          e.stopPropagation();
          e.preventDefault();
          if (dismissedKeyboardOnPointerDown) {
            dismissedKeyboardOnPointerDown = false;
            return;
          }
          if (this.outsideClickCloseEnabled) this.close();
        };
        bg.addEventListener('pointerdown', handleOutsidePointerDown, true);
        bg.addEventListener('click', handleOutsideClick, true);
        this.cleanupOutsideClickGuard = () => {
          bg.removeEventListener('pointerdown', handleOutsidePointerDown, true);
          bg.removeEventListener('click', handleOutsideClick, true);
        };
      }
    }, 0);
    recordThinkDiagnostic('quickinput.open', performance.now() - openedAt);
  }

  private setupKeyboardDetection() {
    this.cleanupKeyboardDetection = setupQuickInputKeyboardDetection({
      contentEl: this.contentEl,
      modalEl: this.modalEl,
    });
  }

  onClose() {
    recordThinkDiagnostic('quickinput.close');
    try {
      if (this.outsideClickGuardTimer !== null) window.clearTimeout(this.outsideClickGuardTimer);
      this.cleanupOutsideClickGuard?.();
      this.cleanupKeyboardDetection?.();
    } finally {
      this.cleanupOutsideClickGuard = null;
      this.outsideClickGuardTimer = null;
      this.cleanupKeyboardDetection = null;
      this.outsideClickCloseEnabled = false;
      this.hasUnsavedDraft = false;
      if (QuickInputModal.activeModal === this) {
        QuickInputModal.activeModal = null;
      }
    }
    unmountPreact(this.contentEl);
  }
}
