/** @jsxImportSource preact */
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { createThinkMuiTheme, type ThinkMuiColorMode } from '../../styles/muiTheme';
import { ThemeProvider } from '../muiCompat';

function hasThemeMarker(element: Element | null, marker: string): boolean {
  return Boolean(element?.classList.contains(marker));
}

export function detectObsidianColorMode(doc: Document = document): ThinkMuiColorMode {
  const html = doc.documentElement;
  const body = doc.body;
  const explicit = html?.getAttribute('data-theme') ?? body?.getAttribute('data-theme');

  if (explicit === 'dark' || hasThemeMarker(html, 'theme-dark') || hasThemeMarker(body, 'theme-dark')) {
    return 'dark';
  }
  if (explicit === 'light' || hasThemeMarker(html, 'theme-light') || hasThemeMarker(body, 'theme-light')) {
    return 'light';
  }

  try {
    return doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function ThinkMuiThemeProvider({ children }: { children: ComponentChildren }) {
  const [mode, setMode] = useState<ThinkMuiColorMode>(() => detectObsidianColorMode());

  useEffect(() => {
    const updateMode = () => setMode(detectObsidianColorMode());
    const observer = new MutationObserver(updateMode);
    const targets = [document.documentElement, document.body].filter(Boolean);
    targets.forEach((target) => observer.observe(target, { attributes: true, attributeFilter: ['class', 'data-theme'] }));

    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    media?.addEventListener?.('change', updateMode);
    updateMode();

    return () => {
      observer.disconnect();
      media?.removeEventListener?.('change', updateMode);
    };
  }, []);

  const muiTheme = useMemo(() => createThinkMuiTheme(mode), [mode]);
  return <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>;
}
