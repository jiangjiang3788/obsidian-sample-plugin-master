// src/features/dashboard/ui/Dashboard.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { DataStore } from '@core/services/dataStore';
import { DashboardConfig, ModuleConfig } from '@core/domain/schema';
import { ModulePanel } from './ModulePanel';
import type ThinkPlugin from '../../../main';
import { TFile, TFolder } from 'obsidian';
import { ViewComponents } from '@features/dashboard/ui';
import { getDateRange, dayjs } from '@core/utils/date';
import {
  filterByRules,
  sortItems,
  filterByDateRange,
  filterByKeyword,
} from '@core/utils/itemFilter';

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
  const [, force] = useState(0);

  /* 数据层变动后强制刷新 */
  useEffect(() => {
    const fn = () => force(v => v + 1);
    dataStore.subscribe(fn);
    return () => dataStore.unsubscribe(fn);
  }, [dataStore]);

  /* 小工具 */
  const unit = (v: string) =>
    ({ 年: 'year', 季: 'quarter', 月: 'month', 周: 'week', 天: 'day' } as any)[v] ??
    'day';
  const fmt = (d: any, v: string) =>
    v === '年'
      ? d.format('YYYY年')
      : v === '季'
      ? `${d.year()}年${QTXT[d.quarter() - 1]}季度`
      : v === '月'
      ? d.format('YYYY-MM')
      : v === '周'
      ? d.format('YYYY-[W]WW')
      : d.format('YYYY-MM-DD');

  const { startDate, endDate } = getDateRange(date, view);

  /* ---------------- Module 渲染 ---------------- */
  const renderModule = (m: ModuleConfig & { groups?: string[] }) => {
    const V = (ViewComponents as any)[m.view];
    if (!V)
      return (
        <ModulePanel module={m}>
          <div>未知视图：{m.view}</div>
        </ModulePanel>
      );

    /* ① 采集并过滤数据 */
    let items = dataStore.queryItems();
    items = filterByRules(items, m.filters || []);
    items = filterByDateRange(
      items,
      startDate.format('YYYY-MM-DD'),
      endDate.format('YYYY-MM-DD'),
    );
    items = filterByKeyword(items, kw);

    /* ② 仪表盘级 path / tag */
    if (config.tags?.length) {
      items = items.filter(it =>
        it.tags.some(t => config.tags!.some(x => t.includes(x))),
      );
    }
    if (config.path?.trim()) {
      const target = config.path.trim();
      const af = (dataStore as any)['app'].vault.getAbstractFileByPath(target);
      const keep = (p: string) =>
        af instanceof TFolder
          ? p.startsWith(target.endsWith('/') ? target : target + '/')
          : af instanceof TFile
          ? p.startsWith(target + '#')
          : p.startsWith(target.endsWith('/') ? target : target + '/');
      items = items.filter(it => keep(it.id));
    }

    /* ③ 排序 */
    items = sortItems(items, m.sort || []);

    /* ④ 视图 props 拼装 ------------------------------------ */
    const vp: any = { ...(m.props || {}) };

    // 默认分组：BlockView 在缺省时按 categoryKey 分组
    if ((m as any).groups?.length) {
      vp.groupField = (m as any).groups[0];
    } else if (m.view === 'BlockView' && vp.groupField == null) {
      vp.groupField = 'categoryKey';
    }

    if (m.view === 'TableView') {
      vp.rowField = (m as any).rowField || '';
      vp.colField = (m as any).colField || '';
    }
    if (m.fields?.length) vp.fields = m.fields;

    return (
      <ModulePanel module={m}>
        <V items={items} {...vp} />
      </ModulePanel>
    );
  };

  /* ---------------- 页面 ---------------- */
  return (
    <div>
      {/* 顶栏 */}
      <div class="tp-toolbar" style="margin-bottom:8px;">
        {['年', '季', '月', '周', '天'].map(v => (
          <button onClick={() => setView(v)} class={v === view ? 'active' : ''}>
            {v}
          </button>
        ))}
        <button disabled style="font-weight:bold;margin:0 4px;background:#fff;">
          {fmt(date, view)}
        </button>
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

      {/* 模块循环 */}
      {config.modules.map(renderModule)}
    </div>
  );
}