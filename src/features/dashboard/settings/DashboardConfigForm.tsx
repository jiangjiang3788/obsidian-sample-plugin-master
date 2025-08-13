// src/features/dashboard/settings/DashboardConfigForm.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
// 引入 useImmer
import { useImmer } from 'use-immer';
import {
  ThemeProvider, CssBaseline, Box, Stack, Typography,
  TextField, Select, MenuItem, IconButton, Collapse, Divider,
  Checkbox, FormControlLabel, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

import { DashboardConfig, ModuleConfig, getAvailableFields } from '@core/index';
import { VIEW_OPTIONS } from '@features/dashboard/ui';
import { theme as baseTheme } from '@shared/styles/mui-theme';
import { PillMultiSelect } from '@shared/components/form/PillMultiSelect';
import { RuleList } from '@shared/components/form/RuleList';
import { VIEW_EDITORS, VIEW_DEFAULT_CONFIGS, ViewKind } from './ModuleEditors/registry';
import { DataStore } from '@core/services/dataStore';

const menu = { disablePortal: true, keepMounted: true } as const;

function keepScroll(fn: () => void) {
  const y = window.scrollY; fn();
  requestAnimationFrame(() => { window.scrollTo({ top: y }); });
}

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

export interface Props {
  dashboard: DashboardConfig;
  dashboards: DashboardConfig[];
  onSave: (d: DashboardConfig) => void;
  onCancel: () => void;
}

export function DashboardConfigForm({ dashboard, dashboards, onSave, onCancel }: Props) {
  const fieldOptions = useMemo(() => {
    const allItems = DataStore.instance.queryItems(); 
    return getAvailableFields(allItems).map(def => def.key);
  }, []);

  // 使用 useImmer 替换 useState
  const [vals, updateVals] = useImmer(() => ({
    ...dashboard,
    initialView: dashboard.initialView || '月',
    hideToolbar: dashboard.hideToolbar || false,
    tags: (dashboard.tags || []).join(', '),
    modules: (dashboard.modules || []).map(m => ({
      id: genId(), ...m,
      collapsed: m.collapsed || false,
      filtersArr: (m.filters ?? []).map(x => ({ ...x })),
      sortArr: (m.sort ?? []).map(x => ({ ...x })),
      fieldsArr: m.fields ?? [],
      groupsArr: m.group ? [m.group] : [],
      _open: true,
    })),
    _baseOpen: true, _modsOpen: true,
  }));

  // 不再需要手动的 set 函数，可以直接用 updateVals 修改
  const addModule = () => keepScroll(() => updateVals(draft => {
    draft.modules.push({
        ...structuredClone(VIEW_DEFAULT_CONFIGS.BlockView),
        id: genId(),
        _open: true,
        // 初始化数组，避免 undefined
        filtersArr: [], 
        sortArr: [], 
        fieldsArr: [], 
        groupsArr: [],
    });
  }));

  const removeModule = (i: number) => keepScroll(() => updateVals(draft => {
    draft.modules.splice(i, 1);
  }));

  const handleViewChange = (index: number, newView: ViewKind) => {
    keepScroll(() => updateVals(draft => {
        const currentModule = draft.modules[index];
        const newModuleConfig = structuredClone(VIEW_DEFAULT_CONFIGS[newView] || VIEW_DEFAULT_CONFIGS.BlockView);
        
        // 保留标题和其他通用字段，合并新视图的默认配置
        draft.modules[index] = {
            ...currentModule,
            ...newModuleConfig,
            title: currentModule.title,
            filtersArr: currentModule.filtersArr,
            sortArr: currentModule.sortArr,
            fieldsArr: currentModule.fieldsArr,
            groupsArr: currentModule.groupsArr,
        };
    }));
  };

  const save = () => {
    const cleaned: DashboardConfig = {
      ...dashboard,
      name: vals.name,
      path: vals.path,
      initialView: vals.initialView,
      initialDate: vals.initialDate,
      hideToolbar: vals.hideToolbar,
      tags: String(vals.tags || '').split(/[,，]/).map((t: string) => t.trim()).filter(Boolean),
      modules: vals.modules.map(({ id, filtersArr, sortArr, fieldsArr, groupsArr, _open, ...rest }: any): ModuleConfig => ({
        ...rest,
        filters: (filtersArr || []).filter((f: any) => f.field).map((f: any) => ({ ...f })),
        sort: (sortArr || []).filter((s: any) => s.field).map((s: any) => ({ ...s })),
        fields: fieldsArr || [],
        group: groupsArr?.[0] || undefined,
      })),
    };
    onSave(cleaned);
  };

  // 渲染部分 JSX 保持不变，但更新事件处理器将使用 updateVals
  return (
    <ThemeProvider theme={baseTheme}>
      <CssBaseline/>
      <Box class="think-compact" sx={{display:'grid', gap:1}}>
        {/* 基础配置 */}
        <Box>
          <Stack direction="row" alignItems="center" spacing={0.75}
                 onClick={()=>keepScroll(()=> updateVals(draft => { draft._baseOpen = !draft._baseOpen; }))}
                 sx={{cursor:'pointer', userSelect:'none', mb: vals._baseOpen? 0.5:0}}>
            <Typography sx={{ color:'text.primary', fontWeight:600, fontSize:16 }}>
              基础配置
            </Typography>
            <span>{vals._baseOpen?'▾':'▸'}</span>
          </Stack>
          <Collapse in={vals._baseOpen} timeout={120} unmountOnExit>
            <Stack spacing={0.6}>
              <Stack direction="row" spacing={0.6} alignItems="center">
                <Typography sx={{minWidth:92}}>配置名称</Typography>
                <TextField value={vals.name} onInput={e => updateVals(draft => { draft.name = (e.target as HTMLInputElement).value; })}/>
              </Stack>
              <Stack direction="row" spacing={0.6} alignItems="center">
                <Typography sx={{minWidth:92}}>数据源路径</Typography>
                <TextField value={vals.path} onInput={e => updateVals(draft => { draft.path = (e.target as HTMLInputElement).value; })}/>
              </Stack>
              <Stack direction="row" spacing={0.6} alignItems="center">
                <Typography sx={{minWidth:92}}>标签</Typography>
                <TextField value={vals.tags} onInput={e => updateVals(draft => { draft.tags = (e.target as HTMLInputElement).value; })}/>
              </Stack>
              <Stack direction="row" spacing={0.6} alignItems="center">
                <Typography sx={{minWidth:92}}>初始视图</Typography>
                <Select value={vals.initialView} MenuProps={menu}
                        onChange={e => updateVals(draft => { draft.initialView = e.target.value as string; })}
                        sx={{minWidth:120}}>
                  {['年','季','月','周','天'].map(v=><MenuItem key={v} value={v}>{v}</MenuItem>)}
                </Select>
              </Stack>
              <Stack direction="row" spacing={0.6} alignItems="center">
                <Typography sx={{minWidth:92}}>初始日期</Typography>
                <TextField type="date" value={vals.initialDate}
                           onChange={e => updateVals(draft => { draft.initialDate = (e.target as HTMLInputElement).value; })}
                           sx={{minWidth:160}}/>
              </Stack>
              <Stack direction="row" spacing={0.6} alignItems="center">
                  <Typography sx={{minWidth:92}}>界面选项</Typography>
                  <FormControlLabel
                      control={<Checkbox checked={vals.hideToolbar} onChange={e => updateVals(draft => { draft.hideToolbar = e.target.checked; })} />}
                      label="隐藏顶部工具栏"
                      sx={{ m: 0 }}
                  />
              </Stack>
            </Stack>
          </Collapse>
        </Box>

        {/* 模块设置 */}
        <Box>
          <Stack direction="row" alignItems="center" sx={{justifyContent:'space-between'}}
                 onClick={()=>keepScroll(()=> updateVals(draft => { draft._modsOpen = !draft._modsOpen; }))}>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{cursor:'pointer', userSelect:'none'}}>
              <Typography sx={{ color:'text.primary', fontWeight:600, fontSize:16 }}>
                模块设置
              </Typography>
              <span>{vals._modsOpen?'▾':'▸'}</span>
            </Stack>
            <IconButton size="small" onClick={(e)=>{e.stopPropagation(); addModule();}} title="新增模块">
              <AddIcon fontSize="small"/>
            </IconButton>
          </Stack>

          <Collapse in={vals._modsOpen} timeout={120} unmountOnExit>
            <Divider sx={{my:0.75, borderColor: 'gray'}}/>
            <Stack spacing={0.75}>
              {vals.modules.map((m:any, i:number) => {
                const Editor = VIEW_EDITORS[(m.view as ViewKind) ?? 'BlockView'];
                return (
                  <div key={m.id}>
                    <Stack direction="row" alignItems="center" spacing={0.6}
                           onClick={()=>keepScroll(()=> updateVals(draft => { draft.modules[i]._open = !m._open; }))}
                           sx={{cursor:'pointer', userSelect:'none'}}>
                      <span style="font-size:16px;line-height:1;">{m._open?'▾':'▸'}</span>
                      <Typography sx={{ flex:1, color:'text.primary', fontWeight:600, fontSize:16 }} title="点击折叠/展开">
                        {m.title || '新模块'}
                      </Typography>
                      <Tooltip title="设置此模块在加载时是否默认折叠">
                          <FormControlLabel
                              sx={{ m: 0, mr: 1 }}
                              control={<Checkbox size="small" checked={m.collapsed} onChange={e => updateVals(draft => { draft.modules[i].collapsed = e.target.checked; })} onClick={e => e.stopPropagation()}/>}
                              label={<Typography sx={{fontSize: 12}}>默认折叠</Typography>}
                              onClick={e => e.stopPropagation()}
                          />
                      </Tooltip>
                      <Select value={m.view} MenuProps={menu}
                              onClick={e=>e.stopPropagation()}
                              onChange={e=>handleViewChange(i, e.target.value as ViewKind)}
                              sx={{minWidth:110}}>
                        {VIEW_OPTIONS.map(v=><MenuItem key={v} value={v}>{v.replace('View','')}</MenuItem>)}
                      </Select>
                      <IconButton size="small" color="error"
                                  onClick={(e)=>{e.stopPropagation(); removeModule(i);}} title="删除模块">
                        <DeleteIcon fontSize="small"/>
                      </IconButton>
                    </Stack>
                    <Collapse in={m._open} timeout={110} unmountOnExit>
                      <Box sx={{mt:0.6}}>
                        <Stack direction="row" spacing={0.6} alignItems="center" sx={{mb:0.4}}>
                          <Typography sx={{minWidth:72}}>模块标题</Typography>
                          <TextField value={m.title||''}
                                     onInput={e=> updateVals(draft => { draft.modules[i].title = (e.target as HTMLInputElement).value; })}
                                     sx={{flex:1}}/>
                        </Stack>
                        {Editor && <Editor
                          value={m}
                          onChange={(patch)=>keepScroll(()=> updateVals(draft => { Object.assign(draft.modules[i], patch); }))}
                          fieldOptions={fieldOptions}/>}
                        <PillMultiSelect
                          label="显示字段" value={m.fieldsArr} options={fieldOptions}
                          onChange={v=>keepScroll(()=> updateVals(draft => { draft.modules[i].fieldsArr = v; }))}
                        />
                        <div style="height:6px;"></div>
                        <PillMultiSelect
                          label="分组字段" value={m.groupsArr} options={fieldOptions}
                          onChange={v=>keepScroll(()=> updateVals(draft => { draft.modules[i].groupsArr = v; }))}
                        />
                        <div style="height:6px;"></div>
                        <RuleList
                          title="过滤规则" mode="filter" rows={m.filtersArr} fieldOptions={fieldOptions}
                          onAdd={()=>keepScroll(()=> updateVals(draft => { draft.modules[i].filtersArr.push({field:'',op:'=',value:''}); }))}
                          onChange={(rows)=>keepScroll(()=> updateVals(draft => { draft.modules[i].filtersArr = rows; }))}
                        />
                        <div style="height:6px;"></div>
                        <RuleList
                          title="排序规则" mode="sort" rows={m.sortArr} fieldOptions={fieldOptions}
                          onAdd={() => keepScroll(() => updateVals(draft => { draft.modules[i].sortArr.push({ field: '', dir: 'asc' }); }))}
                          onChange={(rows)=>keepScroll(()=> updateVals(draft => { draft.modules[i].sortArr = rows; }))}
                        />
                      </Box>
                    </Collapse>
                    {i < vals.modules.length-1 && <Divider sx={{my:0.5, borderColor: 'gray'}} />}
                  </div>
                );
              })}
            </Stack>
          </Collapse>
        </Box>

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <IconButton onClick={save} title="保存"><CheckIcon/></IconButton>
          <IconButton onClick={onCancel} title="取消"><CloseIcon/></IconButton>
        </Stack>
      </Box>
    </ThemeProvider>
  );
}