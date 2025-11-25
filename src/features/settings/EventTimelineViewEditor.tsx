// src/features/settings/EventTimelineViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useEffect, useMemo } from 'preact/hooks';
import type { ViewEditorProps } from './registry';
import type { Item } from '@/core/types/schema';
import { FormField, FieldManager } from '@shared/index';

export const DEFAULT_CONFIG = {
    timeField: 'date',
    titleField: 'title',
    contentField: 'content',
    groupByDay: true,
    showWeekday: true,
    maxContentLength: 160,
    // 新增字段
    fields: ['title', 'date'],
    groupFields: [],
};

export function EventTimelineViewEditor({ value, onChange, dataStore }: ViewEditorProps) {
    const config = { ...DEFAULT_CONFIG, ...value };
    
    // 获取可用字段列表
    const availableFields = useMemo(() => {
        if (!dataStore) return ['title', 'content', 'date', 'startTime', 'endTime', 'categoryKey', 'tags'];
        
        try {
            const items = dataStore.queryItems();
            const fieldSet = new Set<string>();
            
            items.forEach((item: Item) => {
                Object.keys(item).forEach(field => {
                    if (field !== 'extra' && field !== 'file') {
                        fieldSet.add(field);
                    }
                });
                // 添加 extra 字段
                if (item.extra) {
                    Object.keys(item.extra).forEach(extraField => {
                        fieldSet.add(`extra.${extraField}`);
                    });
                }
            });
            
            return Array.from(fieldSet).sort();
        } catch (error) {
            console.error('Error loading fields:', error);
            // 默认字段列表
            return ['title', 'content', 'date', 'startTime', 'endTime', 'categoryKey', 'tags'];
        }
    }, [dataStore]);

    const handleConfigChange = (key: string, newValue: any) => {
        const newConfig = { ...config, [key]: newValue };
        onChange(newConfig);
    };

    return (
        <div class="event-timeline-editor-container">
            <div class="statistics-section">
                <div class="statistics-section-title">事件时间线视图配置</div>
                <div class="statistics-section-description">
                    事件时间线视图将按时间顺序纵向展示事件，每个事件显示为时间线上的一个节点。
                </div>
            </div>

            {/* 字段配置 */}
            <div class="statistics-section">
                <div class="categories-section-title">字段配置</div>
                <div class="field-config-grid">
                    <div class="field-config-item">
                        <label class="field-config-label">时间字段:</label>
                        <select
                            class="field-config-select"
                            value={config.timeField || 'date'}
                            onChange={(e) => handleConfigChange('timeField', (e.target as HTMLSelectElement).value)}
                        >
                            {availableFields.filter(field => 
                                field.includes('date') || 
                                field.includes('time') || 
                                field.includes('Time') ||
                                field.includes('Date')
                            ).map((field) => (
                                <option key={field} value={field}>
                                    {field}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div class="field-config-item">
                        <label class="field-config-label">标题字段:</label>
                        <select
                            class="field-config-select"
                            value={config.titleField || 'title'}
                            onChange={(e) => handleConfigChange('titleField', (e.target as HTMLSelectElement).value)}
                        >
                            {availableFields.map((field) => (
                                <option key={field} value={field}>
                                    {field}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div class="field-config-item">
                        <label class="field-config-label">内容字段:</label>
                        <select
                            class="field-config-select"
                            value={config.contentField || 'content'}
                            onChange={(e) => handleConfigChange('contentField', (e.target as HTMLSelectElement).value)}
                        >
                            {availableFields.map((field) => (
                                <option key={field} value={field}>
                                    {field}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* 显示配置 */}
            <div class="statistics-section">
                <div class="categories-section-title">显示配置</div>
                
                <FormField 
                    label="显示字段" 
                    help="选择要在时间线中显示的字段"
                >
                    <FieldManager 
                        fields={config.fields || ['title', 'date']}
                        availableFields={availableFields}
                        onFieldsChange={(fields) => handleConfigChange('fields', fields)}
                        placeholder="+ 添加显示字段..."
                    />
                </FormField>

                <FormField
                    label="分组字段"
                    help="选择用于分组的字段，可选择多字段进行层级分组"
                >
                    <FieldManager
                        fields={config.groupFields || []}
                        availableFields={availableFields}
                        onFieldsChange={(fields) => handleConfigChange('groupFields', fields)}
                        placeholder="+ 选择分组字段..."
                    />
                </FormField>
                
                <div class="display-config-item">
                    <label class="field-config-label">内容摘要最大长度:</label>
                    <input
                        class="field-config-input"
                        type="number"
                        min="50"
                        max="500"
                        value={config.maxContentLength || 160}
                        onChange={(e) => handleConfigChange('maxContentLength', parseInt((e.target as HTMLInputElement).value) || 160)}
                    />
                    <span class="field-config-unit">字符</span>
                </div>
            </div>

            {/* 配置说明 */}
            <div class="statistics-section">
                <div class="categories-section-title">配置说明</div>
                <div class="categories-description">
                    <strong>字段说明：</strong><br/>
                    • <strong>时间字段</strong>：用于确定事件的时间点，支持日期和时间格式<br/>
                    • <strong>标题字段</strong>：事件节点显示的主标题<br/>
                    • <strong>内容字段</strong>：事件节点显示的内容摘要<br/>
                    • <strong>显示字段</strong>：选择在时间线事件中要显示的字段<br/>
                    • <strong>分组字段</strong>：按指定字段对事件进行分组，支持多级分组<br/>
                    • <strong>内容摘要长度</strong>：超过此长度的内容将被截断并添加省略号<br/>
                    <br/>
                    事件将按照时间字段自动排序，如有分组字段则先按分组显示。
                </div>
            </div>
        </div>
    );
}
