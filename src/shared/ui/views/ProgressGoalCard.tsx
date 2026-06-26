/** @jsxImportSource preact */
import { h } from 'preact';
import type { Item } from '@core/public';
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
  const background = tone === 'goal'
    ? 'linear-gradient(90deg, #8b5cf6 0%, #c084fc 54%, #f59e0b 100%)'
    : 'linear-gradient(90deg, #10b981 0%, #a7f3d0 100%)';
  return (
    <div style={{ width: compact ? '180px' : 'min(100%, 260px)', height: tone === 'goal' ? '10px' : '9px', borderRadius: '999px', background: '#e7dfd2', overflow: 'hidden' }}>
      <div style={{ width: progressBarWidth(ratio), height: '100%', borderRadius: '999px', background }} />
    </div>
  );
}

function SmallSkillRow({ row }: { row: ProgressSkillRowModel }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 220px) 64px minmax(140px, 260px)', gap: '14px', alignItems: 'center', padding: '12px 14px', border: '1px solid #eadfce', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.82)' }} title={row.key}>
      <div style={{ fontWeight: 800, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#181411' }}>{row.title}</div>
      <div style={{ fontWeight: 900, color: '#8b5cf6', whiteSpace: 'nowrap' }}>Lv.{row.levelMeta.level}</div>
      <ExperienceBar ratio={row.progressRatio} tone="skill" />
    </div>
  );
}

function SkillList({ card }: { card: GoalProgressCardModel }) {
  const rows = buildProgressSkillRows(card);
  if (rows.length === 0) {
    return <div style={{ padding: '12px 14px', border: '1px solid #eadfce', borderRadius: '16px', color: '#8d8377', background: 'rgba(255, 255, 255, 0.72)' }}>暂无小技能</div>;
  }

  return (
    <div style={{ display: 'grid', gap: '10px' }}>
      {rows.map((row) => <SmallSkillRow key={row.key} row={row} />)}
    </div>
  );
}

function ExpandedRecords({ records, onOpenRecord }: { records?: ProgressRecentRecordModel[]; onOpenRecord?: (item: Item) => void }) {
  if (!records?.length) return null;
  return (
    <div style={{ display: 'grid', gap: '8px', paddingTop: '2px' }}>
      <div style={{ fontWeight: 800, color: '#181411' }}>记录入口</div>
      {records.map((record) => (
        <button
          key={record.id}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenRecord?.(record.item);
          }}
          style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '12px', alignItems: 'center', padding: '10px 12px', border: '1px solid #eadfce', borderRadius: '14px', background: '#fffdf8', color: 'inherit', textAlign: 'left', cursor: onOpenRecord ? 'pointer' : 'default' }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.title || '未命名记录'}</span>
          <span style={{ color: '#8d8377', fontSize: '12px' }}>{record.date || '无日期'}</span>
        </button>
      ))}
    </div>
  );
}

function ExpandedFacts({ card, onOpenRecord }: { card: GoalProgressCardModel; onOpenRecord?: (item: Item) => void }) {
  const blockRows = buildProgressBlockCountRows(card.blockCounts || {});
  return (
    <div style={{ display: 'grid', gap: '12px', borderTop: '1px solid #eadfce', paddingTop: '14px' }}>
      {blockRows.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {blockRows.map((row) => <span key={row.key} style={{ padding: '6px 10px', borderRadius: '999px', background: '#f3ecdf', color: '#6f655b', fontSize: '12px' }}>{row.label} {row.count}</span>)}
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
    <article class="think-card" style={{ width: 'min(100%, 760px)', padding: '16px', border: '1px solid #e8dccb', borderRadius: '22px', background: 'linear-gradient(135deg, #fffdf8 0%, #fffaf1 100%)', boxShadow: 'none', display: 'grid', gap: '14px' }}>
      <button type="button" onClick={onToggle} aria-expanded={expanded} style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', gap: '14px', alignItems: 'center', padding: 0, border: 'none', background: 'transparent', color: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
        <div style={{ width: '50px', height: '50px', borderRadius: '18px', border: '1px solid #eadfce', background: '#fbf3e5', display: 'grid', placeItems: 'center', fontSize: '28px', boxShadow: 'none' }}>{card.icon || '🧩'}</div>
        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ fontSize: '24px', lineHeight: 1.1, fontWeight: 900, letterSpacing: '-0.04em', color: '#181411', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>{title}</div>
          <ExperienceBar ratio={card.progressRatio} compact />
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: '1px solid #eadfce', borderRadius: '999px', background: 'rgba(255, 255, 255, 0.72)', boxShadow: 'none', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: '18px' }}>{levelMeta.icon}</span>
          <strong style={{ color: '#8b5cf6', fontSize: '17px' }}>Lv.{levelMeta.level}</strong>
          <strong style={{ fontSize: '15px', color: '#181411' }}>{levelMeta.title}</strong>
        </div>
      </button>

      <SkillList card={card} />
      {expanded && <ExpandedFacts card={card} onOpenRecord={onOpenRecord} />}
    </article>
  );
}
