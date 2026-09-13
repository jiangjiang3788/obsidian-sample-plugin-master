import { normalizeWhiteboardRecordReferences } from '../../src/core/whiteboard/WhiteboardRecordReferenceMutations';
import type { WhiteboardBoard } from '../../src/core/whiteboard/WhiteboardSchema';

describe('Whiteboard internal Task projection convergence', () => {
  it('maps Session/Series cards to Task, dedupes and redirects edges', () => {
    const board: WhiteboardBoard = {
      title: '白板', modified: 1,
      items: [
        { id: 'task-card', recordId: 'task-1', x: 10, y: 20 },
        { id: 'session-card', recordId: 'session-1', x: 30, y: 40 },
        { id: 'series-card', recordId: 'series-2', x: 50, y: 60 },
      ],
      edges: [
        { id: 'e1', fromItemId: 'session-card', toItemId: 'series-card', label: '继续' },
      ],
    };

    const count = normalizeWhiteboardRecordReferences(board, {
      'session-1': 'task-1',
      'series-2': 'task-2',
    });

    expect(count).toBe(2);
    expect(board.items.map((item) => [item.id, item.recordId])).toEqual([
      ['task-card', 'task-1'],
      ['series-card', 'task-2'],
    ]);
    expect(board.edges[0]).toMatchObject({ fromItemId: 'task-card', toItemId: 'series-card' });
  });
});
