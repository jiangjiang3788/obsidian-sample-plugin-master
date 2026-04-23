/** @jsxImportSource preact */
import { h } from 'preact';
import { App, Modal, Notice } from 'obsidian';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';

import {
  createServices,
  Services,
  mountWithServices,
  unmountPreact,
  useSelector,
  selectInputSettings,
  QuickInputEditor,
  type QuickInputEditorState,
  useUseCases,
} from '@/app/public';
import { makeObsUri, readRecordSubmitMessage, type Item, type QuickInputSaveData, type RecordInputSource, type RecordSubmitResult } from '@core/public';

import { Box, Button } from '@mui/material';

import { CancelledError, createTakeLatest, ModalHeader } from '@shared/public';

interface QuickInputEditOptions {
  mode?: 'create' | 'edit';
  editItem?: Item;
  source?: Extract<RecordInputSource, 'quickinput' | 'view_quick_create' | 'timer' | 'unknown'>;
  onSubmitSuccess?: (result: RecordSubmitResult, draft: QuickInputSaveData) => void | Promise<void>;
}

export class QuickInputModal extends Modal {
  private static activeModal: QuickInputModal | null = null;
  private services: Services;
  private cleanupKeyboardDetection: (() => void) | null = null;
  private cleanupBackdropCloseGuard: (() => void) | null = null;

  private isMobileLikeEnvironment() {
    if (typeof window === 'undefined') return false;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent)
      || (window.matchMedia?.('(pointer: coarse)').matches ?? false)
      || window.innerWidth <= 820;
  }

  constructor(
    app: App,
    private blockId: string,
    private context?: Record<string, any>,
    private themeId?: string,
    private onSave?: (data: QuickInputSaveData) => void,
    private allowBlockSwitch: boolean = false,
    private options?: QuickInputEditOptions,
  ) {
    super(app);
    this.services = createServices();
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
    this.contentEl.empty();
    this.modalEl.addClass('think-quick-input-modal');
    if (this.isMobileLikeEnvironment()) {
      this.modalEl.addClass('think-quick-input-modal--mobile');
      this.setupKeyboardDetection();
    } else {
      this.modalEl.addClass('think-quick-input-modal--desktop');
    }
    this.setupBackdropCloseGuard();

    mountWithServices(
      this.contentEl,
      <QuickInputModalContent
        getResourcePath={(path) => this.app.vault.adapter.getResourcePath(path)}
        initialBlockId={this.blockId}
        context={this.context}
        initialThemeId={this.themeId}
        onSave={this.onSave}
        closeModal={() => this.close()}
        allowBlockSwitch={this.allowBlockSwitch}
        mode={this.options?.mode || 'create'}
        editItem={this.options?.editItem}
        source={this.options?.source}
        vaultName={this.app.vault.getName()}
        onSubmitSuccess={this.options?.onSubmitSuccess}
      />,
      this.services,
    );
  }

  private setupBackdropCloseGuard() {
    const bgEl = (this as any).bgEl as HTMLElement | null | undefined;
    if (!bgEl) return;

    const stopBackdropClose = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    bgEl.addEventListener('pointerdown', stopBackdropClose, true);
    bgEl.addEventListener('mousedown', stopBackdropClose, true);
    bgEl.addEventListener('click', stopBackdropClose, true);
    bgEl.addEventListener('touchstart', stopBackdropClose, true);
    bgEl.addEventListener('touchend', stopBackdropClose, true);

    this.cleanupBackdropCloseGuard = () => {
      bgEl.removeEventListener('pointerdown', stopBackdropClose, true);
      bgEl.removeEventListener('mousedown', stopBackdropClose, true);
      bgEl.removeEventListener('click', stopBackdropClose, true);
      bgEl.removeEventListener('touchstart', stopBackdropClose, true);
      bgEl.removeEventListener('touchend', stopBackdropClose, true);
    };
  }

  private setupKeyboardDetection() {
    let baselineViewportHeight = window.visualViewport?.height || window.innerHeight;
    const keyboardActivationThreshold = 150;
    const suspectedBottomInset = 156;
    const detectedBottomInsetExtra = 120;

    const setKeyboardHeight = (height: number) => {
      this.modalEl.style.setProperty('--keyboard-height', `${Math.max(0, Math.round(height))}px`);
      document.documentElement.style.setProperty('--keyboard-height', `${Math.max(0, Math.round(height))}px`);
    };

    const setAccessoryInset = (height: number) => {
      this.modalEl.style.setProperty('--keyboard-accessory-inset', `${Math.max(0, Math.round(height))}px`);
    };

    const isKeyboardInput = (el: EventTarget | null): el is HTMLElement => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return true;
      return el.isContentEditable;
    };

    const hasActiveKeyboardInput = () => {
      const activeElement = document.activeElement;
      return !!activeElement && this.contentEl.contains(activeElement) && isKeyboardInput(activeElement);
    };

    const getBodyContainer = () => this.contentEl.querySelector('.think-modal__body') as HTMLElement | null;

    const ensureTargetVisible = (target?: HTMLElement | null) => {
      const activeTarget = target && this.contentEl.contains(target) ? target : (document.activeElement as HTMLElement | null);
      if (!activeTarget || !isKeyboardInput(activeTarget) || !this.contentEl.contains(activeTarget)) return;

      const container = getBodyContainer();
      if (!container) return;

      const anchor = activeTarget.closest('.think-form-row, .think-inline-field-row, .think-textarea-row') as HTMLElement | null;
      const node = anchor || activeTarget;
      const nodeRect = node.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const accessoryInset = Number.parseInt(this.modalEl.style.getPropertyValue('--keyboard-accessory-inset') || '0', 10) || suspectedBottomInset;
      const safeTop = containerRect.top + 12;
      const safeBottom = containerRect.bottom - Math.max(72, accessoryInset);

      if (nodeRect.bottom > safeBottom) {
        container.scrollTop += nodeRect.bottom - safeBottom + 28;
      } else if (nodeRect.top < safeTop) {
        container.scrollTop -= safeTop - nodeRect.top + 12;
      }

      if (activeTarget instanceof HTMLTextAreaElement) {
        const lineReserve = 44;
        const caretBottom = activeTarget.scrollHeight - activeTarget.scrollTop;
        const visibleHeight = activeTarget.clientHeight - lineReserve;
        if (caretBottom > visibleHeight) {
          activeTarget.scrollTop = Math.max(0, activeTarget.scrollHeight - visibleHeight);
        }
      }
    };

    const updateKeyboardState = (target?: HTMLElement | null) => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const heightDiff = Math.max(0, Math.round(baselineViewportHeight - viewportHeight));
      const hasFocusedInput = hasActiveKeyboardInput();
      const detected = heightDiff > keyboardActivationThreshold && hasFocusedInput;
      const suspected = hasFocusedInput;

      this.modalEl.toggleClass('keyboard-detected', detected);
      this.modalEl.toggleClass('keyboard-suspected', suspected);

      if (detected) {
        setKeyboardHeight(heightDiff);
        setAccessoryInset(heightDiff + detectedBottomInsetExtra);
        const offsetTop = window.visualViewport?.offsetTop || 0;
        this.modalEl.style.setProperty('--keyboard-offset', `${offsetTop}px`);
      } else if (suspected) {
        setKeyboardHeight(0);
        setAccessoryInset(suspectedBottomInset);
        this.modalEl.style.removeProperty('--keyboard-offset');
      } else {
        setKeyboardHeight(0);
        setAccessoryInset(0);
        this.modalEl.style.removeProperty('--keyboard-offset');
      }

      if (heightDiff <= 0 && !hasFocusedInput) {
        baselineViewportHeight = viewportHeight;
      }

      if (suspected) {
        ensureTargetVisible(target);
      }
    };

    const scheduleVisibilityPasses = (target?: HTMLElement | null) => {
      const run = () => updateKeyboardState(target);
      requestAnimationFrame(run);
      window.setTimeout(run, 120);
      window.setTimeout(run, 260);
      window.setTimeout(run, 420);
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!isKeyboardInput(target)) return;
      scheduleVisibilityPasses(target);
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (!(event.target instanceof HTMLElement)) {
        window.setTimeout(() => updateKeyboardState(document.activeElement as HTMLElement | null), 60);
        return;
      }
      if (!this.contentEl.contains(event.target)) {
        window.setTimeout(() => updateKeyboardState(document.activeElement as HTMLElement | null), 60);
        return;
      }
      window.setTimeout(() => updateKeyboardState(document.activeElement as HTMLElement | null), 60);
    };

    const handleViewportResize = () => {
      updateKeyboardState(document.activeElement as HTMLElement | null);
    };

    const handleViewportScroll = () => {
      updateKeyboardState(document.activeElement as HTMLElement | null);
    };

    const handleOrientationChange = () => {
      setTimeout(() => {
        baselineViewportHeight = window.visualViewport?.height || window.innerHeight;
        updateKeyboardState(document.activeElement as HTMLElement | null);
      }, 500);
    };

    this.contentEl.addEventListener('focusin', handleFocusIn);
    this.contentEl.addEventListener('focusout', handleFocusOut);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
      window.visualViewport.addEventListener('scroll', handleViewportScroll, { passive: true });
    } else {
      window.addEventListener('resize', handleViewportResize);
    }

    window.addEventListener('orientationchange', handleOrientationChange);
    setKeyboardHeight(0);
    setAccessoryInset(0);
    updateKeyboardState(document.activeElement as HTMLElement | null);

    this.cleanupKeyboardDetection = () => {
      this.contentEl.removeEventListener('focusin', handleFocusIn);
      this.contentEl.removeEventListener('focusout', handleFocusOut);

      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
        window.visualViewport.removeEventListener('scroll', handleViewportScroll);
      } else {
        window.removeEventListener('resize', handleViewportResize);
      }

      window.removeEventListener('orientationchange', handleOrientationChange);
      document.documentElement.style.removeProperty('--keyboard-height');
      this.modalEl.style.removeProperty('--keyboard-height');
      this.modalEl.style.removeProperty('--keyboard-accessory-inset');
      this.modalEl.style.removeProperty('--keyboard-offset');
      this.modalEl.removeClass('keyboard-detected');
      this.modalEl.removeClass('keyboard-suspected');
    };
  }

  onClose() {
    try {
      this.cleanupKeyboardDetection?.();
      this.cleanupBackdropCloseGuard?.();
    } finally {
      this.cleanupKeyboardDetection = null;
      this.cleanupBackdropCloseGuard = null;
      this.modalEl.removeClass('think-quick-input-modal--mobile');
      this.modalEl.removeClass('think-quick-input-modal--desktop');
      if (QuickInputModal.activeModal === this) {
        QuickInputModal.activeModal = null;
      }
    }
    unmountPreact(this.contentEl);
  }
}

function buildEditTitle(item: Item, resolvedBy?: 'exact' | 'inferred' | 'fallback'): string {
  const titleBase = item.type === 'task'
    ? (item.title || '编辑任务')
    : (item.content || item.title || '编辑记录');
  const titlePrefix = resolvedBy === 'inferred'
    ? '推断模板 · '
    : resolvedBy === 'fallback'
      ? '兜底模板 · '
      : '';
  return `${titlePrefix}${titleBase}`;
}

function QuickInputModalContent({
  getResourcePath,
  initialBlockId,
  context,
  initialThemeId,
  onSave,
  closeModal,
  allowBlockSwitch,
  mode,
  editItem,
  source,
  vaultName,
  onSubmitSuccess,
}: {
  getResourcePath: (path: string) => string;
  initialBlockId: string;
  context?: Record<string, any>;
  initialThemeId?: string;
  onSave?: (data: QuickInputSaveData) => void;
  closeModal: () => void;
  allowBlockSwitch: boolean;
  mode: 'create' | 'edit';
  editItem?: Item;
  source?: Extract<RecordInputSource, 'quickinput' | 'view_quick_create' | 'timer' | 'unknown'>;
  vaultName: string;
  onSubmitSuccess?: (result: RecordSubmitResult, draft: QuickInputSaveData) => void | Promise<void>;
}) {
  const settings = useSelector(selectInputSettings);
  const useCases = useUseCases();
  const submitLatestRef = useRef(createTakeLatest('quick-input-submit'));
  const originalTouchRef = useRef<number | null>(null);

  useEffect(() => () => submitLatestRef.current.dispose(), []);

  const preparedRecord = useMemo(() => {
    if (mode === 'edit' && editItem) {
      return useCases.recordInput.prepareEditRecord({
        item: editItem,
        blockId: initialBlockId,
        themeId: initialThemeId ?? null,
        source: 'quickinput',
      });
    }

    return useCases.recordInput.prepareCreateRecord({
      blockId: initialBlockId,
      themeId: initialThemeId ?? null,
      context,
      source: onSave ? 'timer' : (source ?? 'quickinput'),
    });
  }, [useCases, settings, initialBlockId, initialThemeId, context, mode, editItem, onSave, source]);

  const [editorState, setEditorState] = useState<QuickInputEditorState>({
    blockId: preparedRecord.blockId || initialBlockId,
    themeId: preparedRecord.themeId,
    formData: preparedRecord.initialFormData,
    meta: { timeDirection: 'forward' },
    template: null,
    theme: null,
    templateId: null,
    templateSourceType: null,
  });
  const [pendingAction, setPendingAction] = useState<'submit' | 'delete' | null>(null);
  const editorStateRef = useRef<QuickInputEditorState | null>(null);
  const isMobileLike = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent)
      || (window.matchMedia?.('(pointer: coarse)').matches ?? false)
      || window.innerWidth <= 820;
  }, []);

  const currentState = editorStateRef.current || editorState;
  const currentBlock = (settings.blocks || []).find((block: any) => block.id === currentState.blockId);
  const currentBlockName = currentBlock?.name || editorState.template?.name || editorState.blockId;
  const originalUri = mode === 'edit' && editItem ? makeObsUri(editItem, vaultName) : '';
  const isBusy = pendingAction !== null;
  const isTimerCreate = mode === 'create' && (source === 'timer' || !!onSave);
  const originalGestureHint = originalUri && !originalUri.startsWith('#error')
    ? '桌面端按住 Ctrl/⌘ 点击标题或说明；手机端双击标题或说明，可打开原文'
    : undefined;

  const openOriginal = () => {
    if (!originalUri || originalUri.startsWith('#error')) {
      new Notice('❌ 找不到原文位置');
      return;
    }
    window.open(originalUri, '_blank');
  };

  const handleOriginalPointerClick = (event: MouseEvent) => {
    if (!originalGestureHint) return;
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    event.stopPropagation();
    openOriginal();
  };

  const handleOriginalTouchEnd = (event: TouchEvent) => {
    if (!originalGestureHint) return;
    const now = Date.now();
    const previous = originalTouchRef.current;
    originalTouchRef.current = now;

    if (previous && now - previous <= 350) {
      originalTouchRef.current = null;
      event.preventDefault();
      event.stopPropagation();
      openOriginal();
    }
  };

  const showResult = (message: string, type: 'success' | 'error' = 'error') => {
    const prefix = type === 'success' ? '' : '❌ ';
    new Notice(`${prefix}${message}`, type === 'success' ? 4000 : 10000);
  };

  const buildCreateDraft = (): QuickInputSaveData => ({
    blockId: currentState.blockId,
    themeId: currentState.themeId ?? null,
    formData: currentState.formData,
    context,
    meta: currentState.meta,
    source: source ?? (onSave ? 'timer' : 'quickinput'),
  });

  const handleEditorStateChange = useCallback((state: QuickInputEditorState) => {
    editorStateRef.current = state;
    setEditorState(state);
  }, []);

  const handleSubmit = async () => {
    
    if (onSave && mode === 'create') {
      onSave(buildCreateDraft());
      closeModal();
      return;
    }

    setPendingAction('submit');
    try {
      const result = await submitLatestRef.current.run(async (signal) => {
        const latestState = editorStateRef.current || editorState;
        if (mode === 'edit' && editItem) {
          return await useCases.recordInput.submitUpdateRecord({
            item: editItem,
            blockId: latestState.blockId,
            themeId: latestState.themeId,
            formData: latestState.formData,
            meta: latestState.meta,
            signal,
            source: 'quickinput',
          });
        }

        return await useCases.recordInput.submitCreateRecord({
          blockId: latestState.blockId,
          themeId: latestState.themeId,
          formData: latestState.formData,
          context,
          meta: latestState.meta,
          signal,
          source: source ?? 'quickinput',
        });
      });

      if (result.status === 'success') {
        const shouldShowOwnSuccessNotice = !(mode === 'create' && source === 'timer' && onSubmitSuccess);
        if (result.feedback?.notice && shouldShowOwnSuccessNotice) {
          showResult(result.feedback.notice, 'success');
        }
        if (mode === 'create' && onSubmitSuccess) {
          try {
            await onSubmitSuccess(result, buildCreateDraft());
          } catch (followUpError: any) {
            showResult(followUpError?.message || '记录已创建，但后续操作失败');
          }
        }
        closeModal();
        return;
      }

      if (result.status === 'cancelled') {
        return;
      }

      showResult(readRecordSubmitMessage(result, mode === 'edit' ? '保存修改失败' : '创建失败'));
    } catch (error: any) {
      if (!(error instanceof CancelledError)) {
        showResult(error?.message || (mode === 'edit' ? '保存修改失败' : '创建失败'));
      }
    } finally {
      setPendingAction(null);
      submitTriggeredRef.current = false;
    }
  };

  const preserveDesktopInputFocus = (event: MouseEvent | PointerEvent) => {
    if (isMobileLike) return;
    event.preventDefault();
  };

  const submitTriggeredRef = useRef(false);

  const handleSubmitPointerDown = (event: MouseEvent | PointerEvent) => {
    if (isMobileLike) return;
    event.preventDefault();
    event.stopPropagation();
    if (submitTriggeredRef.current || isBusy) return;
    submitTriggeredRef.current = true;
    void handleSubmit().finally(() => {
      window.setTimeout(() => {
        submitTriggeredRef.current = false;
      }, 80);
    });
  };

  const handleDelete = async () => {
    if (mode !== 'edit' || !editItem) return;
    if (!window.confirm('确认删除这条记录吗？')) return;

    setPendingAction('delete');
    try {
      const result = await submitLatestRef.current.run((signal) => useCases.recordInput.submitDeleteRecord({
        item: editItem,
        signal,
        source: 'quickinput',
      }));

      if (result.status === 'success') {
        if (result.feedback?.notice) {
          showResult(result.feedback.notice, 'success');
        }
        closeModal();
        return;
      }

      if (result.status === 'cancelled') {
        return;
      }

      showResult(readRecordSubmitMessage(result, '删除失败'));
    } catch (error: any) {
      if (!(error instanceof CancelledError)) {
        showResult(error?.message || '删除失败');
      }
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div class="think-modal think-modal--quick-input" style={{ padding: '0 0.9rem 0.9rem 0.9rem', display: 'flex', flexDirection: 'column', minHeight: 0, maxHeight: 'calc(100dvh - 24px)', gap: '0.25rem' }}>
      <Box sx={{ mb: '0.75rem' }}>
        <ModalHeader
          left={
            <h3
              style={{ margin: 0 }}
              title={originalGestureHint}
              onClick={mode === 'edit' ? (handleOriginalPointerClick as any) : undefined}
              onTouchEnd={mode === 'edit' ? (handleOriginalTouchEnd as any) : undefined}
            >
              {mode === 'edit' ? `编辑记录 · ${currentBlockName}` : (isTimerCreate ? `开始新任务 · ${currentBlockName}` : `快速录入 · ${currentBlockName}`)}
            </h3>
          }
          onClose={closeModal}
          padding={0}
          borderBottom={false}
        />
      </Box>

      <div class="think-modal__body" style={{ paddingBottom: isMobileLike ? '96px' : undefined }}>
      <QuickInputEditor
        getResourcePath={getResourcePath}
        initialBlockId={preparedRecord.blockId || initialBlockId}
        initialThemeId={preparedRecord.themeId}
        initialFormData={preparedRecord.initialFormData}
        context={mode === 'edit' ? undefined : context}
        allowBlockSwitch={mode === 'edit' ? false : allowBlockSwitch}
        onStateChange={handleEditorStateChange}
        onRequestSubmit={handleSubmit}
        isMobileLike={isMobileLike}
      />
      </div>

      <div class="think-modal__footer think-modal__footer--quick-input" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.9rem', gap: '8px', position: isMobileLike ? 'sticky' : 'static', bottom: 0, background: 'var(--background-primary)', paddingBottom: isMobileLike ? 'calc(env(safe-area-inset-bottom, 0px) + 8px)' : undefined, zIndex: isMobileLike ? 3 : undefined }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%' }}>
          <div>
            {mode === 'edit' ? (
              <Button color="error" onMouseDown={preserveDesktopInputFocus as any} onPointerDown={preserveDesktopInputFocus as any} onClick={handleDelete} disabled={isBusy}>
                {pendingAction === 'delete' ? '删除中...' : '删除'}
              </Button>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button onMouseDown={preserveDesktopInputFocus as any} onPointerDown={preserveDesktopInputFocus as any} onClick={closeModal} disabled={isBusy}>取消</Button>
            <Button data-submit="true" onMouseDown={handleSubmitPointerDown as any} onPointerDown={handleSubmitPointerDown as any} onClick={isMobileLike ? handleSubmit : undefined} variant="contained" disabled={isBusy}>
              {pendingAction === 'submit'
                ? (mode === 'edit' ? '保存中...' : '创建中...')
                : (mode === 'edit' ? '保存修改' : '创建')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
