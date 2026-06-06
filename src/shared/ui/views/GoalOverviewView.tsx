/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import type { GoalOverviewModel, GoalOverviewRow, Item } from '@core/public';
import { readField } from '@core/public';
import type { OpenQuickCreateHandler, OpenRecordHandler, OpenRecordOriginHandler } from '../../types/actions';

interface GoalOverviewViewProps {
  items?: Item[];
  goalOverviewModel?: GoalOverviewModel;
  onOpenRecord?: OpenRecordHandler;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  onQuickCreate?: OpenQuickCreateHandler;
}

function pct(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value || 0)) * 100)}%`;
}

function formatMetricValue(value: number, unit?: string): string {
  return `${Math.round(value * 100) / 100}${unit || ''}`;
}

function ProgressBar({ ratio }: { ratio: number }) {
  const width = Math.round(Math.max(0, Math.min(1, ratio || 0)) * 100);
  return (
    <div style={{ height: '6px', borderRadius: '999px', background: 'var(--background-modifier-border)', overflow: 'hidden' }}>
      <div style={{ width: `${width}%`, height: '100%', background: 'var(--interactive-accent)' }} />
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div class="think-card" style={{ padding: '12px', border: '1px solid var(--background-modifier-border)', borderRadius: '12px', minWidth: 0 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '4px' }}>{value}</div>
      {hint && <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>{hint}</div>}
    </div>
  );
}

function CoreBlockBadge({ label, count }: { label: string; count: number }) {
  if (!count) return null;
  return (
    <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center', padding: '3px 8px', border: '1px solid var(--background-modifier-border)', borderRadius: '999px', fontSize: '12px', color: 'var(--text-muted)' }}>
      <strong style={{ color: 'var(--text-normal)' }}>{label}</strong>{count}
    </span>
  );
}

function RecentItem({ item, onOpenRecord, onOpenRecordOrigin }: { item: Item; onOpenRecord?: OpenRecordHandler; onOpenRecordOrigin?: OpenRecordOriginHandler }) {
  const title = item.title || item.content || String(readField(item, '内容') ?? '未命名记录');
  const date = item.date || String(readField(item, '日期') ?? '');
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--background-modifier-border-hover)' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '12px', minWidth: '76px' }}>{date || '无日期'}</div>
      <button
        type="button"
        class="clickable-icon"
        style={{ textAlign: 'left', flex: 1, height: 'auto', justifyContent: 'flex-start', color: 'var(--text-normal)' }}
        onClick={() => {
          if (onOpenRecord) onOpenRecord(item);
          else if (onOpenRecordOrigin) onOpenRecordOrigin(item);
        }}
      >
        {title}
      </button>
    </div>
  );
}

function GoalRow({ row, onOpenRecord, onOpenRecordOrigin, onQuickCreate }: { row: GoalOverviewRow; onOpenRecord?: OpenRecordHandler; onOpenRecordOrigin?: OpenRecordOriginHandler; onQuickCreate?: OpenQuickCreateHandler }) {
  if (!row) return null;
  const safeTitle = row.title || row.goalPath || '未命名目标';
  const safeGoalPath = row.goalPath || safeTitle;
  return (
    <div class="think-card goal-overview-row" style={{ padding: '14px', border: '1px solid var(--background-modifier-border)', borderRadius: '14px', display: 'grid', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '16px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{safeTitle}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>{safeGoalPath}</div>
          {row.themePath && <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>主题：{row.themePath}</div>}
          {row.activeCycle && (
            <div style={{ color: row.activeCycle.isOverdue ? 'var(--text-error)' : 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>
              周期：{row.activeCycle.title} · {row.activeCycle.startDate} → {row.activeCycle.endDate} · {pct(row.activeCycle.dayProgressRatio)}
            </div>
          )}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '12px', flexShrink: 0 }}>{row.latestDate ? `最近：${row.latestDate}` : '暂无日期'}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
        <StatCard label="记录" value={row.totalCount} />
        <StatCard label="任务" value={`${row.doneTaskCount}/${row.taskCount}`} hint={`完成率 ${pct(row.completionRatio)}`} />
        <StatCard label="阻碍" value={row.blockerCount} />
        <StatCard label="里程碑" value={row.milestoneCount} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <CoreBlockBadge label="计划" count={row.planCount} />
        <CoreBlockBadge label="总结" count={row.reviewCount} />
        <CoreBlockBadge label="打卡" count={row.habitCount} />
        <CoreBlockBadge label="事件" count={row.evidenceCount} />
        <CoreBlockBadge label="思考" count={row.thoughtCount} />
      </div>

      {row.metricProgress && row.metricProgress.length > 0 && (
        <div style={{ display: 'grid', gap: '8px' }}>
          <div style={{ fontWeight: 600 }}>目标指标</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
            {row.metricProgress.slice(0, 4).map((metric) => (
              <div key={metric.key} style={{ border: '1px solid var(--background-modifier-border)', borderRadius: '10px', padding: '8px', display: 'grid', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '12px' }}>
                  <strong>{metric.label}</strong>
                  <span style={{ color: 'var(--text-muted)' }}>{formatMetricValue(metric.currentValue, metric.unit)}{metric.targetValue !== undefined ? ` / ${formatMetricValue(metric.targetValue, metric.unit)}` : ''}</span>
                </div>
                <ProgressBar ratio={metric.progressRatio} />
              </div>
            ))}
          </div>
        </div>
      )}

      {onQuickCreate && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {[
            { label: '新任务', category: '任务', block: 'core.task' },
            { label: '新计划', category: '计划', block: 'core.plan' },
            { label: '新打卡', category: '打卡', block: 'core.habit' },
            { label: '新事件', category: '事件', block: 'core.evidence' },
            { label: '新阻碍', category: '阻碍项', block: 'core.blocker' },
            { label: '新里程碑', category: '里程碑', block: 'core.milestone' },
          ].map((action) => (
            <button
              key={action.block}
              type="button"
              class="mod-cta"
              style={{ fontSize: '12px', padding: '4px 10px' }}
              onClick={() => onQuickCreate({
                preferredBlockId: action.block,
                title: `${action.label} · ${safeTitle}`,
                cellIdentifier: { category: action.category },
                context: {
                  goalId: row.goalId || '',
                  '目标ID': row.goalId || '',
                  goalPath: safeGoalPath,
                  '目标': safeGoalPath,
                  themePath: row.themePath || '',
                  '主题': row.themePath || '',
                  coreBlock: action.block.replace(/^core\./, ''),
                  '核心Block': action.block.replace(/^core\./, ''),
                  cycleId: row.activeCycle?.id || '',
                  '周期ID': row.activeCycle?.id || '',
                  '周期': row.activeCycle?.title || '',
                  __goalContext: { goalId: row.goalId || null, goalPath: safeGoalPath, themePath: row.themePath || null, cycleId: row.activeCycle?.id || null, cycleTitle: row.activeCycle?.title || null },
                },
              })}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {row.recentItems.length > 0 && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>最近记录</div>
          {row.recentItems.slice(0, 5).map((item) => (
            <RecentItem key={item.id} item={item} onOpenRecord={onOpenRecord} onOpenRecordOrigin={onOpenRecordOrigin} />
          ))}
        </div>
      )}
    </div>
  );
}

export function GoalOverviewView({ goalOverviewModel, onOpenRecord, onOpenRecordOrigin, onQuickCreate }: GoalOverviewViewProps) {
  const model = goalOverviewModel;
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const filteredRows = useMemo(() => {
    const text = query.trim().toLowerCase();
    return (model?.rows || []).filter(Boolean).filter((row) => {
      const statusOk = statusFilter === 'all' || String(row.status || 'active') === statusFilter;
      if (!statusOk) return false;
      if (!text) return true;
      return `${row.title || ''} ${row.goalPath || ''} ${row.themePath || ''}`.toLowerCase().includes(text);
    });
  }, [model?.rows, query, statusFilter]);
  if (!model) return <div>暂无目标总览数据</div>;

  return (
    <div class="goal-overview-view" style={{ display: 'grid', gap: '14px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
        <StatCard label="目标数" value={model.totalGoals} />
        <StatCard label="记录数" value={model.totalRecords} />
        <StatCard label="未挂目标记录" value={model.orphanRecordCount} hint="建议后续迁移/补齐" />
        <StatCard label="当前显示" value={filteredRows.length} />
      </div>

      {model.rows.length > 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) 160px', gap: '8px', alignItems: 'center' }}>
          <input class="think-native-input" value={query} placeholder="搜索目标/主题" onInput={(event: any) => setQuery(event.target.value)} />
          <select class="think-native-input" value={statusFilter} onInput={(event: any) => setStatusFilter(event.target.value)}>
            <option value="all">全部状态</option>
            <option value="active">活跃</option>
            <option value="paused">暂停</option>
            <option value="completed">完成</option>
            <option value="archived">归档</option>
          </select>
        </div>
      )}

      {filteredRows.length === 0 ? (
        <div style={{ color: 'var(--text-muted)' }}>没有匹配的目标记录。可以调整搜索条件，或先从旧 `目标::` 字段生成目标候选。</div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {filteredRows.map((row) => (
            <GoalRow key={row.goalPath} row={row} onOpenRecord={onOpenRecord} onOpenRecordOrigin={onOpenRecordOrigin} onQuickCreate={onQuickCreate} />
          ))}
        </div>
      )}
    </div>
  );
}
