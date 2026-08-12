/** Move an item among siblings sharing the same parent. */
export function moveItemInArray<T extends { id: string; parentId?: string | null }>(
  array: T[],
  id: string,
  direction: 'up' | 'down',
): T[] {
  const next = [...array];
  const item = next.find(candidate => candidate.id === id);
  if (!item) return next;
  const siblings = next.filter(candidate => candidate.parentId === item.parentId);
  const index = siblings.findIndex(candidate => candidate.id === id);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= siblings.length) return next;
  const from = next.findIndex(candidate => candidate.id === id);
  const to = next.findIndex(candidate => candidate.id === siblings[target].id);
  if (from < 0 || to < 0) return next;
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const next = [...array];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
