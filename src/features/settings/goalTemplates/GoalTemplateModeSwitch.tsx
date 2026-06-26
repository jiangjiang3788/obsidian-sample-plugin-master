/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, Typography } from '@shared/public';
import type { GoalTemplateEditMode } from '@core/public';

interface GoalTemplateModeSwitchProps {
  mode: GoalTemplateEditMode;
  blockName: string;
  disabled?: boolean;
  onInherit: () => void;
  onOverride: () => void;
}

function modeButtonStyle(active: boolean, disabled: boolean) {
  return {
    border: 'none',
    borderRadius: 999,
    padding: '5px 12px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: active ? 'var(--interactive-accent)' : 'transparent',
    color: active ? 'var(--text-on-accent)' : 'var(--text-muted)',
    font: 'inherit',
    fontWeight: 700,
  };
}

export function GoalTemplateModeSwitch({ mode, blockName, disabled = false, onInherit, onOverride }: GoalTemplateModeSwitchProps) {
  const inherited = mode === 'inherit';
  const override = mode === 'override';
  return (
    <Box sx={{ border: '1px solid var(--background-modifier-border)', borderRadius: 1.25, p: 1, display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.9rem', fontWeight: 800 }}>预设模式</Typography>
        <Typography variant="caption" color="text.secondary">
          {inherited ? `继承 ${blockName} 的基础字段和输出格式` : '当前主题使用独立字段和输出格式'}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5, p: 0.25, border: '1px solid var(--background-modifier-border)', borderRadius: 999, background: 'var(--background-secondary)' }}>
        <button type="button" disabled={disabled} onClick={onInherit} style={modeButtonStyle(inherited, disabled)}>继承</button>
        <button type="button" disabled={disabled} onClick={onOverride} style={modeButtonStyle(override, disabled)}>覆盖</button>
      </Box>
    </Box>
  );
}
