// src/features/dashboard/ui/DashboardConfigForm.tsx
// 改动点：统一无外框；“基础配置 / 模块设置”两段都可折叠；所有影响布局的交互用 keepScroll 包裹。
/** @jsxImportSource preact */
import { h } from 'preact';
import { OPS } from '@core/domain/constants';
import { memo } from 'preact/compat';
import {
  useMemo, useRef, useCallback, useState,
} from 'preact/hooks';
import {
  ThemeProvider, CssBaseline,
  Box, Stack, Typography,
  TextField, Select, MenuItem,
  Checkbox, FormControlLabel,
  IconButton, Divider, Collapse, Autocomplete, Chip,
} from '@mui/material';
import AddIcon       from '@mui/icons-material/Add';
import DeleteIcon    from '@mui/icons-material/Delete';
import DragHandle    from '@mui/icons-material/DragIndicator';
import ArrowDropUp   from '@mui/icons-material/ArrowDropUp';
import ArrowDropDown from '@mui/icons-material/ArrowDropDown';
import { Formik, Form, FieldArray } from 'formik';

import {
  DashboardConfig,
  ModuleConfig,
  CORE_FIELDS,
} from '@core/domain/schema';
import { VIEW_OPTIONS } from '@features/dashboard/ui';
import { theme as baseTheme } from '@shared/styles/mui-theme';

const theme = baseTheme;

const CIRCLE_BTN = { border: '1px solid', borderColor: 'divider', borderRadius: '50%', boxShadow: 'none', width: 26, height: 26, p: '2px' };
const CIRCLE_BTN_S = { ...CIRCLE_BTN, width: 22, height: 22, p: '1px' };

function keepScroll(fn: () => void) {
  const el = document.scrollingElement || document.documentElement;
  const y = el.scrollTop;
  fn();
  const restore = () => el.scrollTo({ top: y });
  requestAnimationFrame(() => {
    requestAnimationFrame(() => setTimeout(restore, 0));
  });
}

function useDebounced<T extends(...a:any)=>void>(fn:T, ms=300) {
  const r = useRef(fn); r.current = fn;
  return useCallback((...a:Parameters<T>)=>{
    clearTimeout((r as any)._t);
    (r as any)._t = setTimeout(()=>r.current(...a), ms);
  },[ms]);
}

/* -------------------- ModuleCard -------------------- */
interface ModCardProps {
  idx: number;
  mod: any;
  fieldOptions: string[];
  setFieldValue: (path:string,v:any,validate?:boolean)=>void;
  remove: (i:number)=>void;
  move: (from:number,to:number)=>void;
}

const ModuleCard = memo<ModCardProps>(({
  idx, mod, fieldOptions, setFieldValue, remove, move,
})=>{
  const [open,setOpen]=useState(true);
  const toggle = ()=>keepScroll(()=>setOpen(v=>!v));

  const onDragStart=(e:DragEvent)=>e.dataTransfer?.setData('text',idx.toString());
  const onDragOver =(e:DragEvent)=>e.preventDefault();
  const onDrop     =(e:DragEvent)=>{
    e.preventDefault();
    const from=Number(e.dataTransfer?.getData('text')??-1);
    if(!isNaN(from)&&from!==idx) keepScroll(()=>move(from,idx));
  };

  const addFilter = () =>
    keepScroll(() =>
      setFieldValue(
        `modules.${idx}.filtersArr`,
        [...mod.filtersArr, { field: '', op: '=', value: '' }],
        false,
      ),
    );

  const delFilter = (i: number) =>
    keepScroll(() =>
      setFieldValue(
        `modules.${idx}.filtersArr`,
        mod.filtersArr.filter((_: any, j: number) => j !== i),
        false,
      ),
    );

  const addSort = () =>
    keepScroll(() =>
      setFieldValue(
        `modules.${idx}.sortArr`,
        [...mod.sortArr, { field: '', dir: 'asc' }],
        false,
      ),
    );

  const delSort = (i: number) =>
    keepScroll(() =>
      setFieldValue(
        `modules.${idx}.sortArr`,
        mod.sortArr.filter((_: any, j: number) => j !== i),
        false,
      ),
    );

  const setDebounced = useDebounced(
    (path:string,val:any)=>setFieldValue(path,val,false),300,
  );

  return (
    <Box
      draggable onDragStart={onDragStart as any}
      onDragOver={onDragOver as any} onDrop={onDrop as any}
      sx={{ border: 0, p: 1.5, bgcolor:'transparent' }}
    >
      {/* Header */}
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField label="标题" value={mod.title}
          onInput={e=>setFieldValue(
            `modules.${idx}.title`,
            (e.target as HTMLInputElement).value,false)} sx={{flex:1}}/>
        <Select value={mod.view}
          onChange={e=>keepScroll(()=>setFieldValue(`modules.${idx}.view`,e.target.value,false))}
          sx={{minWidth:140}}>
          {VIEW_OPTIONS.map(v=><MenuItem key={v} value={v}>{v}</MenuItem>)}
        </Select>
        <FormControlLabel label="默认折叠"
          control={<Checkbox checked={mod.collapsed}
            onChange={e=>keepScroll(()=>setFieldValue(`modules.${idx}.collapsed`,e.target.checked,false))}/> }
          sx={{ml:1}}/>
        <IconButton size="small" onClick={toggle} sx={CIRCLE_BTN}>
          {open?<ArrowDropUp/>:<ArrowDropDown/>}
        </IconButton>
        <IconButton size="small" color="error" sx={CIRCLE_BTN}
          onClick={()=>keepScroll(()=>remove(idx))}><DeleteIcon fontSize="small"/></IconButton>
        <IconButton size="small" sx={CIRCLE_BTN}><DragHandle fontSize="small"/></IconButton>
      </Stack>

      {/* Content */}
      <Collapse in={open} timeout={120} unmountOnExit>
        <Stack spacing={2} sx={{mt:2}}>
          {/* TableView 行/列字段 */}
          {mod.view==='TableView'&&(
            <Stack direction="row" spacing={2}>
              <Autocomplete freeSolo options={fieldOptions} value={mod.rowField??''}
                onChange={(_,v)=>keepScroll(()=>setFieldValue(`modules.${idx}.rowField`,v??'',false))}
                renderInput={p=><TextField {...p} label="行字段"
                  variant="standard" InputProps={{...p.InputProps,disableUnderline:true}}/>}
                sx={{flex:1}}/>
              <Autocomplete freeSolo options={fieldOptions} value={mod.colField??''}
                onChange={(_,v)=>keepScroll(()=>setFieldValue(`modules.${idx}.colField`,v??'',false))}
                renderInput={p=><TextField {...p} label="列字段"
                  variant="standard" InputProps={{...p.InputProps,disableUnderline:true}}/>}
                sx={{flex:1}}/>
            </Stack>
          )}

          {/* 显示字段 */}
          <Box>
            <Typography color="error" fontWeight={600} mb={1}>显示字段</Typography>
            <Autocomplete multiple options={fieldOptions} value={mod.fieldsArr}
              onChange={(_,v)=>keepScroll(()=>setFieldValue(`modules.${idx}.fieldsArr`,v,false))}
              renderTags={(v,getTagProps)=>v.map((opt,i)=><Chip label={opt}{...getTagProps({index:i})}/>)}
              renderInput={p=><TextField {...p} variant="standard" placeholder="选择或输入字段"
                InputProps={{...p.InputProps,disableUnderline:true}}/>}/>
          </Box>

          {/* 分组字段 */}
          <Box>
            <Typography color="error" fontWeight={600} mb={1}>分组字段</Typography>
            <Autocomplete multiple options={fieldOptions} value={mod.groupsArr}
              onChange={(_,v)=>keepScroll(()=>setFieldValue(`modules.${idx}.groupsArr`,v,false))}
              renderTags={(v,getTagProps)=>v.map((opt,i)=><Chip label={opt}{...getTagProps({index:i})}/>)}
              renderInput={p=><TextField {...p} variant="standard" placeholder="选择或输入字段"
                InputProps={{...p.InputProps,disableUnderline:true}}/>}/>
          </Box>

          {/* 过滤规则 */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <Typography color="error" fontWeight={600}>过滤规则</Typography>
              <IconButton size="small" onClick={addFilter} sx={CIRCLE_BTN_S}>
                <AddIcon fontSize="small"/></IconButton>
            </Stack>
            <Stack spacing={1}>
              {mod.filtersArr.map((f:any,i:number)=>(
                <Stack key={i} direction="row" spacing={1}>
                  <TextField select value={f.field}
                    onChange={e=>keepScroll(()=>setFieldValue(`modules.${idx}.filtersArr.${i}.field`,
                      e.target.value,false))} sx={{flex:1}}>
                    {fieldOptions.map(o=><MenuItem key={o} value={o}>{o}</MenuItem>)}
                  </TextField>
                  <Select value={f.op}
                    onChange={e=>keepScroll(()=>setFieldValue(`modules.${idx}.filtersArr.${i}.op`,
                      e.target.value,false))} sx={{width:90}}>
                    {OPS.map(op=><MenuItem key={op} value={op}>{op}</MenuItem>)}
                  </Select>
                  <TextField value={f.value}
                    onInput={e=>setDebounced(
                      `modules.${idx}.filtersArr.${i}.value`,
                      (e.target as HTMLInputElement).value)} sx={{flex:1}}/>
                  <IconButton size="small" color="error" sx={CIRCLE_BTN}
                    onClick={()=>delFilter(i)}><DeleteIcon fontSize="small"/></IconButton>
                </Stack>
              ))}
            </Stack>
          </Box>

          {/* 排序规则 */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <Typography color="error" fontWeight={600}>排序规则</Typography>
              <IconButton size="small" onClick={addSort} sx={CIRCLE_BTN_S}>
                <AddIcon fontSize="small"/></IconButton>
            </Stack>
            <Stack spacing={1}>
              {mod.sortArr.map((s:any,i:number)=>(
                <Stack key={i} direction="row" spacing={1}>
                  <TextField select value={s.field}
                    onChange={e=>keepScroll(()=>setFieldValue(`modules.${idx}.sortArr.${i}.field`,
                      e.target.value,false))} sx={{flex:1}}>
                    {fieldOptions.map(o=><MenuItem key={o} value={o}>{o}</MenuItem>)}
                  </TextField>
                  <Select value={s.dir}
                    onChange={e=>keepScroll(()=>setFieldValue(`modules.${idx}.sortArr.${i}.dir`,
                      e.target.value,false))} sx={{width:100}}>
                    <MenuItem value="asc">升序</MenuItem>
                    <MenuItem value="desc">降序</MenuItem>
                  </Select>
                  <IconButton size="small" color="error" sx={CIRCLE_BTN}
                    onClick={()=>delSort(i)}><DeleteIcon fontSize="small"/></IconButton>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Collapse>
    </Box>
  );
});

/* -------------------- DashboardConfigForm -------------------- */
interface Props {
  dashboard : DashboardConfig;
  dashboards: DashboardConfig[];
  onSave    : (d:DashboardConfig)=>void;
  onCancel  : ()=>void;
}

export function DashboardConfigForm({ dashboard,dashboards,onSave,onCancel }:Props){
  const fieldOptions = useMemo(()=>Array.from(
    new Set([...CORE_FIELDS,'extra.主题','extra.时长','extra.地点'])).sort(),[]);
  const genId = ()=>Date.now().toString(36)+Math.random().toString(36).slice(2);

  const [baseOpen,setBaseOpen]=useState(true);
  const [modsOpen,setModsOpen]=useState(true);
  const toggleBase = ()=>keepScroll(()=>setBaseOpen(v=>!v));
  const toggleMods = ()=>keepScroll(()=>setModsOpen(v=>!v));

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline/>
      <Formik
        initialValues={{
          ...dashboard,
          initialView:dashboard.initialView||'月',
          tags:dashboard.tags?.join(', ')||'',
          modules:dashboard.modules.map(m=>({
            id:genId(),...m,
            filtersArr:(m.filters??[]).map(x=>({...x})),
            sortArr:(m.sort??[]).map(x=>({...x})),
            fieldsArr:m.fields??[],
            groupsArr:(m as any).groups??[],
          })),
        }}
        validate={()=>({})}
        validateOnChange={false}
        onSubmit={vals=>{
          const cleaned:DashboardConfig={
            ...dashboard,...vals,
            tags:vals.tags.split(/[,，]/).map(t=>t.trim()).filter(Boolean),
            modules:vals.modules.map(({id,filtersArr,sortArr,fieldsArr,groupsArr,...rest}):ModuleConfig=>({
              ...rest,
              filters:filtersArr.filter((f:any)=>f.field).map(f=>({field:f.field,op:f.op,value:f.value})),
              sort   :sortArr  .filter((s:any)=>s.field).map(s=>({field:s.field,dir:s.dir})),
              fields :fieldsArr,
              groups :groupsArr,
            })),
          };
          onSave(cleaned);
        }}
      >
      {({ values,setFieldValue })=>(
        <Form>
          {/* 基础设置（无外框，可折叠） */}
          <Box sx={{mb:2}}>
            <Stack direction="row" alignItems="center" spacing={1} mb={baseOpen?1:0}>
              <Typography variant="h6" color="error">基础配置</Typography>
              <IconButton size="small" onClick={toggleBase} sx={CIRCLE_BTN}>
                {baseOpen?<ArrowDropUp/>:<ArrowDropDown/>}
              </IconButton>
            </Stack>
            <Collapse in={baseOpen} timeout={120} unmountOnExit>
              <Stack spacing={1.5}>
                {[{
                  label:'配置名称',node:<TextField fullWidth value={values.name}
                    onInput={e=>setFieldValue('name',(e.target as HTMLInputElement).value,false)}/>,
                },{
                  label:'数据源路径',node:<TextField fullWidth value={values.path}
                    onInput={e=>setFieldValue('path',(e.target as HTMLInputElement).value,false)}/>,
                },{
                  label:'标签(逗号分隔)',node:<TextField fullWidth value={values.tags}
                    onInput={e=>setFieldValue('tags',(e.target as HTMLInputElement).value,false)}/>,
                },{
                  label:'初始视图',node:<Select sx={{minWidth:160}} value={values.initialView}
                    onChange={e=>keepScroll(()=>setFieldValue('initialView',e.target.value,false))}>
                      {['年','季','月','周','天'].map(v=><MenuItem key={v} value={v}>{v}</MenuItem>)}
                    </Select>,
                },{
                  label:'初始日期',node:<TextField type="date" sx={{minWidth:200}}
                    value={values.initialDate}
                    onChange={e=>keepScroll(()=>setFieldValue('initialDate',(e.target as HTMLInputElement).value,false))}
                    InputLabelProps={{shrink:true}}/>,
                }].map((r,i)=>(
                  <Stack key={i} direction="row" alignItems="center" spacing={2}>
                    <Typography sx={{minWidth:96}}>{r.label}</Typography>{r.node}
                  </Stack>
                ))}
              </Stack>
            </Collapse>
          </Box>

          {/* 模块列表（无外框，可折叠） */}
          <Box sx={{mb:2}}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={modsOpen?1:0}>
              <Typography variant="h6" color="error">模块设置</Typography>
              <Stack direction="row" spacing={1}>
                <IconButton size="small" onClick={()=>keepScroll(()=>setModsOpen(v=>!v))} sx={CIRCLE_BTN}>
                  {modsOpen ? <ArrowDropUp/> : <ArrowDropDown/>}
                </IconButton>
                <IconButton
                  size="small" sx={CIRCLE_BTN}
                  onClick={()=>keepScroll(()=>setFieldValue('modules',[
                    ...values.modules,
                    {
                      id:genId(),
                      view:'BlockView',
                      title:'新模块',
                      collapsed:false,
                      filtersArr:[],
                      sortArr:[],
                      fieldsArr:[],
                      groupsArr:['categoryKey'],
                    }
                  ],false))}
                >
                  <AddIcon/>
                </IconButton>
              </Stack>
            </Stack>

            <Collapse in={modsOpen} timeout={120} unmountOnExit>
              <Divider sx={{mb:2}}/>
              <FieldArray name="modules">
              {({ remove,move })=>(
                <Stack spacing={2}>
                  {values.modules.map((m:any,i:number)=>(
                    <ModuleCard key={m.id} idx={i} mod={m}
                      fieldOptions={fieldOptions}
                      setFieldValue={setFieldValue}
                      remove={remove} move={move}/>
                  ))}
                </Stack>
              )}
              </FieldArray>
            </Collapse>
          </Box>

          {/* 底部按钮 */}
          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
            <IconButton type="submit" sx={CIRCLE_BTN}>💾</IconButton>
            <IconButton onClick={onCancel} sx={CIRCLE_BTN}>✖</IconButton>
          </Stack>
        </Form>
      )}
      </Formik>
    </ThemeProvider>
  );
}