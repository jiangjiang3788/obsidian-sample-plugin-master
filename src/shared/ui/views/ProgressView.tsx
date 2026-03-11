/** @jsxImportSource preact */
import { h } from 'preact';

interface ProgressViewProps {
  module: any;
  progressModel?: {
    config: any;
    result: {
      totalPoints: number;
      level: number;
      currentLevelPoints: number;
      nextLevelPoints: number;
      progressRatio: number;
      matchedCount: number;
      categoryBreakdown: Array<{ key: string; points: number; count: number }>;
      themeBreakdown: Array<{ key: string; points: number; count: number }>;
    };
  };
}

function ProgressBar({ ratio }: { ratio: number }) {
  const width = `${Math.max(0, Math.min(100, Math.round((ratio || 0) * 100)))}%`;
  return (
    <div style={{ height: '10px', borderRadius: '999px', background: 'var(--background-modifier-border)', overflow: 'hidden' }}>
      <div style={{ width, height: '100%', borderRadius: '999px', background: 'var(--interactive-accent)' }} />
    </div>
  );
}

function BreakdownList({ title, rows }: { title: string; rows: Array<{ key: string; points: number; count: number }> }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontWeight: 600, marginBottom: '8px' }}>{title}</div>
      {rows.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>暂无数据</div>
      ) : rows.map(row => (
        <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '6px 0', borderBottom: '1px solid var(--background-modifier-border-hover)' }}>
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.key}</span>
          <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{row.points} 分 · {row.count} 条</span>
        </div>
      ))}
    </div>
  );
}

export function ProgressView({ progressModel }: ProgressViewProps) {
  const result = progressModel?.result;
  const config = progressModel?.config;
  if (!result || !config) return <div>暂无积分数据</div>;

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <div class="think-card" style={{ padding: '14px', border: '1px solid var(--background-modifier-border)', borderRadius: '12px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>总积分</div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px' }}>{result.totalPoints}</div>
        </div>
        <div class="think-card" style={{ padding: '14px', border: '1px solid var(--background-modifier-border)', borderRadius: '12px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>当前等级</div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px' }}>Lv.{result.level}</div>
        </div>
        <div class="think-card" style={{ padding: '14px', border: '1px solid var(--background-modifier-border)', borderRadius: '12px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>计分记录</div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px' }}>{result.matchedCount}</div>
        </div>
      </div>

      <div class="think-card" style={{ padding: '14px', border: '1px solid var(--background-modifier-border)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
          <div style={{ fontWeight: 600 }}>升级进度</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            {result.currentLevelPoints}/{Math.max(1, config.levelStep)} · 下一级 {result.nextLevelPoints} 分
          </div>
        </div>
        <ProgressBar ratio={result.progressRatio} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {config.showCategoryBreakdown !== false && <BreakdownList title="分类积分" rows={result.categoryBreakdown} />}
        {config.showThemeBreakdown !== false && <BreakdownList title="主题积分" rows={result.themeBreakdown} />}
      </div>
    </div>
  );
}
