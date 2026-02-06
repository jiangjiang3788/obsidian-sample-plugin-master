// src/shared/ui/modals/QuickInputModal.tsx
/**
 * S7.1: QuickInputModal - 快速输入模态框
 * - 使用 useZustandAppStore 读取 settings
 * - 使用 useCases 进行写入操作
 */
/** @jsxImportSource preact */
import { h } from 'preact';
import { App, Modal, Notice } from 'obsidian';
import { useMemo, useState } from 'preact/hooks';

import {
  createServices,
  Services,
  useDataStore,
  useInputService,
  useZustandAppStore,
  mountWithServices,
  unmountPreact,
} from '@/app/public';
import type { QuickInputSaveData } from '@core/public';

import { Box, Button } from '@mui/material';

import { finalizeQuickInputFormData, QuickInputEditor, type QuickInputEditorState } from '@shared/ui/components/QuickInputEditor';
import { ModalHeader } from '@shared/ui/components/ModalHeader';

export class QuickInputModal extends Modal {
  private services: Services;
  /**
   * 软键盘/视口监听清理函数。
   *
   * 以前通过 `this.onClose = () => {...}` 动态覆写方法来做清理，
   * TS/运行期都容易踩坑（方法与实例属性语义不一致）。
   *
   * 现在改为：在 setupKeyboardDetection() 里生成 cleanup，
   * 由 onClose() 统一调用。
   */
  private cleanupKeyboardDetection: (() => void) | null = null;

  constructor(
    app: App,
    private blockId: string,
    private context?: Record<string, any>,
    private themeId?: string,
    private onSave?: (data: QuickInputSaveData) => void,
    private allowBlockSwitch: boolean = false
  ) {
    super(app);
    // Phase 4.3: features 层禁止 import tsyringe container
    // - Services 只能通过 app/public 的 createServices() 获取
    this.services = createServices();
  }

  onOpen() {
    this.contentEl.empty();
    this.modalEl.addClass('think-quick-input-modal');
    this.setupKeyboardDetection();

    mountWithServices(
      this.contentEl,
      <QuickInputModalContent
        app={this.app}
        initialBlockId={this.blockId}
        context={this.context}
        initialThemeId={this.themeId}
        onSave={this.onSave}
        closeModal={() => this.close()}
        allowBlockSwitch={this.allowBlockSwitch}
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

    // 将清理逻辑收敛成 closure，由 onClose() 统一调用
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
    // 先卸载监听/样式，再卸载 UI
    try {
      this.cleanupKeyboardDetection?.();
    } finally {
      this.cleanupKeyboardDetection = null;
    }
    unmountPreact(this.contentEl);
  }
}

function QuickInputModalContent({
  app,
  initialBlockId,
  context,
  initialThemeId,
  onSave,
  closeModal,
  allowBlockSwitch,
}: {
  app: App;
  initialBlockId: string;
  context?: Record<string, any>;
  initialThemeId?: string;
  onSave?: (data: QuickInputSaveData) => void;
  closeModal: () => void;
  allowBlockSwitch: boolean;
}) {
  const settings = useZustandAppStore((s) => s.settings.inputSettings);
  const dataStore = useDataStore();
  const inputService = useInputService();

  const [editorState, setEditorState] = useState<QuickInputEditorState>({
    blockId: initialBlockId,
    themeId: initialThemeId || null,
    formData: {},
    template: null,
    theme: null,
  });

  const themeIdMap = useMemo(() => {
    const themes = settings.themes || [];
    return new Map(themes.map((t: any) => [t.id, t]));
  }, [settings.themes]);

  const currentBlock = (settings.blocks || []).find((b: any) => b.id === editorState.blockId);
  const currentBlockName = currentBlock?.name || editorState.template?.name || editorState.blockId;

  const handleSubmit = async () => {
    const template = editorState.template;
    if (!template) return;
    if (!inputService) {
      new Notice(`❌ 保存失败: InputService 未初始化`);
      return;
    }

    const finalData = finalizeQuickInputFormData(editorState.formData);
    const finalTheme = editorState.themeId ? themeIdMap.get(editorState.themeId) : undefined;

    if (onSave) {
      onSave({ template, formData: finalData, theme: finalTheme });
      closeModal();
      return;
    }

    try {
      await inputService.executeTemplate(template, finalData, finalTheme);
      new Notice(`✅ 已保存`);
      dataStore?.notifyChange?.();
      closeModal();
    } catch (e: any) {
      new Notice(`❌ 保存失败: ${e.message || e}`, 10000);
    }
  };

  return (
    <div class="think-modal" style={{ padding: '0 1rem 1rem 1rem' }}>
      <Box sx={{ mb: '1rem' }}>
        <ModalHeader
          left={<h3 style={{ margin: 0 }}>{onSave ? `开始新任务: ${currentBlockName}` : `快速录入 · ${currentBlockName}`}</h3>}
          onClose={closeModal}
          padding={0}
          borderBottom={false}
        />
      </Box>

      <QuickInputEditor
        app={app}
        initialBlockId={initialBlockId}
        initialThemeId={initialThemeId || null}
        context={context}
        allowBlockSwitch={allowBlockSwitch}
        onStateChange={setEditorState}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '8px' }}>
        <Button onClick={handleSubmit} variant="contained">
          {onSave ? '创建并开始计时' : '提交'}
        </Button>
        <Button onClick={closeModal}>取消</Button>
      </div>
    </div>
  );
}
