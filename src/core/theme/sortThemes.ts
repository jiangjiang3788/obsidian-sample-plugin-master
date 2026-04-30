import { Theme } from "../../shared/types/Theme";

export function sortThemes(themes: Theme[]) {
  const parents = themes
    .filter(t => !t.parentId)
    .sort((a, b) => a.order - b.order);

  return parents.map(parent => ({
    ...parent,
    children: themes
      .filter(t => t.parentId === parent.id)
      .sort((a, b) => a.order - b.order)
  }));
}
