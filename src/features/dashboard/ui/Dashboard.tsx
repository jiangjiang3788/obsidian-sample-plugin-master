// src/features/dashboard/ui/Dashboard.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import { DataStore } from '@core/services/dataStore';
import { DashboardConfig, Item, ModuleConfig } from '@core/domain/schema';
import { ModulePanel } from './ModulePanel';
import type ThinkPlugin from '../../../main';
import { ViewComponents } from '@features/dashboard/ui';
import { getDateRange, dayjs } from '@core/utils/date';
import { filterByRules, sortItems } from '@core/utils/itemFilter';
import { DashboardContext } from './DashboardContext';
import { useDashboardData } from '../hooks'; // <-- 导入新的钩子

const QTXT = ['一', '二', '三', '四'];

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

  // 移除了 force state 和 useEffect 订阅逻辑，因为它们已封装在 useDashboardData 中

  const handleMarkItemDone = (itemId: string) => {
    dataStore.markItemDone(itemId);
  };

  const unit = useMemo(() =>
    (v: string) => ({ 年: 'year', 季: 'quarter', 月: 'month', 周: 'week', 天: 'day' } as any)[v] ?? 'day',
    []);

  const fmt = useMemo(() =>
    (d: dayjs.Dayjs, v: string) =>
      v === '年'
        ? d.format('YYYY年')
        : v === '季'
          ? `${d.year()}年${QTXT[d.quarter() - 1]}季度`
          : v === '月'
            ? d.format('YYYY-MM')
            : v === '周'
              ? d.format('YYYY-[W]WW')
              : d.format('YYYY-MM-DD'),
    []);

  const { startDate, endDate } = useMemo(() => getDateRange(date, view), [date, view]);
  const dateRange: [Date, Date] = useMemo(() => [startDate.toDate(), endDate.toDate()], [startDate, endDate]);

  // 【核心改动】使用自定义钩子获取全局过滤后的数据
  const baseFilteredItems = useDashboardData(dataStore, config, dateRange, kw, plugin);

  const renderModule = (m: ModuleConfig) => {
    const V = (ViewComponents as any)[m.view];
    if (!V)
      return (
        <ModulePanel module={m}>
          <div>未知视图：{m.view}</div>
        </ModulePanel>
      );
    
    // 【核心改动】对每个模块的最终数据进行缓存
    const moduleItems = useMemo(() => {
        console.log(`Calculating items for module: ${m.title}`);
        // 1. 从预处理好的 baseFilteredItems 开始
        let items = baseFilteredItems;
        // 2. 只应用模块自身的过滤和排序规则
        items = filterByRules(items, m.filters || []);
        items = sortItems(items, m.sort || []);
        return items;
    }, [baseFilteredItems, m.filters, m.sort]); // 依赖项是基础数据和模块自身的规则

    // 视图专属的 props (vp) 准备逻辑保持不变
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
          items={moduleItems} // 传递最终为模块计算好的数据
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
        {/* --- 修改 (#12): 条件渲染工具栏 --- */}
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
        {/* --- 修改结束 --- */}

        {/* 模块循环，现在使用重构后的 renderModule */}
        {config.modules.map(renderModule)}
      </div>
    </DashboardContext.Provider>
  );
}