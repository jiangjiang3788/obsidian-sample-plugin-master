// src/core/settings/ui/SettingsTab.tsx
/** @jsxImportSource preact */
import { render } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { PluginSettingTab, Notice } from 'obsidian';
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
// [REFACTOR] Import the new custom hook.
import { usePersistentState } from '@shared/hooks/usePersistentState';


function keepScroll(fn: () => void) {
  const y = window.scrollY;
  fn();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => window.scrollTo({ top: y }));
  });
}

function SettingsRoot({ plugin }: { plugin: ThinkPlugin }) {
  const [tick, setTick] = useState(0);
  const dashboards = useMemo(() => plugin.dashboards || [], [plugin.dashboards, tick]);
  const inputSettings = useMemo(() => plugin.inputSettings || { base: {}, themes: [] }, [plugin.inputSettings, tick]);

  // [REFACTOR] Replace useState + useEffect combinations with the custom hook.
  const [openInput, setOpenInput] = usePersistentState('think-settings-open-input', true);
  const [openDash, setOpenDash] = usePersistentState('think-settings-open-dash', true);
  const [openName, setOpenName] = usePersistentState<string | null>('think-target-dash', null);
  
  // The useEffects for localStorage are now gone, simplifying the component.

  const addDashboard = () => {
    keepScroll(() => {
      let name = '新仪表盘', n = 1;
      while (plugin.dashboards.some(d => d.name === name)) name = `新仪表盘${n++}`;
      plugin.dashboards.push({ name, modules: [] });
      plugin.persistAll().then(() => {
        new Notice('已创建新仪表盘');
        setTick(t => t + 1);
        setOpenDash(true);
        setOpenName(name);
      });
    });
  };

  const deleteDashboard = (idx: number) => {
    const dash = plugin.dashboards[idx];
    if (!confirm(`确认删除仪表盘「${dash.name}」？此操作不可撤销！`)) return;
    keepScroll(() => {
      plugin.dashboards.splice(idx, 1);
      plugin.persistAll().then(() => {
        new Notice('已删除仪表盘');
        setTick(t => t + 1);
        if (openName === dash.name) setOpenName(null);
      });
    });
  };

  const saveDash = (idx: number, newDashData: DashboardConfig) => {
    keepScroll(() => {
      const oldName = plugin.dashboards[idx].name;
      const newName = newDashData.name;
      if (oldName !== newName && plugin.dashboards.some((d, i) => i !== idx && d.name === newName)) {
        new Notice(`错误：名称为 "${newName}" 的仪表盘已存在。`);
        return;
      }
      plugin.dashboards[idx] = newDashData;
      plugin.persistAll().then(() => {
        new Notice('已保存');
        setTick(t => t + 1);
        setOpenName(newName);
      });
    });
  };

  const handleSaveInputSettings = (newSettings: ThinkSettings['inputSettings']) => {
    keepScroll(() => {
      plugin.inputSettings = newSettings;
      plugin.persistAll().then(() => {
        setTick(t => t + 1);
      });
    });
  };

  return (
    <ThemeProvider theme={baseTheme}>
      <CssBaseline />
      <Box sx={{ display: 'grid', gap: 1.5 }} class="think-compact">
        {/* ── 通用输入设置 ───────────────────────────── */}
        <Accordion expanded={openInput} onChange={(_, e) => setOpenInput(e)} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ color: 'error.main', fontWeight: 800, fontSize: 22 }}>
              通用输入设置
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <InputSettingsTable settings={inputSettings} onSave={handleSaveInputSettings} />
          </AccordionDetails>
        </Accordion>

        {/* ── 仪表盘配置管理 ───────────────────────── */}
        <Accordion expanded={openDash} onChange={(_, e) => setOpenDash(e)} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" alignItems="center" sx={{ width: '100%', justifyContent: 'space-between' }}>
              <Typography sx={{ color: 'error.main', fontWeight: 800, fontSize: 22 }}>
                仪表盘配置管理
              </Typography>
              <IconButton size="small" onClick={addDashboard}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ display: 'grid', gap: 1 }}>
            {dashboards.length === 0 && (
              <Box sx={{ color: 'text.secondary', fontSize: 13 }}>
                还没有仪表盘，点右上角 <AddIcon fontSize="inherit" /> 新建。
              </Box>
            )}

            {dashboards.map((dash, idx) => (
              <Accordion
                key={dash.name}
                expanded={openName === dash.name}
                onChange={(_, e) => setOpenName(e ? dash.name : (openName === dash.name ? null : openName))}
                disableGutters
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" alignItems="center" sx={{ width: '100%', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: 'error.main', fontWeight: 600, fontSize: 20 }}>
                      {dash.name}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(ev) => { ev.stopPropagation(); deleteDashboard(idx); }}
                      title="删除此配置"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </AccordionSummary>

                <AccordionDetails>
                  <DashboardConfigForm
                    dashboard={dash}
                    dashboards={plugin.dashboards}
                    onSave={(d) => saveDash(idx, d)}
                    onCancel={() => setOpenName(null)}
                  />
                </AccordionDetails>
              </Accordion>
            ))}
          </AccordionDetails>
        </Accordion>
      </Box>
    </ThemeProvider>
  );
}

export class SettingsTab extends PluginSettingTab {
  id = 'think-settings';

  constructor(public app: any, private plugin: ThinkPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    render(<SettingsRoot plugin={this.plugin} />, containerEl);
  }
}