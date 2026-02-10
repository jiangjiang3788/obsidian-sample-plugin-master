// src/platform/modals/AiBatchConfirmModal.tsx
/**
 * AiBatchConfirmModal
 * - openAndGetResult(): Promise<boolean>
 * - 关闭（X/遮罩/Esc）也会 resolve(false)，避免 Promise 悬挂
 */
/** @jsxImportSource preact */
import { h } from 'preact';
import type { App } from 'obsidian';
import { Modal, Notice } from 'obsidian';
import { useMemo, useState } from 'preact/hooks';

import {
  type Services,
  createServices,
  mountWithServices,
  unmountPreact,
  useDataStore,
  useInputService,
  useZustandAppStore,
} from '@/app/public';
import type { NaturalRecordCommand, ThemeDefinition } from '@core/public';
import { getEffectiveTemplate } from '@core/public';

import {
  Box,
  Button,
  Chip,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import DeleteIcon from '@mui/icons-material/Delete';

import { finalizeQuickInputFormData, QuickInputEditor } from '@/app/public';
import { ModalHeader } from '@shared/public';

interface RecordItem {
  id: string;
  cmd: NaturalRecordCommand;
  blockId: string;
  themeId?: string;
  formData: Record<string, any>;
  saved: boolean;
  skipped: boolean;
}

export class AiBatchConfirmModal extends Modal {
  private services: Services;
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
    this.contentEl.empty();
    this.modalEl.addClass('think-ai-batch-confirm-modal');
    this.modalEl.style.width = '90vw';
    this.modalEl.style.maxWidth = '900px';
    this.modalEl.style.height = '80vh';

    mountWithServices(
      this.contentEl,
      <AiBatchConfirmForm
        app={this.app}
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
    // 用户直接关闭（点击遮罩/右上角/ESC）也必须 resolve(false)
    if (!this.resolved && this.resolvePromise) {
      this.resolvePromise(false);
      this.resolvePromise = null;
    }
    unmountPreact(this.contentEl);
  }
}
function AiBatchConfirmForm({
  app,
  title,
  confirmText,
  cancelText,
  items: initialItems,
  closeModal,
  onComplete,
}: {
  app: App;
  title: string;
  confirmText?: string;
  cancelText?: string;
  items: NaturalRecordCommand[];
  closeModal: () => void;
  onComplete?: () => void;
}) {
  const settings = useZustandAppStore((state) => state.settings.inputSettings);
  const dataStore = useDataStore();
  const inputService = useInputService();

  const blocks = settings.blocks || [];
  const themes = settings.themes || [];
  const themeIdMap = useMemo(() => new Map<string, ThemeDefinition>(themes.map((t) => [t.id, t])), [themes]);

  const [records, setRecords] = useState<RecordItem[]>(() =>
    initialItems.map((cmd, index) => {
      // block
      let block = blocks.find((b) => b.id === cmd.target.blockId);
      if (!block) block = blocks.find((b) => b.name === cmd.target.blockId);
      if (!block && blocks.length > 0) block = blocks[0];

      // theme
      let themeId: string | undefined;
      if (cmd.target.themeId) {
        const theme = themes.find((t) => t.id === cmd.target.themeId || t.path === cmd.target.themeId);
        if (theme) themeId = theme.id;
      }
      if (!themeId && themes.length > 0) themeId = themes[0].id;

      return {
        id: `record-${index}`,
        cmd,
        blockId: block?.id || '',
        themeId,
        formData: { ...(cmd.fieldValues || {}) },
        saved: false,
        skipped: false,
      };
    })
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentRecord = records[currentIndex];

  const updateCurrentRecord = (updates: Partial<RecordItem>) => {
    setRecords((prev) => prev.map((r, i) => (i === currentIndex ? { ...r, ...updates } : r)));
  };

  const jumpToNextPending = () => {
    const nextPending = records.findIndex((r, i) => i > currentIndex && !r.saved && !r.skipped);
    if (nextPending >= 0) setCurrentIndex(nextPending);
  };

  const handleSaveCurrent = async () => {
    if (!currentRecord) return;
    if (!inputService) {
      new Notice('保存失败：InputService 未初始化');
      return;
    }

    const { template } = getEffectiveTemplate(settings, currentRecord.blockId, currentRecord.themeId);
    if (!template) {
      new Notice('保存失败：找不到模板');
      return;
    }

    const finalData = finalizeQuickInputFormData(currentRecord.formData);
    const finalTheme = currentRecord.themeId ? themeIdMap.get(currentRecord.themeId) : undefined;

    try {
      await inputService.executeTemplate(template, finalData, finalTheme);
      updateCurrentRecord({ saved: true });
      new Notice(`✅ 第 ${currentIndex + 1} 条已保存`);
      dataStore?.notifyChange?.();
      jumpToNextPending();
    } catch (e: any) {
      new Notice(`❌ 保存失败: ${e.message || e}`, 10000);
    }
  };

  const handleSkipCurrent = () => {
    if (!currentRecord) return;
    updateCurrentRecord({ skipped: true });
    jumpToNextPending();
  };

  const handleSaveAll = async () => {
    if (!inputService) {
      new Notice('保存失败：InputService 未初始化');
      return;
    }

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      if (record.saved || record.skipped) continue;

      setCurrentIndex(i);

      const { template } = getEffectiveTemplate(settings, record.blockId, record.themeId);
      if (!template) continue;

      const finalData = finalizeQuickInputFormData(record.formData);
      const finalTheme = record.themeId ? themeIdMap.get(record.themeId) : undefined;

      try {
        await inputService.executeTemplate(template, finalData, finalTheme);
        setRecords((prev) => prev.map((r, idx) => (idx === i ? { ...r, saved: true } : r)));
      } catch (e: any) {
        new Notice(`❌ 第 ${i + 1} 条保存失败: ${e.message || e}`);
      }
    }

    new Notice('✅ 批量保存完成');
    dataStore?.notifyChange?.();
  };

  const handleComplete = () => {
    const savedCount = records.filter((r) => r.saved).length;
    const skippedCount = records.filter((r) => r.skipped).length;
    new Notice(`完成：已保存 ${savedCount} 条，跳过 ${skippedCount} 条`);
    onComplete?.();
    closeModal();
  };

  const savedCount = records.filter((r) => r.saved).length;
  const skippedCount = records.filter((r) => r.skipped).length;
  const pendingCount = records.length - savedCount - skippedCount;

  if (!currentRecord) {
    return <div>没有可处理的记录</div>;
  }

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* 左侧：记录列表 */}
      <Box
        sx={{
          width: '200px',
          borderRight: '1px solid var(--background-modifier-border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <Box sx={{ p: 1.5, borderBottom: '1px solid var(--background-modifier-border)' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            AI 识别结果
          </Typography>
          <Typography variant="caption" color="text.secondary">
            共 {records.length} 条 · 已保存 {savedCount}
          </Typography>
        </Box>
        <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
          {records.map((record, index) => {
            const block = blocks.find((b) => b.id === record.blockId);
            const isActive = index === currentIndex;
            return (
              <ListItemButton
                key={record.id}
                selected={isActive}
                onClick={() => setCurrentIndex(index)}
                sx={{ py: 1, opacity: record.skipped ? 0.5 : 1, bgcolor: isActive ? 'action.selected' : 'transparent' }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {record.saved ? (
                    <CheckCircleIcon color="success" fontSize="small" />
                  ) : record.skipped ? (
                    <DeleteIcon color="disabled" fontSize="small" />
                  ) : (
                    <RadioButtonUncheckedIcon color="action" fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" noWrap sx={{ fontWeight: isActive ? 600 : 400 }}>
                      {block?.name || '未知类型'}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" noWrap color="text.secondary">
                      {record.cmd.fieldValues?.内容?.slice(0, 20) || record.cmd.rawText?.slice(0, 20) || `记录 ${index + 1}`}
                    </Typography>
                  }
                />
              </ListItemButton>
            );
          })}
        </List>
        <Box sx={{ p: 1.5, borderTop: '1px solid var(--background-modifier-border)' }}>
          <Button fullWidth variant="outlined" size="small" onClick={handleSaveAll} disabled={pendingCount === 0}>
            保存全部 ({pendingCount})
          </Button>
        </Box>
      </Box>

      {/* 右侧：编辑区域 */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 头部 */}
        <ModalHeader
          padding={2}
          left={
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {title} · 编辑第 {currentIndex + 1} 条记录
              </Typography>
              {currentRecord.saved && <Chip label="已保存" color="success" size="small" sx={{ ml: 1 }} />}
              {currentRecord.skipped && <Chip label="已跳过" color="default" size="small" sx={{ ml: 1 }} />}
            </Box>
          }
          onClose={closeModal}
        />

        {/* 内容区域：复用 QuickInputEditor */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <QuickInputEditor
            key={currentRecord.id}
            app={app}
            initialBlockId={currentRecord.blockId}
            initialThemeId={currentRecord.themeId || null}
            initialFormData={currentRecord.formData}
            context={{ ...(currentRecord.cmd.fieldValues || {}), ...(currentRecord.formData || {}) }}
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
        </Box>

        {/* 底部操作栏 */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid var(--background-modifier-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Button variant="text" color="inherit" onClick={handleSkipCurrent} disabled={currentRecord.saved || currentRecord.skipped}>
            跳过此条
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" onClick={handleSaveCurrent} disabled={currentRecord.saved}>
              {currentRecord.saved ? '已保存' : '保存此条'}
            </Button>
            <Button variant="outlined" onClick={handleComplete}>
              完成
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
