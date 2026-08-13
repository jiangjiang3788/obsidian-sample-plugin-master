// src/features/settings/components/LayoutEditorPanel.tsx
/** @jsxImportSource preact */
/** Shared layout editor for the Settings page and floating widget. */

import { h } from 'preact';
import { useMemo, useCallback, useState } from 'preact/hooks';
import { useUseCases, useSelector } from '@/app/public';
import {
  Modal,
  ThinkButton,
  ThinkIcon,
  ThinkIconButton,
  ThinkInput,
  ThinkSearchPicker,
} from '@shared/ui/public';
import type { UseCases } from '@/app/public';
import type { Layout, ViewInstance } from '@core/types/public';
import { openModuleSettingsWidget } from '@features/settings/layout/ModuleSettingsModal';
import { LayoutFreeformSettings, LayoutGeneralSettings } from './LayoutEditorControls';

const CREATE_PREFIX = '__create_view__:';

export function LayoutEditorPanel({ layoutId, useCases }: { layoutId: string; useCases?: UseCases }) {
  const _useCases = useCases ?? useUseCases();
  const layout = useSelector((s) => (s.settings.layouts || []).find((l: Layout) => l.id === layoutId)) as Layout | undefined;
  const allViews = useSelector((s) => s.settings.viewInstances) as ViewInstance[];

  const [inputValue, setInputValue] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; viewId: string; viewTitle: string } | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ viewId: string; viewTitle: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleUpdate = useCallback((updates: Partial<Layout>) => {
    if (!layout) return;
    _useCases.layout.updateLayout(layout.id, updates);
  }, [layout, _useCases]);

  const selectedViews = useMemo(() => (
    (layout?.viewInstanceIds || []).map((id) => allViews.find((v) => v.id === id)).filter(Boolean) as ViewInstance[]
  ), [layout?.viewInstanceIds, allViews]);

  const availableViews = useMemo(() => allViews.filter((v) => !(layout?.viewInstanceIds || []).includes(v.id)), [layout?.viewInstanceIds, allViews]);

  const addView = useCallback(async (viewId: string) => {
    if (!layout || !viewId || layout.viewInstanceIds.includes(viewId)) return;
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
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= currentIds.length) return;
    const [moved] = currentIds.splice(index, 1);
    currentIds.splice(targetIndex, 0, moved);
    void _useCases.layout.reorderViewInstancesInLayout(layout.id, currentIds);
  }, [layout, _useCases.layout]);

  const pickerOptions = useMemo(() => {
    const options = availableViews.map((view) => ({ value: view.id, label: view.title }));
    const name = inputValue.trim();
    if (name && !availableViews.some((view) => view.title.toLowerCase().includes(name.toLowerCase()))) {
      options.push({ value: `${CREATE_PREFIX}${name}`, label: `+ 创建新视图：“${name}”` });
    }
    return options;
  }, [availableViews, inputValue]);

  const handleCreateNewView = useCallback(async (viewTitle: string) => {
    const newView = await _useCases.viewInstance.createView(viewTitle);
    if (!newView) return;
    await addView(newView.id);
  }, [_useCases.viewInstance, addView]);

  const handlePickerSelect = useCallback(async (value: string) => {
    if (value.startsWith(CREATE_PREFIX)) {
      await handleCreateNewView(value.slice(CREATE_PREFIX.length));
    } else {
      await addView(value);
    }
    setInputValue('');
    setPickerOpen(true);
  }, [addView, handleCreateNewView]);

  const handleChipRightClick = useCallback((event: MouseEvent, view: ViewInstance) => {
    event.preventDefault();
    setContextMenu({ mouseX: event.clientX - 2, mouseY: event.clientY - 4, viewId: view.id, viewTitle: view.title });
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
    if (title && title !== renameTarget.viewTitle) await _useCases.viewInstance.updateView(renameTarget.viewId, { title });
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

  if (!layout) return <div className="think-settings-section">未找到布局（可能已被删除）。</div>;

  return (
    <div className="think-layout-editor">
      <LayoutGeneralSettings layout={layout} onUpdate={handleUpdate} />
      <LayoutFreeformSettings layout={layout} onUpdate={handleUpdate} onResetFreeformLayout={() => void _useCases.layout.resetFreeformLayout(layout.id)} />

      <div className="think-settings-row think-settings-row--top">
        <span className="think-settings-row__label think-settings-row__label--top">包含视图</span>
        <div className="think-settings-row__body think-layout-editor__views-body">
          <div className="think-layout-editor__views">
            {selectedViews.map((view, index) => (
              <div key={view.id} className="think-layout-editor__view-item">
                <ThinkIconButton
                  label="前移"
                  icon={<ThinkIcon name="chevron-left" />}
                  size="sm"
                  disabled={index === 0}
                  onClick={() => moveView(view.id, -1)}
                  className="think-layout-editor__move-action"
                />
                <button
                  type="button"
                  className="think-chip think-layout-editor__view-chip"
                  title="左键移除，右键更多选项"
                  onClick={() => removeViewFromLayout(view.id)}
                  onContextMenu={(event) => handleChipRightClick(event as any, view)}
                >
                  <span className="think-chip__label">{view.title}</span>
                </button>
                <ThinkIconButton
                  label="后移"
                  icon={<ThinkIcon name="chevron-right" />}
                  size="sm"
                  disabled={index === selectedViews.length - 1}
                  onClick={() => moveView(view.id, 1)}
                  className="think-layout-editor__move-action"
                />
              </div>
            ))}
          </div>

          <ThinkSearchPicker
            query={inputValue}
            options={pickerOptions}
            onQueryChange={(value) => { setInputValue(value); setPickerOpen(true); }}
            onSelect={(value) => void handlePickerSelect(value)}
            placeholder="添加或创建视图…"
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            className="think-settings-search"
          />
        </div>
      </div>

      {contextMenu && (
        <div
          className="think-layout-editor__context-menu"
          style={{ position: 'fixed', top: contextMenu.mouseY, left: contextMenu.mouseX, zIndex: 99999 }}
          onMouseLeave={handleContextMenuClose}
        >
          <div className="think-layout-editor__context-actions">
            <ThinkButton size="sm" variant="secondary" onClick={handleViewSettings}>设置…</ThinkButton>
            <ThinkButton size="sm" variant="ghost" onClick={handleMoveLeftFromMenu}>向前移动</ThinkButton>
            <ThinkButton size="sm" variant="ghost" onClick={handleMoveRightFromMenu}>向后移动</ThinkButton>
            <ThinkButton size="sm" variant="ghost" onClick={handleViewRename}>重命名…</ThinkButton>
            <ThinkButton size="sm" variant="danger" onClick={handleViewRemove}>从布局移除</ThinkButton>
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
        <ThinkInput
          autoFocus
          aria-label="视图名称"
          value={renameValue}
          onInput={(event) => setRenameValue((event.currentTarget as HTMLInputElement).value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void handleRenameSave();
            }
          }}
        />
      </Modal>
    </div>
  );
}
