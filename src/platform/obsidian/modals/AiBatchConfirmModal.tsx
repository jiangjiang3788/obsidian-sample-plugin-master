/** @jsxImportSource preact */
import { h } from 'preact';
import type { App } from 'obsidian';
import { Modal } from 'obsidian';
import { useMemo } from 'preact/hooks';

import {
  type Services,
  QuickInputEditor,
  createServices,
  mountWithServices,
  resolveVaultResourcePath,
  selectSettings,
  unmountPreact,
  useSelector,
  useUseCases,
} from '@/app/public';
import { buildRecordTypeInputSettings } from '@core/recordTypes/public';
import type { NaturalRecordCommand } from '@core/types/public';
import { isMobileLikeEnvironment } from '@features/quickinput/modal/quickInputEnvironment';

import { AiBatchConfirmFooter } from './AiBatchConfirmFooter';
import { buildAiBatchConfirmRecordItems } from './AiBatchConfirmModel';
import { AiBatchConfirmRecordHeader } from './AiBatchConfirmRecordHeader';
import { AiBatchConfirmSidebar } from './AiBatchConfirmSidebar';
import { installBackdropCloseGuard } from './modalBackdropGuard';
import { prepareThinkModal } from './modalPreact';
import { useAiBatchConfirmActions } from './useAiBatchConfirmActions';

export class AiBatchConfirmModal extends Modal {
  private services: Services;
  private cleanupBackdropCloseGuard: (() => void) | null = null;
  private resolvePromise: ((value: boolean) => void) | null = null;
  private resolved = false;

  constructor(
    app: App,
    private args: {
      title: string;
      items: NaturalRecordCommand[];
      traceId?: string;
      confirmText?: string;
      cancelText?: string;
    },
  ) {
    super(app);
    this.services = createServices();
  }

  openAndGetResult(): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.open();
    });
  }

  onOpen() {
    prepareThinkModal(this, 'think-modal-host--large', 'think-ai-batch-confirm-modal');
    this.cleanupBackdropCloseGuard = installBackdropCloseGuard(this);

    mountWithServices(
      this.contentEl,
      <AiBatchConfirmForm
        resolveResourcePath={(path) => resolveVaultResourcePath(this.app, path)}
        title={this.args.title}
        traceId={this.args.traceId}
        items={this.args.items}
        closeModal={() => this.close()}
        onComplete={() => {
          this.resolved = true;
          if (this.resolvePromise) {
            this.resolvePromise(true);
            this.resolvePromise = null;
          }
        }}
      />,
      this.services,
    );
  }

  onClose() {
    this.cleanupBackdropCloseGuard?.();
    this.cleanupBackdropCloseGuard = null;
    if (!this.resolved && this.resolvePromise) {
      this.resolvePromise(false);
      this.resolvePromise = null;
    }
    unmountPreact(this.contentEl);
  }
}

function AiBatchConfirmForm({
  resolveResourcePath,
  title,
  traceId,
  items: initialItems,
  closeModal,
  onComplete,
}: {
  resolveResourcePath: (path: string) => string;
  title: string;
  traceId?: string;
  items: NaturalRecordCommand[];
  closeModal: () => void;
  onComplete?: () => void;
}) {
  const fullSettings = useSelector(selectSettings);
  const settings = buildRecordTypeInputSettings();
  const goalSettings = fullSettings.goalSettings;
  const useCases = useUseCases();
  const recordTypes = settings.recordTypes || [];
  const isMobileLike = useMemo(() => isMobileLikeEnvironment(), []);
  const initialRecords = useMemo(
    () => buildAiBatchConfirmRecordItems({
      items: initialItems,
      recordTypes,
      goalSettings,
      inputSettings: settings,
    }),
    [initialItems, recordTypes, goalSettings, settings],
  );

  const {
    records,
    currentIndex,
    currentRecord,
    summary,
    pendingAction,
    isBusy,
    actionStatus,
    setCurrentIndex,
    handleEditorStateChange,
    handleSaveCurrent,
    handleSkipCurrent,
    handleSaveAll,
    handleComplete,
  } = useAiBatchConfirmActions({
    initialRecords,
    traceId,
    submitCreateRecord: (params) => useCases.recordInput.submitCreateRecord(params),
    closeModal,
    onComplete,
  });

  if (!currentRecord) return <div className="think-overlay-empty">没有可处理的记录</div>;

  return (
    <div className="think-ai-batch" data-ai-batch-busy={isBusy ? 'true' : 'false'}>
      <AiBatchConfirmSidebar
        records={records}
        recordTypes={recordTypes}
        currentIndex={currentIndex}
        savedCount={summary.savedCount}
        pendingCount={summary.pendingCount}
        isBusy={isBusy}
        isSavingAll={pendingAction === 'all'}
        onSelect={setCurrentIndex}
        onSaveAll={() => { void handleSaveAll(); }}
      />

      <section className="think-ai-batch__main">
        <AiBatchConfirmRecordHeader
          title={title}
          currentIndex={currentIndex}
          record={currentRecord}
          onClose={() => { if (!isBusy) closeModal(); }}
        />
        <div
          className={`think-overlay-body think-ai-batch__editor${isBusy ? ' is-busy' : ''}${currentRecord.saved || currentRecord.skipped ? ' is-locked' : ''}`}
          aria-busy={isBusy || undefined}
          aria-disabled={currentRecord.saved || currentRecord.skipped || undefined}
        >
          <QuickInputEditor
            key={currentRecord.id}
            getResourcePath={resolveResourcePath}
            initialRecordTypeId={currentRecord.recordTypeId}
            initialFormData={currentRecord.formData}
            context={currentRecord.editorContext}
            allowRecordTypeSwitch={true}
            dense={true}
            isMobileLike={isMobileLike}
            onRequestSubmit={() => { void handleSaveCurrent(); }}
            onStateChange={(state) => handleEditorStateChange(currentRecord.id, state)}
          />
        </div>

        <AiBatchConfirmFooter
          saved={currentRecord.saved}
          skipped={currentRecord.skipped}
          isBusy={isBusy}
          isSavingCurrent={pendingAction === 'current'}
          actionStatus={actionStatus}
          onSkip={handleSkipCurrent}
          onSave={() => { void handleSaveCurrent(); }}
          onComplete={handleComplete}
        />
      </section>
    </div>
  );
}
