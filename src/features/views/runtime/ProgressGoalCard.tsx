/** @jsxImportSource preact */
import { h } from 'preact';
import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import type { GoalDefinition } from '@core/goal/public';
import type { MessageRenderPort } from '@core/ports/public';
import type { RecordViewItem, ThemeDefinition, ViewInstance } from '@core/types/public';
import type {
  MarkDoneHandler,
  OpenRecordHandler,
  OpenRecordOriginHandler,
  ResolveResourcePathHandler,
  TimerController,
} from '@shared/types/public';
import { ThinkIcon } from '@shared/ui/public';
import { BlockView } from './BlockView';
import {
  buildProgressSkillRows,
  getGoalProgressTitle,
  getProgressLevelMeta,
  progressBarWidth,
  ratioPercent,
  type GoalProgressCardModel,
  type ProgressRecentRecordModel,
  type ProgressSkillRowModel,
} from './ProgressViewModel';

interface ProgressRecordRuntimeProps {
  module: ViewInstance;
  onOpenRecord?: OpenRecordHandler;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  resolveResourcePath?: ResolveResourcePathHandler;
  messageRenderPort?: MessageRenderPort;
  onMarkDone: MarkDoneHandler;
  timerService: TimerController;
  timers: any[];
  allThemes: ThemeDefinition[];
  goals: GoalDefinition[];
}

interface GoalProgressCardProps extends ProgressRecordRuntimeProps {
  card: GoalProgressCardModel;
  expanded: boolean;
  onToggle: () => void;
}

function ExperienceBar({ ratio, tone = 'goal' }: { ratio: number; tone?: 'goal' | 'skill' }) {
  const style = { '--think-progress-ratio': progressBarWidth(ratio) } as JSX.CSSProperties;
  return (
    <span class={`think-progress-bar think-progress-bar--${tone}`} aria-label={`进度 ${progressBarWidth(ratio)}`}>
      <span class="think-progress-bar__fill" style={style} />
    </span>
  );
}

function ThemeRecords({ records, runtime }: {
  records: ProgressRecentRecordModel[];
  runtime: ProgressRecordRuntimeProps;
}) {
  if (!records.length) return <div class="think-progress-theme-records__empty">该主题暂无记录</div>;
  const fields = runtime.module.fields?.length ? runtime.module.fields : ['title', 'content'];
  return (
    <div class="think-progress-theme-records" aria-label="主题记录">
      <BlockView
        items={records.map((record) => record.item)}
        fields={fields}
        onMarkDone={runtime.onMarkDone}
        timerService={runtime.timerService}
        timers={runtime.timers}
        allThemes={runtime.allThemes}
        goals={runtime.goals}
        resolveResourcePath={runtime.resolveResourcePath}
        onOpenRecordOrigin={runtime.onOpenRecordOrigin}
        messageRenderPort={runtime.messageRenderPort}
        onOpenRecord={runtime.onOpenRecord}
      />
    </div>
  );
}

function SkillList({ card, runtime }: { card: GoalProgressCardModel; runtime: ProgressRecordRuntimeProps }) {
  const rows = buildProgressSkillRows(card);
  const [openKey, setOpenKey] = useState<string | null>(null);
  if (rows.length === 0) return <div class="think-progress-empty-skill">暂无主题成长记录</div>;

  return (
    <div class="think-progress-skills" role="list">
      {rows.map((row: ProgressSkillRowModel) => {
        const open = openKey === row.key;
        return (
          <div class={`think-progress-skill-group ${open ? 'is-open' : ''}`} key={row.key} role="listitem">
            <button
              type="button"
              class="think-progress-skill think-list-row think-list-row--interactive"
              onClick={() => setOpenKey(open ? null : row.key)}
              aria-expanded={open}
              title={`${row.title} · ${row.points} XP · ${row.count} 条记录`}
            >
              <span class="think-progress-skill__bullet" aria-hidden="true">•</span>
              <span class="think-progress-skill__title">{row.title}</span>
              <span class="think-progress-skill__level">Lv.{row.levelMeta.level}</span>
              <ExperienceBar ratio={row.progressRatio} tone="skill" />
              <span class="think-progress-skill__tail">
                <span class="think-progress-skill__meta">{row.points} XP · {row.count} 条</span>
                <span class="think-progress-skill__chevron" aria-hidden="true"><ThinkIcon name={open ? 'chevron-down' : 'chevron-right'} /></span>
              </span>
            </button>
            {open && <ThemeRecords records={row.recentRecords} runtime={runtime} />}
          </div>
        );
      })}
    </div>
  );
}

export function GoalProgressCard(props: GoalProgressCardProps) {
  const {
    card,
    expanded,
    onToggle,
    module,
    onOpenRecord,
    onOpenRecordOrigin,
    resolveResourcePath,
    messageRenderPort,
    onMarkDone,
    timerService,
    timers,
    allThemes,
    goals,
  } = props;
  const title = getGoalProgressTitle(card);
  const levelMeta = getProgressLevelMeta(card.level);
  const runtime: ProgressRecordRuntimeProps = {
    module,
    onOpenRecord,
    onOpenRecordOrigin,
    resolveResourcePath,
    messageRenderPort,
    onMarkDone,
    timerService,
    timers,
    allThemes,
    goals,
  };

  return (
    <section class="think-progress-section think-progress-card" role="listitem">
      <button type="button" onClick={onToggle} aria-expanded={expanded} class="think-progress-section__trigger think-list-row think-list-row--interactive">
        <span class="think-progress-section__chevron" aria-hidden="true"><ThinkIcon name={expanded ? 'chevron-down' : 'chevron-right'} /></span>
        <span class="think-progress-section__icon">{card.icon || '🧩'}</span>
        <span class="think-progress-section__name">
          <span class="think-progress-section__title">{title}</span>
          <span class="think-progress-section__level-title">{levelMeta.icon} {levelMeta.title}</span>
        </span>
        <span class="think-progress-section__level">Lv.{levelMeta.level}</span>
        <ExperienceBar ratio={card.progressRatio} tone="goal" />
        <span class="think-progress-section__percent">{ratioPercent(card.progressRatio)}</span>
      </button>

      {expanded && (
        <div class="think-progress-section__body">
          <SkillList card={card} runtime={runtime} />
        </div>
      )}
    </section>
  );
}
