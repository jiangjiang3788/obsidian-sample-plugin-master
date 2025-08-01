// src/ui/DashboardConfigForm.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { memo } from 'preact/compat';
import { useMemo, useRef, useCallback, useState } from 'preact/hooks';
import {
  ThemeProvider, CssBaseline,
  Box, Stack, Typography,
  TextField, Select, MenuItem,
  Checkbox, FormControlLabel,
  IconButton, Button, Chip, Autocomplete, Divider,
  Collapse,
} from '@mui/material';
import AddIcon     from '@mui/icons-material/Add';
import DeleteIcon  from '@mui/icons-material/Delete';
import DragHandle  from '@mui/icons-material/DragIndicator';
import ArrowDropUp from '@mui/icons-material/ArrowDropUp';
import ArrowDropDown from '@mui/icons-material/ArrowDropDown';
import { Formik, Form, FieldArray } from 'formik';

import {
  DashboardConfig,
  ModuleConfig,
  FilterRule,
  SortRule,
  CORE_FIELDS,
} from '../config/schema';
import { VIEW_OPTIONS } from '../views';
import { theme } from './mui-theme';

/* ---------- 通用 ---------- */
const OPS = ['=', '!=', 'includes', 'regex', '>', '<'] as const;
const safeJSON = <T,>(txt: string, fallback: T): T => { try { return JSON.parse(txt); } catch { return fallback; } };
function useDebounced<T extends (...a: any[]) => void>(fn: T, delay = 300) {
  const r = useRef(fn); r.current = fn;
  return useCallback((...a: Parameters<T>) => {
    clearTimeout((r as any)._t);
    (r as any)._t = setTimeout(() => r.current(...a), delay);
  }, [delay]);
}

/* ========== 模块卡片 ========== */
interface ModCardProps {
  idx: number;
  mod: any;
  fieldOptions: string[];
  setFieldValue: (path: string, v: any, validate?: boolean) => void;
  remove: (i: number) => void;
  move: (from: number, to: number) => void;
}

const ModuleCard = memo<ModCardProps>(({
  idx, mod, fieldOptions, setFieldValue, remove, move,
}) => {
  const [open, setOpen] = useState(true);
  const toggle = () => setOpen(v => !v);

  /* 拖动排序（原生 HTML5） */
  const onDragStart = (e: DragEvent) => e.dataTransfer?.setData('text/plain', idx.toString());
  const onDragOver  = (e: DragEvent) => e.preventDefault();
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const from = Number(e.dataTransfer?.getData('text/plain') ?? -1);
    if (!isNaN(from) && from !== idx) move(from, idx);
  };

  /* 过滤 / 排序 规则的操作函数 ----------------------------- */
  const addFilter  = () => setFieldValue(`modules.${idx}.filtersArr`, [...mod.filtersArr, {field:'',op:'=',value:''}], false);
  const delFilter  = (i:number) => setFieldValue(`modules.${idx}.filtersArr`, mod.filtersArr.filter((_:any,j:number)=>j!==i), false);
  const addSort    = () => setFieldValue(`modules.${idx}.sortArr`,    [...mod.sortArr,    {field:'',dir:'asc'}], false);
  const delSort    = (i:number) => setFieldValue(`modules.${idx}.sortArr`,    mod.sortArr.filter((_:any,j:number)=>j!==i), false);

  const setDebounced = useDebounced(
    (path: string, val: any) => setFieldValue(path, val, false),
    300,
  );

  return (
    <Box
      draggable
      onDragStart={onDragStart as any}
      onDragOver={onDragOver as any}
      onDrop={onDrop as any}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 1.5,
        backgroundColor: 'background.paper',
      }}
    >
      {/* --- 头部 ------------------------------------------------------------------- */}
      <Stack direction="row" spacing={1} alignItems="center">
        <DragHandle sx={{ cursor:'grab', color:'text.secondary' }}/>
        <TextField
          label="标题"
          value={mod.title}
          onInput={e=>setFieldValue(`modules.${idx}.title`, (e.target as HTMLInputElement).value, false)}
          sx={{ flex:1 }}
          size="small"
        />
        <Select
          size="small"
          value={mod.view}
          onChange={e=>setFieldValue(`modules.${idx}.view`, e.target.value, false)}
          sx={{ minWidth:120 }}
        >
          {VIEW_OPTIONS.map(v=> <MenuItem key={v} value={v}>{v}</MenuItem>)}
        </Select>
        <FormControlLabel
          label="默认折叠"
          control={
            <Checkbox
              size="small"
              checked={mod.collapsed}
              onChange={e=>setFieldValue(`modules.${idx}.collapsed`, e.target.checked, false)}
            />
          }
          sx={{ ml:1 }}
        />
        <IconButton size="small" onClick={toggle}>{open ? <ArrowDropUp/> : <ArrowDropDown/>}</IconButton>
        <IconButton size="small" color="error" onClick={()=>remove(idx)}><DeleteIcon fontSize="small"/></IconButton>
      </Stack>

      {/* --- 内容 ------------------------------------------------------------------- */}
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Stack spacing={2} sx={{ mt:2 }}>
          {/* 行列字段（仅 TableView 用） */}
          {mod.view === 'TableView' && (
            <Stack direction="row" spacing={2}>
              <TextField
                label="行字段"
                value={mod.rowField}
                onInput={e=>setFieldValue(`modules.${idx}.rowField`, (e.target as HTMLInputElement).value, false)}
                size="small"
                sx={{ flex:1 }}
              />
              <TextField
                label="列字段"
                value={mod.colField}
                onInput={e=>setFieldValue(`modules.${idx}.colField`, (e.target as HTMLInputElement).value, false)}
                size="small"
                sx={{ flex:1 }}
              />
            </Stack>
          )}

          {/* ---------- 显示字段 ---------- */}
          <Autocomplete
            multiple
            freeSolo
            options={fieldOptions}
            value={mod.fieldsArr}
            onChange={(_, v)=>setFieldValue(`modules.${idx}.fieldsArr`, v, false)}
            renderTags={(value,getTagProps)=>
              value.map((opt,i)=><Chip label={opt} {...getTagProps({index:i})}/>)
            }
            renderInput={p=> <TextField {...p} label="显示字段（可多选）" size="small"/>}
          />

          {/* ---------- 过滤规则 ---------- */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <Typography fontWeight={500}>过滤规则</Typography>
              <IconButton size="small" onClick={addFilter}><AddIcon fontSize="small"/></IconButton>
            </Stack>
            <Stack spacing={1}>
              {mod.filtersArr.map((f:any,i:number)=>(
                <Stack key={i} direction="row" spacing={1}>
                  <Autocomplete
                    freeSolo
                    options={fieldOptions}
                    value={f.field}
                    onChange={(_,v)=>setFieldValue(`modules.${idx}.filtersArr.${i}.field`, v??'', false)}
                    renderInput={p=> <TextField {...p} size="small"/>}
                    sx={{ flex:1 }}
                  />
                  <Select
                    size="small"
                    value={f.op}
                    onChange={e=>setFieldValue(`modules.${idx}.filtersArr.${i}.op`, e.target.value,false)}
                    sx={{ width:90 }}
                  >
                    {OPS.map(op=><MenuItem key={op} value={op}>{op}</MenuItem>)}
                  </Select>
                  <TextField
                    size="small"
                    value={f.value}
                    onInput={e=>setDebounced(`modules.${idx}.filtersArr.${i}.value`, (e.target as HTMLInputElement).value)}
                    sx={{ flex:1 }}
                  />
                  <IconButton size="small" color="error" onClick={()=>delFilter(i)}><DeleteIcon fontSize="small"/></IconButton>
                </Stack>
              ))}
            </Stack>
          </Box>

          {/* ---------- 排序规则 ---------- */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <Typography fontWeight={500}>排序规则</Typography>
              <IconButton size="small" onClick={addSort}><AddIcon fontSize="small"/></IconButton>
            </Stack>
            <Stack spacing={1}>
              {mod.sortArr.map((s:any,i:number)=>(
                <Stack key={i} direction="row" spacing={1}>
                  <Autocomplete
                    freeSolo
                    options={fieldOptions}
                    value={s.field}
                    onChange={(_,v)=>setFieldValue(`modules.${idx}.sortArr.${i}.field`, v??'', false)}
                    renderInput={p=> <TextField {...p} size="small"/>}
                    sx={{ flex:1 }}
                  />
                  <Select
                    size="small"
                    value={s.dir}
                    onChange={e=>setFieldValue(`modules.${idx}.sortArr.${i}.dir`, e.target.value,false)}
                    sx={{ width:100 }}
                  >
                    <MenuItem value="asc">升序</MenuItem>
                    <MenuItem value="desc">降序</MenuItem>
                  </Select>
                  <IconButton size="small" color="error" onClick={()=>delSort(i)}><DeleteIcon fontSize="small"/></IconButton>
                </Stack>
              ))}
            </Stack>
          </Box>

          {/* ---------- 其他参数 ---------- */}
          <TextField
            label="props (JSON，可选)"
            multiline minRows={2}
            value={mod.propsStr}
            onInput={e=>setDebounced(`modules.${idx}.propsStr`, (e.target as HTMLInputElement).value)}
          />
        </Stack>
      </Collapse>
    </Box>
  );
});

/* ========== 主表单组件 ========== */
interface Props {
  dashboard : DashboardConfig;
  dashboards: DashboardConfig[];
  onSave    : (d: DashboardConfig) => void;
  onCancel  : () => void;
}

export function DashboardConfigForm({ dashboard, dashboards, onSave, onCancel }: Props) {
  const fieldOptions = useMemo(
    () => Array.from(new Set([...CORE_FIELDS, 'extra.主题','extra.时长','extra.地点'])).sort(),
    [],
  );
  const isNameUnique = (n:string)=>dashboards.every(d=>d===dashboard||d.name!==n);
  const genId = ()=> Date.now().toString(36)+Math.random().toString(36).slice(2);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline/>
      <Formik
        initialValues={{
          ...dashboard,
          initialView: dashboard.initialView || '月',
          tags       : dashboard.tags?.join(', ') || '',
          modules    : dashboard.modules.map(m=>({
            id        : genId(),
            ...m,
            /* UI 专用字段 */
            filtersArr: (m.filters ?? []).map(x=>({...x})),
            sortArr   : (m.sort ?? []).map(x=>({...x})),
            fieldsArr : m.fields ?? [],
            propsStr  : JSON.stringify(m.props ?? {}, null, 0),
          })),
        }}
        validate={v=>{
          const e:any={}; const n=v.name.trim();
          if(!n) e.name='名称不能为空'; else if(!isNameUnique(n)) e.name='名称已存在';
          return e;
        }}
        validateOnChange={false}
        onSubmit={vals=>{
          const cleaned:DashboardConfig={
            ...dashboard,
            ...vals,
            tags: vals.tags.split(/[,，]/).map(t=>t.trim()).filter(Boolean),
            modules: vals.modules.map(({id,filtersArr,sortArr,fieldsArr,propsStr,...rest}):ModuleConfig=>({
              ...rest,
              filters: filtersArr.filter((f:any)=>f.field).map(f=>({field:f.field,op:f.op,value:f.value})),
              sort   : sortArr  .filter((s:any)=>s.field).map(s=>({field:s.field,dir:s.dir})),
              fields : fieldsArr,
              props  : safeJSON<Record<string,any>>(propsStr,{}),
            })),
          };
          onSave(cleaned);
        }}
      >
        {({ values, errors, setFieldValue })=>(
          <Form>
            {/* ---------- 基础设置 ---------- */}
            <Box sx={{p:2,border:1,borderColor:'divider',borderRadius:2,mb:3,backgroundColor:'background.paper'}}>
              <Typography variant="h6" gutterBottom>基础设置</Typography>
              <Stack spacing={2}>
                <TextField
                  label="配置名称"
                  value={values.name}
                  error={!!errors.name}
                  helperText={errors.name}
                  onInput={e=>setFieldValue('name',(e.target as HTMLInputElement).value,false)}
                />
                <TextField
                  label="数据源路径"
                  value={values.path}
                  placeholder="如 Daily/2025，可留空"
                  onInput={e=>setFieldValue('path',(e.target as HTMLInputElement).value,false)}
                />
                <TextField
                  label="标签(逗号分隔)"
                  value={values.tags}
                  onInput={e=>setFieldValue('tags',(e.target as HTMLInputElement).value,false)}
                />
                <Select
                  value={values.initialView}
                  onChange={e=>setFieldValue('initialView',e.target.value,false)}
                  sx={{ maxWidth:160 }}
                >
                  {['年','季','月','周','天'].map(v=><MenuItem key={v} value={v}>{v}</MenuItem>)}
                </Select>
                <TextField
                  type="date"
                  label="初始日期"
                  value={values.initialDate}
                  onChange={e=>setFieldValue('initialDate',(e.target as HTMLInputElement).value,false)}
                  InputLabelProps={{ shrink:true }}
                  sx={{ maxWidth:200 }}
                />
              </Stack>
            </Box>

            {/* ---------- 模块列表 ---------- */}
            <FieldArray name="modules">
              {({ push, remove, move })=>(
                <Box sx={{mb:3}}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="h6">模块列表</Typography>
                    <IconButton
                      color="primary"
                      onClick={()=>push({
                        id:genId(), view:'BlockView', title:'新模块', collapsed:false,
                        filtersArr:[], sortArr:[], fieldsArr:[], propsStr:'{}',
                      })}
                    ><AddIcon/></IconButton>
                  </Stack>
                  <Divider sx={{mb:2}}/>
                  <Stack spacing={2}>
                    {values.modules.map((m:any,i:number)=>(
                      <ModuleCard
                        key={m.id}
                        idx={i}
                        mod={m}
                        fieldOptions={fieldOptions}
                        setFieldValue={setFieldValue}
                        remove={remove}
                        move={move}
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </FieldArray>

            {/* ---------- 按钮 ---------- */}
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button variant="contained" type="submit">💾 保存</Button>
              <Button variant="outlined" color="secondary" onClick={onCancel}>取消</Button>
            </Stack>
          </Form>
        )}
      </Formik>
    </ThemeProvider>
  );
}