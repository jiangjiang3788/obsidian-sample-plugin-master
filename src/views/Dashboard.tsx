// views/Dashboard.tsx
// 顶栏增加快速过滤；与 DataStore 拆分兼容；显示配置区域保留
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { DataStore } from '../data/store';
import { DashboardConfig, ModuleConfig, getAllFields } from '../config/schema';
import { ModulePanel } from './ModulePanel';
import type ThinkPlugin from '../main';
import { TFile, TFolder, Notice } from 'obsidian';
import { ViewComponents } from './index';

const QUARTER_TEXT = ['一', '二', '三', '四'];

interface DashboardProps {
  config: DashboardConfig;
  dataStore: DataStore;
  plugin: ThinkPlugin;
}

export function Dashboard({ config, dataStore, plugin }: DashboardProps) {
  const moment = (window as any).moment;
  const initialView = config.initialView || '月';
  const initialDateMoment = config.initialDate
    ? moment(config.initialDate, 'YYYY-MM-DD')
    : moment();

  const [currentView, setCurrentView] = useState(initialView);
  const [currentDate, setCurrentDate] = useState(initialDateMoment);
  const [showConfig, setShowConfig] = useState(false);
  const [tempConfig, setTempConfig] = useState<DashboardConfig | null>(null);
  const [newViewType, setNewViewType] = useState('TableView');
  const [dataVersion, setDataVersion] = useState(0);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    const onData = () => setDataVersion(v => v + 1);
    dataStore.subscribe(onData);
    return () => dataStore.unsubscribe(onData);
  }, [dataStore]);

  useEffect(() => {
    if (showConfig) {
      const clone = (cfg: DashboardConfig) =>
        typeof structuredClone === 'function'
          ? structuredClone(cfg)
          : JSON.parse(JSON.stringify(cfg));
      setTempConfig(clone(config));
      setNewViewType('TableView');
    } else {
      setTempConfig(null);
    }
  }, [showConfig, config]);

  const getDateRange = (date: any, viewType: string) => {
    let s = date.clone(),
      e = date.clone();
    switch (viewType) {
      case '年':
        s = date.clone().startOf('year');
        e = date.clone().endOf('year');
        break;
      case '季':
        s = date.clone().startOf('quarter');
        e = date.clone().endOf('quarter');
        break;
      case '月':
        s = date.clone().startOf('month');
        e = date.clone().endOf('month');
        break;
      case '周':
        s = date.clone().startOf('week');
        e = date.clone().endOf('week');
        break;
      case '天':
        s = date.clone().startOf('day');
        e = date.clone().endOf('day');
        break;
    }
    return { startDate: s, endDate: e };
  };

  const formattedDate = (date: any, viewType: string) => {
    switch (viewType) {
      case '年':
        return date.format('YYYY年');
      case '季': {
        const q = date.quarter();
        return `${date.year()}年${QUARTER_TEXT[q - 1]}季度`;
      }
      case '月':
        return date.format('YYYY-MM');
      case '周':
        return date.format('YYYY-[W]WW');
      case '天':
        return date.format('YYYY-MM-DD');
      default:
        return date.format('YYYY-MM-DD');
    }
  };

  const prevPeriod = () => {
    switch (currentView) {
      case '年':
        setCurrentDate(currentDate.clone().subtract(1, 'year'));
        break;
      case '季':
        setCurrentDate(currentDate.clone().subtract(1, 'quarter'));
        break;
      case '月':
        setCurrentDate(currentDate.clone().subtract(1, 'month'));
        break;
      case '周':
        setCurrentDate(currentDate.clone().subtract(1, 'week'));
        break;
      case '天':
        setCurrentDate(currentDate.clone().subtract(1, 'day'));
        break;
    }
  };
  const nextPeriod = () => {
    switch (currentView) {
      case '年':
        setCurrentDate(currentDate.clone().add(1, 'year'));
        break;
      case '季':
        setCurrentDate(currentDate.clone().add(1, 'quarter'));
        break;
      case '月':
        setCurrentDate(currentDate.clone().add(1, 'month'));
        break;
      case '周':
        setCurrentDate(currentDate.clone().add(1, 'week'));
        break;
      case '天':
        setCurrentDate(currentDate.clone().add(1, 'day'));
        break;
    }
  };
  const resetToday = () => setCurrentDate(moment());

  const renderModule = (mod: ModuleConfig) => {
    // ★★★ 先特判 SettingsFormView：它不需要 items，需要 plugin
    if (mod.view === 'SettingsFormView') {
      const ViewComp: any = ViewComponents[mod.view];
      return (
        <ModulePanel module={mod}>
          <ViewComp plugin={plugin} storageKey="inputSettings" />
        </ModulePanel>
      );
    }

    // 其他视图照旧
    let items = dataStore.queryItems(mod.filters || [], mod.sort || []);

    // 仪表盘级 tag/path 过滤
    if (config.tags?.length) {
      items = items.filter(it =>
        it.tags.some(tag => config.tags!.some(t => tag.includes(t))),
      );
    }
    if (config.path && config.path.trim() !== '') {
      const target = config.path.trim();
      const af = (DataStore.instance as any)['app'].vault.getAbstractFileByPath(target);
      if (af) {
        if (af instanceof TFolder) {
          const prefix = target.endsWith('/') ? target : target + '/';
          items = items.filter(it => it.id.startsWith(prefix));
        } else if (af instanceof TFile) {
          const prefix = target + '#';
          items = items.filter(it => it.id.startsWith(prefix));
        }
      } else {
        const prefix = target.endsWith('/') ? target : target + '/';
        items = items.filter(it => it.id.startsWith(prefix));
      }
    }

    // 时间范围过滤
    if (currentView && currentDate) {
    const { startDate, endDate } = getDateRange(currentDate, currentView);
    items = items.filter(it => {
      if (!it.date) return true; // 🟢 显示无日期项
      const d = moment(it.date, 'YYYY-MM-DD');
      return d.isSameOrAfter(startDate) && d.isSameOrBefore(endDate);
    });
    }

    // 关键字过滤
    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      items = items.filter(it =>
        (it.title + ' ' + it.content).toLowerCase().includes(kw),
      );
    }

    const ViewComp = (ViewComponents as any)[mod.view];
    if (!ViewComp) {
      return (
        <ModulePanel module={mod}>
          <div>未知视图: {mod.view}</div>
        </ModulePanel>
      );
    }
    const viewProps: any = { ...(mod.props || {}) };
    if (mod.group) viewProps.groupField = mod.group;
    if (mod.fields) viewProps.fields = mod.fields;

    return (
      <ModulePanel module={mod}>
        <ViewComp items={items} {...viewProps} />
      </ModulePanel>
    );
  };

  /* ---------- 配置保存 ---------- */
  const saveConfig = () => {
    if (!tempConfig) return;
    const oldName = config.name;
    const newName = tempConfig.name.trim();
    if (newName === '') {
      new Notice('名称不能为空');
      return;
    }
    if (newName !== oldName && plugin.dashboards.some(d => d !== config && d.name === newName)) {
      new Notice('配置名称已存在，请更换名称');
      return;
    }

    config.name         = newName;
    config.path         = tempConfig.path || '';
    config.tags         = tempConfig.tags || [];
    config.initialView  = tempConfig.initialView || '月';
    config.initialDate  = tempConfig.initialDate || moment().format('YYYY-MM-DD');
    config.modules      = tempConfig.modules;

    if (newName !== oldName) {
      plugin.activeDashboards.forEach(e => {
        if (e.configName === oldName) e.configName = newName;
      });
    }

    // ⚠️ 这里也要把 inputSettings 一并存回，最保险的做法是调用 persistAll（如果有）
    const saved = (plugin as any).persistAll
      ? (plugin as any).persistAll()
      : plugin.saveData({ dashboards: plugin.dashboards, inputSettings: (plugin as any).inputSettings });

    Promise.resolve(saved).then(() => {
      new Notice('仪表盘配置已保存');
      plugin.refreshAllDashboards();
    });
    setShowConfig(false);
  };

  return (
    <div>
      {/* 顶部工具栏 */}
      <div class="tp-toolbar" style="margin-bottom:8px;">
        {['年', '季', '月', '周', '天'].map(v => (
          <button
            onClick={() => setCurrentView(v)}
            class={v === currentView ? 'active' : ''}
          >
            {v}
          </button>
        ))}
        <button disabled style="font-weight:bold;margin:0 4px;background:#fff;cursor:default;">
          {formattedDate(currentDate, currentView)}
        </button>
        <button onClick={prevPeriod}>←</button>
        <button onClick={nextPeriod}>→</button>
        <button onClick={resetToday}>＝</button>
        <input
          placeholder="快速过滤…"
          style="margin-left:4px;"
          value={keyword}
          onInput={e => setKeyword((e.target as HTMLInputElement).value)}
        />
        <button onClick={() => setShowConfig(!showConfig)} style="margin-left:4px;">⚙︎</button>
      </div>

      {/* 配置面板（原样保留） */}
      {showConfig && tempConfig && (
        /* …… 你原来的 配置 UI 代码，完整保留（略） …… */
        /* 我上面只是改了 saveConfig 的实现，整段 UI 这里不重复贴，以免太长 */
        /* 直接用你发来的整段 Dashboard.tsx，唯一需要合并的就是 renderModule 和 saveConfig 里的改动 */
        <div
          style="border:1px solid #eee;padding:12px;margin-bottom:12px;border-radius:8px;background:#fcfcfc;"
        >
          {/* …… 原样保留 …… */}
          {/* 这里请用你完整的 Dashboard.tsx 的配置面板那段；我不重复贴了，避免冲突 */}
        </div>
      )}

      {!showConfig && config.modules.map(mod => renderModule(mod))}
    </div>
  );
}