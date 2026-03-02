// test/unit/TemplateResolver.test.ts
// TemplateResolver 单元测试

import { TemplateResolver } from '../../src/core/services/TemplateResolver';
import type { InputSettings, BlockTemplate, ThemeDefinition, ThemeOverride } from '../../src/core/types/schema';

describe('TemplateResolver', () => {
    // 基础测试数据
    const baseBlock: BlockTemplate = {
        id: 'block1',
        name: '测试模板',
        fields: [
            { id: 'f1', key: 'content', label: '内容', type: 'text' },
            { id: 'f2', key: 'date', label: '日期', type: 'date' }
        ],
        outputTemplate: '{{content}} - {{date}}',
        targetFile: 'test.md',
        appendUnderHeader: '## 默认标题'
    };

    const theme1: ThemeDefinition = {
        id: 'theme1',
        path: '主题1',
        icon: '🎯'
    };

    const theme2: ThemeDefinition = {
        id: 'theme2',
        path: '主题2',
        icon: '⭐'
    };

    // 启用的 override
    const enabledOverride: ThemeOverride = {
        id: 'override1',
        blockId: 'block1',
        themeId: 'theme1',
        disabled: false,
        outputTemplate: '重写模板: {{content}}',
        appendUnderHeader: '## 重写标题'
    };

    // 禁用的 override
    const disabledOverride: ThemeOverride = {
        id: 'override2',
        blockId: 'block1',
        themeId: 'theme2',
        disabled: true,
        outputTemplate: '不应该使用的模板',
        appendUnderHeader: '## 不应该使用的标题'
    };

    describe('resolve()', () => {
        test('case a) block 不存在时返回 template null', () => {
            const settings: InputSettings = {
                blocks: [baseBlock],
                themes: [theme1],
                overrides: []
            };

            const result = TemplateResolver.resolve(settings, 'nonexistent-block');
            
            expect(result.template).toBeNull();
            expect(result.theme).toBeNull();
        });

        test('case b) themeId 不存在时返回 baseBlock + theme null', () => {
            const settings: InputSettings = {
                blocks: [baseBlock],
                themes: [theme1],
                overrides: []
            };

            const result = TemplateResolver.resolve(settings, 'block1');
            
            expect(result.template).not.toBeNull();
            expect(result.template?.id).toBe('block1');
            expect(result.template?.outputTemplate).toBe('{{content}} - {{date}}');
            expect(result.template?.appendUnderHeader).toBe('## 默认标题');
            expect(result.theme).toBeNull();
        });

        test('case c) themeId 存在且 override.disabled=false 时应用合并', () => {
            const settings: InputSettings = {
                blocks: [baseBlock],
                themes: [theme1],
                overrides: [enabledOverride]
            };

            const result = TemplateResolver.resolve(settings, 'block1', 'theme1');
            
            expect(result.template).not.toBeNull();
            expect(result.template?.id).toBe('block1');
            // override 的字段应该被合并
            expect(result.template?.outputTemplate).toBe('重写模板: {{content}}');
            expect(result.template?.appendUnderHeader).toBe('## 重写标题');
            // 没有被 override 的字段应该保持 baseBlock 的值
            expect(result.template?.targetFile).toBe('test.md');
            expect(result.template?.fields).toEqual(baseBlock.fields);
            // theme 应该存在
            expect(result.theme).not.toBeNull();
            expect(result.theme?.id).toBe('theme1');
            expect(result.theme?.path).toBe('主题1');
        });

        test('case d) themeId 存在但 override.disabled=true 时不应用 override', () => {
            const settings: InputSettings = {
                blocks: [baseBlock],
                themes: [theme2],
                overrides: [disabledOverride]
            };

            const result = TemplateResolver.resolve(settings, 'block1', 'theme2');
            
            expect(result.template).not.toBeNull();
            expect(result.template?.id).toBe('block1');
            // 应该返回 baseBlock 的原始值，不应用 override
            expect(result.template?.outputTemplate).toBe('{{content}} - {{date}}');
            expect(result.template?.appendUnderHeader).toBe('## 默认标题');
            expect(result.template?.targetFile).toBe('test.md');
            // theme 仍然应该存在
            expect(result.theme).not.toBeNull();
            expect(result.theme?.id).toBe('theme2');
        });

        test('themeId 存在但没有对应 override 时返回 baseBlock + theme', () => {
            const settings: InputSettings = {
                blocks: [baseBlock],
                themes: [theme1, theme2],
                overrides: [] // 没有 override
            };

            const result = TemplateResolver.resolve(settings, 'block1', 'theme1');
            
            expect(result.template).not.toBeNull();
            expect(result.template?.outputTemplate).toBe('{{content}} - {{date}}');
            expect(result.theme).not.toBeNull();
            expect(result.theme?.id).toBe('theme1');
        });

        test('themeId 不在 themes 列表中时 theme 返回 null', () => {
            const settings: InputSettings = {
                blocks: [baseBlock],
                themes: [theme1],
                overrides: []
            };

            const result = TemplateResolver.resolve(settings, 'block1', 'nonexistent-theme');
            
            expect(result.template).not.toBeNull();
            expect(result.template?.id).toBe('block1');
            expect(result.theme).toBeNull();
        });
    });

    describe('resolveTemplateOnly()', () => {
        test('应该只返回 template，不返回 theme', () => {
            const settings: InputSettings = {
                blocks: [baseBlock],
                themes: [theme1],
                overrides: [enabledOverride]
            };

            const template = TemplateResolver.resolveTemplateOnly(settings, 'block1', 'theme1');
            
            expect(template).not.toBeNull();
            expect(template?.id).toBe('block1');
            expect(template?.outputTemplate).toBe('重写模板: {{content}}');
        });

        test('block 不存在时返回 null', () => {
            const settings: InputSettings = {
                blocks: [baseBlock],
                themes: [theme1],
                overrides: []
            };

            const template = TemplateResolver.resolveTemplateOnly(settings, 'nonexistent');
            
            expect(template).toBeNull();
        });
    });
});
