import type { Item, TemplateField } from '../../src/core/types/schema';
import { scanFieldMigrations } from '../../src/core/fields/FieldMigration';

const baseItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'daily.md#1',
  title: '记录',
  content: '记录内容',
  type: 'block',
  tags: [],
  recurrence: 'none',
  categoryKey: '默认',
  created: 0,
  modified: 0,
  extra: {},
  ...overrides,
});

describe('FieldMigration', () => {
  it('只生成迁移预览，不修改原始记录', () => {
    const item = baseItem({ theme: '工作/插件', themePath: '工作/插件' });
    const preview = scanFieldMigrations([item]);

    expect(preview.version).toBe('v1.4');
    expect(preview.mode).toBe('preview');
    expect(preview.summary.legacyThemeRecords).toBe(1);
    expect(preview.issues.some(issue => issue.kind === 'legacy_theme_field' && issue.targetFieldKey === 'themePath')).toBe(true);
    expect(item.theme).toBe('工作/插件');
  });

  it('识别旧 pintu 图片字段并建议迁移到 image', () => {
    const preview = scanFieldMigrations([
      baseItem({ id: 'daily.md#2', pintu: 'assets/a.png' }),
    ]);

    const issue = preview.issues.find(candidate => candidate.kind === 'legacy_image_field');
    expect(issue?.targetFieldKey).toBe('image');
    expect(issue?.safeAutoFix).toBe(true);
    expect(preview.summary.legacyImageRecords).toBe(1);
  });

  it('识别旧 parser 注入的 extra 正文污染字段', () => {
    const preview = scanFieldMigrations([
      baseItem({ id: 'daily.md#3', extra: { 正文: '正文副本', 地点: '家' } }),
    ]);

    expect(preview.summary.pollutedExtraRecords).toBe(1);
    expect(preview.issues.some(issue => issue.kind === 'legacy_extra_alias' && issue.fieldKey === 'extra.正文')).toBe(true);
    expect(preview.issues.some(issue => issue.fieldKey === 'extra.地点')).toBe(false);
  });

  it('识别 extra 与内置核心字段重名的情况', () => {
    const preview = scanFieldMigrations([
      baseItem({ id: 'daily.md#4', extra: { 主题: '健康/睡眠', 标签: '睡眠,健康' } }),
    ]);

    const targets = preview.issues
      .filter(issue => issue.kind === 'custom_core_name_collision')
      .map(issue => issue.targetFieldKey)
      .sort();

    expect(targets).toEqual(['tags', 'themePath']);
  });

  it('识别旧设置字段和核心字段重名，但不自动修改设置', () => {
    const fields: TemplateField[] = [
      { id: 'f1', key: '主题', label: '主题', type: 'path' },
      { id: 'f2', key: '备注', label: '备注', type: 'text' },
    ];
    const preview = scanFieldMigrations({ fields });

    const issue = preview.issues.find(candidate => candidate.kind === 'template_core_field_collision');
    expect(issue?.targetFieldKey).toBe('themePath');
    expect(issue?.safeAutoFix).toBe(false);
    expect(preview.affectedTemplateFieldCount).toBe(1);
  });
});
