/** @jsxImportSource preact */
import { h } from 'preact';
import type { JSX } from 'preact';
import type { Item } from '@core/types/public';
import {
  buildProgressBlockCountRows,
  buildProgressSkillRows,
  getGoalProgressTitle,
  getProgressLevelMeta,
  progressBarWidth,
  type GoalProgressCardModel,
  type ProgressRecentRecordModel,
  type ProgressSkillRowModel,
} from './ProgressViewModel';

interface GoalProgressCardProps {
  card: GoalProgressCardModel;
  expanded: boolean;
  onToggle: () => void;
  onOpenRecord?: (item: Item) => void;
}

function ExperienceBar({ ratio, tone = 'goal', compact = false }: { ratio: number; tone?: 'goal' | 'skill'; compact?: boolean }) {
  const style = { '--think-progress-ratio': progressBarWidth(ratio) } as JSX.CSSProperties;
  const classes = [
    'think-progress-bar',
    `think-progress-bar--${tone}`,
    compact ? 'think-progress-bar--compact' : '',
  ].filter(Boolean).join(' ');
  return (
    <div class={classes} aria-label={`进度 ${progressBarWidth(ratio)}`}>
      <div class="think-progress-bar__fill" style={style} />
    </div>
  );
}

function SmallSkillRow({ row }: { row: ProgressSkillRowModel }) {
  return (
    <div class="think-progress-skill" title={row.key}>
      <div class="think-progress-skill__title">{row.title}</div>
      <div class="think-progress-skill__level">Lv.{row.levelMeta.level}</div>
      <ExperienceBar ratio={row.progressRatio} tone="skill" />
    </div>
  );
}

function SkillList({ card }: { card: GoalProgressCardModel }) {
  const rows = buildProgressSkillRows(card);
  if (rows.length === 0) return <div class="think-progress-empty-skill">暂无小技能</div>;
  return <div class="think-progress-skills">{rows.map((row) => <SmallSkillRow key={row.key} row={row} />)}</div>;
}

function ExpandedRecords({ records, onOpenRecord }: { records?: ProgressRecentRecordModel[]; onOpenRecord?: (item: Item) => void }) {
  if (!records?.length) return null;
  return (
    <div class="think-progress-records">
      <div class="think-progress-records__title">记录入口</div>
      {records.map((record) => (
        <button
          key={record.id}
          type="button"
          disabled={!onOpenRecord}
          onClick={(event) => {
            event.stopPropagation();
            onOpenRecord?.(record.item);
          }}
          class="think-progress-record"
        >
          <span class="think-progress-record__title">{record.title || '未命名记录'}</span>
          <span class="think-progress-record__date">{record.date || '无日期'}</span>
        </button>
      ))}
    </div>
  );
}

function ExpandedFacts({ card, onOpenRecord }: { card: GoalProgressCardModel; onOpenRecord?: (item: Item) => void }) {
  const blockRows = buildProgressBlockCountRows(card.blockCounts || {});
  return (
    <div class="think-progress-details">
      {blockRows.length > 0 && (
        <div class="think-progress-details__chips">
          {blockRows.map((row) => <span key={row.key} class="think-progress-details__chip">{row.label} {row.count}</span>)}
        </div>
      )}
      <ExpandedRecords records={card.recentRecords} onOpenRecord={onOpenRecord} />
    </div>
  );
}

export function GoalProgressCard({ card, expanded, onToggle, onOpenRecord }: GoalProgressCardProps) {
  const title = getGoalProgressTitle(card);
  const levelMeta = getProgressLevelMeta(card.level);

  return (
    <article class="think-card think-progress-card">
      <button type="button" onClick={onToggle} aria-expanded={expanded} class="think-progress-card__trigger">
        <div class="think-progress-card__icon">{card.icon || '🧩'}</div>
        <div class="think-progress-card__main">
          <div class="think-progress-card__title">{title}</div>
          <ExperienceBar ratio={card.progressRatio} compact />
        </div>
        <div class="think-progress-card__level">
          <span class="think-progress-card__level-icon">{levelMeta.icon}</span>
          <strong class="think-progress-card__level-value">Lv.{levelMeta.level}</strong>
          <strong class="think-progress-card__level-title">{levelMeta.title}</strong>
        </div>
      </button>

      <SkillList card={card} />
      {expanded && <ExpandedFacts card={card} onOpenRecord={onOpenRecord} />}
    </article>
  );
}
