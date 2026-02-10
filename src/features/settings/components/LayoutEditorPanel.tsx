// src/features/settings/components/LayoutEditorPanel.tsx
/** @jsxImportSource preact */
/**
 * LayoutEditorPanel
 * - 从 LayoutSettings.tsx 抽出，供“设置页”和“布局设置浮窗”复用同一套 UI
 * - 设计目标：浮窗展示“当前布局”的全部设置（不做阉割版）
 */

import { h } from 'preact';
import { useMemo, useCallback, useState } from 'preact/hooks';
import { useUseCases, useSelector } from '@/app/public';
import type { UseCases } from '@/app/public';
import type { Layout, ViewInstance } from '@core/public';

import {
  Stack,
  Typography,
  TextField,
  Checkbox,
  FormControlLabel,
  Tooltip,
  Chip,
  Radio,
  RadioGroup as MuiRadioGroup,
  Autocomplete,
} from '@mui/material';

import { openModuleSettingsWidget } from '@/features/settings/ModuleSettingsModal';

const PERIOD_OPTIONS = ['年', '季', '月', '周', '天'].map((v) => ({ value: v, label: v }));
const DISPLAY_MODE_OPTIONS = [
  { value: 'list', label: '列表' },
  { value: 'grid', label: '网格' },
];

const LABEL_WIDTH = '80px';

const AlignedRadioGroup = ({ label, options, selectedValue, onChange }: any) => (
  <Stack direction="row" alignItems="center" spacing={2}>
    <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>{label}</Typography>
    <MuiRadioGroup row value={selectedValue} onChange={(e) => onChange((e.target as HTMLInputElement).value)}>
      {options.map((opt: any) => (
        <FormControlLabel key={opt.value} value={opt.value} control={<Radio size="small" />} label={opt.label} />
      ))}
    </MuiRadioGroup>
  </Stack>
);

/**
 * 复用组件：编辑单个 Layout 的所有设置
 */
export function LayoutEditorPanel({ layoutId, useCases }: { layoutId: string; useCases?: UseCases }) {
  const _useCases = useCases ?? useUseCases();
  const layout = useSelector((s) => (s.settings.layouts || []).find((l: Layout) => l.id === layoutId)) as
    | Layout
    | undefined;
  const allViews = useSelector((s) => s.settings.viewInstances) as ViewInstance[];

  const [inputValue, setInputValue] = useState('');
  const [contextMenu, setContextMenu] = useState<
    { mouseX: number; mouseY: number; viewId: string; viewTitle: string } | null
  >(null);

  const handleUpdate = useCallback(
    (updates: Partial<Layout>) => {
      if (!layout) return;
      _useCases.layout.updateLayout(layout.id, updates);
    },
    [layout, _useCases]
  );

  const selectedViews = useMemo(
    () =>
      (layout?.viewInstanceIds || [])
        .map((id) => allViews.find((v) => v.id === id))
        .filter(Boolean) as ViewInstance[],
    [layout?.viewInstanceIds, allViews]
  );

  const availableViews = useMemo(
    () => allViews.filter((v) => !(layout?.viewInstanceIds || []).includes(v.id)),
    [layout?.viewInstanceIds, allViews]
  );

  const addView = (viewId: string) => {
    if (!layout) return;
    if (viewId) handleUpdate({ viewInstanceIds: [...layout.viewInstanceIds, viewId] });
  };

  const removeViewFromLayout = (viewId: string) => {
    if (!layout) return;
    handleUpdate({ viewInstanceIds: layout.viewInstanceIds.filter((id) => id !== viewId) });
  };

  const autocompleteOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; type: 'existing' | 'create'; newName?: string }> =
      availableViews.map((v) => ({ value: v.id, label: v.title, type: 'existing' }));

    if (
      inputValue.trim() &&
      !availableViews.some((v) => v.title.toLowerCase().includes(inputValue.trim().toLowerCase()))
    ) {
      opts.push({
        value: 'create',
        label: `+ 创建新视图："${inputValue.trim()}"`,
        type: 'create',
        newName: inputValue.trim(),
      });
    }
    return opts;
  }, [availableViews, inputValue]);

  const handleCreateNewView = useCallback(
    async (viewTitle: string) => {
      const newView = await _useCases.viewInstance.createView(viewTitle);
      if (!newView) return;
      addView(newView.id);
    },
    [_useCases, layout?.id]
  );

  const handleAutocompleteChange = useCallback(
    async (_event: any, newValue: any) => {
      if (!newValue) return;
      if (newValue.type === 'existing') addView(newValue.value);
      if (newValue.type === 'create') await handleCreateNewView(newValue.newName);
      setInputValue('');
    },
    [handleCreateNewView, layout?.id]
  );

  const handleChipRightClick = useCallback((event: MouseEvent, view: ViewInstance) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      viewId: view.id,
      viewTitle: view.title,
    });
  }, []);

  const handleContextMenuClose = useCallback(() => setContextMenu(null), []);

  const handleViewSettings = useCallback(() => {
    if (!contextMenu) return;
    const view = allViews.find((v) => v.id === contextMenu.viewId);
    if (view) openModuleSettingsWidget(view);
    handleContextMenuClose();
  }, [contextMenu, allViews]);

  const handleViewRename = useCallback(() => {
    if (!contextMenu) return;
    const newName = prompt('请输入新的视图名称', contextMenu.viewTitle);
    if (newName && newName.trim()) {
      _useCases.viewInstance.updateView(contextMenu.viewId, { title: newName.trim() });
    }
    handleContextMenuClose();
  }, [contextMenu, _useCases]);

  const handleViewRemove = useCallback(() => {
    if (!contextMenu) return;
    removeViewFromLayout(contextMenu.viewId);
    handleContextMenuClose();
  }, [contextMenu, layout?.id]);

  if (!layout) {
    return <div style={{ padding: 12 }}>未找到布局（可能已被删除）。</div>;
  }

  return (
    <Stack spacing={2} sx={{ p: '8px 16px 16px 16px' }}>
      <TextField
        label="布局名称"
        value={layout.name || ''}
        onChange={(e) => handleUpdate({ name: (e.target as HTMLInputElement).value })}
        size="small"
        fullWidth
      />

      <Stack direction="row" alignItems="center" spacing={2}>
        <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>工具栏</Typography>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={!layout.hideToolbar}
              onChange={(e) => handleUpdate({ hideToolbar: !(e.target as HTMLInputElement).checked })}
            />
          }
          label={<Typography noWrap>显示工具栏/导航器</Typography>}
          sx={{ flexShrink: 0, mr: 0 }}
        />
      </Stack>

      <Stack direction="row" alignItems="center" spacing={2}>
        <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>初始日期</Typography>
        <TextField
          type="date"
          size="small"
          variant="outlined"
          disabled={!!layout.initialDateFollowsNow}
          value={layout.initialDate || ''}
          onChange={(e) => handleUpdate({ initialDate: (e.target as HTMLInputElement).value })}
          sx={{ width: '170px' }}
        />
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={!!layout.initialDateFollowsNow}
              onChange={(e) => handleUpdate({ initialDateFollowsNow: (e.target as HTMLInputElement).checked })}
            />
          }
          label={<Typography noWrap>跟随今日</Typography>}
        />
      </Stack>

      <AlignedRadioGroup
        label="初始视图（时间窗）"
        options={PERIOD_OPTIONS}
        selectedValue={layout.initialView || '月'}
        onChange={(value: string) => handleUpdate({ initialView: value })}
      />

      <AlignedRadioGroup
        label="排列方式"
        options={DISPLAY_MODE_OPTIONS}
        selectedValue={layout.displayMode || 'list'}
        onChange={(value: string) => handleUpdate({ displayMode: value as 'list' | 'grid' })}
      />

      {layout.displayMode === 'grid' && (
        <Stack direction="row" alignItems="center" spacing={2} sx={{ pl: `calc(${LABEL_WIDTH} + 16px)` }}>
          <TextField
            label="列数"
            type="number"
            size="small"
            variant="outlined"
            value={layout.gridConfig?.columns || 2}
            onChange={(e) =>
              handleUpdate({ gridConfig: { columns: parseInt((e.target as HTMLInputElement).value, 10) || 2 } })
            }
            sx={{ width: '100px' }}
          />
        </Stack>
      )}

      <Stack direction="row" flexWrap="wrap" spacing={1} useFlexGap alignItems="center">
        <Typography sx={{ width: LABEL_WIDTH, flexShrink: 0, fontWeight: 500 }}>包含视图</Typography>

        {selectedViews.map(
          (view) =>
            view && (
              <Tooltip key={view.id} title={`左键移除，右键更多选项`}>
                <Chip
                  label={view.title}
                  onClick={() => removeViewFromLayout(view.id)}
                  onContextMenu={(e) => handleChipRightClick(e as any, view)}
                  size="small"
                  sx={{ cursor: 'pointer' }}
                />
              </Tooltip>
            )
        )}

        <Autocomplete
          value={null}
          inputValue={inputValue}
          onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
          options={autocompleteOptions}
          getOptionLabel={(option) => (option ? option.label : '')}
          onChange={handleAutocompleteChange}
          renderInput={(params) => (
            <TextField {...(params as any)} variant="outlined" placeholder="+ 搜索添加或创建视图..." />
          )}
          sx={{ minWidth: 240 }}
          size="small"

          // ✅ 关键修复：在 FloatingPanel 中必须禁用 Portal，否则 Popper 挂到 body 上
          // 会被 FloatingPanel 的“点击外部关闭”误判，并且可能被浮窗遮挡。
          disablePortal
          PopperProps={{ style: { zIndex: 20000 } }}
        />
      </Stack>

      {/* 简易右键菜单（你说右键菜单已修复，这里保持原样） */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.mouseY,
            left: contextMenu.mouseX,
            background: 'var(--background-primary)',
            border: '1px solid var(--background-modifier-border)',
            borderRadius: 8,
            padding: 8,
            zIndex: 99999,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}
          onMouseLeave={handleContextMenuClose}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
            <button className="mod-cta" onClick={handleViewSettings}>
              设置…
            </button>
            <button onClick={handleViewRename}>重命名…</button>
            <button onClick={handleViewRemove}>从布局移除</button>
          </div>
        </div>
      )}
    </Stack>
  );
}
