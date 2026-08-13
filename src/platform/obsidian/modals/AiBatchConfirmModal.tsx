// src/platform/obsidian/modals/AiBatchConfirmModal.tsx
/**
 * AiBatchConfirmModal
 * - openAndGetResult(): Promise<boolean>
 * - 关闭（X/遮罩/Esc）也会 resolve(false)，避免 Promise 悬挂
 */
/** @jsxImportSource preact */
import { h } from 'preact';
import type { App } from 'obsidian';
import { Modal, Notice } from 'obsidian';
import { useState } from 'preact/hooks';

import { type Services, createServices, mountWithServices, unmountPreact, useUseCases, useSelector, selectSettings, resolveVaultResourcePath } from '@/app/public';
import type { NaturalRecordCommand } from '@core/types/public';
import type { RecordSubmitResult } from '@core/recordInput/public';
import { readRecordSubmitMessage } from '@core/utils/public';

import { QuickInputEditor } from '@/app/public';

import { AiBatchConfirmFooter } from './AiBatchConfirmFooter';
import {
  type AiBatchConfirmRecordItem,
  buildAiBatchConfirmBatchSummary,
  buildAiBatchConfirmCreateSubmitParams,
  buildAiBatchConfirmRecordContext,
  buildAiBatchConfirmRecordItems,
  findNextPendingAiBatchConfirmIndex,
  patchAiBatchConfirmRecordAtIndex,
  summarizeAiBatchConfirmRecords,
} from './AiBatchConfirmModel';
import { AiBatchConfirmRecordHeader } from './AiBatchConfirmRecordHeader';
import { AiBatchConfirmSidebar } from './AiBatchConfirmSidebar';
import { installBackdropCloseGuard } from './modalBackdropGuard';
import { prepareThinkModal } from './modalPreact';

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
      confirmText?: string;
      cancelText?: string;
    }
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
        confirmText={this.args.confirmText}
        cancelText={this.args.cancelText}
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
      this.services
    );
  }

  onClose() {
    this.cleanupBackdropCloseGuard?.();
    this.cleanupBackdropCloseGuard = null;
    // 用户直接关闭（点击遮罩/右上角/ESC）也必须 resolve(false)
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
  items: initialItems,
  closeModal,
  onComplete,
}: {
  resolveResourcePath: (path: string) => string;
  title: string;
  confirmText?: string;
  cancelText?: string;
  items: NaturalRecordCommand[];
  closeModal: () => void;
  onComplete?: () => void;
}) {
  const fullSettings = useSelector(selectSettings);
  const settings = fullSettings.inputSettings;
  const goalSettings = fullSettings.goalSettings;
  const useCases = useUseCases();
  const blocks = settings.blocks || [];
  const [records, setRecords] = useState<AiBatchConfirmRecordItem[]>(() =>
    buildAiBatchConfirmRecordItems({
      items: initialItems,
      blocks,
      themes: settings.themes || [],
      goalSettings,
      inputSettings: settings,
    })
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentRecord = records[currentIndex];
  const summary = summarizeAiBatchConfirmRecords(records);

  const updateCurrentRecord = (updates: Partial<AiBatchConfirmRecordItem>) => {
    setRecords((prev) => patchAiBatchConfirmRecordAtIndex(prev, currentIndex, updates));
  };

  const jumpToNextPending = (nextRecords = records) => {
    const nextPending = findNextPendingAiBatchConfirmIndex(nextRecords, currentIndex);
    if (nextPending >= 0) setCurrentIndex(nextPending);
  };

  const readFailureMessage = (result: RecordSubmitResult, fallback: string) => {
    return readRecordSubmitMessage(result, fallback);
  };

  const handleSaveCurrent = async () => {
    if (!currentRecord) return;

    const result = await useCases.recordInput.submitCreateRecord(buildAiBatchConfirmCreateSubmitParams(currentRecord));

    if (result.status === 'success') {
      const nextRecords = patchAiBatchConfirmRecordAtIndex(records, currentIndex, { saved: true });
      setRecords(nextRecords);
      new Notice(`✅ 第 ${currentIndex + 1} 条已保存`);
      jumpToNextPending(nextRecords);
      return;
    }

    if (result.status === 'cancelled') return;
    new Notice(`❌ 保存失败: ${readFailureMessage(result, '保存失败')}`, 10000);
  };

  const handleSkipCurrent = () => {
    if (!currentRecord) return;
    const nextRecords = patchAiBatchConfirmRecordAtIndex(records, currentIndex, { skipped: true });
    setRecords(nextRecords);
    jumpToNextPending(nextRecords);
  };

  const handleSaveAll = async () => {
    const results: RecordSubmitResult[] = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      if (record.saved || record.skipped) continue;

      setCurrentIndex(i);
      const result = await useCases.recordInput.submitCreateRecord(buildAiBatchConfirmCreateSubmitParams(record));
      results.push(result);

      if (result.status === 'success') {
        setRecords((prev) => patchAiBatchConfirmRecordAtIndex(prev, i, { saved: true }));
      } else if (result.status !== 'cancelled') {
        new Notice(`❌ 第 ${i + 1} 条保存失败: ${readFailureMessage(result, '保存失败')}`);
      }
    }

    const batchSummary = buildAiBatchConfirmBatchSummary(results);
    if (batchSummary.feedback?.notice) new Notice(batchSummary.feedback.notice);
  };

  const handleComplete = () => {
    const latestSummary = summarizeAiBatchConfirmRecords(records);
    new Notice(`完成：已保存 ${latestSummary.savedCount} 条，跳过 ${latestSummary.skippedCount} 条`);
    onComplete?.();
    closeModal();
  };

  if (!currentRecord) return <div className="think-overlay-empty">没有可处理的记录</div>;

  return (
    <div className="think-ai-batch">
      <AiBatchConfirmSidebar
        records={records}
        blocks={blocks}
        currentIndex={currentIndex}
        savedCount={summary.savedCount}
        pendingCount={summary.pendingCount}
        onSelect={setCurrentIndex}
        onSaveAll={handleSaveAll}
      />

      <section className="think-ai-batch__main">
        <AiBatchConfirmRecordHeader title={title} currentIndex={currentIndex} record={currentRecord} onClose={closeModal} />
        <div className="think-overlay-body think-ai-batch__editor">
          <QuickInputEditor
            key={currentRecord.id}
            getResourcePath={resolveResourcePath}
            initialBlockId={currentRecord.blockId}
            initialThemeId={currentRecord.themeId || null}
            initialFormData={currentRecord.formData}
            context={buildAiBatchConfirmRecordContext(currentRecord)}
            allowBlockSwitch={true}
            dense={true}
            onStateChange={(state) =>
              updateCurrentRecord({
                blockId: state.blockId,
                themeId: state.themeId || undefined,
                formData: state.formData,
              })
            }
          />
        </div>

        <AiBatchConfirmFooter
          saved={currentRecord.saved}
          skipped={currentRecord.skipped}
          onSkip={handleSkipCurrent}
          onSave={handleSaveCurrent}
          onComplete={handleComplete}
        />
      </section>
    </div>
  );
}
