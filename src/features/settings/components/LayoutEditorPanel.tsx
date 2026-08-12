// src/features/settings/components/LayoutEditorPanel.tsx
/** @jsxImportSource preact */
/**
 * LayoutEditorPanel
 * - 从 LayoutSettings.tsx 抽出，供“设置页”和“布局设置浮窗”复用同一套 UI
 * - 设计目标：浮窗展示“当前布局”的全部设置（不做阉割版）
 */

import { h } from 'preact';
import { useMemo, useCallback, useState, useRef } from 'preact/hooks';
import { useUseCases, useSelector } from '@/app/public';
import { ArrowBackIosNewIcon, ArrowForwardIosIcon, IconAction, Modal } from '@shared/ui/public';
import type { UseCases } from '@/app/public';
import type { Layout, ViewInstance } from '@core/types/public';

import {
  Stack,
  Typography,
  TextField,
  Tooltip,
  Chip,
  Autocomplete,
  Box,
} from '@shared/ui/public';

import { openModuleSettingsWidget } from '@features/settings/layout/ModuleSettingsModal';

import { LayoutFreeformSettings, LayoutGeneralSettings } from './LayoutEditorControls';

export function LayoutEditorPanel({ layoutId, useCases }: { layoutId: string; useCases?: UseCases }) {
  const _useCases = useCases ?? useUseCases();
  const layout = useSelector((s) => (s.settings.layouts || []).find((l: Layout) => l.id === layoutId)) as
    | Layout
    | undefined;
  const allViews = useSelector((s) => s.settings.viewInstances) as ViewInstance[];

  const [inputValue, setInputValue] = useState('');
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [contextMenu, setContextMenu] = useState<
    { mouseX: number; mouseY: number; viewId: string; viewTitle: string } | null
  >(null);
  const [renameTarget, setRenameTarget] = useState<{ viewId: string; viewTitle: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');

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

  const addView = useCallback(async (viewId: string) => {
    if (!layout || !viewId) return;
    if (layout.viewInstanceIds.includes(viewId)) return;
    await _useCases.layout.addViewInstanceToLayout(layout.id, viewId);
  }, [layout, _useCases.layout]);

  const removeViewFromLayout = useCallback((viewId: string) => {
    if (!layout) return;
    void _useCases.layout.removeViewInstanceFromLayout(layout.id, viewId);
  }, [layout, _useCases.layout]);

  const moveView = useCallback((viewId: string, direction: -1 | 1) => {
    if (!layout) return;
    const currentIds = [...layout.viewInstanceIds];
    const index = currentIds.indexOf(viewId);
    if (index < 0) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= currentIds.length) return;
    const [moved] = currentIds.splice(index, 1);
    currentIds.splice(targetIndex, 0, moved);
    void _useCases.layout.reorderViewInstancesInLayout(layout.id, currentIds);
  }, [layout, _useCases.layout]);

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

  const reopenAutocomplete = useCallback(() => {
    window.requestAnimationFrame(() => {
      setAutocompleteOpen(true);
      inputRef.current?.focus();
    });
  }, []);

  const handleCreateNewView = useCallback(
    async (viewTitle: string) => {
      const newView = await _useCases.viewInstance.createView(viewTitle);
      if (!newView) return;
      await addView(newView.id);
      reopenAutocomplete();
    },
    [_useCases, addView, reopenAutocomplete]
  );

  const handleAutocompleteChange = useCallback(
    async (_event: any, newValue: any) => {
      if (!newValue) return;
      if (newValue.type === 'existing') {
        await addView(newValue.value);
        setInputValue('');
        reopenAutocomplete();
        return;
      }
      if (newValue.type === 'create') {
        setInputValue('');
        await handleCreateNewView(newValue.newName);
      }
    },
    [addView, handleCreateNewView, reopenAutocomplete]
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
  }, [contextMenu, allViews, handleContextMenuClose]);

  const openViewRename = useCallback((viewId: string, viewTitle: string) => {
    setRenameTarget({ viewId, viewTitle });
    setRenameValue(viewTitle);
  }, []);

  const handleViewRename = useCallback(() => {
    if (!contextMenu) return;
    openViewRename(contextMenu.viewId, contextMenu.viewTitle);
    handleContextMenuClose();
  }, [contextMenu, openViewRename, handleContextMenuClose]);

  const handleRenameSave = useCallback(async () => {
    if (!renameTarget) return;
    const title = renameValue.trim();
    if (!title || title === renameTarget.viewTitle) {
      setRenameTarget(null);
      return;
    }
    await _useCases.viewInstance.updateView(renameTarget.viewId, { title });
    setRenameTarget(null);
  }, [renameTarget, renameValue, _useCases.viewInstance]);

  const handleViewRemove = useCallback(() => {
    if (!contextMenu) return;
    removeViewFromLayout(contextMenu.viewId);
    handleContextMenuClose();
  }, [contextMenu, removeViewFromLayout, handleContextMenuClose]);

  const handleMoveLeftFromMenu = useCallback(() => {
    if (!contextMenu) return;
    moveView(contextMenu.viewId, -1);
    handleContextMenuClose();
  }, [contextMenu, moveView, handleContextMenuClose]);

  const handleMoveRightFromMenu = useCallback(() => {
    if (!contextMenu) return;
    moveView(contextMenu.viewId, 1);
    handleContextMenuClose();
  }, [contextMenu, moveView, handleContextMenuClose]);

  if (!layout) {
    return <div className="think-settings-section">未找到布局（可能已被删除）。</div>;
  }

  return (
    <Stack spacing={2} className="think-layout-editor">
      <LayoutGeneralSettings layout={layout} onUpdate={handleUpdate} />
      <LayoutFreeformSettings
        layout={layout}
        onUpdate={handleUpdate}
        onResetFreeformLayout={() => {
          void _useCases.layout.resetFreeformLayout(layout.id);
        }}
      />

      <Stack direction="row" alignItems="flex-start" spacing={2} className="think-settings-row think-settings-row--top">
        <Typography className="think-settings-row__label think-settings-row__label--top">包含视图</Typography>

        <Stack spacing={1} className="think-settings-row__body">
          <Box className="think-layout-editor__views">
            {selectedViews.map((view, index) =>
              view ? (
                <Box
                  key={view.id}
                  className="think-layout-editor__view-item"
                >
                  <IconAction
                    label="前移"
                    icon={<ArrowBackIosNewIcon className="think-layout-editor__move-icon" />}
                    size="small"
                    disabled={index === 0}
                    onClick={() => moveView(view.id, -1)}
                    className="think-layout-editor__move-action"
                    stopPropagation={false}
                  />

                  <Tooltip title="左键移除，右键更多选项">
                    <Chip
                      label={view.title}
                      onClick={() => removeViewFromLayout(view.id)}
                      onContextMenu={(e) => handleChipRightClick(e as any, view)}
                      size="small"
                      className="think-layout-editor__view-chip"
                    />
                  </Tooltip>

                  <IconAction
                    label="后移"
                    icon={<ArrowForwardIosIcon className="think-layout-editor__move-icon" />}
                    size="small"
                    disabled={index === selectedViews.length - 1}
                    onClick={() => moveView(view.id, 1)}
                    className="think-layout-editor__move-action"
                    stopPropagation={false}
                  />
                </Box>
              ) : null
            )}
          </Box>

          <Autocomplete
            open={autocompleteOpen}
            value={null}
            inputValue={inputValue}
            onOpen={() => setAutocompleteOpen(true)}
            onClose={(_, reason) => {
              if (reason === 'selectOption') return;
              setAutocompleteOpen(false);
            }}
            onInputChange={(_, newInputValue) => {
              setInputValue(newInputValue);
              setAutocompleteOpen(true);
            }}
            options={autocompleteOptions}
            getOptionLabel={(option) => (option ? option.label : '')}
            onChange={handleAutocompleteChange}
            disableCloseOnSelect
            blurOnSelect={false}
            clearOnBlur={false}
            selectOnFocus
            renderInput={(params) => (
              <TextField
                {...(params as any)}
                variant="outlined"
                placeholder="+ 搜索添加或创建视图..."
                inputRef={(node: HTMLInputElement | null) => {
                  inputRef.current = node;
                  const paramsRef = (params as any).inputProps?.ref;
                  if (typeof paramsRef === 'function') paramsRef(node);
                }}
              />
            )}
            className="think-settings-search"
            size="small"
            disablePortal
            slotProps={{ popper: { style: { zIndex: 20000 } } } as any}
          />
        </Stack>
      </Stack>

      {contextMenu && (
        <div
          className="think-layout-editor__context-menu"
          style={{
            position: 'fixed',
            top: contextMenu.mouseY,
            left: contextMenu.mouseX,
            zIndex: 99999,
          }}
          onMouseLeave={handleContextMenuClose}
        >
          <div className="think-layout-editor__context-actions">
            <button className="mod-cta" onClick={handleViewSettings}>
              设置…
            </button>
            <button onClick={handleMoveLeftFromMenu}>向前移动</button>
            <button onClick={handleMoveRightFromMenu}>向后移动</button>
            <button onClick={handleViewRename}>重命名…</button>
            <button onClick={handleViewRemove}>从布局移除</button>
          </div>
        </div>
      )}

      <Modal
        isOpen={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        title="重命名视图"
        size="small"
        onSave={handleRenameSave}
        saveButtonText="重命名"
      >
        <TextField
          fullWidth
          autoFocus
          label="视图名称"
          value={renameValue}
          onInput={(event: Event) => setRenameValue((event.target as HTMLInputElement).value)}
          onKeyDown={(event: KeyboardEvent) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void handleRenameSave();
            }
          }}
        />
      </Modal>
    </Stack>
  );
}
