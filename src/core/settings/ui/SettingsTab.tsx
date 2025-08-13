// src/core/settings/ui/SettingsTab.tsx
/** @jsxImportSource preact */
import { render } from 'preact';
// [MODIFIED] 从 preact/compat 导入 unmountComponentAtNode 以便在组件隐藏时进行清理
import { unmountComponentAtNode } from 'preact/compat';
import { PluginSettingTab, App, Notice } from 'obsidian';
import type ThinkPlugin from '../../../main';
import type { DashboardConfig, ThinkSettings } from '../../../main';
import {
  ThemeProvider, CssBaseline, Box, Stack, Typography, IconButton,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { DashboardConfigForm } from '@features/dashboard/settings/DashboardConfigForm';
import { InputSettingsTable } from './InputSettingsTable';
import { theme as baseTheme } from '@shared/styles/mui-theme';
import { usePersistentState } from '@shared/hooks/usePersistentState';
import { AppStore, useStore } from '@state/AppStore';
import { LOCAL_STORAGE_KEYS, DEFAULT_NAMES } from '@core/domain/constants';

function keepScroll(fn: () => void) {
  const y = window.scrollY;
  fn();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => window.scrollTo({ top: y }));
  });
}

function SettingsRoot({ plugin }: { plugin: ThinkPlugin }) {
  const dashboards = useStore(state => state.settings.dashboards);
  const inputSettings = useStore(state => state.settings.inputSettings);

  const [openInput, setOpenInput] = usePersistentState(LOCAL_STORAGE_KEYS.SETTINGS_OPEN_INPUT, true);
  const [openDash, setOpenDash] = usePersistentState(LOCAL_STORAGE_KEYS.SETTINGS_OPEN_DASHBOARDS, true);
  const [openName, setOpenName] = usePersistentState<string | null>(LOCAL_STORAGE_KEYS.TARGET_DASHBOARD, null);
 
  const addDashboard = () => {
    keepScroll(async () => {
      await AppStore.instance.addDashboard(DEFAULT_NAMES.NEW_DASHBOARD);
      new Notice('已创建新仪表盘');
      setOpenDash(true);
     
      const currentDashboards = AppStore.instance.getSettings().dashboards;
      const newDash = currentDashboards[currentDashboards.length - 1];
      if (newDash) setOpenName(newDash.name);
    });
  };

  const deleteDashboard = (idx: number) => {
    const dash = dashboards[idx];
    if (!confirm(`确认删除仪表盘「${dash.name}」？此操作不可撤销！`)) return;
    keepScroll(async () => {
      await AppStore.instance.deleteDashboard(idx);
      new Notice('已删除仪表盘');
      if (openName === dash.name) setOpenName(null);
    });
  };

  const saveDash = (idx: number, newDashData: DashboardConfig) => {
    keepScroll(async () => {
      const oldName = dashboards[idx].name;
      const newName = newDashData.name;
      if (oldName !== newName && dashboards.some((d, i) => i !== idx && d.name === newName)) {
        new Notice(`错误：名称为 "${newName}" 的仪表盘已存在。`);
        return;
      }
      await AppStore.instance.updateDashboard(idx, newDashData);
      new Notice('已保存');
      setOpenName(newName);
    });
  };

  const handleSaveInputSettings = (newSettings: ThinkSettings['inputSettings']) => {
    keepScroll(async () => {
      await AppStore.instance.updateInputSettings(newSettings);
    });
  };

  return (
    <ThemeProvider theme={baseTheme}>
      <CssBaseline />
      <Box sx={{ p: 2, display: 'grid', gap: 2 }} class="think-setting-root">
        {/* 通用输入设置 */}
        <Accordion expanded={openInput} onChange={() => setOpenInput(!openInput)}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontWeight: 600 }}>通用输入设置</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <InputSettingsTable
                    settings={inputSettings}
                    onSave={handleSaveInputSettings}
                />
            </AccordionDetails>
        </Accordion>

        {/* 仪表盘配置 */}
        <Accordion expanded={openDash} onChange={() => setOpenDash(!openDash)}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
                    <Typography sx={{ fontWeight: 600 }}>仪表盘配置</Typography>
                    <IconButton size="small" onClick={e => { e.stopPropagation(); addDashboard(); }} title="新增仪表盘">
                        <AddIcon />
                    </IconButton>
                </Stack>
            </AccordionSummary>
            <AccordionDetails>
                <Stack spacing={2}>
                    {dashboards.map((dash, idx) => (
                        <Accordion key={dash.name} expanded={openName === dash.name} onChange={() => setOpenName(openName === dash.name ? null : dash.name)}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
                                    <Typography>{dash.name}</Typography>
                                    <IconButton size="small" color="error" onClick={e => { e.stopPropagation(); deleteDashboard(idx); }} title="删除此仪表盘">
                                        <DeleteIcon />
                                    </IconButton>
                                </Stack>
                            </AccordionSummary>
                            <AccordionDetails>
                                <DashboardConfigForm
                                    dashboard={dash}
                                    dashboards={dashboards}
                                    onSave={(newData) => saveDash(idx, newData)}
                                    onCancel={() => setOpenName(null)}
                                />
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </Stack>
            </AccordionDetails>
        </Accordion>
      </Box>
    </ThemeProvider>
  );
}

export class SettingsTab extends PluginSettingTab {
  id: string;

  constructor(public app: App, private plugin: ThinkPlugin) {
    super(app, plugin);
    this.id = plugin.manifest.id;
  }

  display(): void {
    const { containerEl } = this;
    // 每次显示时，先清空容器，确保一个干净的挂载目标
    containerEl.empty();
    
    // [DEBUG] 添加中文调试信息，确认组件挂载
    console.log('[ThinkPlugin - SettingsTab] 显示设置面板，正在挂载 Preact 组件...');

    render(<SettingsRoot plugin={this.plugin} />, containerEl);
  }

  /**
   * [FIXED] 实现 hide 方法，在设置页关闭时被 Obsidian 调用
   * 这是修复“第二次无法打开”问题的关键。
   */
  hide(): void {
    // [DEBUG] 添加中文调试信息，确认组件卸载
    console.log('[ThinkPlugin - SettingsTab] 隐藏设置面板，正在卸载 Preact 组件...');

    // 从容器中卸载 Preact 组件，释放资源并清理事件监听器
    // 这可以防止内存泄漏，并确保下次 display 时可以重新挂载一个全新的组件
    unmountComponentAtNode(this.containerEl);
  }
}