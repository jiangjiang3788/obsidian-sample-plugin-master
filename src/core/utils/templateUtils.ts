// src/core/utils/templateUtils.ts
import { moment } from 'obsidian';

/**
 * @file 模板渲染工具函数
 * ----------------------------------------------------------------
 * 这是一个独立的、无状态的纯函数，用于将模板字符串和数据对象渲染成最终的文本。
 * 它不依赖任何服务，可以被安全地在任何地方调用。
 */

/**
 * 根据给定的数据渲染一个模板字符串。
 * @param templateString - 包含 {{placeholder}} 变量的模板。
 * @param data - 一个包含要替换变量的值的对象。
 * @returns 渲染完成后的字符串。
 */
export function renderTemplate(templateString: string, data: Record<string, any>): string {
    return templateString.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, placeholder) => {
        const key = placeholder.trim();
        let result = '';

        try {
            if (key === 'block') {
                result = data.block?.name || '';
            } else if (key === 'theme') {
                result = data.theme?.path || '';
            } else if (key === 'icon') {
                result = data.theme?.icon || '';
            } else if (key.startsWith('moment:')) {
                const format = key.substring(7);
                result = moment().format(format);
            } else {
                const keys = key.split('.');
                const rootKey = keys[0];
                
                if (!(rootKey in data)) {
                    return ''; // 如果根键不存在，直接返回空字符串
                }

                let value: any = data[rootKey];
                if (keys.length > 1) {
                    for (let i = 1; i < keys.length; i++) {
                        if (value && typeof value === 'object' && keys[i] in value) {
                            value = value[keys[i]];
                        } else {
                            value = '';
                            break;
                        }
                    }
                }

                if (typeof value === 'object' && value !== null && 'label' in value) {
                    result = String(value.label);
                } else {
                    result = value !== null && value !== undefined ? String(value) : '';
                }
            }
            return result;
        } catch (e: any) {
            console.error(`[ThinkPlugin] 解析模板变量 {{${key}}} 时发生错误:`, e);
            return `(解析错误: ${key})`;
        }
    });
}