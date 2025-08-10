// src/features/settings/ui/DashboardConfigForm.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import {
  ThemeProvider, CssBaseline, Box, Stack, Typography,
  TextField, Select, MenuItem, IconButton, Collapse, Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

import { CORE_FIELDS, DashboardConfig, ModuleConfig } from '@core/domain/schema';
import { VIEW_OPTIONS, ViewName } from '@features/dashboard/ui'; // 确保 ViewName 被导出
import { theme as baseTheme } from '@shared/styles/mui-theme';
import { PillMultiSelect } from '@shared/components/form/PillMultiSelect';
import { RuleList } from '@shared/components/form/RuleList';
import { VIEW_EDITORS, ViewKind } from './ModuleEditors/registry';

const menu = { disablePortal: true, keepMounted: true } as const;

/* 保持滚动位置（避免“跳”） */
function keepScroll(fn:()=>void){
  const y=window.scrollY; fn();
  setTimeout(()=>window.scrollTo({top:y}),0);
  requestAnimationFrame(()=>{ window.scrollTo({top:y}); requestAnimationFrame(()=>window.scrollTo({top:y})); });
}

// ======================= 新增：所有视图模块的默认配置 =======================
const genId = ()=>Date.now().toString(36)+Math.random().toString(36).slice(2);

const DEFAULT_MODULE_CONFIGS: Record<ViewName, Omit<any, 'id' | '_open'>> = {
  BlockView: {
    view: 'BlockView', title: '新模块', collapsed: false,
    filtersArr:[], sortArr:[], fieldsArr:[], groupsArr:['categoryKey'],
  },
  ListView: {
    view: 'ListView', title: '新列表', collapsed: false,
    filtersArr:[], sortArr:[], fieldsArr:['content'], groupsArr:['fileName'],
  },
  TableView: {
    view: 'TableView', title: '新表格', collapsed: false,
    filtersArr:[], sortArr:[{field:'completionDate', dir:'desc'}], fieldsArr:['content', 'status', 'completionDate'], groupsArr:[],
  },
  ExcelView: {
    view: 'ExcelView', title: '新表格', collapsed: false,
    filtersArr:[], sortArr:[], fieldsArr:[], groupsArr:[],
  },
  TimelineView: { // <-- 这里是 TimelineView 的默认配置
    view: 'TimelineView', title: '新时间轴', collapsed: false,
    filtersArr:[], sortArr:[], fieldsArr:[], groupsArr:[],
    viewConfig: {
      categoryMap: {
        "00-健康打卡": "健康", "2-1健康": "健康", "2-2三餐": "健康",
        "2-3生活": "生活", "2-4思考": "思考", "2-5电脑": "电脑", "2-6工作": "工作",
        "2-0其他": "其他",
      },
      colorPalette: [
        "#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa",
        "#f472b6", "#38bdf8", "#10b981", "#f97316"
      ],
      progressOrder: ['健康', '生活', '电脑', '工作', '其他'],
    }
  }
};
// ========================================================================


export interface Props {
  dashboard : DashboardConfig;
  dashboards: DashboardConfig[];
  onSave    : (d:DashboardConfig)=>void;
  onCancel  : ()=>void;
}

export function DashboardConfigForm({ dashboard, dashboards, onSave, onCancel }: Props) {
  const fieldOptions = useMemo(()=>Array.from(new Set([...CORE_FIELDS,'extra.主题','extra.时长','extra.地点'])).sort(),[]);

  const [vals,setVals] = useState<any>({
    ...dashboard,
    initialView:dashboard.initialView||'月',
    tags:(dashboard.tags||[]).join(', '),
    modules:(dashboard.modules||[]).map(m=>({
      id:genId(), ...m,
      filtersArr:(m.filters??[]).map(x=>({...x})),
      sortArr   :(m.sort??[]   ).map(x=>({...x})),
      fieldsArr :m.fields??[],
      groupsArr :(m as any).groups??[],
      _open:true,
    })),
    _baseOpen:true,_modsOpen:true,
  });

  const set=(path:string,val:any)=>{
    if(!path.includes('.')) { setVals((v:any)=>({ ...v,[path]:val })); return; }
    setVals((v:any)=>{ const d=structuredClone(v); const seg=path.split('.'); let cur:any=d;
      for(let i=0;i<seg.length-1;i++) cur=cur[seg[i]]; cur[seg.at(-1)!]=val; return d; });
  };

  // 修改：添加模块时使用默认配置
  const addModule=()=>keepScroll(()=>set('modules',[...vals.modules, {
    ...structuredClone(DEFAULT_MODULE_CONFIGS.TimelineView), // 默认添加时间轴视图
    id: genId(),
    _open: true,
  }]));
  
  const removeModule=(i:number)=>keepScroll(()=>set('modules', vals.modules.filter((_x:any,j:number)=>j!==i)));

  // 新增：当切换视图类型时，加载对应的默认配置
  const handleViewChange = (index: number, newView: ViewName) => {
    const currentModule = vals.modules[index];
    const newModuleConfig = structuredClone(DEFAULT_MODULE_CONFIGS[newView] || DEFAULT_MODULE_CONFIGS.BlockView);
    
    // 保留通用配置，替换视图专属配置
    const updatedModule = {
      ...currentModule, // 保留 id, _open 等
      ...newModuleConfig, // 应用新视图的 title, view, viewConfig, fieldsArr 等
      title: currentModule.title, // 保留用户已修改的标题
    };

    const newModules = [...vals.modules];
    newModules[index] = updatedModule;
    set('modules', newModules);
  };

  const save=()=>{
    const cleaned:DashboardConfig={
      ...dashboard,
      ...vals,
      tags:String(vals.tags||'').split(/[,，]/).map((t:string)=>t.trim()).filter(Boolean),
      modules:vals.modules.map(({id,filtersArr,sortArr,fieldsArr,groupsArr,_open, ...rest}:any):ModuleConfig=>({
        ...rest,
        filters:(filtersArr||[]).filter((f:any)=>f.field).map((f:any)=>({...f})),
        sort   :(sortArr   ||[]).filter((s:any)=>s.field).map((s:any)=>({...s})),
        fields:fieldsArr||[],
        ...(groupsArr && groupsArr.length? { groups:groupsArr } : {}),
      })),
    };
    onSave(cleaned);
  };

  return (
    <ThemeProvider theme={baseTheme}>
      <CssBaseline/>
      <Box class="think-compact" sx={{display:'grid', gap:1}}>
        {/* 基础配置 */}
        <Box>
          <Stack direction="row" alignItems="center" spacing={0.75}
                 onClick={()=>keepScroll(()=>set('_baseOpen', !vals._baseOpen))}
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
                <TextField value={vals.name} onInput={e=>set('name',(e.target as HTMLInputElement).value)}/>
              </Stack>
              <Stack direction="row" spacing={0.6} alignItems="center">
                <Typography sx={{minWidth:92}}>数据源路径</Typography>
                <TextField value={vals.path} onInput={e=>set('path',(e.target as HTMLInputElement).value)}/>
              </Stack>
              <Stack direction="row" spacing={0.6} alignItems="center">
                <Typography sx={{minWidth:92}}>标签</Typography>
                <TextField value={vals.tags} onInput={e=>set('tags',(e.target as HTMLInputElement).value)}/>
              </Stack>
              <Stack direction="row" spacing={0.6} alignItems="center">
                <Typography sx={{minWidth:92}}>初始视图</Typography>
                <Select value={vals.initialView} MenuProps={menu}
                        onChange={e=>keepScroll(()=>set('initialView', e.target.value))}
                        sx={{minWidth:120}}>
                  {['年','季','月','周','天'].map(v=><MenuItem key={v} value={v}>{v}</MenuItem>)}
                </Select>
              </Stack>
              <Stack direction="row" spacing={0.6} alignItems="center">
                <Typography sx={{minWidth:92}}>初始日期</Typography>
                <TextField type="date" value={vals.initialDate}
                           onChange={e=>keepScroll(()=>set('initialDate',(e.target as HTMLInputElement).value))}
                           sx={{minWidth:160}}/>
              </Stack>
            </Stack>
          </Collapse>
        </Box>

        {/* 模块设置 */}
        <Box>
          <Stack direction="row" alignItems="center" sx={{justifyContent:'space-between'}}
                 onClick={()=>keepScroll(()=>set('_modsOpen', !vals._modsOpen))}>
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
              {vals.modules.map((m:any,i:number)=>{
                const Editor = VIEW_EDITORS[(m.view as ViewKind) ?? 'BlockView'];
                return (
                  <div key={m.id}>
                    {/* 模块头（点击折叠/展开） */}
                    <Stack direction="row" alignItems="center" spacing={0.6}
                           onClick={()=>keepScroll(()=>set(`modules.${i}._open`, !m._open))}
                           sx={{cursor:'pointer', userSelect:'none'}}>
                      <span style="font-size:16px;line-height:1;">{m._open?'▾':'▸'}</span>
                      <Typography sx={{ flex:1, color:'text.primary', fontWeight:600, fontSize:16 }} title="点击折叠/展开">
                        {m.title || '新模块'}
                      </Typography>
                      <Select value={m.view} MenuProps={menu}
                              onClick={e=>e.stopPropagation()}
                              // 修改：onChange 事件调用新的 handleViewChange 函数
                              onChange={e=>keepScroll(()=>handleViewChange(i, e.target.value as ViewName))}
                              sx={{minWidth:110}}>
                        {VIEW_OPTIONS.map(v=><MenuItem key={v} value={v}>{v.replace('View','')}</MenuItem>)}
                      </Select>

                      <IconButton size="small" color="error"
                                  onClick={(e)=>{e.stopPropagation(); removeModule(i);}} title="删除模块">
                        <DeleteIcon fontSize="small"/>
                      </IconButton>
                    </Stack>

                    {/* 模块体 */}
                    <Collapse in={m._open} timeout={110} unmountOnExit>
                      <Box sx={{mt:0.6}}>
                        {/* 标题编辑 */}
                        <Stack direction="row" spacing={0.6} alignItems="center" sx={{mb:0.4}}>
                          <Typography sx={{minWidth:72}}>模块标题</Typography>
                          <TextField value={m.title||''}
                                     onInput={e=>set(`modules.${i}.title`, (e.target as HTMLInputElement).value)}
                                     sx={{flex:1}}/>
                        </Stack>

                        {/* 视图专属设置 */}
                        {Editor && <Editor
                          value={m.viewConfig || {}}
                          onChange={(patch)=>keepScroll(()=>set(`modules.${i}.viewConfig`, { ...(m.viewConfig || {}), ...patch }))}
                          fieldOptions={fieldOptions}/>}
                        
                        {/* 通用：显示字段 / 分组字段 */}
                        <PillMultiSelect
                          label="显示字段"
                          value={m.fieldsArr}
                          options={fieldOptions}
                          onChange={v=>keepScroll(()=>set(`modules.${i}.fieldsArr`, v))}
                        />
                        <div style="height:6px;"></div>
                        <PillMultiSelect
                          label="分组字段"
                          value={m.groupsArr}
                          options={fieldOptions}
                          onChange={v=>keepScroll(()=>set(`modules.${i}.groupsArr`, v))}
                        />

                        {/* 过滤 / 排序 */}
                        <div style="height:6px;"></div>
                        <RuleList
                          title="过滤规则"
                          mode="filter"
                          rows={m.filtersArr}
                          fieldOptions={fieldOptions}
                          onAdd={()=>keepScroll(()=>set(`modules.${i}.filtersArr`, [...m.filtersArr,{field:'',op:'=',value:''}] ))}
                          onChange={(rows)=>keepScroll(()=>set(`modules.${i}.filtersArr`, rows))}
                        />
                        <div style="height:6px;"></div>
                        <RuleList
                          title="排序规则"
                          mode="sort"
                          rows={m.sortArr}
                          fieldOptions={fieldOptions}
                          onAdd={()=>keepScroll(()=>set(`modules.${i}.sortArr`, [...m.sortArr,{field:'',dir:'asc'}]))}
                          onChange={(rows)=>keepScroll(()=>set(`modules.${i}.sortArr`, rows))}
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

        {/* 底部操作 */}
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <IconButton onClick={save} title="保存"><CheckIcon/></IconButton>
          <IconButton onClick={onCancel} title="取消"><CloseIcon/></IconButton>
        </Stack>
      </Box>
    </ThemeProvider>
  );
}