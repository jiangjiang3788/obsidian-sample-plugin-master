/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ThinkButton, ThinkNotice } from '@shared/ui/public';
import { diagnosticError } from '@shared/utils/public';
import { FloatingPanel, useUiPort, type UseCases } from '@/app/public';
import type { TemplateRecordTypeDefinition } from '@core/recordTypes/public';
import type { GoalDefinition, GoalTemplate } from '@core/goal/public';
import type { TemplateField } from '@core/types/public';
import { getGoalLeaf, isPeriodAwareRecordType, resolveGoalIcon } from '@core/goal/public';
import { FieldsEditor } from '../input/FieldsEditor';
import { GoalTemplateModeSwitch } from './GoalTemplateModeSwitch';
import { NativeSelectInput, NativeTextInput } from './GoalTemplateNativeControls';
import {
  buildDisabledTemplate,
  buildDraftDiffSummary,
  buildDefaultDraft,
  buildTemplatePatchFromDraft,
  inferTemplateEditMode,
  makeDraftFromTemplate,
  makeNewDraft,
  presetGranularityOptions,
  switchDraftToOverride,
  type GoalTemplateDraftState,
  type GoalTemplateEditMode,
} from './GoalTemplateEditorModel';

// Goal Template 只定义字段、默认值与保存位置，不覆盖存储 grammar。
function isGoalIdentityIconField(field: TemplateField): boolean {
  const source = field as any;
  const key = String(source.key || source.label || '').trim();
  const semantic = String(source.semantic || source.semanticType || '').trim();
  return key === 'icon' || key === '图标' || semantic === 'icon';
}

interface GoalTemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: GoalDefinition | null;
  block: TemplateRecordTypeDefinition | null;
  template: GoalTemplate | null;
  useCases: UseCases;
}

export function GoalTemplateEditorModal({ isOpen, onClose, goal, block, template, useCases }: GoalTemplateEditorModalProps) {
  const ui = useUiPort();
  const [mode, setMode] = useState<GoalTemplateEditMode>('default');
  const [draft, setDraft] = useState<GoalTemplateDraftState>(() => makeNewDraft(block));
  const draftRef = useRef<GoalTemplateDraftState>(draft);

  useEffect(() => {
    if (!isOpen) return;
    const nextMode: GoalTemplateEditMode = template ? inferTemplateEditMode(template) : 'override';
    const baseDraft = makeDraftFromTemplate(template && template.enabled !== false ? template : null, block);
    const nextDraft = nextMode === 'default' ? buildDefaultDraft(baseDraft, block) : baseDraft;
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

  const supportsPeriod = !!block && isPeriodAwareRecordType(block.id);
  const fieldEditDisabled = mode !== 'override';
  const diffSummary = useMemo(() => buildDraftDiffSummary(goal, block, draft), [goal, block, draft]);

  const handleModeChange = (nextMode: GoalTemplateEditMode) => {
    setMode(nextMode);
    if (nextMode === 'default') {
      setDraft((previous) => {
        const next = buildDefaultDraft(previous, block);
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
      if (mode === 'default') {
        await useCases.goal.deleteGoalTemplate(goalPath, block.id);
        ui.notice(`已移除模板：${goalPath} / ${block.name}`);
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
      ui.notice(`已保存模板：${goalPath} / ${block.name}`);
      onClose();
    } catch (error) {
      diagnosticError('[GoalTemplateEditorModal] save failed', error);
      ui.notice('保存模板失败，请查看控制台日志');
    }
  };

  if (!isOpen || !goal || !block) return null;
  const goalPath = goal.path;
  const goalLeaf = getGoalLeaf(goalPath) || goalPath;
  const goalIcon = resolveGoalIcon(goal);

  return (
    <FloatingPanel
      id={`goal-template-editor-${goal.path}-${block.id}`}
      title={<span>模板：<strong>{goalIcon ? `${goalIcon} ` : ''}{goalLeaf}</strong> / {block.name}</span>}
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
              <div className="think-settings-title-strong">{goalIcon ? `${goalIcon} ` : ''}{goalLeaf}</div>
              <div className="think-settings-caption" title={goalPath}>完整路径：{goalPath}</div>
              <div className="think-settings-caption">每个目标 × 记录类型最多只有一个模板。</div>
              <div className="think-settings-caption">模板只定义这个目标下的录入字段、默认值与保存位置；图标默认值统一继承目标图标。</div>
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
            <NativeTextInput label="标题" value={draft.appendUnderHeader} onInput={(value) => updateDraft({ appendUnderHeader: value })} disabled={fieldEditDisabled} placeholder="例如：## 我的目标" />
            <NativeTextInput label="说明" value={draft.description} onInput={(value) => updateDraft({ description: value })} disabled={mode === 'disabled'} placeholder="可选" />

            {mode === 'override' && diffSummary.length ? (
              <div className="think-editor-diff-list">
                {diffSummary.map((item) => <span key={item} className="think-editor-diff-chip">{item}</span>)}
              </div>
            ) : null}
          </section>

          <section className={fieldEditDisabled ? 'think-settings-muted-disabled think-goal-template-editor__form-fields' : 'think-goal-template-editor__form-fields'}>
            <div className="think-goal-template-editor__section-heading">表单字段</div>
            {mode === 'default' ? <div className="think-settings-caption">未配置表示删除这个目标的模板；没有模板时快捷录入不可用。</div> : null}
            {mode === 'disabled' ? <div className="think-settings-caption">隐藏表示显式禁止这个目标使用该记录类型录入。</div> : null}
            <FieldsEditor fields={draft.fields || []} disabled={fieldEditDisabled} isDefaultValueLocked={isGoalIdentityIconField} onChange={(fields: TemplateField[]) => updateDraft({ fields })} />
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
