// src/views/Dashboard.tsx
//-----------------------------------------------------------
// 仪表盘视图：统一筛选助手 + 齿轮按钮跳设置页
//-----------------------------------------------------------

/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { DataStore } from '../data/store';
import { DashboardConfig, ModuleConfig } from '../config/schema';
import { ModulePanel } from './ModulePanel';
import type ThinkPlugin from '../main';
import { TFile, TFolder } from 'obsidian';
import { ViewComponents } from './index';
import { getDateRange } from '../utils/date';
import { DashboardConfigForm } from '../ui/DashboardConfigForm';
import {
  filterByRules,
  sortItems,
  filterByDateRange,
  filterByKeyword,
} from '../utils/itemFilter';

const QUARTER_TEXT = ['一', '二', '三', '四'];

interface Props {
  config: DashboardConfig;
  dataStore: DataStore;
  plugin: ThinkPlugin;
}

export function Dashboard({ config, dataStore, plugin }: Props) {
  const moment = (window as any).moment;

  const [view, setView] = useState(config.initialView || '月');
  const [date, setDate] = useState(
    config.initialDate ? moment(config.initialDate) : moment(),
  );
  const [showCfg, setShowCfg] = useState(false);
  const [kw, setKw] = useState('');

  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force(v => v + 1);
    dataStore.subscribe(fn);
    return () => dataStore.unsubscribe(fn);
  }, [dataStore]);

  /* ---------- 工具 ---------- */
  const unit = (v: string) =>
    ({ 年: 'year', 季: 'quarter', 月: 'month', 周: 'week', 天: 'day' } as any)[v] ??
    'day';

  const fmt = (d: any, v: string) =>
    v === '年'
      ? d.format('YYYY年')
      : v === '季'
      ? `${d.year()}年${QUARTER_TEXT[d.quarter() - 1]}季度`
      : v === '月'
      ? d.format('YYYY-MM')
      : v === '周'
      ? d.format('YYYY-[W]WW')
      : d.format('YYYY-MM-DD');

  const { startDate, endDate } = getDateRange(date, view);

  /* ---------- 渲染模块 ---------- */
  const renderModule = (m: ModuleConfig) => {
    if (m.view === 'SettingsFormView') {
      const V = ViewComponents[m.view] as any;
      return (
        <ModulePanel module={m}>
          <V plugin={plugin} storageKey="inputSettings" />
        </ModulePanel>
      );
    }

    /* ① 数据收集 + 统一过滤 */
    let items = dataStore.queryItems(); // 先拿全部
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
    if (config.path && config.path.trim()) {
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

    /* ---------- 视图组件 ---------- */
    const V = (ViewComponents as any)[m.view];
    if (!V)
      return (
        <ModulePanel module={m}>
          <div>未知视图：{m.view}</div>
        </ModulePanel>
      );

    const vp: any = { ...(m.props || {}) };
    if (m.group) vp.groupField = m.group;
    if (m.fields) vp.fields = m.fields;

    return (
      <ModulePanel module={m}>
        <V items={items} {...vp} />
      </ModulePanel>
    );
  };

  const onSaveConfig = (d: DashboardConfig) => {
    Object.assign(config, d);
    plugin.persistAll().then(() => {
      setShowCfg(false);
    });
  };

  /* ---------- 输出 ---------- */
  return (
    <div>
      {/* 顶栏 */}
      <div class="tp-toolbar" style="margin-bottom:8px;">
        {['年', '季', '月', '周', '天'].map(v => (
          <button onClick={() => setView(v)} class={v === view ? 'active' : ''}>
            {v}
          </button>
        ))}
        <button
          disabled
          style="font-weight:bold;margin:0 4px;background:#fff;"
        >
          {fmt(date, view)}
        </button>
        <button onClick={() => setDate(date.clone().subtract(1, unit(view)))}>
          ←
        </button>
        <button onClick={() => setDate(date.clone().add(1, unit(view)))}>
          →
        </button>
        <button onClick={() => setDate(moment())}>＝</button>
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

      {showCfg ? (
        <DashboardConfigForm
          dashboard={structuredClone(config)}
          dashboards={plugin.dashboards}
          onSave={onSaveConfig}
          onCancel={() => setShowCfg(false)}
        />
      ) : (
        config.modules.map(renderModule)
      )}
    </div>
  );
}