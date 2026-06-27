/** @jsxImportSource preact */
import { h } from 'preact';
import { App, Modal } from 'obsidian';
import { useCallback, useMemo, useRef, useState } from 'preact/hooks';

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
  useDataStore,
  getVaultName,
  resolveVaultResourcePath,
} from '@/app/public';
import { type Item, type QuickInputSaveData, type RecordInputSource, type RecordSubmitResult } from '@core/public';
import { setupQuickInputKeyboardDetection } from './quickInputKeyboard';
import { isMobileLikeEnvironment } from './quickInputEnvironment';
import { useQuickInputOriginalNavigation } from './quickInputOriginalLink';
import { QuickInputModalFooter } from './QuickInputModalFooter';
import { QuickInputModalHeader } from './QuickInputModalHeader';
import { useQuickInputOutputPlanPreview } from './useQuickInputOutputPlanPreview';
import { useQuickInputSubmitController } from './useQuickInputSubmit';
import { QuickInputConflictRecoveryPanel } from './QuickInputConflictRecoveryPanel';
import { showQuickInputNotice } from './quickInputNotice';

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
  private cleanupOutsideClickGuard: (() => void) | null = null;

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
    this.contentEl.empty();
    this.modalEl.addClass('think-os');
    this.modalEl.addClass('think-os--modal');
    this.modalEl.addClass('think-modal-host');
    this.modalEl.addClass('think-quick-input-modal');
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
  const dataStore = useDataStore();

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
  }, [useCases, initialBlockId, initialThemeId, context, mode, editItem, onSave, source]);

  const [isRescanningRecoveryPaths, setIsRescanningRecoveryPaths] = useState(false);
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
  const editorStateRef = useRef<QuickInputEditorState | null>(null);
  const isMobileLike = useMemo(() => isMobileLikeEnvironment(), []);

  const currentState = editorStateRef.current || editorState;
  const currentBlock = (settings.blocks || []).find((block: any) => block.id === currentState.blockId);
  const currentBlockName = currentBlock?.name || currentState.template?.name || currentState.blockId;
  const isTimerCreate = mode === 'create' && (source === 'timer' || !!onSave);
  const {
    liveOutputPlan,
    livePersistencePlan,
    outputPlanHint,
    pathChangeHint,
  } = useQuickInputOutputPlanPreview({ currentState, preparedRecord, editItem, mode });

  const {
    originalGestureHint,
    openOriginal,
    handleOriginalPointerClick,
    handleOriginalTouchEnd,
  } = useQuickInputOriginalNavigation({ mode, editItem, vaultName });

  const getCurrentState = useCallback(() => editorStateRef.current || editorState, [editorState]);

  const {
    pendingAction,
    isBusy,
    handleSubmit,
    handleDelete,
    handleSubmitPointerDown,
    preserveDesktopInputFocus,
    recovery,
    clearRecovery,
  } = useQuickInputSubmitController({
    mode,
    editItem,
    context,
    source,
    onSave,
    onSubmitSuccess,
    closeModal,
    useCases,
    getCurrentState,
    liveOutputPlan,
    livePersistencePlan,
    isMobileLike,
  });

  const handleEditorStateChange = useCallback((state: QuickInputEditorState) => {
    editorStateRef.current = state;
    setEditorState(state);
  }, []);

  const handleRecoveryRescan = useCallback(async () => {
    if (!recovery.paths.length || isRescanningRecoveryPaths) return;
    setIsRescanningRecoveryPaths(true);
    try {
      await Promise.all(recovery.paths.map((path) => dataStore.scanFileByPath(path)));
      showQuickInputNotice(`已重新扫描 ${recovery.paths.length} 个文件，请重试保存。`, 'success');
    } catch (error: unknown) {
      showQuickInputNotice(error instanceof Error ? error.message : '重新扫描失败');
    } finally {
      setIsRescanningRecoveryPaths(false);
    }
  }, [dataStore, isRescanningRecoveryPaths, recovery.paths]);

  return (
    <div class="think-modal think-modal--quick-input" style={{ padding: '0 0.9rem 0.9rem 0.9rem', display: 'flex', flexDirection: 'column', minHeight: 0, maxHeight: 'calc(100dvh - 24px)', gap: '0.25rem' }}>
      <QuickInputModalHeader
        mode={mode}
        currentBlockName={currentBlockName}
        isTimerCreate={isTimerCreate}
        originalGestureHint={originalGestureHint}
        outputPlanHint={outputPlanHint}
        pathChangeHint={pathChangeHint}
        onClose={closeModal}
        onOriginalPointerClick={handleOriginalPointerClick}
        onOriginalTouchEnd={handleOriginalTouchEnd}
      />

      <QuickInputConflictRecoveryPanel
        recovery={recovery}
        isBusy={isBusy}
        isRescanning={isRescanningRecoveryPaths}
        onOpenOriginal={openOriginal}
        onRescan={handleRecoveryRescan}
        onRetry={handleSubmit}
        onDismiss={clearRecovery}
      />

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

      <QuickInputModalFooter
        mode={mode}
        isBusy={isBusy}
        isMobileLike={isMobileLike}
        pendingAction={pendingAction}
        onCancel={closeModal}
        onDelete={handleDelete}
        onSubmitClick={handleSubmit}
        onSubmitPointerDown={handleSubmitPointerDown}
        onPreserveDesktopInputFocus={preserveDesktopInputFocus}
      />
    </div>
  );
}
