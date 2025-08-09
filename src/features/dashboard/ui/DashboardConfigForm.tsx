// src/features/dashboard/ui/DashboardConfigForm.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { memo } from 'preact/compat';
import { useMemo, useState } from 'preact/hooks';
import {
  ThemeProvider, CssBaseline,
  Box, Stack, Typography,
  TextField, Select, MenuItem,
  IconButton, Divider, Collapse, Autocomplete
} from '@mui/material';
import AddIcon       from '@mui/icons-material/Add';
import DeleteIcon    from '@mui/icons-material/Delete';
import DragHandle    from '@mui/icons-material/DragIndicator';
import EditIcon      from '@mui/icons-material/Edit';
import CheckIcon     from '@mui/icons-material/Check';
import CloseIcon     from '@mui/icons-material/Close';

import { OPS } from '@core/domain/constants';
import { DashboardConfig, ModuleConfig, CORE_FIELDS } from '@core/domain/schema';
import { VIEW_OPTIONS } from '@features/dashboard/ui';
import { theme as baseTheme } from '@shared/styles/mui-theme';

/* ────────────────────────────── 布局参数 ───────────────────────────── */
const SECTION_GAP = 1.0;  // 区块之间
const INNER_GAP   = 0.6;  // 区块内部
const ROW_GAP     = 0.6;  // 每一行

/* 下拉菜单不走 portal，尽量避免“跳一下” */
const menuProps = { autoFocus: false, disablePortal: true, keepMounted: true } as const;

/* 保持滚动条位置（window 版） */
function keepScroll(fn: () => void) {
  const y = window.scrollY;
  fn();
  setTimeout(() => window.scrollTo({ top: y }), 0);
  requestAnimationFrame(() => {
    window.scrollTo({ top: y });
    requestAnimationFrame(() => window.scrollTo({ top: y }));
  });
  setTimeout(() => window.scrollTo({ top: y }), 160);
}

/* ────────────────────────────── Tag 渲染（扁扁的 pill；点击删除） ───────────────────────────── */
function renderPills(value: readonly string[], getTagProps: any) {
  return (
    <span class="think-pills">
      {value.map((opt, index) => {
        const { onDelete, key } = getTagProps({ index });
        return (
          <span
            key={key ?? index}
            class="think-pill"
            onClick={onDelete}
            title="点击移除"
          >
            {String(opt)}
          </span>
        );
      })}
    </span>
  );
}

/* ────────────────────────────── 模块卡片 ───────────────────────────── */
interface ModCardProps {
  idx: number;
  mod: any;
  fieldOptions: string[];
  setFieldValue: (path: string, v: any) => void;
  remove: (i: number) => void;
}

const ModuleCard = memo<ModCardProps>(({ idx, mod, fieldOptions, setFieldValue, remove }) => {
  const [open, setOpen] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState<string>(mod.title ?? '');

  const toggle = () => keepScroll(() => setOpen(v => !v));
  const titleText = (mod.title || '新模块').trim();

  const setDebounced = ((ms = 220) => {
    let t: any;
    return (path: string, val: any) => {
      clearTimeout(t);
      t = setTimeout(() => setFieldValue(path, val), ms);
    };
  })();

  /* 行工具 */
  const addFilterRow = () =>
    keepScroll(() =>
      setFieldValue(`modules.${idx}.filtersArr`, [
        ...mod.filtersArr,
        { field: '', op: '=', value: '' },
      ]),
    );
  const delFilterRow = (i: number) =>
    keepScroll(() =>
      setFieldValue(
        `modules.${idx}.filtersArr`,
        mod.filtersArr.filter((_: any, j: number) => j !== i),
      ),
    );

  const addSortRow = () =>
    keepScroll(() =>
      setFieldValue(`modules.${idx}.sortArr`, [
        ...mod.sortArr,
        { field: '', dir: 'asc' },
      ]),
    );
  const delSortRow = (i: number) =>
    keepScroll(() =>
      setFieldValue(
        `modules.${idx}.sortArr`,
        mod.sortArr.filter((_: any, j: number) => j !== i),
      ),
    );

  const saveTitle = () => {
    keepScroll(() => setFieldValue(`modules.${idx}.title`, titleDraft));
    setEditingTitle(false);
  };

  return (
    <Box sx={{ py: 0.25 }}>
      {/* 头部 —— 点击标题折叠/展开 */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ cursor: editingTitle ? 'default' : 'pointer', userSelect: 'none' }}
        onClick={() => {
          if (!editingTitle) toggle();
        }}
      >
        <span style="font-size:16px;line-height:1;">{open ? '▾' : '▸'}</span>

        {!editingTitle ? (
          <Typography sx={{ flex: 1, fontWeight: 600 }} title="点击折叠/展开">
            {titleText}
          </Typography>
        ) : (
          <TextField
            autoFocus
            value={titleDraft}
            onClick={e => e.stopPropagation()}
            onInput={e => setTitleDraft((e.target as HTMLInputElement).value)}
            onKeyDown={e => {
              const k = (e as any).key;
              if (k === 'Enter') {
                e.preventDefault();
                saveTitle();
              }
              if (k === 'Escape') {
                e.preventDefault();
                setEditingTitle(false);
                setTitleDraft(mod.title ?? '');
              }
            }}
            sx={{ flex: 1 }}
          />
        )}

        <Select
          value={mod.view}
          onClick={e => e.stopPropagation()}
          MenuProps={menuProps}
          onChange={e => keepScroll(() => setFieldValue(`modules.${idx}.view`, e.target.value))}
          sx={{ minWidth: 110 }}
        >
          {VIEW_OPTIONS.map(v => (
            <MenuItem key={v} value={v}>
              {v}
            </MenuItem>
          ))}
        </Select>

        {!editingTitle ? (
          <IconButton
            size="small"
            onClick={e => {
              e.stopPropagation();
              setTitleDraft(mod.title ?? '');
              setEditingTitle(true);
            }}
            title="重命名"
          >
            <EditIcon fontSize="small" />
          </IconButton>
        ) : (
          <span onClick={e => e.stopPropagation()}>
            <IconButton size="small" onClick={saveTitle} title="保存">
              <CheckIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => {
                setEditingTitle(false);
                setTitleDraft(mod.title ?? '');
              }}
              title="取消"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </span>
        )}

        <IconButton
          size="small"
          color="error"
          onClick={e => {
            e.stopPropagation();
            keepScroll(() => remove(idx));
          }}
          title="删除模块"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>

        <IconButton size="small" onClick={e => e.stopPropagation()} title="拖动排序（预留）">
          <DragHandle fontSize="small" />
        </IconButton>
      </Stack>

      {/* 内容 */}
      <Collapse in={open} timeout={110} unmountOnExit>
        <Stack spacing={INNER_GAP} sx={{ mt: INNER_GAP }}>
          {/* TableView 专属：行/列字段 */}
          {mod.view === 'TableView' && (
            <Stack direction="row" spacing={ROW_GAP}>
              <Autocomplete
                freeSolo
                disablePortal
                options={fieldOptions}
                value={mod.rowField ?? ''}
                onChange={(_, v) => keepScroll(() => setFieldValue(`modules.${idx}.rowField`, v ?? ''))}
                renderInput={p => <TextField {...p} label="行字段" />}
                sx={{ flex: 1 }}
              />
              <Autocomplete
                freeSolo
                disablePortal
                options={fieldOptions}
                value={mod.colField ?? ''}
                onChange={(_, v) => keepScroll(() => setFieldValue(`modules.${idx}.colField`, v ?? ''))}
                renderInput={p => <TextField {...p} label="列字段" />}
                sx={{ flex: 1 }}
              />
            </Stack>
          )}

          {/* 显示字段 */}
          <Box>
            <Typography color="error" fontWeight={700} sx={{ mb: 0.2 }}>
              显示字段
            </Typography>
            <Autocomplete
              multiple
              disablePortal
              options={fieldOptions}
              value={mod.fieldsArr}
              onChange={(_, v) => keepScroll(() => setFieldValue(`modules.${idx}.fieldsArr`, v))}
              renderTags={renderPills as any}
              renderInput={p => <TextField {...p} placeholder="选择或输入字段" />}
            />
          </Box>

          {/* 分组字段 */}
          <Box>
            <Typography color="error" fontWeight={700} sx={{ mb: 0.2 }}>
              分组字段
            </Typography>
            <Autocomplete
              multiple
              disablePortal
              options={fieldOptions}
              value={mod.groupsArr}
              onChange={(_, v) => keepScroll(() => setFieldValue(`modules.${idx}.groupsArr`, v))}
              renderTags={renderPills as any}
              renderInput={p => <TextField {...p} placeholder="选择或输入字段" />}
            />
          </Box>

          {/* 过滤规则 */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mb: 0.2 }}>
              <Typography color="error" fontWeight={800}>
                过滤规则
              </Typography>
              <Typography
                sx={{ color: 'error.main', fontWeight: 800, cursor: 'pointer' }}
                onClick={addFilterRow}
                title="新增过滤行"
              >
                ＋
              </Typography>
            </Stack>
            <Stack spacing={0.4}>
              {mod.filtersArr.map((f: any, i: number) => (
                <Stack key={i} direction="row" spacing={ROW_GAP}>
                  <TextField
                    select
                    value={f.field}
                    SelectProps={{ MenuProps: menuProps }}
                    onChange={e =>
                      keepScroll(() =>
                        setFieldValue(`modules.${idx}.filtersArr.${i}.field`, e.target.value),
                      )
                    }
                    sx={{ flex: 1 }}
                  >
                    {fieldOptions.map(o => (
                      <MenuItem key={o} value={o}>
                        {o}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Select
                    value={f.op}
                    MenuProps={menuProps}
                    onChange={e =>
                      keepScroll(() =>
                        setFieldValue(`modules.${idx}.filtersArr.${i}.op`, e.target.value),
                      )
                    }
                    sx={{ width: 90 }}
                  >
                    {OPS.map(op => (
                      <MenuItem key={op} value={op}>
                        {op}
                      </MenuItem>
                    ))}
                  </Select>
                  <TextField
                    value={f.value}
                    onInput={e =>
                      setDebounced(`modules.${idx}.filtersArr.${i}.value`, (e.target as HTMLInputElement).value)
                    }
                    sx={{ flex: 1 }}
                  />
                  <IconButton size="small" color="error" onClick={() => delFilterRow(i)} title="删除该行">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          </Box>

          {/* 排序规则 */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mb: 0.2 }}>
              <Typography color="error" fontWeight={800}>
                排序规则
              </Typography>
              <Typography
                sx={{ color: 'error.main', fontWeight: 800, cursor: 'pointer' }}
                onClick={addSortRow}
                title="新增排序行"
              >
                ＋
              </Typography>
            </Stack>
            <Stack spacing={0.4}>
              {mod.sortArr.map((s: any, i: number) => (
                <Stack key={i} direction="row" spacing={ROW_GAP}>
                  <TextField
                    select
                    value={s.field}
                    SelectProps={{ MenuProps: menuProps }}
                    onChange={e =>
                      keepScroll(() => setFieldValue(`modules.${idx}.sortArr.${i}.field`, e.target.value))
                    }
                    sx={{ flex: 1 }}
                  >
                    {fieldOptions.map(o => (
                      <MenuItem key={o} value={o}>
                        {o}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Select
                    value={s.dir}
                    MenuProps={menuProps}
                    onChange={e =>
                      keepScroll(() => setFieldValue(`modules.${idx}.sortArr.${i}.dir`, e.target.value))
                    }
                    sx={{ width: 100 }}
                  >
                    <MenuItem value="asc">升序</MenuItem>
                    <MenuItem value="desc">降序</MenuItem>
                  </Select>
                  <IconButton size="small" color="error" onClick={() => delSortRow(i)} title="删除该行">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Collapse>
    </Box>
  );
});

/* ────────────────────────────── 表单容器 ───────────────────────────── */
interface Props {
  dashboard: DashboardConfig;
  dashboards: DashboardConfig[];
  onSave: (d: DashboardConfig) => void;
  onCancel: () => void;
}

export function DashboardConfigForm({ dashboard, dashboards, onSave, onCancel }: Props) {
  const fieldOptions = useMemo(
    () => Array.from(new Set([...CORE_FIELDS, 'extra.主题', 'extra.时长', 'extra.地点'])).sort(),
    [],
  );
  const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

  /* 初始化本地状态（把 filters/sort/fields/groups 拆平） */
  const [values, setValues] = useState<any>({
    ...dashboard,
    initialView: dashboard.initialView || '月',
    tags: (dashboard.tags || []).join(', '),
    modules: (dashboard.modules || []).map(m => ({
      id: genId(),
      ...m,
      filtersArr: (m.filters ?? []).map(x => ({ ...x })),
      sortArr: (m.sort ?? []).map(x => ({ ...x })),
      fieldsArr: m.fields ?? [],
      groupsArr: (m as any).groups ?? [],
    })),
  });

  /* 简单的 set(path, val) */
  const set = (path: string, val: any) => {
    if (!path.includes('.')) {
      setValues((v: any) => ({ ...v, [path]: val }));
      return;
    }
    setValues((v: any) => {
      const draft: any = structuredClone(v);
      const seg = path.split('.');
      let cur: any = draft;
      for (let i = 0; i < seg.length - 1; i++) cur = cur[seg[i]];
      cur[seg[seg.length - 1]] = val;
      return draft;
    });
  };

  const addModule = () =>
    keepScroll(() =>
      set('modules', [
        ...values.modules,
        {
          id: genId(),
          view: 'BlockView',
          title: '新模块',
          collapsed: false,
          filtersArr: [],
          sortArr: [],
          fieldsArr: [],
          groupsArr: ['categoryKey'],
        },
      ]),
    );
  const removeModule = (i: number) =>
    keepScroll(() => set('modules', values.modules.filter((_x: any, j: number) => j !== i)));

  /* 保存为 DashboardConfig 结构 */
  const handleSave = () => {
    const cleaned: DashboardConfig = {
      ...dashboard,
      ...values,
      tags: String(values.tags || '')
        .split(/[,，]/)
        .map((t: string) => t.trim())
        .filter(Boolean),
      modules: values.modules.map(
        ({ id, filtersArr, sortArr, fieldsArr, groupsArr, ...rest }: any): ModuleConfig => ({
          ...rest,
          filters: (filtersArr || []).filter((f: any) => f.field).map((f: any) => ({ ...f })),
          sort: (sortArr || []).filter((s: any) => s.field).map((s: any) => ({ ...s })),
          fields: fieldsArr || [],
          ...(groupsArr && groupsArr.length ? { groups: groupsArr } : {}),
        }),
      ) as any, // groups 是扩展字段，保持 any
    };
    onSave(cleaned);
  };

  return (
    <ThemeProvider theme={baseTheme}>
      <CssBaseline />
      <Box sx={{ display: 'grid', gap: SECTION_GAP }} class="think-compact">
        {/* 基础配置 */}
        <Box>
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.75}
            onClick={() => keepScroll(() => setValues((v: any) => ({ ...v, _baseOpen: !v._baseOpen })))} // 内部控制
            sx={{ cursor: 'pointer', userSelect: 'none', mb: values._baseOpen === false ? 0 : 0.5 }}
          >
            <Typography variant="h6" color="error">
              基础配置
            </Typography>
            <span>{values._baseOpen === false ? '▸' : '▾'}</span>
          </Stack>

          <Collapse in={values._baseOpen !== false} timeout={110} unmountOnExit>
            <Stack spacing={INNER_GAP}>
              <Stack direction="row" spacing={ROW_GAP} alignItems="center">
                <Typography sx={{ minWidth: 92 }}>配置名称</Typography>
                <TextField value={values.name} onInput={e => set('name', (e.target as HTMLInputElement).value)} />
              </Stack>

              <Stack direction="row" spacing={ROW_GAP} alignItems="center">
                <Typography sx={{ minWidth: 92 }}>数据源路径</Typography>
                <TextField value={values.path} onInput={e => set('path', (e.target as HTMLInputElement).value)} />
              </Stack>

              <Stack direction="row" spacing={ROW_GAP} alignItems="center">
                <Typography sx={{ minWidth: 92 }}>标签</Typography>
                <TextField value={values.tags} onInput={e => set('tags', (e.target as HTMLInputElement).value)} />
              </Stack>

              <Stack direction="row" spacing={ROW_GAP} alignItems="center">
                <Typography sx={{ minWidth: 92 }}>初始视图</Typography>
                <Select
                  value={values.initialView}
                  MenuProps={menuProps}
                  onChange={e => keepScroll(() => set('initialView', e.target.value))}
                  sx={{ minWidth: 120 }}
                >
                  {['年', '季', '月', '周', '天'].map(v => (
                    <MenuItem key={v} value={v}>
                      {v}
                    </MenuItem>
                  ))}
                </Select>
              </Stack>

              <Stack direction="row" spacing={ROW_GAP} alignItems="center">
                <Typography sx={{ minWidth: 92 }}>初始日期</Typography>
                <TextField
                  type="date"
                  value={values.initialDate}
                  onChange={e => keepScroll(() => set('initialDate', (e.target as HTMLInputElement).value))}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 160 }}
                />
              </Stack>
            </Stack>
          </Collapse>
        </Box>

        {/* 模块设置 */}
        <Box>
          <Stack
            direction="row"
            alignItems="center"
            sx={{ justifyContent: 'space-between', mb: values._modsOpen === false ? 0 : 0.5 }}
            onClick={() => keepScroll(() => setValues((v: any) => ({ ...v, _modsOpen: !v._modsOpen })))}
          >
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ cursor: 'pointer', userSelect: 'none' }}>
              <Typography variant="h6" color="error">
                模块设置
              </Typography>
              <span>{values._modsOpen === false ? '▸' : '▾'}</span>
            </Stack>
            <IconButton
              size="small"
              onClick={e => {
                e.stopPropagation();
                addModule();
              }}
              title="新增模块"
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Collapse in={values._modsOpen !== false} timeout={110} unmountOnExit>
            <Divider sx={{ my: 0.75 }} />
            <Stack spacing={0.75}>
              {values.modules.map((m: any, i: number) => (
                <div key={m.id}>
                  <ModuleCard
                    idx={i}
                    mod={m}
                    fieldOptions={fieldOptions}
                    setFieldValue={(path, v) => set(path, v)}
                    remove={removeModule}
                  />
                  {i < values.modules.length - 1 && <Divider sx={{ my: 0.5 }} />}
                </div>
              ))}
            </Stack>
          </Collapse>
        </Box>

        {/* 底部操作 */}
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <IconButton onClick={handleSave} title="保存">
            <CheckIcon />
          </IconButton>
          <IconButton onClick={onCancel} title="取消">
            <CloseIcon />
          </IconButton>
        </Stack>
      </Box>
    </ThemeProvider>
  );
}