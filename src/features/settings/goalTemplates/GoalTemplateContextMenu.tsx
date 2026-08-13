/** @jsxImportSource preact */
import { h } from 'preact';
import { createPortal } from 'preact/compat';
import { useEffect } from 'preact/hooks';
import type { CoreBlockDefinition } from '@core/blocks/public';
import type { GoalDefinition, GoalTemplate } from '@core/goal/public';
import { getGoalTemplateDisplayInfo } from '@core/goal/public';
import { findExistingTemplateForTheme, readGoalTemplateThemePath } from './goalTemplateCopy';

interface GoalTemplateContextMenuState {
  x: number;
  y: number;
  goal: GoalDefinition;
  block: CoreBlockDefinition;
  template: GoalTemplate;
}

interface GoalTemplateContextMenuProps {
  state: GoalTemplateContextMenuState | null;
  blocks: CoreBlockDefinition[];
  templates: GoalTemplate[];
  onClose: () => void;
  onOpenBlock: (goal: GoalDefinition, block: CoreBlockDefinition, template?: GoalTemplate | null) => void;
  onCopyToBlock: (targetBlock: CoreBlockDefinition) => void;
  onCopyMissingBlocks: () => void;
  onDeleteTemplate?: (goal: GoalDefinition, block: CoreBlockDefinition, template: GoalTemplate) => void;
}

function MenuItem({ label, meta, danger = false, disabled = false, emphasized = false, onClick }: {
  label: string;
  meta?: string;
  danger?: boolean;
  disabled?: boolean;
  emphasized?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        'think-goal-template-menu__item',
        danger ? 'is-danger' : '',
        emphasized ? 'is-emphasized' : '',
      ].filter(Boolean).join(' ')}
      disabled={disabled}
      onClick={onClick}
    >
      <span>{label}</span>
      {meta ? <span className="think-goal-template-menu__meta">{meta}</span> : null}
    </button>
  );
}

export function GoalTemplateContextMenu({ state, blocks, templates, onClose, onOpenBlock, onCopyToBlock, onCopyMissingBlocks, onDeleteTemplate }: GoalTemplateContextMenuProps) {
  useEffect(() => {
    if (!state) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, onClose]);

  if (!state || typeof document === 'undefined') return null;
  const display = getGoalTemplateDisplayInfo(state.template, state.goal);
  const themePath = display.themePath || readGoalTemplateThemePath(state.template, state.goal);
  const title = display.name;
  const missingCount = blocks.filter((block) => block.id !== state.block.id && !findExistingTemplateForTheme(templates, state.goal, block, state.template)).length;
  const left = Math.min(state.x, Math.max(12, window.innerWidth - 340));
  const top = Math.min(state.y, Math.max(12, window.innerHeight - 420));

  const menu = (
    <div className="think-os think-os--settings think-goal-template-menu-layer">
      <div className="think-goal-template-menu__backdrop" onMouseDown={onClose} onContextMenu={(event: MouseEvent) => { event.preventDefault(); onClose(); }} />
      <div
        className="think-goal-template-menu"
        style={{ left, top }}
        onMouseDown={(event: MouseEvent) => event.stopPropagation()}
        onClick={(event: MouseEvent) => event.stopPropagation()}
        onContextMenu={(event: MouseEvent) => event.preventDefault()}
      >
        <header className="think-goal-template-menu__header">
          <div className="think-goal-template-menu__title">记录预设：{title}</div>
          <div className="think-goal-template-menu__description">{themePath || '未设置主题'} · {state.block.name}</div>
        </header>

        <div className="think-goal-template-menu__group">
          <MenuItem label="编辑字段预设" meta="当前" onClick={() => {
            onOpenBlock(state.goal, state.block, state.template);
            onClose();
          }} />
          <MenuItem label="补齐全部缺失记录类型" meta={missingCount > 0 ? `创建 ${missingCount}` : '已补齐'} emphasized disabled={missingCount <= 0} onClick={() => {
            onCopyMissingBlocks();
            onClose();
          }} />
        </div>

        {onDeleteTemplate ? (
          <div className="think-goal-template-menu__group">
            <MenuItem label="删除当前预设" meta="仅此主题" danger onClick={() => {
              onDeleteTemplate(state.goal, state.block, state.template);
              onClose();
            }} />
          </div>
        ) : null}

        <div className="think-goal-template-menu__group">
          {blocks.map((block) => {
            const isCurrent = block.id === state.block.id;
            const existing = isCurrent ? state.template : findExistingTemplateForTheme(templates, state.goal, block, state.template);
            return (
              <MenuItem
                key={block.id}
                label={block.name}
                meta={isCurrent ? '当前' : existing ? '已存在，打开' : '创建'}
                disabled={false}
                onClick={() => {
                  if (isCurrent) onOpenBlock(state.goal, block, state.template);
                  else if (existing) onOpenBlock(state.goal, block, existing);
                  else onCopyToBlock(block);
                  onClose();
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );

  return createPortal(menu, document.body);
}
