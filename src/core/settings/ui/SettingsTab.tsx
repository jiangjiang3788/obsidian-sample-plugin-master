// src/core/settings/ui/SettingsTab.tsx
/** @jsxImportSource preact */
import { render } from 'preact';
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
import { usePersistentState } from '@shared/hooks/usePersistentState';
import { AppStore, useStore } from '@state/AppStore'; // [FIX] 引入 AppStore 和 useStore

// 辅助函数，用于在执行操作后保持滚动条位置，提升体验
function keepScroll(fn: () => void) {
  const y = window.scrollY;
  fn();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => window.scrollTo({ top: y }));
  });
}

function SettingsRoot({ plugin }: { plugin: ThinkPlugin }) {
  // [FIX] 使用 useStore hook 从 AppStore 响应式地获取状态
  const dashboards = useStore(state => state.settings.dashboards);
  const inputSettings = useStore(state => state.settings.inputSettings);

  const [openInput, setOpenInput] = usePersistentState('think-settings-open-input', true);
  const [openDash, setOpenDash] = usePersistentState('think-settings-open-dash', true);
  const [openName, setOpenName] = usePersistentState<string | null>('think-target-dash', null);
  
  // [FIX] 所有写操作都通过 AppStore actions
  const addDashboard = () => {
    keepScroll(async () => {
      // action 内部会处理重名问题
      await AppStore.instance.addDashboard('新仪表盘'); 
      new Notice('已创建新仪表盘');
      setOpenDash(true);
      
      // 找到刚刚创建的仪表盘的实际名称并展开它
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
      // Notice is handled inside the table component, so no need for one here.
    });
  };

  // ... 其余 JSX 代码与您提供的版本相同，这里为了完整性而包含 ...
  return (
    <ThemeProvider theme={baseTheme}>
      <CssBaseline />
      <Box sx={{ display: 'grid', gap: 1.5 }} class="think-compact">
        {/* 通用输入设置 */}
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

        {/* 仪表盘配置管理 */}
        <Accordion expanded={openDash} onChange={(_, e) => setOpenDash(e)} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" alignItems="center" sx={{ width: '100%', justifyContent: 'space-between' }}>
              <Typography sx={{ color: 'error.main', fontWeight: 800, fontSize: 22 }}>
                仪表盘配置管理
              </Typography>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); addDashboard(); }}>
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
                key={dash.name + idx} // 使用 name + idx 避免重名导致 key 冲突
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
                    dashboards={dashboards} // dashboards 现在是响应式的
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