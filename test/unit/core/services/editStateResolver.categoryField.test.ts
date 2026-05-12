import { describe, expect, it } from '@jest/globals';

import { buildEditRecordState } from '@/core/services/recordInput/editStateResolver';

describe('buildEditRecordState category backfill', () => {
  it('uses categoryKey for flash-note category fields instead of theme path', () => {
    const settings = {
      blocks: [
        {
          id: 'blk-flash',
          name: '闪念',
          categoryKey: '闪念',
          fields: [
            {
              id: 'f1',
              key: '思考分类',
              label: '思考分类',
              type: 'select',
              options: [
                { value: '闪念/事件', label: '事件' },
                { value: '闪念/感受', label: '感受' },
                { value: '闪念/思考', label: '思考' },
              ],
            },
            { id: 'f2', key: '内容', label: '内容', type: 'textarea' },
          ],
          outputTemplate: '<!-- start -->\n分类:: {{思考分类.value}}\n主题:: {{theme}}\n内容:: {{内容}}\n<!-- end -->',
          targetFile: '01/闪念.md',
          appendUnderHeader: '## {{theme}}',
        },
      ],
      themes: [
        { id: 'theme-health', path: '健康/心情' },
      ],
      overrides: [],
    };

    const item = {
      id: '01/闪念.md#12',
      type: 'block' as const,
      title: '我有点累',
      content: '我有点累',
      editableText: '我有点累',
      rawSource: '<!-- start -->\n分类:: 闪念/感受\n主题:: 健康/心情\n内容:: 我有点累\n<!-- end -->',
      tags: [],
      recurrence: 'none',
      created: 0,
      modified: 0,
      extra: {},
      categoryKey: '闪念/感受',
      theme: '健康/心情',
      file: { path: '01/闪念.md', line: 12, basename: '闪念' },
    };

    const prepared = buildEditRecordState({
      settings: settings as any,
      item: item as any,
      preferredBlockId: 'blk-flash',
      preferredThemeId: 'theme-health',
    });

    expect(prepared.initialFormData['思考分类']).toEqual({ value: '闪念/感受', label: '感受' });
  });
});
