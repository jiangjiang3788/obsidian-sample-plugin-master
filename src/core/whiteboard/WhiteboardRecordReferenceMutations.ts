import type { WhiteboardBoard, WhiteboardEdge } from './WhiteboardSchema';

type ProjectionEntry = {
  item: WhiteboardBoard['items'][number] | NonNullable<WhiteboardBoard['archivedItems']>[number];
  collection: 'active' | 'archived';
  desiredRecordId: string;
  isDirect: boolean;
};

function redirectAndDedupeEdges(edges: readonly WhiteboardEdge[], redirect: ReadonlyMap<string, string>): WhiteboardEdge[] {
  const seen = new Set<string>();
  const next: WhiteboardEdge[] = [];
  for (const edge of edges) {
    const fromItemId = redirect.get(edge.fromItemId) ?? edge.fromItemId;
    const toItemId = redirect.get(edge.toItemId) ?? edge.toItemId;
    if (fromItemId === toItemId) continue;
    const key = `${fromItemId}\u0000${toItemId}\u0000${edge.label ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push({ ...edge, fromItemId, toItemId });
  }
  return next;
}

/**
 * Rebind persisted Whiteboard projections from retired/internal Record IDs to their
 * canonical user-facing Record IDs. Existing direct projections win, then active
 * projections win over archived ones. Duplicate projections are removed and edges
 * are redirected to the surviving card. The return value counts card projections
 * rebound or removed; edge redirects are a consequence of those projection changes.
 */
export function normalizeWhiteboardRecordReferences(
  board: WhiteboardBoard,
  replacements: Readonly<Record<string, string>>,
): number {
  const active = board.items.map((item) => ({
    item,
    collection: 'active' as const,
    desiredRecordId: replacements[item.recordId] ?? item.recordId,
    isDirect: !replacements[item.recordId],
  }));
  const archived = (board.archivedItems ?? []).map((item) => ({
    item,
    collection: 'archived' as const,
    desiredRecordId: replacements[item.recordId] ?? item.recordId,
    isDirect: !replacements[item.recordId],
  }));
  const entries: ProjectionEntry[] = [...active, ...archived];
  if (!entries.some((entry) => entry.desiredRecordId !== entry.item.recordId)) return 0;

  const byRecordId = new Map<string, ProjectionEntry[]>();
  for (const entry of entries) {
    const bucket = byRecordId.get(entry.desiredRecordId) ?? [];
    bucket.push(entry);
    byRecordId.set(entry.desiredRecordId, bucket);
  }

  const keepIds = new Set<string>();
  const redirect = new Map<string, string>();
  let changed = 0;

  const rank = (entry: ProjectionEntry): number => {
    if (entry.isDirect && entry.collection === 'active') return 0;
    if (entry.isDirect && entry.collection === 'archived') return 1;
    if (entry.collection === 'active') return 2;
    return 3;
  };

  for (const [recordId, bucket] of byRecordId) {
    bucket.sort((left, right) => rank(left) - rank(right));
    const winner = bucket[0];
    keepIds.add(winner.item.id);
    if (winner.item.recordId !== recordId) {
      winner.item.recordId = recordId;
      changed += 1;
    }
    for (const loser of bucket.slice(1)) {
      keepIds.delete(loser.item.id);
      redirect.set(loser.item.id, winner.item.id);
      changed += 1;
    }
  }

  board.items = board.items.filter((item) => keepIds.has(item.id));
  if (board.archivedItems) board.archivedItems = board.archivedItems.filter((item) => keepIds.has(item.id));
  board.edges = redirectAndDedupeEdges(board.edges, redirect);
  if (board.archivedEdges) board.archivedEdges = redirectAndDedupeEdges(board.archivedEdges, redirect);
  return changed;
}
