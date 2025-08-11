// src/features/dashboard/ui/Dashboard.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import { DataStore } from '@core/services/dataStore';
import { DashboardConfig, Item, ModuleConfig } from '@core/domain/schema';
import { ModulePanel } from './ModulePanel';
import type ThinkPlugin from '../../../main';
import { ViewComponents } from '@features/dashboard/ui';
// --- 修改：导入新的工具函数，并移除 dayjs 的直接导入 ---
import { getDateRange, dayjs, formatDateForView } from '@core/utils/date';
import { filterByRules, sortItems } from '@core/utils/itemFilter';
import { DashboardContext } from './DashboardContext';
import { useDashboardData } from '../hooks';

// const QTXT = ['一', '二', '三', '四']; // <--- 移除：该逻辑已移入 date.ts

interface Props {
  config: DashboardConfig;
  dataStore: DataStore;
  plugin: ThinkPlugin;
}

export function Dashboard({ config, dataStore, plugin }: Props) {
  const [view, setView] = useState(config.initialView || '月');
  const [date, setDate] = useState(
    config.initialDate ? dayjs(config.initialDate) : dayjs(),
  );
  const [kw, setKw] = useState('');

  const handleMarkItemDone = (itemId: string) => {
    dataStore.markItemDone(itemId);
  };

  const unit = useMemo(() =>
    (v: string) => ({ 年: 'year', 季: 'quarter', 月: 'month', 周: 'week', 天: 'day' } as any)[v] ?? 'day',
    []);

  // --- 修改：fmt 函数现在变得极其简单和干净 ---
  const fmt = useMemo(() => formatDateForView, []);

  const { startDate, endDate } = useMemo(() => getDateRange(date, view), [date, view]);
  const dateRange: [Date, Date] = useMemo(() => [startDate.toDate(), endDate.toDate()], [startDate, endDate]);

  const baseFilteredItems = useDashboardData(dataStore, config, dateRange, kw, plugin);

  const renderModule = (m: ModuleConfig) => {
    const V = (ViewComponents as any)[m.view];
    if (!V)
      return (
        <ModulePanel module={m}>
          <div>未知视图：{m.view}</div>
        </ModulePanel>
      );
    
    const moduleItems = useMemo(() => {
        console.log(`Calculating items for module: ${m.title}`);
        let items = baseFilteredItems;
        items = filterByRules(items, m.filters || []);
        items = sortItems(items, m.sort || []);
        return items;
    }, [baseFilteredItems, m.filters, m.sort]); 

    const vp: any = { ...(m.props || {}) };
    vp.groupField = m.group;
    if (m.view === 'BlockView' && !vp.groupField) {
        vp.groupField = 'categoryKey';
    }
    if (m.view === 'TableView') {
      vp.rowField = m.rowField || '';
      vp.colField = m.colField || '';
    }
    if (m.fields?.length) vp.fields = m.fields;
    if (m.view === 'TimelineView' && m.viewConfig) {
      vp.viewConfig = m.viewConfig;
    }

    return (
      <ModulePanel module={m}>
        <V
          items={moduleItems} 
          module={m}
          dateRange={dateRange}
          {...vp}
        />
      </ModulePanel>
    );
  };

  return (
    <DashboardContext.Provider value={{ onMarkItemDone: handleMarkItemDone }}>
      <div>
        {!config.hideToolbar && (
            <div class="tp-toolbar" style="margin-bottom:8px;">
                {['年', '季', '月', '周', '天'].map(v => (
                    <button onClick={() => setView(v)} class={v === view ? 'active' : ''}>{v}</button>
                ))}
                <button disabled style="font-weight:bold;margin:0 4px;background:#fff;">{fmt(date, view)}</button>
                <button onClick={() => setDate(date.clone().subtract(1, unit(view)))}>←</button>
                <button onClick={() => setDate(date.clone().add(1, unit(view)))}>→</button>
                <button onClick={() => setDate(dayjs())}>＝</button>
                <input
                  placeholder="快速过滤…"
                  style="margin-left:4px;"
                  value={kw}
                  onInput={e => setKw((e.target as HTMLInputElement).value)}
                />
                <button
                  style="margin-left:4px;"
                  onClick={() => plugin.openSettingsForDashboard(config.name)}
                  title="在插件设置中编辑本仪表盘"
                >
                  ⚙︎
                </button>
            </div>
        )}

        {config.modules.map(renderModule)}
      </div>
    </DashboardContext.Provider>
  );
}