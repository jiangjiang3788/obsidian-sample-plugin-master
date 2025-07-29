// src/ui/DashboardConfigForm.tsx
/* -----------------------------------------------------------
 *  DashboardConfigForm.tsx  ‑ 现代化 UI + 性能优化版
 * ----------------------------------------------------------*/

/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useCallback, useRef } from 'preact/hooks';
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
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { Formik, Form, FieldArray } from 'formik';
import { memo } from 'preact/compat';
import {
  DashboardConfig,
  ModuleConfig,
  FilterRule,
  SortRule,
  CORE_FIELDS,
} from '../config/schema';
import { VIEW_OPTIONS } from '../views';
import { theme } from './mui-theme';

/* ---------- 工具 ---------- */
const toJSON = <T,>(s: string, fallback: T): T => {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
};

/** 简易防抖 hook（浏览器就绪即可，无额外依赖） */
function useDebouncedCallback<T extends (...args: any[]) => void>(
  cb: T,
  delay = 300,
) {
  const ref = useRef(cb);
  ref.current = cb;

  return useCallback(
    (...args: Parameters<T>) => {
      clearTimeout((ref as any)._t);
      (ref as any)._t = setTimeout(() => ref.current(...args), delay);
    },
    [delay],
  );
}

/* ---------- 子组件：模块卡片 ---------- */
interface ModuleCardProps {
  idx: number;
  mod: any;
  fieldOptions: string[];
  setFieldValue: (
    field: string,
    value: any,
    shouldValidate?: boolean,
  ) => void;
  remove: (index: number) => void;
}

const ModuleCard = memo<ModuleCardProps>(
  ({ idx, mod, fieldOptions, setFieldValue, remove }) => {
    /* 针对大 JSON 字段做 300 ms 防抖 */
    const debouncedSet = useDebouncedCallback(
      (path: string, val: string) => setFieldValue(path, val, false),
      300,
    );

    return (
      <Box
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
              fullWidth
              label="标题"
              value={mod.title}
              onInput={e =>
                setFieldValue(
                  `modules.${idx}.title`,
                  (e.target as HTMLInputElement).value,
                  false,
                )
              }
            />
          </Grid>

          <Grid item xs={6} md={3}>
            <Select
              fullWidth
              label="视图"
              value={mod.view}
              onChange={e =>
                setFieldValue(`modules.${idx}.view`, e.target.value, false)
              }
            >
              {VIEW_OPTIONS.map(v => (
                <MenuItem key={v} value={v}>
                  {v}
                </MenuItem>
              ))}
            </Select>
          </Grid>

          <Grid item xs={6} md={3}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={mod.collapsed}
                  onChange={e =>
                    setFieldValue(
                      `modules.${idx}.collapsed`,
                      e.target.checked,
                      false,
                    )
                  }
                />
              }
              label="默认折叠"
            />
          </Grid>

          {/* ---------- JSON 输入区 ---------- */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="filters (JSON)"
              multiline
              minRows={2}
              value={mod.filtersStr}
              onInput={e =>
                debouncedSet(
                  `modules.${idx}.filtersStr`,
                  (e.target as HTMLInputElement).value,
                )
              }
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="sort (JSON)"
              multiline
              minRows={2}
              value={mod.sortStr}
              onInput={e =>
                debouncedSet(
                  `modules.${idx}.sortStr`,
                  (e.target as HTMLInputElement).value,
                )
              }
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Autocomplete
              multiple
              freeSolo
              options={fieldOptions}
              value={mod.fieldsArr}
              onChange={(_, newVal) =>
                setFieldValue(`modules.${idx}.fieldsArr`, newVal, false)
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
              fullWidth
              label="props (JSON)"
              multiline
              minRows={2}
              value={mod.propsStr}
              onInput={e =>
                debouncedSet(
                  `modules.${idx}.propsStr`,
                  (e.target as HTMLInputElement).value,
                )
              }
            />
          </Grid>
        </Grid>
      </Box>
    );
  },
);

/* ---------------------------------------------------------- */
interface Props {
  dashboard: DashboardConfig; // 当前被编辑的 Dashboard（已克隆）
  dashboards: DashboardConfig[];
  onSave: (d: DashboardConfig) => void;
  onCancel: () => void;
}

export function DashboardConfigForm({
  dashboard,
  dashboards,
  onSave,
  onCancel,
}: Props) {
  /* 可选字段：核心字段 + 常见 meta 字段占位 */
  const fieldOptions = useMemo(
    () =>
      Array.from(
        new Set([...CORE_FIELDS, 'extra.主题', 'extra.时长', 'extra.地点']),
      ).sort(),
    [],
  );

  /* 当前仪表盘名称是否唯一 */
  const isNameUnique = (name: string) =>
    dashboards.every(d => d === dashboard || d.name !== name);

  /* 工具函数：生成稳定 id */
  const genId = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Formik
        initialValues={{
          ...dashboard,
          initialView: dashboard.initialView || '月',
          tags: dashboard.tags?.join(', ') || '',
          /** 将 modules 拍平成表单友好结构，并且补 id */
          modules: dashboard.modules.map(m => ({
            id: genId(),
            ...m,
            filtersStr: JSON.stringify(m.filters ?? [], null, 0),
            sortStr: JSON.stringify(m.sort ?? [], null, 0),
            fieldsArr: m.fields ?? [],
            propsStr: JSON.stringify(m.props ?? {}, null, 0),
          })),
        }}
        /** 仅在 blur / submit 时统一校验，大幅减少 rAF 长任务 */
        validateOnChange={false}
        validate={vals => {
          const err: Record<string, string> = {};
          if (!vals.name.trim()) err.name = '名称不能为空';
          else if (!isNameUnique(vals.name.trim())) err.name = '名称已存在';
          return err;
        }}
        onSubmit={vals => {
          const cleaned: DashboardConfig = {
            ...dashboard,
            ...vals,
            tags: vals.tags
              .split(/[,，]/)
              .map(t => t.trim())
              .filter(Boolean),
            modules: vals.modules.map(
              ({ id, filtersStr, sortStr, fieldsArr, propsStr, ...rest }) => ({
                ...rest,
                filters: toJSON<FilterRule[]>(filtersStr, []),
                sort: toJSON<SortRule[]>(sortStr, []),
                fields: fieldsArr,
                props: toJSON<Record<string, any>>(propsStr, {}),
              }),
            ),
          };
          onSave(cleaned);
        }}
      >
        {({ values, errors, setFieldValue }) => (
          <Form>
            {/* ========== 基本信息 ========== */}
            <Box
              sx={{
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                mb: 3,
              }}
            >
              <Typography variant="h6" gutterBottom>
                仪表盘信息
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="仪表盘名称"
                    name="name"
                    value={values.name}
                    error={Boolean(errors.name)}
                    helperText={errors.name}
                    onInput={e =>
                      setFieldValue(
                        'name',
                        (e.target as HTMLInputElement).value,
                        false,
                      )
                    }
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="数据源路径"
                    name="path"
                    value={values.path}
                    placeholder="如 Daily/2025"
                    onInput={e =>
                      setFieldValue(
                        'path',
                        (e.target as HTMLInputElement).value,
                        false,
                      )
                    }
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="标签（逗号分隔）"
                    name="tags"
                    placeholder="project, daily"
                    value={values.tags}
                    onInput={e =>
                      setFieldValue(
                        'tags',
                        (e.target as HTMLInputElement).value,
                        false,
                      )
                    }
                  />
                </Grid>

                <Grid item xs={6} md={3}>
                  <Select
                    fullWidth
                    label="初始视图"
                    value={values.initialView ?? ''}
                    onChange={e =>
                      setFieldValue('initialView', e.target.value, false)
                    }
                  >
                    {['年', '季', '月', '周', '天'].map(v => (
                      <MenuItem key={v} value={v}>
                        {v}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>

                <Grid item xs={6} md={3}>
                  <TextField
                    fullWidth
                    type="date"
                    label="初始日期"
                    value={values.initialDate}
                    onChange={e =>
                      setFieldValue(
                        'initialDate',
                        (e.target as HTMLInputElement).value,
                        false,
                      )
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* ========== 模块列表 ========== */}
            <FieldArray name="modules">
              {({ push, remove }) => (
                <Box
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 3,
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Typography variant="h6">模块列表</Typography>
                    <IconButton
                      color="primary"
                      onClick={() =>
                        push({
                          id: genId(),
                          view: 'BlockView',
                          title: '新模块',
                          collapsed: false,
                          filtersStr: '[]',
                          sortStr: '[]',
                          fieldsArr: [],
                          propsStr: '{}',
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

            {/* ========== 按钮组 ========== */}
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button type="submit" variant="contained">
                💾 保存
              </Button>
              <Button variant="outlined" color="secondary" onClick={onCancel}>
                取消
              </Button>
            </Stack>
          </Form>
        )}
      </Formik>
    </ThemeProvider>
  );
}