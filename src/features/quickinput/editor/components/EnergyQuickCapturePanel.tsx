/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';

import { dayjs } from '@core/utils/public';

import {
  ENERGY_QUICK_LEVELS,
  ENERGY_QUICK_LEVEL_LABELS,
  calculateDetailedEnergyScore,
  normalizeEnergyScore,
  type EnergyQuickLevel,
} from '@core/energy/public';

import { resolveQuickInputEnergyDefaultGoal, type QuickInputEnergyCaptureRequest } from '../QuickInputEditorModel';
import { GoalSelector, type GoalSelectorOption } from './GoalSelector';
import { RecordTypeSwitcher, type RecordTypeSwitcherOption } from './RecordTypeSwitcher';
import { SelectablePill } from './SelectablePill';

export interface EnergyQuickCapturePanelProps {
  blocks: RecordTypeSwitcherOption[];
  allowBlockSwitch: boolean;
  currentBlockId: string;
  onBlockChange: (blockId: string) => void;
  goals: GoalSelectorOption[];
  selectedGoalPath: string | null;
  onSelectGoal: (goal: GoalSelectorOption | null) => void;
  selectedGoalId: string | null;
  defaultGoalId?: string | null;
  selectedThemePath?: string | null;
  onCapture?: (request: QuickInputEnergyCaptureRequest) => Promise<void> | void;
}

export function EnergyQuickCapturePanel({
  blocks,
  allowBlockSwitch,
  currentBlockId,
  onBlockChange,
  goals,
  selectedGoalPath,
  onSelectGoal,
  selectedGoalId,
  defaultGoalId,
  selectedThemePath,
  onCapture,
}: EnergyQuickCapturePanelProps) {
  const [pendingScore, setPendingScore] = useState<EnergyQuickLevel | null>(null);
  const [isDetailed, setIsDetailed] = useState(false);
  const [brainScore, setBrainScore] = useState(60);
  const [physicalScore, setPhysicalScore] = useState(60);
  const [isSavingDetailed, setIsSavingDetailed] = useState(false);
  const [captureMode, setCaptureMode] = useState<'realtime' | 'retrospective'>('realtime');
  const [retrospectiveDate, setRetrospectiveDate] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [retrospectiveTime, setRetrospectiveTime] = useState('');
  const [showTargetEditor, setShowTargetEditor] = useState(false);

  useEffect(() => {
    if (selectedGoalPath || goals.length === 0) return;
    onSelectGoal(resolveQuickInputEnergyDefaultGoal(goals, defaultGoalId));
  }, [defaultGoalId, goals, onSelectGoal, selectedGoalPath]);

  const detailedScore = useMemo(
    () => calculateDetailedEnergyScore(brainScore, physicalScore),
    [brainScore, physicalScore],
  );

  const hasCaptureTime = captureMode === 'realtime' || Boolean(retrospectiveDate && retrospectiveTime);
  const captureTiming = captureMode === 'retrospective'
    ? { captureMode: 'retrospective' as const, date: retrospectiveDate, time: retrospectiveTime }
    : { captureMode: 'realtime' as const };

  const canCapture = Boolean(
    selectedGoalId
    && selectedGoalPath
    && onCapture
    && hasCaptureTime
    && pendingScore === null
    && !isSavingDetailed,
  );

  const captureQuick = async (score: EnergyQuickLevel) => {
    if (!selectedGoalId || !selectedGoalPath || !onCapture || !canCapture) return;
    setPendingScore(score);
    try {
      await onCapture({
        scoreMode: 'quick',
        score,
        goalId: selectedGoalId,
        goalPath: selectedGoalPath,
        themePath: selectedThemePath || null,
        ...captureTiming,
      });
    } finally {
      setPendingScore(null);
    }
  };

  const captureDetailed = async () => {
    if (!selectedGoalId || !selectedGoalPath || !onCapture || !canCapture) return;
    setIsSavingDetailed(true);
    try {
      await onCapture({
        scoreMode: 'detailed',
        brainScore: normalizeEnergyScore(brainScore),
        physicalScore: normalizeEnergyScore(physicalScore),
        goalId: selectedGoalId,
        goalPath: selectedGoalPath,
        themePath: selectedThemePath || null,
        ...captureTiming,
      });
    } finally {
      setIsSavingDetailed(false);
    }
  };

  const updateBrainScore = (value: string) => setBrainScore(normalizeEnergyScore(Number(value)));
  const updatePhysicalScore = (value: string) => setPhysicalScore(normalizeEnergyScore(Number(value)));

  return (
    <div class="think-quick-input-energy-panel">
      {allowBlockSwitch && blocks.length > 1 && (
        <section class="think-quick-input-energy-section">
          <div class="think-quick-input-energy-section__title">记录类型</div>
          <RecordTypeSwitcher
            blocks={blocks}
            currentBlockId={currentBlockId}
            onBlockChange={onBlockChange}
          />
        </section>
      )}

      <section class="think-quick-input-energy-section think-quick-input-energy-target">
        <div class="think-quick-input-energy-target__summary">
          <div>
            <div class="think-quick-input-energy-section__title">记录到</div>
            <div class="think-quick-input-context-hint">
              {selectedGoalPath || '未选择目标'}{selectedThemePath ? ` · ${selectedThemePath}` : ''}
            </div>
          </div>
          <button
            type="button"
            class="think-quick-input-energy-detail-toggle"
            onClick={() => setShowTargetEditor((value) => !value)}
            disabled={pendingScore !== null || isSavingDetailed}
          >
            {showTargetEditor ? '收起' : '修改目标'}
          </button>
        </div>
        {showTargetEditor && (
          <div class="think-quick-input-energy-target__editor">
            <GoalSelector goals={goals} selectedGoalPath={selectedGoalPath} onSelect={onSelectGoal} dense />
            <div class="think-quick-input-context-hint">主题不在这里临时选择；请到“设置 → 数据管理 → 记录类型 → 精力记录默认值”维护默认精力主题。</div>
          </div>
        )}
      </section>

      <section class="think-quick-input-energy-section">
        <div class="think-quick-input-energy-section__title">记录时间</div>
        <div class="think-quick-input-energy-capture-mode" role="group" aria-label="精力记录时间模式">
          <button
            type="button"
            class={`think-quick-input-energy-capture-mode__button${captureMode === 'realtime' ? ' is-active' : ''}`}
            onClick={() => setCaptureMode('realtime')}
            disabled={pendingScore !== null || isSavingDetailed}
          >
            实时
          </button>
          <button
            type="button"
            class={`think-quick-input-energy-capture-mode__button${captureMode === 'retrospective' ? ' is-active' : ''}`}
            onClick={() => setCaptureMode('retrospective')}
            disabled={pendingScore !== null || isSavingDetailed}
          >
            补录
          </button>
        </div>
        {captureMode === 'retrospective' && (
          <div class="think-quick-input-energy-retrospective-time">
            <label>
              <span>发生日期</span>
              <input
                type="date"
                value={retrospectiveDate}
                max={dayjs().format('YYYY-MM-DD')}
                disabled={pendingScore !== null || isSavingDetailed}
                onInput={(event) => setRetrospectiveDate(event.currentTarget.value)}
              />
            </label>
            <label>
              <span>发生时间</span>
              <input
                type="time"
                value={retrospectiveTime}
                step="60"
                disabled={pendingScore !== null || isSavingDetailed}
                onInput={(event) => setRetrospectiveTime(event.currentTarget.value)}
              />
            </label>
            {!retrospectiveTime && (
              <div class="think-quick-input-context-hint">补录必须选择具体时间；不会用“上午/下午”等模糊时段代替。</div>
            )}
          </div>
        )}
      </section>

      <section class="think-quick-input-energy-section">
        <div class="think-quick-input-energy-mode-row">
          <div class="think-quick-input-energy-section__title">{isDetailed ? '详细精力' : captureMode === 'retrospective' ? '补录精力' : '当前精力'}</div>
          <button
            type="button"
            class="think-quick-input-energy-detail-toggle"
            onClick={() => setIsDetailed((value) => !value)}
            disabled={pendingScore !== null || isSavingDetailed}
          >
            {isDetailed ? '返回快捷' : '详细模式'}
          </button>
        </div>

        {!isDetailed ? (
          <div class="think-quick-input-energy-levels" role="group" aria-label="当前精力快捷评分">
            {ENERGY_QUICK_LEVELS.map((score) => {
              const label = ENERGY_QUICK_LEVEL_LABELS[score];
              const pending = pendingScore === score;
              return (
                <SelectablePill
                  key={score}
                  disabled={!canCapture}
                  onClick={() => void captureQuick(score)}
                  title={`${score} · ${label}`}
                  className="think-quick-input-energy-level"
                >
                  <span class="think-quick-input-energy-level__score">{score}</span>
                  <span class="think-quick-input-energy-level__label">{pending ? '记录中…' : label}</span>
                </SelectablePill>
              );
            })}
          </div>
        ) : (
          <div class="think-quick-input-energy-detailed">
            <EnergyDimensionInput
              label="脑力"
              value={brainScore}
              onChange={updateBrainScore}
              disabled={!canCapture}
            />
            <EnergyDimensionInput
              label="体力"
              value={physicalScore}
              onChange={updatePhysicalScore}
              disabled={!canCapture}
            />
            <div class="think-quick-input-energy-summary">
              <span>综合精力</span>
              <strong>{detailedScore}</strong>
              <span class="think-quick-input-energy-summary__hint">脑力与体力等权平均，仅用于统一时间线</span>
            </div>
            <button
              type="button"
              class="think-quick-input-energy-save-detailed"
              disabled={!canCapture}
              onClick={() => void captureDetailed()}
            >
              {isSavingDetailed ? '记录中…' : '保存详细精力'}
            </button>
          </div>
        )}

        {!selectedGoalPath && (
          <div class="think-quick-input-context-hint">请先选择一个目标，精力记录不会脱离目标单独保存。</div>
        )}
      </section>
    </div>
  );
}

interface EnergyDimensionInputProps {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: string) => void;
}

function EnergyDimensionInput({ label, value, disabled, onChange }: EnergyDimensionInputProps) {
  return (
    <label class="think-quick-input-energy-dimension">
      <span class="think-quick-input-energy-dimension__header">
        <span>{label}</span>
        <strong>{value}</strong>
      </span>
      <span class="think-quick-input-energy-dimension__controls">
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={value}
          disabled={disabled}
          onInput={(event) => onChange(event.currentTarget.value)}
          aria-label={`${label}精力百分制`}
        />
        <input
          class="think-quick-input-energy-dimension__number"
          type="number"
          min="0"
          max="100"
          step="1"
          value={value}
          disabled={disabled}
          onInput={(event) => onChange(event.currentTarget.value)}
          aria-label={`${label}精力数值`}
        />
      </span>
    </label>
  );
}
