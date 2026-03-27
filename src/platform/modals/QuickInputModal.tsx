/** @jsxImportSource preact */
import { h } from 'preact';
import { App, Modal, Notice } from 'obsidian';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

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
    this.setupKeyboardDetection();

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

  private setupKeyboardDetection() {
    let initialViewportHeight = window.innerHeight;
    let keyboardHeight = 300;

    const setKeyboardHeight = (height: number) => {
      keyboardHeight = height;
      this.modalEl.style.setProperty('--keyboard-height', `${height}px`);
      document.documentElement.style.setProperty('--keyboard-height', `${height}px`);
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        this.modalEl.addClass('keyboard-active');
        setTimeout(() => {
          const container = this.contentEl.querySelector('.think-modal__body') as HTMLElement | null;
          const anchor = target.closest('.think-form-row, .think-inline-field-row, .think-textarea-row') as HTMLElement | null;
          (anchor || target).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
          if (container && anchor) {
            const anchorRect = anchor.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            if (anchorRect.bottom > containerRect.bottom - 16) {
              container.scrollTop += anchorRect.bottom - containerRect.bottom + 24;
            }
          }
        }, 180);
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setTimeout(() => {
          this.modalEl.removeClass('keyboard-active');
        }, 100);
      }
    };

    const handleResize = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const heightDiff = initialViewportHeight - currentHeight;

      if (heightDiff > 150) {
        this.modalEl.addClass('keyboard-active');
        setKeyboardHeight(heightDiff);
        const modalContent = this.contentEl.querySelector('.modal-content, .think-modal') as HTMLElement;
        if (modalContent) {
          modalContent.style.paddingBottom = `calc(${heightDiff}px + env(safe-area-inset-bottom, 0px) + 24px)`;
        }
      } else {
        this.modalEl.removeClass('keyboard-active');
        setKeyboardHeight(300);
        const modalContent = this.contentEl.querySelector('.think-modal__body') as HTMLElement | null;
        if (modalContent) modalContent.style.removeProperty('padding-bottom');
      }
    };

    const handleVisualViewportResize = () => {
      if (window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const heightDiff = initialViewportHeight - viewportHeight;

        if (heightDiff > 150) {
          this.modalEl.addClass('keyboard-active');
          setKeyboardHeight(heightDiff);
          const offsetTop = window.visualViewport.offsetTop || 0;
          this.modalEl.style.setProperty('--keyboard-offset', `${offsetTop}px`);
        } else {
          this.modalEl.removeClass('keyboard-active');
          setKeyboardHeight(300);
          const modalContent = this.contentEl.querySelector('.think-modal__body') as HTMLElement | null;
          if (modalContent) modalContent.style.removeProperty('padding-bottom');
        }
      }
    };

    this.contentEl.addEventListener('focusin', handleFocusIn);
    this.contentEl.addEventListener('focusout', handleFocusOut);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportResize);
    } else {
      window.addEventListener('resize', handleResize);
    }

    const handleOrientationChange = () => {
      setTimeout(() => {
        initialViewportHeight = window.innerHeight;
        setKeyboardHeight(300);
      }, 500);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    setKeyboardHeight(300);

    this.cleanupKeyboardDetection = () => {
      this.contentEl.removeEventListener('focusin', handleFocusIn);
      this.contentEl.removeEventListener('focusout', handleFocusOut);

      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }

      window.removeEventListener('orientationchange', handleOrientationChange);
      document.documentElement.style.removeProperty('--keyboard-height');
      this.modalEl.style.removeProperty('--keyboard-height');
      this.modalEl.style.removeProperty('--keyboard-offset');
    };
  }

  onClose() {
    try {
      this.cleanupKeyboardDetection?.();
    } finally {
      this.cleanupKeyboardDetection = null;
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
    template: null,
    theme: null,
    templateId: null,
    templateSourceType: null,
  });
  const [pendingAction, setPendingAction] = useState<'submit' | 'delete' | null>(null);

  const currentBlock = (settings.blocks || []).find((block: any) => block.id === editorState.blockId);
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
    blockId: editorState.blockId,
    themeId: editorState.themeId ?? null,
    formData: editorState.formData,
    context,
    source: source ?? (onSave ? 'timer' : 'quickinput'),
  });

  const handleSubmit = async () => {
    if (onSave && mode === 'create') {
      onSave(buildCreateDraft());
      closeModal();
      return;
    }

    setPendingAction('submit');
    try {
      const result = await submitLatestRef.current.run(async (signal) => {
        if (mode === 'edit' && editItem) {
          return await useCases.recordInput.submitUpdateRecord({
            item: editItem,
            blockId: editorState.blockId,
            themeId: editorState.themeId,
            formData: editorState.formData,
            signal,
            source: 'quickinput',
          });
        }

        return await useCases.recordInput.submitCreateRecord({
          blockId: editorState.blockId,
          themeId: editorState.themeId,
          formData: editorState.formData,
          context,
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
    }
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

      <div class="think-modal__body">
      <QuickInputEditor
        getResourcePath={getResourcePath}
        initialBlockId={preparedRecord.blockId || initialBlockId}
        initialThemeId={preparedRecord.themeId}
        initialFormData={preparedRecord.initialFormData}
        context={mode === 'edit' ? undefined : context}
        allowBlockSwitch={mode === 'edit' ? false : allowBlockSwitch}
        onStateChange={setEditorState}
      />
      </div>

      <div class="think-modal__footer think-modal__footer--quick-input" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.9rem', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%' }}>
          <div>
            {mode === 'edit' ? (
              <Button color="error" onClick={handleDelete} disabled={isBusy}>
                {pendingAction === 'delete' ? '删除中...' : '删除'}
              </Button>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button onClick={closeModal} disabled={isBusy}>取消</Button>
            <Button onClick={handleSubmit} variant="contained" disabled={isBusy}>
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
