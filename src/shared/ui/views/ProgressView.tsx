/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import type { Item } from '@core/public';

interface GoalProgressCardModel {
  key: string;
  title: string;
  goalPath: string;
  icon?: string | null;
  itemCount: number;
  totalPoints: number;
  level: number;
  currentLevelPoints: number;
  nextLevelPoints: number;
  levelStep: number;
  progressRatio: number;
  matchedCount: number;
  latestDate?: string | null;
  blockCounts: Record<string, number>;
  categoryBreakdown?: Array<{ key: string; points: number; count: number }>;
  themeBreakdown?: Array<{ key: string; points: number; count: number }>;
}

interface ProgressViewProps {
  module: any;
  items?: Item[];
  progressModel?: {
    config: any;
    mode?: 'goal' | 'legacy';
    goalCards?: GoalProgressCardModel[];
    summary?: { goalCount: number; totalPoints: number; totalItems: number };
    result?: any;
  };
}

const BLOCK_LABELS: Record<string, string> = {
  task: '任务',
  plan: '计划',
  review: '总结',
  habit: '打卡',
  blocker: '阻碍项',
  milestone: '里程碑',
  thought: '思考',
  evidence: '事件',
  unknown: '未分类',
};

function ratioPercent(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value || 0)) * 100)}%`;
}

function ProgressBar({ ratio, height = '10px' }: { ratio: number; height?: string }) {
  const width = `${Math.max(0, Math.min(100, Math.round((ratio || 0) * 100)))}%`;
  return (
    <div style={{ height, borderRadius: '999px', background: 'var(--background-modifier-border)', overflow: 'hidden' }}>
      <div style={{ width, height: '100%', borderRadius: '999px', background: 'var(--interactive-accent)', transition: 'width 0.25s ease' }} />
    </div>
  );
}


function leafLabel(path: string): string {
  const parts = String(path || '').split('/').map((part) => part.trim()).filter(Boolean);
  return parts[parts.length - 1] || path || '未设置主题';
}

function ThemeBreakdownList({ rows }: { rows?: Array<{ key: string; points: number; count: number }> }) {
  const visible = (rows || []).filter((row) => row.count > 0).slice(0, 8);
  if (visible.length === 0) return <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>暂无主题细分</div>;

  return (
    <div style={{ display: 'grid', gap: '6px' }}>
      {visible.map((row) => (
        <div key={row.key} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: '8px', fontSize: '12px' }} title={row.key}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{leafLabel(row.key)}</span>
          <span style={{ color: 'var(--text-muted)' }}>{row.count} 条 · {row.points} 经验</span>
        </div>
      ))}
    </div>
  );
}

function BlockCountGrid({ counts }: { counts: Record<string, number> }) {
  const rows = ['task', 'plan', 'review', 'habit', 'blocker', 'milestone', 'thought', 'evidence']
    .map((key) => ({ key, label: BLOCK_LABELS[key] || key, count: Number(counts?.[key] || 0) }))
    .filter((row) => row.count > 0);

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

function GoalProgressCard({ card, expanded, onToggle }: { card: GoalProgressCardModel; expanded: boolean; onToggle: () => void }) {
  const remain = Math.max(0, Number(card.levelStep || 0) - Number(card.currentLevelPoints || 0));
  const title = card.title || card.goalPath || '未命名目标';

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

      {!expanded && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
          <span>任务 {card.blockCounts.task || 0}</span>
          <span>打卡 {card.blockCounts.habit || 0}</span>
          <span>阻碍 {card.blockCounts.blocker || 0}</span>
          <span>里程碑 {card.blockCounts.milestone || 0}</span>
          <span>最近 {card.latestDate || '暂无'}</span>
        </div>
      )}

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

export function ProgressView({ progressModel }: ProgressViewProps) {
  const cards = progressModel?.goalCards || [];
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  if (cards.length === 0) return <div>暂无目标进度数据</div>;

  const summary = progressModel?.summary || {
    goalCount: cards.length,
    totalPoints: cards.reduce((sum, card) => sum + card.totalPoints, 0),
    totalItems: cards.reduce((sum, card) => sum + card.itemCount, 0),
  };

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <div class="think-card" style={{ padding: '14px', border: '1px solid var(--background-modifier-border)', borderRadius: '12px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>目标数</div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px' }}>{summary.goalCount}</div>
        </div>
        <div class="think-card" style={{ padding: '14px', border: '1px solid var(--background-modifier-border)', borderRadius: '12px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>目标经验</div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px' }}>{summary.totalPoints}</div>
        </div>
        <div class="think-card" style={{ padding: '14px', border: '1px solid var(--background-modifier-border)', borderRadius: '12px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>目标记录</div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px' }}>{summary.totalItems}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '12px' }}>
        {cards.map((card) => (
          <GoalProgressCard
            key={card.key}
            card={card}
            expanded={!!expandedKeys[card.key]}
            onToggle={() => setExpandedKeys((prev) => ({ ...prev, [card.key]: !prev[card.key] }))}
          />
        ))}
      </div>
    </div>
  );
}
