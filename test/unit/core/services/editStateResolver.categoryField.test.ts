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

  it('backfills period fields for plan records, including legacy duplicate category output', () => {
    const settings = {
      blocks: [
        {
          id: 'blk-plan',
          name: '计划',
          categoryKey: '计划',
          fields: [
            {
              id: 'f1',
              key: '周期',
              label: '周期',
              type: 'radio',
              options: [
                { value: '周', label: '周' },
                { value: '月', label: '月' },
                { value: '年', label: '年' },
              ],
            },
            { id: 'f2', key: '内容', label: '内容', type: 'textarea' },
          ],
          outputTemplate: '<!-- start -->\n分类:: 计划\n周期:: {{周期}}\n内容:: {{内容}}\n<!-- end -->',
          targetFile: '01/计划.md',
        },
      ],
      themes: [],
      overrides: [],
    };

    const item = {
      id: '01/计划.md#20',
      templateId: 'blk-plan',
      templateSourceType: 'block' as const,
      type: 'block' as const,
      title: '五月计划',
      content: '五月计划',
      editableText: '五月计划',
      rawSource: '<!-- start -->\n模板ID:: blk-plan\n模板来源:: block\n分类:: 计划\n分类:: 月\n内容:: 五月计划\n<!-- end -->',
      tags: [],
      recurrence: 'none',
      created: 0,
      modified: 0,
      extra: {},
      categoryKey: '月',
      file: { path: '01/计划.md', line: 20, basename: '计划' },
    };

    const prepared = buildEditRecordState({
      settings: settings as any,
      item: item as any,
      preferredBlockId: 'blk-plan',
    });

    expect(prepared.initialFormData['周期']).toEqual({ value: '月', label: '月' });
  });

  it('backfills tags fields from parsed item tags', () => {
    const settings = {
      blocks: [
        {
          id: 'blk-flash',
          name: '闪念',
          categoryKey: '闪念',
          fields: [
            { id: 'f1', key: '标签', label: '标签', type: 'text' },
            { id: 'f2', key: '内容', label: '内容', type: 'textarea' },
          ],
          outputTemplate: '<!-- start -->\n分类:: 闪念\n标签:: {{标签}}\n内容:: {{内容}}\n<!-- end -->',
          targetFile: '01/闪念.md',
        },
      ],
      themes: [],
      overrides: [],
    };

    const item = {
      id: '01/闪念.md#8',
      templateId: 'blk-flash',
      templateSourceType: 'block' as const,
      type: 'block' as const,
      title: '灵感',
      content: '灵感',
      editableText: '灵感',
      rawSource: '<!-- start -->\n分类:: 闪念\n标签:: 阅读,AI\n内容:: 灵感\n<!-- end -->',
      tags: ['阅读', 'AI'],
      recurrence: 'none',
      created: 0,
      modified: 0,
      extra: {},
      categoryKey: '闪念',
      file: { path: '01/闪念.md', line: 8, basename: '闪念' },
    };

    const prepared = buildEditRecordState({
      settings: settings as any,
      item: item as any,
      preferredBlockId: 'blk-flash',
    });

    expect(prepared.initialFormData['标签']).toBe('阅读,AI');
  });
});
