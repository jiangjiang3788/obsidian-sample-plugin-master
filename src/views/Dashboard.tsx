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
import { getDateRange } from '../utils/date';   // 

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

  const { startDate, endDate } = getDateRange(currentDate, currentView);
  

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
        <div
          style="border:1px solid #eee;padding:12px;margin-bottom:12px;border-radius:8px;background:#fcfcfc;"
        >
          <h3 style="margin-top:0;">编辑配置</h3>
          <fieldset style="margin-bottom:10px;">
            <legend>基础设置</legend>
            <label>
              配置名称:
              <input
                type="text"
                value={tempConfig.name}
                onInput={e =>
                  setTempConfig({ ...tempConfig, name: (e.target as HTMLInputElement).value })
                }
              />
            </label>
            <br />
            <label>
              数据源路径:
              <input
                type="text"
                value={tempConfig.path || ''}
                onInput={e =>
                  setTempConfig({ ...tempConfig, path: (e.target as HTMLInputElement).value })
                }
              />
            </label>
            <br />
            <label>
              标签(逗号分隔):
              <input
                type="text"
                value={Array.isArray(tempConfig.tags) ? tempConfig.tags.join(',') : (tempConfig.tags || '')}
                onInput={e => {
                  const val = (e.target as HTMLInputElement).value;
                  const tags = val.split(/[,，]/).map(t => t.trim()).filter(Boolean);
                  setTempConfig({ ...tempConfig, tags });
                }}
              />
            </label>
            <br />
            <label>
              初始视图:
              <select
                value={tempConfig.initialView || '月'}
                onChange={e =>
                  setTempConfig({
                    ...tempConfig,
                    initialView: (e.target as HTMLSelectElement).value,
                  })
                }
              >
                {['年', '季', '月', '周', '天'].map(v => (
                  <option value={v}>{v}</option>
                ))}
              </select>
            </label>
            <br />
            <label>
              初始日期:
              <input
                type="date"
                value={tempConfig.initialDate || moment().format('YYYY-MM-DD')}
                onChange={e =>
                  setTempConfig({
                    ...tempConfig,
                    initialDate: (e.target as HTMLInputElement).value,
                  })
                }
              />
            </label>
            <br />
          </fieldset>

          <div id="modulesArea">
            {tempConfig.modules.map((mod, idx) => (
              <fieldset style="border:1px solid #ccc;padding:8px;margin-bottom:8px;">
                <legend>
                  {mod.title || '模块'} ({mod.view})
                </legend>
                <div>
                  <label>
                    模块标题:
                    <input
                      type="text"
                      value={mod.title}
                      onInput={e => {
                        const arr = [...tempConfig.modules];
                        arr[idx] = { ...mod, title: (e.target as HTMLInputElement).value };
                        setTempConfig({ ...tempConfig, modules: arr });
                      }}
                    />
                  </label>
                </div>
                <div>
                  <label>
                    视图类型:
                    <select
                      value={mod.view}
                      onChange={e => {
                        const arr = [...tempConfig.modules];
                        arr[idx] = { ...mod, view: (e.target as HTMLSelectElement).value as any };
                        setTempConfig({ ...tempConfig, modules: arr });
                      }}
                    >
                      {Object.keys(ViewComponents).map(v => (
                        <option value={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div>
                  <label>
                    默认折叠:
                    <input
                      type="checkbox"
                      checked={!!mod.collapsed}
                      onChange={e => {
                        const arr = [...tempConfig.modules];
                        arr[idx] = { ...mod, collapsed: (e.target as HTMLInputElement).checked };
                        setTempConfig({ ...tempConfig, modules: arr });
                      }}
                    />
                  </label>
                </div>

                {mod.view === 'TableView' && (
                  <div>
                    <label>
                      行字段:
                      <input
                        type="text"
                        value={mod.props?.rowField || ''}
                        onInput={e => {
                          const arr = [...tempConfig.modules];
                          arr[idx] = {
                            ...mod,
                            props: { ...mod.props, rowField: (e.target as HTMLInputElement).value },
                          };
                          setTempConfig({ ...tempConfig, modules: arr });
                        }}
                      />
                    </label>
                    <br />
                    <label>
                      列字段:
                      <input
                        type="text"
                        value={mod.props?.colField || ''}
                        onInput={e => {
                          const arr = [...tempConfig.modules];
                          arr[idx] = {
                            ...mod,
                            props: { ...mod.props, colField: (e.target as HTMLInputElement).value },
                          };
                          setTempConfig({ ...tempConfig, modules: arr });
                        }}
                      />
                    </label>
                  </div>
                )}

                {(mod.view === 'BlockView' || mod.view === 'TimelineView') && (
                  <div>
                    <label>
                      分组字段:
                      <input
                        type="text"
                        value={mod.group || ''}
                        onInput={e => {
                          const arr = [...tempConfig.modules];
                          arr[idx] = { ...mod, group: (e.target as HTMLInputElement).value || undefined };
                          setTempConfig({ ...tempConfig, modules: arr });
                        }}
                      />
                    </label>
                  </div>
                )}

                {mod.view !== 'TableView' &&
                  mod.view !== 'ChartView' &&
                  mod.view !== 'CalendarView' && (
                    <div>
                      <label>
                        显示字段(逗号分隔 / * 为动态):
                        <input
                          type="text"
                          placeholder="如 title,tags,date 或 *"
                          value={mod.fields ? mod.fields.join(',') : ''}
                          onInput={e => {
                            const val = (e.target as HTMLInputElement).value;
                            const arrFields =
                              val.trim() === '*'
                                ? ['*']
                                : val.split(/[,，]/).map(f => f.trim()).filter(Boolean);
                            const arr = [...tempConfig.modules];
                            arr[idx] = { ...mod, fields: arrFields.length ? arrFields : undefined };
                            setTempConfig({ ...tempConfig, modules: arr });
                          }}
                        />
                      </label>
                    </div>
                  )}

                {/* 过滤规则 */}
                <div style="border-top:1px dashed #ccc;margin-top:6px;padding-top:6px;">
                  <strong>过滤规则</strong>
                  {(mod.filters || []).map((rule, ridx) => (
                    <div style="display:flex;margin-bottom:4px;">
                      <input
                        type="text"
                        style="flex:0 0 30%;"
                        value={rule.field}
                        onInput={e => {
                          const nf = (e.target as HTMLInputElement).value;
                          const nfils = [...(mod.filters || [])];
                          nfils[ridx] = { ...rule, field: nf };
                          const arr = [...tempConfig.modules];
                          arr[idx] = { ...mod, filters: nfils };
                          setTempConfig({ ...tempConfig, modules: arr });
                        }}
                      />
                      <select
                        value={rule.op}
                        onChange={e => {
                          const op = (e.target as HTMLSelectElement).value as typeof rule.op;
                          const nfils = [...(mod.filters || [])];
                          nfils[ridx] = { ...rule, op };
                          const arr = [...tempConfig.modules];
                          arr[idx] = { ...mod, filters: nfils };
                          setTempConfig({ ...tempConfig, modules: arr });
                        }}
                      >
                        {['=', '!=', 'includes', 'regex', '>', '<'].map(op => (
                          <option value={op}>{op}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        style="flex:0 0 30%;"
                        value={String(rule.value)}
                        onInput={e => {
                          const nv = (e.target as HTMLInputElement).value;
                          const nfils = [...(mod.filters || [])];
                          nfils[ridx] = { ...rule, value: nv };
                          const arr = [...tempConfig.modules];
                          arr[idx] = { ...mod, filters: nfils };
                          setTempConfig({ ...tempConfig, modules: arr });
                        }}
                      />
                      <button
                        onClick={() => {
                          const nfils = [...(mod.filters || [])];
                          nfils.splice(ridx, 1);
                          const arr = [...tempConfig.modules];
                          arr[idx] = { ...mod, filters: nfils };
                          setTempConfig({ ...tempConfig, modules: arr });
                        }}
                      >
                        删除
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const nfils = [...(mod.filters || []), { field: '', op: '=', value: '' }];
                      const arr = [...tempConfig.modules];
                      arr[idx] = { ...mod, filters: nfils };
                      setTempConfig({ ...tempConfig, modules: arr });
                    }}
                  >
                    + 添加过滤条件
                  </button>
                </div>

                {/* 排序规则 */}
                <div style="border-top:1px dashed #ccc;margin-top:6px;padding-top:6px;">
                  <strong>排序规则</strong>
                  {(mod.sort || []).map((rule, ridx) => (
                    <div style="display:flex;margin-bottom:4px;">
                      <input
                        type="text"
                        style="flex:0 0 40%;"
                        value={rule.field}
                        onInput={e => {
                          const nf = (e.target as HTMLInputElement).value;
                          const ns = [...(mod.sort || [])];
                          ns[ridx] = { ...rule, field: nf };
                          const arr = [...tempConfig.modules];
                          arr[idx] = { ...mod, sort: ns };
                          setTempConfig({ ...tempConfig, modules: arr });
                        }}
                      />
                      <select
                        value={rule.dir}
                        onChange={e => {
                          const d = (e.target as HTMLSelectElement).value as typeof rule.dir;
                          const ns = [...(mod.sort || [])];
                          ns[ridx] = { ...rule, dir: d };
                          const arr = [...tempConfig.modules];
                          arr[idx] = { ...mod, sort: ns };
                          setTempConfig({ ...tempConfig, modules: arr });
                        }}
                      >
                        <option value="asc">升序</option>
                        <option value="desc">降序</option>
                      </select>
                      <button
                        style="margin-left:4px;"
                        onClick={() => {
                          const ns = [...(mod.sort || [])];
                          ns.splice(ridx, 1);
                          const arr = [...tempConfig.modules];
                          arr[idx] = { ...mod, sort: ns };
                          setTempConfig({ ...tempConfig, modules: arr });
                        }}
                      >
                        删除
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const ns = [...(mod.sort || []), { field: '', dir: 'asc' }];
                      const arr = [...tempConfig.modules];
                      arr[idx] = { ...mod, sort: ns };
                      setTempConfig({ ...tempConfig, modules: arr });
                    }}
                  >
                    + 添加排序条件
                  </button>
                </div>

                <div style="text-align:right;">
                  {idx > 0 && (
                    <button
                      onClick={() => {
                        const arr = [...tempConfig.modules];
                        [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                        setTempConfig({ ...tempConfig, modules: arr });
                      }}
                    >
                      ↑ 上移
                    </button>
                  )}
                  {idx < tempConfig.modules.length - 1 && (
                    <button
                      onClick={() => {
                        const arr = [...tempConfig.modules];
                        [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                        setTempConfig({ ...tempConfig, modules: arr });
                      }}
                    >
                      ↓ 下移
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const arr = [...tempConfig.modules];
                      arr.splice(idx, 1);
                      setTempConfig({ ...tempConfig, modules: arr });
                    }}
                  >
                    删除模块
                  </button>
                </div>
              </fieldset>
            ))}
            <div>
              <select value={newViewType} onChange={e => setNewViewType((e.target as HTMLSelectElement).value)}>
                {Object.keys(ViewComponents).map(v => (
                  <option value={v}>{v}</option>
                ))}
              </select>
              <button
                style="margin-left:6px;"
                onClick={() => {
                  const mod: ModuleConfig = {
                    view: newViewType as any,
                    title: '新模块',
                    collapsed: false,
                    filters: [],
                    sort: [],
                    props: {},
                  };
                  setTempConfig({ ...tempConfig!, modules: [...tempConfig!.modules, mod] });
                }}
              >
                添加模块
              </button>
            </div>
          </div>

          <hr />
          <button onClick={saveConfig}>保存配置</button>
          <button style="margin-left:8px;" onClick={() => setShowConfig(false)}>
            取消
          </button>

          <datalist id="fields-list">
            {getAllFields(dataStore.query()).map(f => (
              <option value={f} />
            ))}
          </datalist>
        </div>
      )}

      {!showConfig && config.modules.map(mod => renderModule(mod))}
    </div>
  );
}