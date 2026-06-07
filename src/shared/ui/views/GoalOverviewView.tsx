/** DEPRECATED: GoalOverview / GoalDetail are legacy compatibility files. New views must use ProgressView / StatisticsView. */
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import type { GoalOverviewModel, GoalOverviewRow } from '@core/public';

interface GoalOverviewViewProps {
  goalOverviewModel?: GoalOverviewModel;
}

function pct(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value || 0)) * 100)}%`;
}

function ProgressBar({ ratio }: { ratio: number }) {
  const width = Math.round(Math.max(0, Math.min(1, ratio || 0)) * 100);
  return (
    <div style={{ height: '7px', borderRadius: '999px', background: 'var(--background-modifier-border)', overflow: 'hidden' }}>
      <div style={{ width: `${width}%`, height: '100%', background: 'var(--interactive-accent)' }} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
      {label}<strong style={{ color: 'var(--text-normal)' }}>{value}</strong>
    </span>
  );
}

function goalScore(row: GoalOverviewRow): number {
  const taskRatio = row.taskCount > 0 ? row.doneTaskCount / row.taskCount : 0;
  const activity = Math.min(1, (row.habitCount + row.planCount + row.reviewCount + row.milestoneCount) / 8);
  const blockerPenalty = Math.min(0.4, row.blockerCount * 0.08);
  return Math.max(0, Math.min(1, taskRatio * 0.6 + activity * 0.4 - blockerPenalty));
}

function GoalProgressRow({ row }: { row: GoalOverviewRow }) {
  const score = goalScore(row);
  const title = row.title || row.goalPath || '未命名目标';
  return (
    <div class="think-card goal-progress-row" style={{ padding: '12px', border: '1px solid var(--background-modifier-border)', borderRadius: '12px', display: 'grid', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row.icon ? `${row.icon} ` : ''}{title}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>{row.goalPath}</div>
          {row.themePath && <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>主题：{row.themePath}</div>}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 700 }}>{pct(score)}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{row.status || 'active'}</div>
        </div>
      </div>
      <ProgressBar ratio={score} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        <Stat label="任务" value={`${row.doneTaskCount}/${row.taskCount}`} />
        <Stat label="打卡" value={row.habitCount} />
        <Stat label="阻碍" value={row.blockerCount} />
        <Stat label="里程碑" value={row.milestoneCount} />
        <Stat label="最近" value={row.latestDate || '无'} />
      </div>
      {row.activeCycle && (
        <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
          当前周期：{row.activeCycle.title} · {row.activeCycle.startDate} → {row.activeCycle.endDate} · 时间进度 {pct(row.activeCycle.dayProgressRatio)}
        </div>
      )}
    </div>
  );
}

export function GoalOverviewView({ goalOverviewModel }: GoalOverviewViewProps) {
  const model = goalOverviewModel;
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const filteredRows = useMemo(() => {
    const text = query.trim().toLowerCase();
    return (model?.rows || []).filter((row) => {
      const statusOk = statusFilter === 'all' || String(row.status || 'active') === statusFilter;
      if (!statusOk) return false;
      if (!text) return true;
      return `${row.title || ''} ${row.goalPath || ''} ${row.themePath || ''}`.toLowerCase().includes(text);
    });
  }, [model?.rows, query, statusFilter]);

  if (!model) return <div>暂无目标进度数据</div>;

  return (
    <div class="goal-overview-view" style={{ display: 'grid', gap: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
        <div class="think-card" style={{ padding: '10px', border: '1px solid var(--background-modifier-border)', borderRadius: '10px' }}>目标：<strong>{model.totalGoals}</strong></div>
        <div class="think-card" style={{ padding: '10px', border: '1px solid var(--background-modifier-border)', borderRadius: '10px' }}>记录：<strong>{model.totalRecords}</strong></div>
        <div class="think-card" style={{ padding: '10px', border: '1px solid var(--background-modifier-border)', borderRadius: '10px' }}>未挂目标：<strong>{model.orphanRecordCount}</strong></div>
        <div class="think-card" style={{ padding: '10px', border: '1px solid var(--background-modifier-border)', borderRadius: '10px' }}>显示：<strong>{filteredRows.length}</strong></div>
      </div>

      {model.rows.length > 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) 150px', gap: '8px' }}>
          <input class="think-native-input" value={query} placeholder="搜索目标/主题" onInput={(event: any) => setQuery(event.target.value)} />
          <select class="think-native-input" value={statusFilter} onInput={(event: any) => setStatusFilter(event.target.value)}>
            <option value="all">全部</option>
            <option value="active">活跃</option>
            <option value="paused">暂停</option>
            <option value="completed">完成</option>
            <option value="archived">归档</option>
          </select>
        </div>
      )}

      {filteredRows.length === 0 ? (
        <div style={{ color: 'var(--text-muted)' }}>暂无目标进度。</div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {filteredRows.map((row) => <GoalProgressRow key={row.goalPath} row={row} />)}
        </div>
      )}
    </div>
  );
}
