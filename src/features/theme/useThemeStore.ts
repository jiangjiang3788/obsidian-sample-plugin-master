import type { Theme } from '@core/public';

export function ensureThemeOrder(themes: Theme[]): Theme[] {
  return themes.map((t, i) => ({
    ...t,
    order: typeof t.order === "number" ? t.order : i
  }));
}
