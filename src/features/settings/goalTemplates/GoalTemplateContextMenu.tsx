/** @jsxImportSource preact */
import { h } from 'preact';
import type { JSX } from 'preact';
import { createPortal } from 'preact/compat';
import { useEffect } from 'preact/hooks';
import type { CoreBlockDefinition, GoalDefinition, GoalTemplate } from '@core/public';
import { findExistingTemplateForTheme, getGoalTemplateDisplayName, readGoalTemplateThemePath } from './goalTemplateCopy';

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

const backdropStyle: JSX.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 999998,
  background: 'transparent',
};

const menuStyle: JSX.CSSProperties = {
  position: 'fixed',
  zIndex: 999999,
  minWidth: 250,
  maxWidth: 320,
  padding: 8,
  border: '1px solid var(--background-modifier-border)',
  borderRadius: 12,
  background: 'var(--background-primary)',
  boxShadow: '0 12px 34px rgba(0,0,0,.24)',
  color: 'var(--text-normal)',
};

const itemStyle: JSX.CSSProperties = {
  width: '100%',
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 10,
  padding: '7px 9px',
  borderRadius: 8,
  cursor: 'pointer',
  textAlign: 'left',
  font: 'inherit',
};

const mutedStyle: JSX.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '11px',
  whiteSpace: 'nowrap',
};


function leafPath(value: unknown): string {
  const text = String(value ?? '').trim();
  return text.split('/').filter(Boolean).pop() || text;
}

function isGeneratedPresetName(value: unknown): boolean {
  const text = String(value ?? '').trim();
  return !text || /^预设\s*\d+$/i.test(text) || /^preset[-_\s]*\d+$/i.test(text) || text === '记录预设' || text === '未命名预设';
}

function cleanDisplayText(value: unknown): string {
  return String(value ?? '').replace(/^[#＃]+\s*/, '').trim();
}

function displayPresetName(template: GoalTemplate, themePath: string): string {
  const raw = getGoalTemplateDisplayName(template);
  if (!isGeneratedPresetName(raw)) return raw;
  return cleanDisplayText(leafPath(themePath)) || raw;
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
  const themePath = readGoalTemplateThemePath(state.template, state.goal);
  const title = displayPresetName(state.template, themePath);
  const missingCount = blocks.filter((block) => block.id !== state.block.id && !findExistingTemplateForTheme(templates, state.goal, block, state.template)).length;
  const left = Math.min(state.x, Math.max(12, window.innerWidth - 340));
  const top = Math.min(state.y, Math.max(12, window.innerHeight - 420));

  const menu = (
    <>
      <div style={backdropStyle} onMouseDown={onClose} onContextMenu={(event: any) => { event.preventDefault(); onClose(); }} />
      <div
        style={{ ...menuStyle, left, top }}
        onMouseDown={(event: any) => event.stopPropagation()}
        onClick={(event: any) => event.stopPropagation()}
        onContextMenu={(event: any) => event.preventDefault()}
      >
        <div style={{ padding: '4px 6px 8px', borderBottom: '1px solid var(--background-modifier-border)' }}>
          <div style={{ fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>记录预设：{title}</div>
          <div style={{ ...mutedStyle, marginTop: 2, whiteSpace: 'normal' }}>{themePath || '未设置主题'} · 当前记录类型：{state.block.name}</div>
        </div>

        <button
          type="button"
          style={{ ...itemStyle, marginTop: 6 }}
          onClick={() => {
            onOpenBlock(state.goal, state.block, state.template);
            onClose();
          }}
        >
          <span>编辑字段预设</span>
          <span style={mutedStyle}>当前</span>
        </button>

        <button
          type="button"
          style={{ ...itemStyle, marginTop: 6, background: 'rgba(124, 60, 255, .10)' }}
          onClick={() => {
            onCopyMissingBlocks();
            onClose();
          }}
          disabled={missingCount <= 0}
        >
          <span>补齐全部缺失记录类型</span>
          <span style={mutedStyle}>{missingCount > 0 ? `创建 ${missingCount}` : '已补齐'}</span>
        </button>

        <div style={{ margin: '7px 0', height: 1, background: 'var(--background-modifier-border)' }} />

        {onDeleteTemplate ? (
          <button
            type="button"
            style={{ ...itemStyle, color: 'var(--text-error, #d14)' }}
            onClick={() => {
              onDeleteTemplate(state.goal, state.block, state.template);
              onClose();
            }}
          >
            <span>删除当前预设</span>
            <span style={mutedStyle}>仅此主题</span>
          </button>
        ) : null}

        <div style={{ margin: '7px 0', height: 1, background: 'var(--background-modifier-border)' }} />

        {blocks.map((block) => {
          const isCurrent = block.id === state.block.id;
          const existing = isCurrent ? state.template : findExistingTemplateForTheme(templates, state.goal, block, state.template);
          return (
            <button
              key={block.id}
              type="button"
              style={{ ...itemStyle, opacity: isCurrent ? 0.72 : 1 }}
              onClick={() => {
                if (isCurrent) onOpenBlock(state.goal, block, state.template);
                else if (existing) onOpenBlock(state.goal, block, existing);
                else onCopyToBlock(block);
                onClose();
              }}
            >
              <span>{block.name}</span>
              <span style={mutedStyle}>{isCurrent ? '当前' : existing ? '已存在，打开' : '创建'}</span>
            </button>
          );
        })}
      </div>
    </>
  );

  return createPortal(menu, document.body);
}
