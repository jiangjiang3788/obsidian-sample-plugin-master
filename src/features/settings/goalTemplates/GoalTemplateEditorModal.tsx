/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ThinkButton, ThinkNotice } from '@shared/ui/public';
import { diagnosticError } from '@shared/utils/public';
import { FloatingPanel, useUiPort, type UseCases } from '@/app/public';
import type { CoreBlockDefinition } from '@core/blocks/public';
import type { GoalDefinition, GoalTemplate } from '@core/goal/public';
import type { TemplateField } from '@core/types/public';
import { isPeriodAwareCoreBlock } from '@core/goal/public';
import { FieldsEditor } from '../input/FieldsEditor';
import { GoalTemplateModeSwitch } from './GoalTemplateModeSwitch';
import { NativeSelectInput, NativeTextInput } from './GoalTemplateNativeControls';
import {
  buildDisabledTemplate,
  buildDraftDiffSummary,
  buildInheritedDraft,
  buildTemplatePatchFromDraft,
  inferTemplateEditMode,
  makeDraftFromTemplate,
  makeNewDraft,
  presetGranularityOptions,
  switchDraftToOverride,
  type GoalTemplateDraftState,
  type GoalTemplateEditMode,
} from './GoalTemplateEditorModel';

interface GoalTemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: GoalDefinition | null;
  block: CoreBlockDefinition | null;
  template: GoalTemplate | null;
  useCases: UseCases;
}

export function GoalTemplateEditorModal({ isOpen, onClose, goal, block, template, useCases }: GoalTemplateEditorModalProps) {
  const ui = useUiPort();
  const [mode, setMode] = useState<GoalTemplateEditMode>('inherit');
  const [draft, setDraft] = useState<GoalTemplateDraftState>(() => makeNewDraft(block));
  const draftRef = useRef<GoalTemplateDraftState>(draft);

  useEffect(() => {
    if (!isOpen) return;
    const nextMode = inferTemplateEditMode(template);
    const baseDraft = makeDraftFromTemplate(template && template.enabled !== false ? template : null, block);
    const nextDraft = nextMode === 'inherit' ? buildInheritedDraft(baseDraft, block) : baseDraft;
    setMode(nextMode);
    draftRef.current = nextDraft;
    setDraft(nextDraft);
  }, [isOpen, goal?.path, block?.id, template?.id, template?.enabled]);

  useEffect(() => { draftRef.current = draft; }, [draft]);

  const updateDraft = (updates: Partial<GoalTemplateDraftState>) => {
    setDraft((previous) => {
      const next = { ...previous, ...updates };
      draftRef.current = next;
      return next;
    });
  };

  const supportsPeriod = !!block && isPeriodAwareCoreBlock(block.id);
  const fieldEditDisabled = mode !== 'override';
  const diffSummary = useMemo(() => buildDraftDiffSummary(goal, block, draft), [goal, block, draft]);

  const handleModeChange = (nextMode: GoalTemplateEditMode) => {
    setMode(nextMode);
    if (nextMode === 'inherit') {
      setDraft((previous) => {
        const next = buildInheritedDraft(previous, block);
        draftRef.current = next;
        return next;
      });
      return;
    }
    if (nextMode === 'override') {
      setDraft((previous) => {
        const next = switchDraftToOverride(previous, block);
        draftRef.current = next;
        return next;
      });
    }
  };

  const handleSave = async () => {
    if (!goal || !block) return;
    const goalPath = goal.path;
    const activeElement = document.activeElement as HTMLElement | null;
    if (activeElement && typeof activeElement.blur === 'function') activeElement.blur();
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    try {
      if (mode === 'inherit') {
        await useCases.goal.deleteGoalTemplate(goalPath, block.id);
        ui.notice(`已恢复默认模板：${goalPath} / ${block.name}`);
        onClose();
        return;
      }

      if (mode === 'disabled') {
        await useCases.goal.upsertGoalTemplate(buildDisabledTemplate(goal, block));
        ui.notice(`已隐藏：${goalPath} / ${block.name}`);
        onClose();
        return;
      }

      await useCases.goal.upsertGoalTemplate(buildTemplatePatchFromDraft({ goal, block, draft: draftRef.current }));
      ui.notice(`已保存字段预设：${goalPath} / ${block.name}`);
      onClose();
    } catch (error) {
      diagnosticError('[GoalTemplateEditorModal] save failed', error);
      ui.notice('保存字段预设失败，请查看控制台日志');
    }
  };

  if (!isOpen || !goal || !block) return null;
  const goalPath = goal.path;

  return (
    <FloatingPanel
      id={`goal-template-editor-${goal.path}-${block.id}`}
      title={<span>字段预设：<strong>{goalPath}</strong> / {block.name}</span>}
      onClose={onClose}
      defaultPosition={{ x: Math.max(24, window.innerWidth / 2 - 380), y: 72 }}
      portal={false}
      placement="floating"
      closeOnOutsideClick={false}
      width={760}
      height={680}
      minWidth={560}
      minHeight={430}
      maxWidth="96vw"
      maxHeight="92vh"
      resizable
      bodyPadding={0}
      bodyStyle={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
    >
      <div className="think-os--settings think-goal-template-editor">
        <div className="think-goal-template-editor__stack">
          <header className="think-editor-header">
            <div className="think-goal-template-editor__identity">
              <div className="think-settings-title-strong">{goal.icon ? `${goal.icon} ` : ''}{goalPath}</div>
              <div className="think-settings-caption">每个目标 × 记录类型只有一个字段预设，不再存在第二层分类或预设变体。</div>
              <div className="think-settings-caption">Goal Template 只定义字段、默认值与保存位置，不覆盖存储 grammar。</div>
            </div>
          </header>

          {mode === 'disabled' ? (
            <ThinkNotice tone="warning">「{block.name}」在这个目标下不会出现在普通录入入口。</ThinkNotice>
          ) : null}

          <GoalTemplateModeSwitch mode={mode} blockName={block.name} onChange={handleModeChange} />

          <section className="think-goal-template-editor__fields">
            {supportsPeriod ? (
              <NativeSelectInput
                label="周期"
                value={draft.granularity}
                options={presetGranularityOptions}
                onChange={(value) => updateDraft({ granularity: value as GoalTemplateDraftState['granularity'] })}
                disabled={mode === 'disabled'}
              />
            ) : null}
            <NativeTextInput label="保存文件" value={draft.targetFile} onInput={(value) => updateDraft({ targetFile: value })} disabled={fieldEditDisabled} placeholder="例如：01/目标打卡.md" />
            <NativeTextInput label="标题" value={draft.appendUnderHeader} onInput={(value) => updateDraft({ appendUnderHeader: value })} disabled={fieldEditDisabled} placeholder="## {{goalPath}}" />
            <NativeTextInput label="说明" value={draft.description} onInput={(value) => updateDraft({ description: value })} disabled={mode === 'disabled'} placeholder="可选" />

            {mode === 'override' && diffSummary.length ? (
              <div className="think-editor-diff-list">
                {diffSummary.map((item) => <span key={item} className="think-editor-diff-chip">{item}</span>)}
              </div>
            ) : null}
          </section>

          <section className={fieldEditDisabled ? 'think-settings-muted-disabled think-goal-template-editor__form-fields' : 'think-goal-template-editor__form-fields'}>
            <div className="think-goal-template-editor__section-heading">表单字段</div>
            {mode === 'inherit' ? <div className="think-settings-caption">默认模式直接使用记录类型模板；切换到“自定义”后才保存目标专属字段。</div> : null}
            {mode === 'disabled' ? <div className="think-settings-caption">隐藏模式不保存字段覆盖。</div> : null}
            <FieldsEditor fields={draft.fields || []} disabled={fieldEditDisabled} onChange={(fields: TemplateField[]) => updateDraft({ fields })} />
          </section>

          <footer className="think-settings-sticky-actions">
            <ThinkButton onClick={onClose}>取消</ThinkButton>
            <ThinkButton onClick={handleSave} variant="primary">保存</ThinkButton>
          </footer>
        </div>
      </div>
    </FloatingPanel>
  );
}
