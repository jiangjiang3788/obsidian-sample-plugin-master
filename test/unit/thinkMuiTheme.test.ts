import { createThinkMuiTheme } from '@shared/styles/mui-theme';
import { detectObsidianColorMode } from '@shared/ui/components/ThinkMuiThemeProvider';

describe('Think OS MUI bridge', () => {
  afterEach(() => {
    document.documentElement.className = '';
    document.body.className = '';
    document.documentElement.removeAttribute('data-theme');
    document.body.removeAttribute('data-theme');
  });

  it('creates mode-aware themes while keeping component skin on Think tokens', () => {
    const light = createThinkMuiTheme('light');
    const dark = createThinkMuiTheme('dark');

    expect(light.palette.mode).toBe('light');
    expect(dark.palette.mode).toBe('dark');

    const buttonRoot = light.components?.MuiButton?.styleOverrides?.root as Record<string, unknown>;
    expect(buttonRoot.minHeight).toBe('var(--think-control-height-md, 32px)');
    expect(buttonRoot.borderRadius).toBe('var(--think-radius-sm, 6px)');
  });

  it('detects Obsidian theme markers on html and body', () => {
    document.body.classList.add('theme-dark');
    expect(detectObsidianColorMode(document)).toBe('dark');

    document.body.classList.remove('theme-dark');
    document.documentElement.classList.add('theme-light');
    expect(detectObsidianColorMode(document)).toBe('light');

    document.documentElement.classList.remove('theme-light');
    document.documentElement.setAttribute('data-theme', 'dark');
    expect(detectObsidianColorMode(document)).toBe('dark');
  });
});
