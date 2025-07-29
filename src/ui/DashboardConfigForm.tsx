// src/ui/DashboardConfigForm.tsx

/* -----------------------------------------------------------
 *  DashboardConfigForm.tsx  ‑ 现代化 UI 版本
 * ----------------------------------------------------------*/

/** @jsxImportSource preact */
import { h, Fragment } from 'preact';
import { useMemo } from 'preact/hooks';
import {
  ThemeProvider,
  CssBaseline,
  Box,
  Stack,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Button,
  Chip,
  Autocomplete,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { Formik, Form, FieldArray } from 'formik';
import Grid from '@mui/material/GridLegacy';
import { DashboardConfig, ModuleConfig, FilterRule, SortRule, CORE_FIELDS } from '../config/schema';
import { VIEW_OPTIONS } from '../views';
import { theme } from './mui-theme';

interface Props {
  dashboard:  DashboardConfig;               // 克隆体
  dashboards: DashboardConfig[];
  onSave:    (d: DashboardConfig) => void;
  onCancel:  () => void;
}

/* ---------- 可复用 ---------- */
const toJSON = <T,>(s: string, fallback: T): T => {
  try { return JSON.parse(s); } catch { return fallback; }
};

/* ---------------------------------------------------------- */
export function DashboardConfigForm(props: Props) {

  /* 可选字段：核心字段 + 常见 meta 字段占位 */
  const fieldOptions = useMemo(
    () => Array.from(new Set([...CORE_FIELDS, 'extra.主题', 'extra.时长', 'extra.地点'])).sort(),
    [],
  );

  /** 当前仪表盘名称是否唯一 */
  const isNameUnique = (name: string) =>
    props.dashboards.every(d => d === props.dashboard || d.name !== name);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Formik
        initialValues={{
          ...props.dashboard,
          initialView: props.dashboard.initialView || '月',
          tags: props.dashboard.tags?.join(', ') || '',

          /* 把 modules 的复杂字段先序列化，后面再还原 */
          modules: props.dashboard.modules.map(m => ({
            ...m,
            filtersStr: JSON.stringify(m.filters ?? [], null, 0),
            sortStr:    JSON.stringify(m.sort    ?? [], null, 0),
            fieldsArr:  m.fields ?? [],
            propsStr:   JSON.stringify(m.props   ?? {}, null, 0),
          })),
        }}

        validate={vals => {
          const err: Record<string, string> = {};
          if (!vals.name.trim()) err.name = '名称不能为空';
          else if (!isNameUnique(vals.name.trim())) err.name = '名称已存在';
          return err;
        }}

        onSubmit={vals => {
          const cleaned: DashboardConfig = {
            ...props.dashboard,
            ...vals,
            tags: vals.tags
              .split(/[,，]/)
              .map(t => t.trim())
              .filter(Boolean),
            modules: vals.modules.map(v => ({
              view:      v.view as ModuleConfig['view'],
              title:     v.title,
              collapsed: v.collapsed,
              filters:   toJSON<FilterRule[]>(v.filtersStr, []),
              sort:      toJSON<SortRule[]>(v.sortStr, []),
              fields:    v.fieldsArr,
              props:     toJSON<Record<string, any>>(v.propsStr, {}),
              group:     (v as any).group,
            })),
          };
          props.onSave(cleaned);
        }}
      >
        {({ values, errors, setFieldValue }) => (
          <Form>
            {/* ========== 基本信息 ========== */}
            <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1, mb: 3 }}>
              <Typography variant="h6" gutterBottom>仪表盘信息</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="仪表盘名称"
                    name="name"
                    value={values.name}
                    error={Boolean(errors.name)}
                    helperText={errors.name}
                    onInput={e => setFieldValue('name', (e.target as HTMLInputElement).value)}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    label="数据源路径"
                    name="path"
                    value={values.path}
                    placeholder="如 Daily/2025"
                    onInput={e => setFieldValue('path', (e.target as HTMLInputElement).value)}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="标签（逗号分隔）"
                    name="tags"
                    placeholder="project, daily"
                    value={values.tags}
                    onInput={e => setFieldValue('tags', (e.target as HTMLInputElement).value)}
                  />
                </Grid>

                <Grid item xs={6} md={3}>
                  <Select
                    fullWidth
                    label="初始视图"
                    value={values.initialView ?? ''}
                    onChange={e => setFieldValue('initialView', e.target.value)}
                  >
                    {['年','季','月','周','天'].map(v => (
                      <MenuItem key={v} value={v}>{v}</MenuItem>
                    ))}
                  </Select>
                </Grid>

                <Grid item xs={6} md={3}>
                  <TextField
                    type="date"
                    label="初始日期"
                    value={values.initialDate}
                    onChange={e => setFieldValue('initialDate', (e.target as HTMLInputElement).value)}
                    InputLabelProps={{ shrink: true }}
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
                          view: 'BlockView',
                          title: '新模块',
                          collapsed: false,
                          filtersStr: '[]',
                          sortStr:    '[]',
                          fieldsArr:  [],
                          propsStr:   '{}',
                        })
                      }
                    >
                      <AddIcon />
                    </IconButton>
                  </Stack>

                  {/* ========== 每个模块 editable card ========== */}
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    {values.modules.map((mod: any, idx: number) => (
                      <Box
                        key={idx}
                        sx={{
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          p: 2,
                          position: 'relative',
                        }}
                      >
                        <IconButton
                          size="small"
                          color="error"
                          sx={{ position: 'absolute', top: 8, right: 8 }}
                          onClick={() => remove(idx)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>

                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="标题"
                              value={mod.title}
                              onInput={e => setFieldValue(`modules.${idx}.title`, (e.target as HTMLInputElement).value)}
                            />
                          </Grid>

                          <Grid item xs={6} md={3}>
                            <Select
                              label="视图"
                              value={mod.view}
                              onChange={e => setFieldValue(`modules.${idx}.view`, e.target.value)}
                              fullWidth
                            >
                              {VIEW_OPTIONS.map(v => (
                                <MenuItem key={v} value={v}>{v}</MenuItem>
                              ))}
                            </Select>
                          </Grid>

                          <Grid item xs={6} md={3}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={mod.collapsed}
                                  onChange={e => setFieldValue(`modules.${idx}.collapsed`, e.target.checked)}
                                />
                              }
                              label="默认折叠"
                            />
                          </Grid>

                          {/* ---------- JSON 输入区 ---------- */}
                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="filters (JSON)"
                              multiline
                              minRows={2}
                              value={mod.filtersStr}
                              onInput={e => setFieldValue(`modules.${idx}.filtersStr`, (e.target as HTMLInputElement).value)}
                            />
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="sort (JSON)"
                              multiline
                              minRows={2}
                              value={mod.sortStr}
                              onInput={e => setFieldValue(`modules.${idx}.sortStr`, (e.target as HTMLInputElement).value)}
                            />
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <Autocomplete
                              multiple
                              freeSolo
                              options={fieldOptions}
                              value={mod.fieldsArr}
                              onChange={(_, newVal) =>
                                setFieldValue(`modules.${idx}.fieldsArr`, newVal)
                              }
                              renderTags={(value: readonly string[], getTagProps) =>
                                value.map((option: string, index: number) => (
                                  <Chip label={option} {...getTagProps({ index })} />
                                ))
                              }
                              renderInput={params => (
                                <TextField {...params} label="fields (多选自动补齐)" />
                              )}
                            />
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="props (JSON)"
                              multiline
                              minRows={2}
                              value={mod.propsStr}
                              onInput={e => setFieldValue(`modules.${idx}.propsStr`, (e.target as HTMLInputElement).value)}
                            />
                          </Grid>
                        </Grid>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </FieldArray>

            {/* ========== 按钮组 ========== */}
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button type="submit" variant="contained">💾 保存</Button>
              <Button variant="outlined" color="secondary" onClick={props.onCancel}>取消</Button>
            </Stack>
          </Form>
        )}
      </Formik>
    </ThemeProvider>
  );
}
