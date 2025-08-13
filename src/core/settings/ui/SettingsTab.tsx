// src/core/settings/ui/SettingsTab.tsx
/** @jsxImportSource preact */
import { render } from 'preact';
// [MODIFIED] 从 preact 导入 unmountComponentAtNode 来进行清理
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
    // ... SettingsRoot 组件内部逻辑保持不变 ...
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
        {/* ... JSX ... */}
    </ThemeProvider>
  );
}

export class SettingsTab extends PluginSettingTab {
  // [MODIFIED] ID 现在从 manifest 中读取，更健壮
  id: string;

  constructor(public app: App, private plugin: ThinkPlugin) {
    super(app, plugin);
    this.id = plugin.manifest.id;
  }

  display(): void {
    const { containerEl } = this;
    containerEl