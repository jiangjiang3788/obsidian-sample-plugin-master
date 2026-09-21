/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

import { QuickInputEditorFields } from './components/Fields';
import { GoalSelector, type GoalSelectorOption } from './components/GoalSelector';
import { RecordTypeSwitcher } from './components/RecordTypeSwitcher';
import { QuickInputFormRow } from './components/FormRow';

export interface QuickInputEditorViewProps {
  getResourcePath: (path: string) => string;

  recordTypes: any[];
  allowRecordTypeSwitch: boolean;
  currentRecordTypeId: string;
  onRecordTypeChange: (recordTypeId: string) => void;

  goals: GoalSelectorOption[];
  recentGoalPaths?: string[];
  selectedGoalPath: string | null;
  onSelectGoal: (goal: GoalSelectorOption | null, source?: 'hierarchy' | 'recent') => void;
  onCreateGoal?: (goalPath: string) => Promise<void> | void;

  template: any;
  formData: Record<string, any>;
  fieldValueOptionsByKey?: Record<string, Array<{ value: string; label?: string; icon?: string }>>;
  timeDirection?: 'forward' | 'backward';
  dense?: boolean;
  showDivider?: boolean;
  onUpdateField: (key: string, value: any, isOptionObject?: boolean) => void;
  onTimeDirectionChange?: (direction: 'forward' | 'backward') => void;
  onRequestSubmit?: () => void;
  isMobileLike?: boolean;
  showTimeDirectionControl?: boolean;
  currentGoalPath?: string | null;
  templateSourceType?: 'record-type' | 'goal-template' | null;
  fieldSourceSummary?: Record<string, number>;
  currentPeriodLabel?: string | null;
  autoFocusContent?: boolean;
}

export function QuickInputEditorView({
  getResourcePath,
  recordTypes,
  allowRecordTypeSwitch,
  currentRecordTypeId,
  onRecordTypeChange,
  goals,
  recentGoalPaths = [],
  selectedGoalPath,
  onSelectGoal,
  onCreateGoal,
  template,
  formData,
  fieldValueOptionsByKey,
  timeDirection = 'forward',
  dense = false,
  showDivider = true,
  onUpdateField,
  onTimeDirectionChange,
  onRequestSubmit,
  isMobileLike = false,
  showTimeDirectionControl = false,
  currentGoalPath = null,
  templateSourceType = null,
  autoFocusContent = false,
}: QuickInputEditorViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const didAutoFocusRef = useRef(false);

  // Obsidian may apply its own modal focus after the Preact tree mounts, so the
  // native `autoFocus` attribute alone is not deterministic. Focus the Task
  // body imperatively after mount, with a couple of short retries while the
  // modal settles. Once the user interacts with the form we stop retrying, and
  // Goal/template hydration later in the session never steals focus back.
  useEffect(() => {
    if (!autoFocusContent || !template || didAutoFocusRef.current) return;
    const root = rootRef.current;
    if (!root) return;

    let cancelled = false;
    let userInteracted = false;
    const markUserInteraction = () => { userInteracted = true; };
    root.addEventListener('pointerdown', markUserInteraction, true);
    root.addEventListener('keydown', markUserInteraction, true);

    const focusContent = () => {
      if (cancelled || userInteracted || didAutoFocusRef.current) return;
      const target = root.querySelector('[data-quick-input-content="true"]') as HTMLInputElement | HTMLTextAreaElement | null;
      if (!target || target.disabled) return;
      try {
        target.focus({ preventScroll: true });
      } catch {
        target.focus();
      }
      if (document.activeElement === target) {
        const end = String(target.value ?? '').length;
        try { target.setSelectionRange(end, end); } catch { /* non-text controls are not tagged */ }
        didAutoFocusRef.current = true;
      }
    };

    const timers = [0, 40, 120].map((delay) => window.setTimeout(focusContent, delay));
    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      root.removeEventListener('pointerdown', markUserInteraction, true);
      root.removeEventListener('keydown', markUserInteraction, true);
    };
  }, [autoFocusContent, Boolean(template)]);

  if (!template) {
    return (
      <div ref={rootRef} className={`think-quick-input-editor${dense ? ' is-dense' : ''}`}>
        <div className="think-quick-input-context-grid">
          {allowRecordTypeSwitch && recordTypes.length > 1 && (
            <QuickInputFormRow label="记录类型">
              <RecordTypeSwitcher
                recordTypes={recordTypes}
                currentRecordTypeId={currentRecordTypeId}
                onRecordTypeChange={onRecordTypeChange}
              />
            </QuickInputFormRow>
          )}

          {currentRecordTypeId ? (
            <QuickInputFormRow label="目标">
              <GoalSelector
                goals={goals}
                recentGoalPaths={recentGoalPaths}
                selectedGoalPath={selectedGoalPath}
                onSelect={onSelectGoal}
                onCreateGoal={onCreateGoal}
                dense={dense}
              />
            </QuickInputFormRow>
          ) : null}
        </div>
        <div className="think-quick-input-context-hint">
          {currentRecordTypeId ? '请选择已配置模板的目标后继续。' : '请选择记录类型后继续。'}
        </div>
      </div>
    );
  }

  const shouldShowRecordTypeFallbackHint = Boolean(currentGoalPath)
    && templateSourceType === 'record-type';
  const isTaskTemplate = String(currentRecordTypeId || template?.recordTypeId || template?.id || '').replace(/^core\./, '') === 'task';

  return (
    <div ref={rootRef} className={`think-quick-input-editor${dense ? ' is-dense' : ''}`}>
      <div className="think-quick-input-context-grid">
          {allowRecordTypeSwitch && recordTypes.length > 1 && (
            <QuickInputFormRow label="记录类型">
              <RecordTypeSwitcher
                recordTypes={recordTypes}
                currentRecordTypeId={currentRecordTypeId}
                onRecordTypeChange={onRecordTypeChange}
              />
            </QuickInputFormRow>
          )}

          <QuickInputFormRow label="目标">
            <div className="think-quick-input-context-row__stack">
              <GoalSelector
                goals={goals}
                recentGoalPaths={recentGoalPaths}
                selectedGoalPath={selectedGoalPath}
                onSelect={onSelectGoal}
                onCreateGoal={onCreateGoal}
                dense={dense}
              />
              {shouldShowRecordTypeFallbackHint && (
                <div className="think-quick-input-context-hint">当前记录使用记录类型基础模板。</div>
              )}
            </div>
          </QuickInputFormRow>
      </div>

      {showDivider && !isTaskTemplate && <div className="think-quick-input-context-divider" aria-hidden="true" />}

      <div className="think-quick-input-fields">
        <QuickInputEditorFields
          getResourcePath={getResourcePath}
          template={template}
          formData={formData}
          fieldValueOptionsByKey={fieldValueOptionsByKey}
          dense={dense}
          onUpdateField={onUpdateField}
          timeDirection={timeDirection}
          onTimeDirectionChange={onTimeDirectionChange}
          onRequestSubmit={onRequestSubmit}
          isMobileLike={isMobileLike}
          showTimeDirectionControl={showTimeDirectionControl}
          autoFocusContent={autoFocusContent}
        />
      </div>
    </div>
  );
}
