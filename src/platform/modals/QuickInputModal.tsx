// src/shared/ui/modals/QuickInputModal.tsx
/**
 * S7.1: QuickInputModal - 快速输入模态框
 * - 使用 useZustandAppStore 读取 settings
 * - 使用 useCases 进行写入操作
 */
/** @jsxImportSource preact */
import { h } from 'preact';
import { App, Modal, Notice } from 'obsidian';
import { useMemo, useRef, useState } from 'preact/hooks';

import { createServices, Services, useDataStore, useInputService, mountWithServices, unmountPreact, useSelector, selectInputSettings } from '@/app/public';
import { makeObsUri, type Item, type QuickInputSaveData, type ThemeDefinition } from '@core/public';
import { buildPathOption, getLeafPath, normalizePath } from '@core/utils/pathSemantic';

import { Box, Button } from '@mui/material';

import { finalizeQuickInputFormData, QuickInputEditor, type QuickInputEditorState } from '@/app/public';
import { CancelledError, createTakeLatest, ModalHeader } from '@shared/public';

interface QuickInputEditOptions {
  mode?: 'create' | 'edit';
  editItem?: Item;
}

interface ResolvedEditState {
  blockId: string;
  themeId: string | null;
  initialFormData: Record<string, any>;
  title: string;
  resolvedBy: 'exact' | 'inferred' | 'fallback';
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
        vaultName={this.app.vault.getName()}
      />,
      this.services
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

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        this.modalEl.addClass('keyboard-active');
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
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
          modalContent.scrollTop = modalContent.scrollHeight;
        }
      } else {
        this.modalEl.removeClass('keyboard-active');
        setKeyboardHeight(300);
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
          if (offsetTop > 0) {
            this.modalEl.style.setProperty('--keyboard-offset', `${offsetTop}px`);
          }
        } else {
          this.modalEl.removeClass('keyboard-active');
          setKeyboardHeight(300);
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

function findThemeIdByPath(themes: ThemeDefinition[] = [], path?: string): string | null {
  if (!path) return null;
  return themes.find((t: any) => t.path === path)?.id ?? null;
}

function isOptionObject(value: any): value is { label?: any; value?: any } {
  return !!value && typeof value === 'object' && ('value' in value || 'label' in value);
}

function isPathLikeField(field: any): boolean {
  if (!field) return false;
  if (field.semanticType === 'path') return true;
  const key = String(field.key || field.label || '');
  if (key.includes('分类') || /category/i.test(key)) return true;
  return Array.isArray(field.options) && field.options.some((opt: any) => String(opt?.value || '').includes('/'));
}

function mapFieldValue(field: any, rawValue: any) {
  if (rawValue === undefined || rawValue === null || rawValue === '') return undefined;
  if (isOptionObject(rawValue)) {
    return { value: rawValue.value, label: rawValue.label ?? rawValue.value };
  }
  if (['select', 'radio', 'rating'].includes(field.type)) {
    const options = field.options || [];
    if (field.type === 'rating' || field.semanticType === 'ratingPair') {
      const option = options.find((opt: any) => String(opt.label ?? opt.value) === String(rawValue) || String(opt.value) === String(rawValue));
      if (option) return { value: option.value, label: option.label || option.value };
    }
    if (isPathLikeField(field)) {
      const rawPath = normalizePath(String(rawValue));
      const option = options.find((opt: any) => normalizePath(String(opt.value || '')) === rawPath || String(opt.label || '') === String(rawValue));
      if (option) return { value: normalizePath(String(option.value)), label: option.label || getLeafPath(String(option.value)) || option.value };
      const built = buildPathOption(String(rawValue));
      if (built) return built;
    }
    const option = options.find((opt: any) => opt.value === rawValue || opt.label === rawValue || String(opt.value) === String(rawValue) || String(opt.label) === String(rawValue));
    if (option) return { value: option.value, label: option.label || option.value };
  }
  return rawValue;
}

function normalizeToken(value: any): string {
  return String(value || '').trim().toLowerCase();
}

function getItemSemanticTokens(item: Item): Set<string> {
  const tokens = new Set<string>();
  const push = (value: any) => {
    const normalized = normalizeToken(value);
    if (normalized) tokens.add(normalized);
  };

  push(item.categoryKey);
  push(item.theme);
  push(item.file?.basename);
  push(item.fileName);
  push(item.header);
  push(item.templateId);

  Object.keys(item.extra || {}).forEach((key) => push(key));

  if (item.content) push('content');
  if (item.title) push('title');
  if (item.date || item.createdDate) push('date');
  if (item.startTime) push('time');
  if (item.endTime) push('end');
  if (item.duration !== undefined) push('duration');
  if (item.rating !== undefined) push('rating');

  return tokens;
}

function scoreTemplateForItem(block: any, item: Item): number {
  let score = 0;
  const outputTemplate = String(block?.outputTemplate || '');
  const semanticTokens = getItemSemanticTokens(item);
  const categoryKey = normalizeToken(item.categoryKey);
  const blockId = normalizeToken(block?.id);
  const blockName = normalizeToken(block?.name);
  const blockCategory = normalizeToken(block?.categoryKey);

  if (item.templateId && normalizeToken(item.templateId) === blockId) score += 100;
  if (categoryKey && categoryKey === blockCategory) score += 30;
  if (categoryKey && categoryKey === blockName) score += 20;

  if (item.type === 'task') {
    if (/^\s*-\s*\[[ xX]?\]/m.test(outputTemplate)) score += 40;
    else score -= 10;
  } else {
    if (/<!--\s*start\s*-->/i.test(outputTemplate) || /内容\s*[:：]/.test(outputTemplate)) score += 20;
  }

  const fields = Array.isArray(block?.fields) ? block.fields : [];
  for (const field of fields) {
    const key = normalizeToken(field?.key);
    const label = normalizeToken(field?.label);
    if (semanticTokens.has(key)) score += 8;
    if (label && semanticTokens.has(label)) score += 6;

    if (item.type === 'task' && ['title', '标题', 'content', '内容'].includes(field?.key)) score += 4;
    if (item.type === 'block' && ['content', '内容'].includes(field?.key)) score += 4;
  }

  return score;
}

function resolveBlockForEdit(blocks: any[], item: Item, initialBlockId: string) {
  if (!Array.isArray(blocks) || blocks.length === 0) return { block: null, resolvedBy: 'fallback' as const };

  if (item.templateId) {
    const exact = blocks.find((b: any) => b.id === item.templateId);
    if (exact) return { block: exact, resolvedBy: 'exact' as const };
  }

  const withScores = blocks
    .map((block: any) => ({ block, score: scoreTemplateForItem(block, item) }))
    .sort((a: any, b: any) => b.score - a.score);

  const top = withScores[0];
  if (top && top.score > 0) return { block: top.block, resolvedBy: 'inferred' as const };

  const initial = initialBlockId ? blocks.find((b: any) => b.id === initialBlockId) : null;
  if (initial) return { block: initial, resolvedBy: 'fallback' as const };

  const sameTypeFallback = item.type === 'task'
    ? blocks.find((b: any) => /^\s*-\s*\[[ xX]?\]/m.test(String(b?.outputTemplate || '')))
    : blocks.find((b: any) => /<!--\s*start\s*-->/i.test(String(b?.outputTemplate || '')) || /内容\s*[:：]/.test(String(b?.outputTemplate || '')));

  return { block: sameTypeFallback || blocks[0], resolvedBy: 'fallback' as const };
}

function buildRatingOption(field: any, item: Item) {
  if (item.rating === undefined && !item.pintu) return undefined;
  const options = field?.options || [];
  const score = item.rating !== undefined && item.rating !== null ? String(item.rating) : '';
  const image = String(item.pintu || '');
  let option = options.find((opt: any) => String(opt.label ?? '') === score && (!image || String(opt.value || '') === image));
  if (!option && score) option = options.find((opt: any) => String(opt.label ?? opt.value) === score);
  if (!option && image) option = options.find((opt: any) => String(opt.value || '') === image);
  if (option) return { value: option.value, label: option.label || option.value };
  if (score || image) return { value: image, label: score || image };
  return undefined;
}

function buildInitialFormData(template: any, item: Item): Record<string, any> {
  const result: Record<string, any> = {};
  if (!template?.fields?.length) return result;

  const extraEntries = Object.entries(item.extra || {});
  const readExtraByAlias = (alias: string) => {
    if (!alias) return undefined;
    if (item.extra && Object.prototype.hasOwnProperty.call(item.extra, alias)) return item.extra[alias as keyof typeof item.extra];
    const lower = normalizeToken(alias);
    const match = extraEntries.find(([key]) => normalizeToken(key) === lower);
    return match?.[1];
  };

  const readValue = (field: any) => {
    const aliases = [field.key, field.label, String(field.key || '').toLowerCase(), String(field.label || '').toLowerCase()];
    for (const alias of aliases) {
      const value = readExtraByAlias(alias);
      if (value !== undefined) return value;
    }

    const key = String(field.key || '').toLowerCase();
    const label = String(field.label || '').toLowerCase();

    if (field.type === 'rating' || field.semanticType === 'ratingPair' || ['评分', 'rating'].includes(key) || ['评分', 'rating'].includes(label)) {
      return buildRatingOption(field, item);
    }

    if (isPathLikeField(field)) {
      return item.categoryKey || undefined;
    }

    if (['内容', 'content', 'title', '标题'].includes(field.key) || ['内容', 'content', 'title', '标题'].includes(field.label)) {
      return item.type === 'task' ? (item.title || item.content) : item.content;
    }
    if (['日期', 'date'].includes(field.key) || ['日期', 'date'].includes(field.label)) return item.date || item.createdDate;
    if (['时间', 'time', 'start'].includes(key) || ['时间', 'time', 'start'].includes(label)) return item.startTime;
    if (['结束', 'end'].includes(key) || ['结束', 'end'].includes(label)) return item.endTime;
    if (['时长', 'duration'].includes(key) || ['时长', 'duration'].includes(label)) return item.duration;
    if (['主题', 'theme'].includes(key) || ['主题', 'theme'].includes(label)) return item.theme || item.header;
    return (item as any)[field.key] ?? (item as any)[field.label];
  };

  for (const field of template.fields) {
    const raw = readValue(field);
    const mapped = mapFieldValue(field, raw);
    if (mapped !== undefined) result[field.key] = mapped;
  }
  return result;
}

function resolveEditState(settings: any, initialBlockId: string, initialThemeId: string | undefined, editItem?: Item): ResolvedEditState {
  if (!editItem) {
    return {
      blockId: initialBlockId,
      themeId: initialThemeId || null,
      initialFormData: {},
      title: initialBlockId,
      resolvedBy: 'fallback',
    };
  }

  const blocks = settings.blocks || [];
  const { block: resolvedBlock, resolvedBy } = resolveBlockForEdit(blocks, editItem, initialBlockId);

  const themeId = findThemeIdByPath(settings.themes || [], editItem.theme) || initialThemeId || null;
  const matchingOverride = resolvedBlock
    ? (settings.overrides || []).find((o: any) => o.blockId === resolvedBlock.id && o.themeId === themeId && !o.disabled)
    : null;
  const template = resolvedBlock
    ? (matchingOverride
      ? {
          ...resolvedBlock,
          ...matchingOverride,
          fields: matchingOverride.fields || resolvedBlock.fields,
        }
      : resolvedBlock)
    : null;

  const titleBase = editItem.type === 'task' ? (editItem.title || '编辑任务') : (editItem.content || editItem.title || '编辑记录');
  const titlePrefix = resolvedBy === 'inferred' ? '推断模板 · ' : resolvedBy === 'fallback' ? '兜底模板 · ' : '';

  return {
    blockId: resolvedBlock?.id || initialBlockId,
    themeId,
    initialFormData: template ? buildInitialFormData(template, editItem) : {},
    title: `${titlePrefix}${titleBase}`,
    resolvedBy,
  };
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
  vaultName,
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
  vaultName: string;
}) {
  const settings = useSelector(selectInputSettings);
  const dataStore = useDataStore();
  const inputService = useInputService();
  const submitLatestRef = useRef(createTakeLatest('quick-input-submit'));

  const editState = useMemo(
    () => resolveEditState(settings, initialBlockId, initialThemeId, mode === 'edit' ? editItem : undefined),
    [settings, initialBlockId, initialThemeId, mode, editItem]
  );

  const [editorState, setEditorState] = useState<QuickInputEditorState>({
    blockId: editState.blockId,
    themeId: editState.themeId,
    formData: editState.initialFormData,
    template: null,
    theme: null,
    templateId: null,
    templateSourceType: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const themeIdMap = useMemo(() => {
    const themes = settings.themes || [];
    return new Map(themes.map((t: any) => [t.id, t]));
  }, [settings.themes]);

  const currentBlock = (settings.blocks || []).find((b: any) => b.id === editorState.blockId);
  const currentBlockName = currentBlock?.name || editorState.template?.name || editorState.blockId;
  const originalUri = mode === 'edit' && editItem ? makeObsUri(editItem, vaultName) : '';

  const handleJumpToOriginal = () => {
    if (!originalUri || originalUri.startsWith('#error')) {
      new Notice('❌ 找不到原文位置');
      return;
    }
    window.open(originalUri, '_blank');
  };

  const handleSubmit = async () => {
    const template = editorState.template;
    if (!template) return;
    if (!inputService) {
      new Notice('❌ 保存失败: InputService 未初始化');
      return;
    }

    const finalData = finalizeQuickInputFormData(editorState.formData);
    const finalTheme = editorState.themeId ? themeIdMap.get(editorState.themeId) : undefined;

    if (onSave && mode === 'create') {
      onSave({ template, formData: finalData, theme: finalTheme, templateId: editorState.templateId, templateSourceType: editorState.templateSourceType });
      closeModal();
      return;
    }

    setIsSubmitting(true);
    try {
      await submitLatestRef.current.run(async (signal) => {
        if (mode === 'edit' && editItem) {
          await inputService.updateExistingRecord(editItem, template, finalData, finalTheme, {
            templateId: editorState.templateId,
            templateSourceType: editorState.templateSourceType,
          }, signal);
        } else {
          const path = await inputService.executeTemplate(template, finalData, finalTheme, {
            templateId: editorState.templateId,
            templateSourceType: editorState.templateSourceType,
          });
          await dataStore?.scanFileByPath?.(path);
          dataStore?.notifyChange?.();
        }
      });
      new Notice(mode === 'edit' ? '✅ 已写回 md 并刷新记录' : '✅ 已保存');
      closeModal();
    } catch (e: any) {
      if (!(e instanceof CancelledError)) {
        new Notice(`❌ 保存失败: ${e.message || e}`, 10000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="think-modal" style={{ padding: '0 1rem 1rem 1rem' }}>
      <Box sx={{ mb: '1rem' }}>
        <ModalHeader
          left={<h3 style={{ margin: 0 }}>{mode === 'edit' ? `编辑记录 · ${currentBlockName}` : (onSave ? `开始新任务: ${currentBlockName}` : `快速录入 · ${currentBlockName}`)}</h3>}
          onClose={closeModal}
          padding={0}
          borderBottom={false}
        />
      </Box>

      <QuickInputEditor
        getResourcePath={getResourcePath}
        initialBlockId={editState.blockId}
        initialThemeId={editState.themeId}
        initialFormData={editState.initialFormData}
        context={mode === 'edit' ? undefined : context}
        allowBlockSwitch={mode === 'edit' ? false : allowBlockSwitch}
        onStateChange={setEditorState}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', gap: '8px' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {mode === 'edit' ? editState.title : ''}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {mode === 'edit' && editItem?.file?.path ? (
            <Button onClick={handleJumpToOriginal} disabled={isSubmitting}>跳到原文</Button>
          ) : null}
          <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : (mode === 'edit' ? '写回 md' : (onSave ? '创建并开始计时' : '提交'))}
          </Button>
          <Button onClick={closeModal} disabled={isSubmitting}>取消</Button>
        </div>
      </div>
    </div>
  );
}
