// src/features/settings/ui/SettingsTab.tsx
/** @jsxImportSource preact */
import { render } from 'preact';
import { useMemo, useState, useEffect } from 'preact/hooks';

import { PluginSettingTab, Notice } from 'obsidian';
import type ThinkPlugin from '../../../main';

import {
  ThemeProvider, CssBaseline,
  Box, Stack, Typography, IconButton,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { DashboardConfigForm } from '../../dashboard/ui';
import { InputSettingsTable }  from './InputSettingsTable';
import { theme as baseTheme }  from '@shared/styles/mui-theme';

function keepScroll(fn: () => void) {
  const el = document.scrollingElement || document.documentElement;
  const y = el.scrollTop;
  fn();
  // 连续两帧 + 微延迟，尽量压住 MUI 触发的布局抖动
  const restore = () => el.scrollTo({ top: y });
  requestAnimationFrame(() => {
    requestAnimationFrame(() => setTimeout(restore, 0));
  });
}

/* ---------------- Preact Root ---------------- */
function SettingsRoot({ plugin }: { plugin: ThinkPlugin }) {
  const [tick, setTick] = useState(0);
  const dashboards = useMemo(() => plugin.dashboards || [], [plugin.dashboards, tick]);

  // 顶层两个大区块的展开状态（本地记忆）
  const [openInput, setOpenInput] = useState<boolean>(() => {
    const v = localStorage.getItem('think-settings-open-input');
    return v === null ? true : v === 'true';
  });
  const [openDash, setOpenDash] = useState<boolean>(() => {
    const v = localStorage.getItem('think-settings-open-dash');
    return v === null ? true : v === 'true';
  });
  useEffect(() => { localStorage.setItem('think-settings-open-input', String(openInput)); }, [openInput]);
  useEffect(() => { localStorage.setItem('think-settings-open-dash',  String(openDash));  }, [openDash]);

  // 单个仪表盘展开状态（用名称记忆）
  const [openName, setOpenName] = useState<string | null>(() => localStorage.getItem('think-target-dash'));
  useEffect(() => {
    if (openName) localStorage.setItem('think-target-dash', openName);
    else localStorage.removeItem('think-target-dash');
  }, [openName]);

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

  const saveDash = (idx: number, d: any) => {
    keepScroll(() => {
      Object.assign(plugin.dashboards[idx], d);
      plugin.persistAll().then(() => {
        new Notice('已保存');
        setTick(t => t + 1);
        setOpenName(plugin.dashboards[idx].name);
      });
    });
  };

  return (
    <ThemeProvider theme={baseTheme}>
      <CssBaseline />
      <Box sx={{ display:'grid', gap:2 }}>
        {/* ── 通用输入设置（裸） ─────────────────────────────── */}
        <Accordion
          expanded={openInput}
          onChange={(_,e)=>setOpenInput(e)}
          transitionDuration={120}
          disableGutters
          square
          sx={{ boxShadow:'none', borderRadius:0 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
            <Typography variant="h6" color="error">通用输入设置</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <InputSettingsTable plugin={plugin} bare />
          </AccordionDetails>
        </Accordion>

        {/* ── 仪表盘配置管理 ───────────────────────────────── */}
        <Accordion
          expanded={openDash}
          onChange={(_,e)=>setOpenDash(e)}
          transitionDuration={120}
          disableGutters
          square
          sx={{ boxShadow:'none', borderRadius:0 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ width:'100%', justifyContent:'space-between' }}>
              <Typography variant="h6" color="error">Think 仪表盘 - 配置管理</Typography>
              <IconButton size="small" onClick={addDashboard}><AddIcon/></IconButton>
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ display:'grid', gap:1.5 }}>
            {dashboards.length === 0 && (
              <Box sx={{ color:'text.secondary', fontSize:14 }}>
                还没有仪表盘，点击右上角 <AddIcon fontSize="inherit" /> 创建一个吧。
              </Box>
            )}

            {dashboards.map((dash, idx) => (
              <Accordion
                key={dash.name}
                data-dash-name={dash.name}
                expanded={openName === dash.name}
                onChange={(_, e)=> keepScroll(() => setOpenName(e ? dash.name : (openName===dash.name? null : openName)))}
                transitionDuration={120}
                disableGutters
                square
                sx={{ boxShadow:'none', borderRadius:0 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ width:'100%', justifyContent:'space-between' }}>
                    <Typography fontWeight={600}>{dash.name}</Typography>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(ev)=>{ev.stopPropagation(); deleteDashboard(idx);}}
                    >
                      <DeleteIcon fontSize="small"/>
                    </IconButton>
                  </Stack>
                </AccordionSummary>

                <AccordionDetails>
                  <DashboardConfigForm
                    dashboard={structuredClone(dash)}
                    dashboards={plugin.dashboards}
                    onSave={(d)=>saveDash(idx, d)}
                    onCancel={()=>{}}
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

/* ---------------- Obsidian SettingTab Shell ---------------- */
export class SettingsTab extends PluginSettingTab {
  private plugin: ThinkPlugin;

  constructor(app: any, plugin: ThinkPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    render(<SettingsRoot plugin={this.plugin} />, containerEl);
  }
}