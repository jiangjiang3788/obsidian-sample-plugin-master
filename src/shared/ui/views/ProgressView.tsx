/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import type { Item } from '@core/public';
import { getThemeLevelData } from '@core/public';

interface ProgressViewProps {
  module: any;
  items?: Item[];
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

function ProgressBar({ ratio, color = 'var(--interactive-accent)', height = '10px' }: { ratio: number; color?: string; height?: string }) {
  const width = `${Math.max(0, Math.min(100, Math.round((ratio || 0) * 100)))}%`;
  return (
    <div style={{ height, borderRadius: '999px', background: 'var(--background-modifier-border)', overflow: 'hidden' }}>
      <div style={{ width, height: '100%', borderRadius: '999px', background: color, transition: 'width 0.25s ease' }} />
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

function ThemeGrowthSection({ items, config }: { items: Item[]; config: any }) {
  const rows = useMemo(() => {
    const allowed = new Set((config?.includedCategories || []).filter(Boolean));
    const themeMap = new Map<string, Item[]>();

    for (const item of items || []) {
      const category = (item.categoryKey || '').split('/')[0] || item.categoryKey || '未分类';
      if (allowed.size > 0 && !allowed.has(category)) continue;

      const theme = item.theme || '未设置主题';
      const bucket = themeMap.get(theme) || [];
      bucket.push(item);
      themeMap.set(theme, bucket);
    }

    return Array.from(themeMap.entries())
      .map(([theme, themeItems]) => ({
        theme,
        itemCount: themeItems.length,
        levelData: getThemeLevelData(themeItems),
      }))
      .sort((a, b) => {
        const checkDiff = b.levelData.totalChecks - a.levelData.totalChecks;
        if (checkDiff !== 0) return checkDiff;
        const itemDiff = b.itemCount - a.itemCount;
        if (itemDiff !== 0) return itemDiff;
        return a.theme.localeCompare(b.theme, 'zh-CN');
      })
      .slice(0, Math.max(1, config?.topN || 5));
  }, [items, config]);

  if (rows.length === 0) return null;

  return (
    <div style={{ display: 'grid', gap: '10px' }}>
      <div style={{ fontWeight: 600 }}>主题经验</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        {rows.map(({ theme, itemCount, levelData }) => {
          const remain = levelData.nextRequirement ? Math.max(0, levelData.nextRequirement - levelData.totalChecks) : 0;
          return (
            <div key={theme} class="think-card" style={{ padding: '14px', border: '1px solid var(--background-modifier-border)', borderRadius: '12px', display: 'grid', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{ fontSize: '18px', lineHeight: 1 }}>{levelData.config.icon}</span>
                    <span style={{ fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{theme}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                    Lv.{levelData.level} · {levelData.config.title}
                  </div>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', flexShrink: 0, textAlign: 'right' }}>
                  {levelData.totalChecks} 经验
                </div>
              </div>

              <ProgressBar ratio={levelData.progress} color={levelData.config.color} height="8px" />

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>
                <span>{itemCount} 条记录</span>
                <span>
                  {levelData.nextConfig
                    ? `再 ${remain} 次到 ${levelData.nextConfig.icon} ${levelData.nextConfig.title}`
                    : '已满级'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProgressView({ items = [], progressModel }: ProgressViewProps) {
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

      {config.showThemeBreakdown !== false && <ThemeGrowthSection items={items} config={config} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {config.showCategoryBreakdown !== false && <BreakdownList title="分类积分" rows={result.categoryBreakdown} />}
        {config.showThemeBreakdown !== false && <BreakdownList title="主题积分" rows={result.themeBreakdown} />}
      </div>
    </div>
  );
}
