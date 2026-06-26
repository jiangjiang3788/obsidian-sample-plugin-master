/** @jsxImportSource preact */
import { h } from 'preact';
import {
  buildProgressBlockCountRows,
  buildProgressCollapsedFacts,
  getGoalProgressRemainingPoints,
  getGoalProgressTitle,
  getProgressLeafLabel,
  getVisibleProgressThemeBreakdown,
  progressBarWidth,
  ratioPercent,
  type GoalProgressCardModel,
} from './ProgressViewModel';

function ProgressBar({ ratio, height = '10px' }: { ratio: number; height?: string }) {
  return (
    <div style={{ height, borderRadius: '999px', background: 'var(--background-modifier-border)', overflow: 'hidden' }}>
      <div style={{ width: progressBarWidth(ratio), height: '100%', borderRadius: '999px', background: 'var(--interactive-accent)', transition: 'width 0.25s ease' }} />
    </div>
  );
}

function ThemeBreakdownList({ rows }: { rows?: Array<{ key: string; points: number; count: number }> }) {
  const visible = getVisibleProgressThemeBreakdown(rows);
  if (visible.length === 0) return <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>暂无主题细分</div>;

  return (
    <div style={{ display: 'grid', gap: '6px' }}>
      {visible.map((row) => (
        <div key={row.key} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: '8px', fontSize: '12px' }} title={row.key}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getProgressLeafLabel(row.key)}</span>
          <span style={{ color: 'var(--text-muted)' }}>{row.count} 条 · {row.points} 经验</span>
        </div>
      ))}
    </div>
  );
}

function BlockCountGrid({ counts }: { counts: Record<string, number> }) {
  const rows = buildProgressBlockCountRows(counts);
  if (rows.length === 0) return <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>暂无 Block 统计</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(86px, 1fr))', gap: '8px' }}>
      {rows.map((row) => (
        <div key={row.key} style={{ border: '1px solid var(--background-modifier-border)', borderRadius: '10px', padding: '8px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{row.label}</div>
          <div style={{ fontWeight: 700, marginTop: '2px' }}>{row.count}</div>
        </div>
      ))}
    </div>
  );
}

function CollapsedProgressFacts({ card }: { card: GoalProgressCardModel }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
      {buildProgressCollapsedFacts(card).map((fact) => (
        <span key={fact.key}>{fact.label} {fact.value}</span>
      ))}
    </div>
  );
}

export function GoalProgressCard({ card, expanded, onToggle }: { card: GoalProgressCardModel; expanded: boolean; onToggle: () => void }) {
  const remain = getGoalProgressRemainingPoints(card);
  const title = getGoalProgressTitle(card);

  return (
    <div class="think-card" style={{ padding: '14px', border: '1px solid var(--background-modifier-border)', borderRadius: '12px', display: 'grid', gap: '10px' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center', padding: 0, border: 'none', background: 'transparent', color: 'inherit', textAlign: 'left', cursor: 'pointer' }}
        aria-expanded={expanded}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{ fontSize: '18px', lineHeight: 1 }}>{card.icon || '🎯'}</span>
            <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</strong>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {card.goalPath}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 700 }}>Lv.{card.level}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{expanded ? '收起' : '展开'}</div>
        </div>
      </button>

      <div style={{ display: 'grid', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '12px' }}>
          <span>{card.totalPoints} 经验 · {card.itemCount} 条记录</span>
          <span>{ratioPercent(card.progressRatio)}</span>
        </div>
        <ProgressBar ratio={card.progressRatio} height="8px" />
      </div>

      {!expanded && <CollapsedProgressFacts card={card} />}

      {expanded && (
        <div style={{ display: 'grid', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
            <div><div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>总经验</div><strong>{card.totalPoints}</strong></div>
            <div><div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>当前等级</div><strong>Lv.{card.level}</strong></div>
            <div><div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>距下一级</div><strong>{remain}</strong></div>
            <div><div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>最近更新</div><strong>{card.latestDate || '暂无'}</strong></div>
          </div>
          <BlockCountGrid counts={card.blockCounts || {}} />
          <div style={{ borderTop: '1px solid var(--background-modifier-border)', paddingTop: '10px', display: 'grid', gap: '6px' }}>
            <div style={{ fontWeight: 600, fontSize: '13px' }}>主题细分</div>
            <ThemeBreakdownList rows={card.themeBreakdown} />
          </div>
        </div>
      )}
    </div>
  );
}
