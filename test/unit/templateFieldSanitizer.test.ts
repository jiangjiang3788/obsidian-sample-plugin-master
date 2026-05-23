import {
  createCustomTemplateField,
  getUserTemplateFieldTypeOptions,
  getCustomFieldNameWarning,
  isCoreInputFieldName,
  isReservedCustomFieldName,
  isMultiValueTemplateFieldType,
  sanitizeTemplateField,
  sanitizeTemplateFields,
  templateFieldTypeSupportsDefaultValue,
  templateFieldTypeUsesOptions,
} from '@/core/fields';

describe('TemplateFieldSanitizer', () => {
  it('keeps persisted custom fields limited to name and type plus type-owned config', () => {
    const sanitized = sanitizeTemplateField({
      id: 'a',
      key: '项目',
      label: '项目',
      type: 'multiSelect',
      semantic: 'themePath',
      semanticType: 'path',
      cardinality: 'multi',
      hierarchical: true,
      storage: { scope: 'core', markdownKey: '主题' },
      aliases: ['主题'],
      defaultValue: '不应保留',
      options: [{ value: 'A', label: '选项A' }],
    } as any);

    expect(sanitized).toEqual({
      id: 'a',
      key: '项目',
      label: '项目',
      type: 'multiSelect',
      options: [{ value: 'A', label: '选项A' }],
    });
  });

  it('maps old select/radio types to singleSelect', () => {
    expect(sanitizeTemplateField({ id: 'a', key: '状态', label: '状态', type: 'select' as any }).type).toBe('singleSelect');
    expect(sanitizeTemplateField({ id: 'b', key: '状态', label: '状态', type: 'radio' as any }).type).toBe('singleSelect');
  });

  it('binds multi-value behavior to field type', () => {
    expect(isMultiValueTemplateFieldType('multiSelect')).toBe(true);
    expect(isMultiValueTemplateFieldType('multiPath')).toBe(true);
    expect(isMultiValueTemplateFieldType('multiTag')).toBe(true);
    expect(isMultiValueTemplateFieldType('multiImage')).toBe(true);
    expect(isMultiValueTemplateFieldType('tag')).toBe(false);
    expect(isMultiValueTemplateFieldType('image')).toBe(false);
  });

  it('keeps options only for option-like field types', () => {
    const text = sanitizeTemplateField({ id: 'a', key: '备注', label: '备注', type: 'text', options: [{ value: 'A' }] });
    const select = sanitizeTemplateField({ id: 'b', key: '状态', label: '状态', type: 'singleSelect', options: [{ value: 'A' }] });
    expect(text.options).toBeUndefined();
    expect(select.options).toEqual([{ value: 'A' }]);
    expect(templateFieldTypeUsesOptions('singleSelect')).toBe(true);
    expect(templateFieldTypeUsesOptions('text')).toBe(false);
  });

  it('keeps defaultValue only for scalar input types', () => {
    expect(templateFieldTypeSupportsDefaultValue('text')).toBe(true);
    expect(templateFieldTypeSupportsDefaultValue('multiSelect')).toBe(false);
    const multi = sanitizeTemplateField({ id: 'a', key: '多选', label: '多选', type: 'multiSelect', defaultValue: 'A' });
    const text = sanitizeTemplateField({ id: 'b', key: '备注', label: '备注', type: 'text', defaultValue: 'hello' });
    expect(multi.defaultValue).toBeUndefined();
    expect(text.defaultValue).toBe('hello');
  });

  it('allows core input fields in forms without converting them to extra field names', () => {
    expect(createCustomTemplateField(1, 'path', '分类')).toMatchObject({ key: '分类', label: '分类', type: 'path' });
    expect(createCustomTemplateField(2, 'path', '主题')).toMatchObject({ key: '主题', label: '主题', type: 'path' });
    expect(createCustomTemplateField(3, 'multiTag', '标签')).toMatchObject({ key: '标签', label: '标签', type: 'multiTag' });
    expect(createCustomTemplateField(4, 'image', '图片')).toMatchObject({ key: '图片', label: '图片', type: 'image' });
    expect(getUserTemplateFieldTypeOptions().map(option => option.value)).toContain('multiImage');
  });

  it('protects file and derived field names while allowing core input names', () => {
    expect(isCoreInputFieldName('主题')).toBe(true);
    expect(isCoreInputFieldName('标签')).toBe(true);
    expect(isCoreInputFieldName('分类')).toBe(true);
    expect(isReservedCustomFieldName('文件名')).toBe(true);
    expect(isReservedCustomFieldName('所在标题')).toBe(true);
    expect(getCustomFieldNameWarning('主题')).toBeUndefined();
    expect(getCustomFieldNameWarning('文件名')).toContain('文件/派生字段');

    const sanitized = sanitizeTemplateFields([
      { id: 'a', key: '主题', label: '主题', type: 'path' },
      { id: 'b', key: '主题', label: '主题', type: 'path' },
      { id: 'c', key: '文件名', label: '文件名', type: 'text' },
      { id: 'd', key: '项目', label: '项目', type: 'text' },
      { id: 'e', key: '项目', label: '项目', type: 'text' },
    ]);
    expect(sanitized[0].key).toBe('主题');
    expect(sanitized[1].key).toBe('主题2');
    expect(sanitized[2].key).not.toBe('文件名');
    expect(sanitized[3].key).toBe('项目');
    expect(sanitized[4].key).toBe('项目2');
  });
});
