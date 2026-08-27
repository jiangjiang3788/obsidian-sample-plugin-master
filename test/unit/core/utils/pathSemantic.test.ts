import { buildPathOption, getBasePath, getLeafPath, normalizePath } from '@/core/utils/pathSemantic';

describe('pathSemantic', () => {
  test('normalizes and extracts base/leaf path', () => {
    expect(normalizePath(' 闪念 / 事件 ')).toBe('闪念/事件');
    expect(getBasePath('闪念/思考')).toBe('闪念');
    expect(getLeafPath('闪念/思考')).toBe('思考');
  });

  test('buildPathOption returns leaf label and full value', () => {
    expect(buildPathOption('闪念/感受')).toEqual({ label: '感受', value: '闪念/感受' });
  });
});
