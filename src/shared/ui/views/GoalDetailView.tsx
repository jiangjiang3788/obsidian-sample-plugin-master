/** DEPRECATED: GoalOverview / GoalDetail are legacy compatibility files. New views must use ProgressView / StatisticsView. */
/** @jsxImportSource preact */
import { h } from 'preact';
import type { GoalOverviewModel, GoalOverviewRow } from '@core/public';

interface GoalDetailDistributionItem {
  key?: string;
  label: string;
  count: number;
  ratio?: number;
}

interface GoalDetailStatisticsModel {
  row?: GoalOverviewRow | null;
  overview?: GoalOverviewModel;
  statusSummary?: {
    total: number;
    doneTasks: number;
    openTasks: number;
    completionRatio: number;
  };
  blockDistribution?: GoalDetailDistributionItem[];
  periodDistribution?: Array<{ periodId: string; label: string; count: number }>;
  matchingRecordCount?: number;
}

interface GoalDetailViewProps {
  goalDetailModel?: GoalDetailStatisticsModel | GoalOverviewModel;
  goalOverviewModel?: GoalOverviewModel;
}

function pct(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value || 0)) * 100)}%`;
}

function isStatisticsModel(model: GoalDetailViewProps['goalDetailModel']): model is GoalDetailStatisticsModel {
  return !!model && ('blockDistribution' in model || 'statusSummary' in model || 'overview' in model);
}

function resolveRow(model?: GoalDetailStatisticsModel | GoalOverviewModel | null, fallback?: GoalOverviewModel): GoalOverviewRow | null {
  if (!model && !fallback) return null;
  if (isStatisticsModel(model)) return model.row || model.overview?.selectedRow || (model.overview?.rows.length === 1 ? model.overview.rows[0] : null) || null;
  const overview = (model as GoalOverviewModel) || fallback;
  return overview?.selectedRow || (overview?.rows.length === 1 ? overview.rows[0] : null) || null;
}

function DistributionBar({ label, count, ratio }: { label: string; count: number; ratio: number }) {
  return (
    <div style={{ display: 'grid', gap: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
        <span>{label}</span><strong>{count}</strong>
      </div>
      <div style={{ height: '6px', borderRadius: '999px', background: 'var(--background-modifier-border)', overflow: 'hidden' }}>
        <div style={{ width: pct(ratio), height: '100%', background: 'var(--interactive-accent)' }} />
      </div>
    </div>
  );
}

function defaultBlockDistribution(row: GoalOverviewRow): GoalDetailDistributionItem[] {
  const total = Math.max(1, row.totalCount || 0);
  return [
    ['任务', row.taskCount],
    ['计划', row.planCount],
    ['总结', row.reviewCount],
    ['打卡', row.habitCount],
    ['事件', row.evidenceCount],
    ['阻碍项', row.blockerCount],
    ['里程碑', row.milestoneCount],
    ['思考', row.thoughtCount],
  ].map(([label, count]) => ({ label: String(label), count: Number(count), ratio: Number(count) / total }));
}

function GoalStatistics({ row, model }: { row: GoalOverviewRow; model?: GoalDetailStatisticsModel | null }) {
  const summary = model?.statusSummary || { total: row.totalCount, doneTasks: row.doneTaskCount, openTasks: row.openTaskCount, completionRatio: row.completionRatio };
  const blockDistribution = model?.blockDistribution?.length ? model.blockDistribution : defaultBlockDistribution(row);
  const periodDistribution = model?.periodDistribution || [];
  const maxPeriodCount = Math.max(1, ...periodDistribution.map((item) => item.count));
  return (
    <div class="goal-detail-view" style={{ display: 'grid', gap: '12px' }}>
      <div class="think-card" style={{ padding: '14px', border: '1px solid var(--background-modifier-border)', borderRadius: '12px' }}>
        <div style={{ fontSize: '18px', fontWeight: 700 }}>{row.icon ? `${row.icon} ` : ''}{row.title || row.goalPath}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>{row.goalPath}</div>
        {row.themePath && <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>主题：{row.themePath}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
        <div class="think-card" style={{ padding: '10px', border: '1px solid var(--background-modifier-border)', borderRadius: '10px' }}>总记录<br/><strong>{summary.total}</strong></div>
        <div class="think-card" style={{ padding: '10px', border: '1px solid var(--background-modifier-border)', borderRadius: '10px' }}>任务完成<br/><strong>{summary.doneTasks}/{row.taskCount}</strong></div>
        <div class="think-card" style={{ padding: '10px', border: '1px solid var(--background-modifier-border)', borderRadius: '10px' }}>未完成任务<br/><strong>{summary.openTasks}</strong></div>
        <div class="think-card" style={{ padding: '10px', border: '1px solid var(--background-modifier-border)', borderRadius: '10px' }}>完成率<br/><strong>{pct(summary.completionRatio)}</strong></div>
        <div class="think-card" style={{ padding: '10px', border: '1px solid var(--background-modifier-border)', borderRadius: '10px' }}>最近记录<br/><strong>{row.latestDate || '无'}</strong></div>
      </div>

      {row.activeCycle && (
        <div class="think-card" style={{ padding: '12px', border: '1px solid var(--background-modifier-border)', borderRadius: '12px' }}>
          <div style={{ fontWeight: 700 }}>当前推导周期</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>{row.activeCycle.title} · {row.activeCycle.startDate} → {row.activeCycle.endDate}</div>
          <div style={{ height: '6px', borderRadius: '999px', background: 'var(--background-modifier-border)', overflow: 'hidden', marginTop: '8px' }}>
            <div style={{ width: pct(row.activeCycle.dayProgressRatio), height: '100%', background: 'var(--interactive-accent)' }} />
          </div>
        </div>
      )}

      <div class="think-card" style={{ padding: '12px', border: '1px solid var(--background-modifier-border)', borderRadius: '12px', display: 'grid', gap: '10px' }}>
        <div style={{ fontWeight: 700 }}>Block 分布</div>
        {blockDistribution.map((item) => <DistributionBar key={item.key || item.label} label={item.label} count={item.count} ratio={item.ratio ?? item.count / Math.max(1, row.totalCount)} />)}
      </div>

      <div class="think-card" style={{ padding: '12px', border: '1px solid var(--background-modifier-border)', borderRadius: '12px', display: 'grid', gap: '10px' }}>
        <div style={{ fontWeight: 700 }}>周期分布</div>
        {periodDistribution.length ? periodDistribution.map((item) => (
          <DistributionBar key={item.periodId} label={item.label} count={item.count} ratio={item.count / maxPeriodCount} />
        )) : <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>暂无周期分布数据</div>}
      </div>
    </div>
  );
}

export function GoalDetailView({ goalDetailModel, goalOverviewModel }: GoalDetailViewProps) {
  const row = resolveRow(goalDetailModel, goalOverviewModel);
  if (!goalDetailModel && !goalOverviewModel) return <div>暂无目标统计数据</div>;
  if (!row) return <div style={{ color: 'var(--text-muted)' }}>请在视图配置中填写固定目标路径，以展示单目标统计。</div>;
  return <GoalStatistics row={row} model={isStatisticsModel(goalDetailModel) ? goalDetailModel : null} />;
}
