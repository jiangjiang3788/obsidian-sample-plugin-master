// src/ui/DashboardConfigForm.tsx


/** @jsxImportSource preact */
import { h } from 'preact';
import { memo } from 'preact/compat';
import { useMemo, useRef, useCallback } from 'preact/hooks';
import {
  ThemeProvider, CssBaseline,
  Box, Stack, Grid,
  Typography, TextField, Select, MenuItem,
  FormControlLabel, Checkbox,
  Button, Chip, Autocomplete, IconButton,
} from '@mui/material';
import AddIcon    from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
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

/* ---------- JSON 安全解析 ---------- */
const safeJSON = <T,>(txt: string, fallback: T): T => {
  try   { return JSON.parse(txt); }
  catch { return fallback;       }
};

/* ---------- 简易防抖 Hook ---------- */
function useDebouncedCallback<T extends (...a: any[]) => void>(
  fn: T,
  delay = 300,
) {
  const ref = useRef(fn);
  ref.current = fn;
  return useCallback(
    (...args: Parameters<T>) => {
      clearTimeout((ref as any)._t);
      (ref as any)._t = setTimeout(() => ref.current(...args), delay);
    },
    [delay],
  );
}

/* ---------- 模块卡片子组件 ---------- */
interface ModuleCardProps {
  idx: number;
  mod: any;
  fieldOptions: string[];
  setFieldValue: (
    field: string,
    value: any,
    shouldValidate?: boolean,
  ) => void;
  remove: (idx: number) => void;
}

const ModuleCard = memo<ModuleCardProps>(
  ({ idx, mod, fieldOptions, setFieldValue, remove }) => {
    const setDebounced = useDebouncedCallback(
      (path: string, val: string) => setFieldValue(path, val, false),
      300,
    );

    return (
      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2, position: 'relative' }}>
        {/* 删除模块 */}
        <IconButton
          size="small"
          color="error"
          sx={{ position: 'absolute', top: 8, right: 8 }}
          onClick={() => remove(idx)}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>

        <Grid container spacing={2}>
          {/* 标题 */}
          <Grid item xs={12} md={6}>
            <TextField
              label="标题"
              value={mod.title}
              onInput={e =>
                setFieldValue(`modules.${idx}.title`, (e.target as HTMLInputElement).value, false)
              }
              fullWidth
            />
          </Grid>

          {/* 视图类型 */}
          <Grid item xs={6} md={3}>
            <Select
              value={mod.view}
              onChange={e =>
                setFieldValue(`modules.${idx}.view`, e.target.value, false)
              }
              fullWidth
            >
              {VIEW_OPTIONS.map(v => (
                <MenuItem key={v} value={v}>{v}</MenuItem>
              ))}
            </Select>
          </Grid>

          {/* 默认折叠 */}
          <Grid item xs={6} md={3}>
            <FormControlLabel
              label="默认折叠"
              control={
                <Checkbox
                  checked={mod.collapsed}
                  onChange={e =>
                    setFieldValue(`modules.${idx}.collapsed`, e.target.checked, false)
                  }
                />
              }
            />
          </Grid>

          {/* filters / sort / fields / props */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="filters (JSON)"
              multiline minRows={2}
              value={mod.filtersStr}
              onInput={e =>
                setDebounced(`modules.${idx}.filtersStr`, (e.target as HTMLInputElement).value)
              }
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="sort (JSON)"
              multiline minRows={2}
              value={mod.sortStr}
              onInput={e =>
                setDebounced(`modules.${idx}.sortStr`, (e.target as HTMLInputElement).value)
              }
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Autocomplete
              multiple
              freeSolo
              options={fieldOptions}
              value={mod.fieldsArr}
              onChange={(_, v) => setFieldValue(`modules.${idx}.fieldsArr`, v, false)}
              renderTags={(value: readonly string[], getTagProps) =>
                value.map((opt, i) => (
                  <Chip label={opt} {...getTagProps({ index: i })} />
                ))
              }
              renderInput={params => <TextField {...params} label="fields (多选自动补齐)" />}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="props (JSON)"
              multiline minRows={2}
              value={mod.propsStr}
              onInput={e =>
                setDebounced(`modules.${idx}.propsStr`, (e.target as HTMLInputElement).value)
              }
              fullWidth
            />
          </Grid>
        </Grid>
      </Box>
    );
  },
);

/* ---------------------------------------------------------- */
interface Props {
  dashboard : DashboardConfig;       // 编辑对象（已克隆）
  dashboards: DashboardConfig[];     // 全部对象，用来做名称唯一校验
  onSave    : (d: DashboardConfig) => void;
  onCancel  : () => void;
}

export function DashboardConfigForm({
  dashboard,
  dashboards,
  onSave,
  onCancel,
}: Props) {
  /* 自动补齐字段 */
  const fieldOptions = useMemo(
    () => Array.from(new Set([...CORE_FIELDS, 'extra.主题', 'extra.时长', 'extra.地点'])).sort(),
    [],
  );

  /* 名称唯一性校验 */
  const isNameUnique = (name: string) =>
    dashboards.every(d => d === dashboard || d.name !== name);

  /* 生成稳定的前端 key（不会写入结果） */
  const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Formik
        /* ---------- 初始值 ---------- */
        initialValues={{
          ...dashboard,
          initialView: dashboard.initialView || '月',
          tags       : dashboard.tags?.join(', ') || '',
          modules    : dashboard.modules.map(m => ({
            id        : genId(),
            ...m,
            filtersStr: JSON.stringify(m.filters ?? [],  null, 0),
            sortStr   : JSON.stringify(m.sort    ?? [],  null, 0),
            fieldsArr : m.fields ?? [],
            propsStr  : JSON.stringify(m.props   ?? {}, null, 0),
          })),
        }}
        validateOnChange={false}
        validate={vals => {
          const err: Record<string, string> = {};
          const n = vals.name.trim();
          if (!n) err.name = '名称不能为空';
          else if (!isNameUnique(n)) err.name = '名称已存在';
          return err;
        }}
        /* ---------- 提交 ---------- */
        onSubmit={vals => {
          const cleaned: DashboardConfig = {
            ...dashboard,
            ...vals,
            tags: vals.tags
              .split(/[,，]/)
              .map(t => t.trim())
              .filter(Boolean),
            modules: vals.modules.map(
              ({ id, filtersStr, sortStr, fieldsArr, propsStr, ...rest }): ModuleConfig => ({
                ...rest,
                filters: safeJSON<FilterRule[]>(filtersStr, []),
                sort   : safeJSON<SortRule[]>(sortStr   , []),
                fields : fieldsArr,
                props  : safeJSON<Record<string, any>>(propsStr, {}),
              }),
            ),
          };
          onSave(cleaned);
        }}
      >
        {({ values, errors, setFieldValue }) => (
          <Form>
            {/* ========== 仪表盘信息 ========== */}
            <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1, mb: 3 }}>
              <Typography variant="h6" gutterBottom>仪表盘信息</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="仪表盘名称"
                    value={values.name}
                    error={!!errors.name}
                    helperText={errors.name}
                    onInput={e => setFieldValue('name', (e.target as HTMLInputElement).value, false)}
                    fullWidth
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    label="数据源路径"
                    placeholder="如 Daily/2025"
                    value={values.path}
                    onInput={e => setFieldValue('path', (e.target as HTMLInputElement).value, false)}
                    fullWidth
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="标签（逗号分隔）"
                    placeholder="project, daily"
                    value={values.tags}
                    onInput={e => setFieldValue('tags', (e.target as HTMLInputElement).value, false)}
                    fullWidth
                  />
                </Grid>

                <Grid item xs={6} md={3}>
                  <Select
                    value={values.initialView}
                    onChange={e => setFieldValue('initialView', e.target.value, false)}
                    fullWidth
                  >
                    {['年', '季', '月', '周', '天'].map(v => (
                      <MenuItem key={v} value={v}>{v}</MenuItem>
                    ))}
                  </Select>
                </Grid>

                <Grid item xs={6} md={3}>
                  <TextField
                    type="date"
                    label="初始日期"
                    value={values.initialDate}
                    onChange={e => setFieldValue('initialDate', (e.target as HTMLInputElement).value, false)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Box>

            {/* ========== 模块列表 ========== */}
            <FieldArray name="modules">
              {({ push, remove }) => (
                <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1, mb: 3 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6">模块列表</Typography>
                    <IconButton
                      color="primary"
                      onClick={() =>
                        push({
                          id        : genId(),
                          view      : 'BlockView',
                          title     : '新模块',
                          collapsed : false,
                          filtersStr: '[]',
                          sortStr   : '[]',
                          fieldsArr : [],
                          propsStr  : '{}',
                        })
                      }
                    >
                      <AddIcon />
                    </IconButton>
                  </Stack>

                  <Stack spacing={2} sx={{ mt: 2 }}>
                    {values.modules.map((mod: any, idx: number) => (
                      <ModuleCard
                        key={mod.id}
                        idx={idx}
                        mod={mod}
                        fieldOptions={fieldOptions}
                        setFieldValue={setFieldValue}
                        remove={remove}
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </FieldArray>

            {/* ========== 按钮 ========== */}
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button type="submit" variant="contained">💾 保存</Button>
              <Button variant="outlined" color="secondary" onClick={onCancel}>取消</Button>
            </Stack>
          </Form>
        )}
      </Formik>
    </ThemeProvider>
  );
}