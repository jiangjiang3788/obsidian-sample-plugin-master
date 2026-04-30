import { Theme } from "../../shared/types/Theme";

export function reorderThemes(
  themes: Theme[],
  parentId: string | null,
  orderedIds: string[]
): Theme[] {
  return themes.map(t => {
    if ((t.parentId || null) === parentId) {
      const idx = orderedIds.indexOf(t.id);
      if (idx !== -1) {
        return { ...t, order: idx };
      }
    }
    return t;
  });
}
