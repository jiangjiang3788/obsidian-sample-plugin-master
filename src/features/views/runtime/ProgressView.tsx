/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import type { InputSettings, RecordViewItem, ThemeDefinition, ViewInstance } from '@core/types/public';
import type { GoalDefinition } from '@core/goal/public';
import type { MessageRenderPort } from '@core/ports/public';
import type { MarkDoneHandler, OpenRecordHandler, OpenRecordOriginHandler, ResolveResourcePathHandler, TimerController } from '@shared/types/public';
import { GoalProgressCard } from './ProgressGoalCard';
import { buildProgressViewRenderModel } from './ProgressViewModel';

interface ProgressViewProps {
  module: ViewInstance;
  items: RecordViewItem[];
  goals?: GoalDefinition[];
  inputSettings?: InputSettings;
  onOpenRecord?: OpenRecordHandler;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  resolveResourcePath?: ResolveResourcePathHandler;
  messageRenderPort?: MessageRenderPort;
  onMarkDone: MarkDoneHandler;
  timerService: TimerController;
  timers: any[];
  allThemes: ThemeDefinition[];
}

export function ProgressView({
  module,
  items,
  goals = [],
  inputSettings,
  onOpenRecord,
  onOpenRecordOrigin,
  resolveResourcePath,
  messageRenderPort,
  onMarkDone,
  timerService,
  timers = [],
  allThemes = [],
}: ProgressViewProps) {
  const progressModel = useMemo(() => buildProgressViewRenderModel({ items, module, goals, themes: inputSettings?.themes || allThemes }), [items, module, goals, inputSettings?.themes, allThemes]);
  const cards = progressModel.goalCards || [];
  const [collapsedKeys, setCollapsedKeys] = useState<Record<string, boolean>>({});

  if (cards.length === 0) return <div class="think-progress-view__empty">暂无目标成长记录</div>;

  return (
    <div class="think-progress-view think-list" role="list" aria-label="成长视图">
      {cards.map((card) => {
        const expanded = collapsedKeys[card.key] !== true;
        return (
          <GoalProgressCard
            key={card.key}
            card={card}
            module={module}
            expanded={expanded}
            onToggle={() => setCollapsedKeys((prev) => ({ ...prev, [card.key]: expanded }))}
            onOpenRecord={onOpenRecord}
            onOpenRecordOrigin={onOpenRecordOrigin}
            resolveResourcePath={resolveResourcePath}
            messageRenderPort={messageRenderPort}
            onMarkDone={onMarkDone}
            timerService={timerService}
            timers={timers}
            allThemes={allThemes}
            goals={goals}
          />
        );
      })}
    </div>
  );
}
