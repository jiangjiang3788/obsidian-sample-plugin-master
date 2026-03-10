import { describe, expect, it } from 'vitest';
import { buildPathOption } from '../../../core/utils/pathSemantic';

describe('quick input category backfill helpers', () => {
  it('creates option objects from categoryKey for editing', () => {
    expect(buildPathOption('闪念/思考')).toEqual({ label: '思考', value: '闪念/思考' });
  });
});
