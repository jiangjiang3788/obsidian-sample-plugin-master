// src/features/settings/EventTimelineViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { EVENT_TIMELINE_VIEW_DEFAULT_CONFIG } from '@core/config/viewConfigs';

// 重新导出以保持兼容性
export { EVENT_TIMELINE_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/config/viewConfigs';

export function EventTimelineViewEditor() {
    return (
        <div class="event-timeline-editor-description">
            <div class="statistics-section-title">事件时间线视图</div>
            <div class="statistics-section-description">
                事件时间线视图按时间顺序纵向展示事件，采用三栏布局：
                <br/>
                <strong>[左侧日期] - [中间时间线] - [右侧内容卡片]</strong>
                <br/><br/>
                主要特性：
                <br/>
                • <strong>分组显示</strong>：支持多级字段分组，按上方的<strong>分组字段</strong>配置
                <br/>
                • <strong>卡片渲染</strong>：任务类型使用 TaskRow 组件，其他类型使用 BlockItem 组件
                <br/>
                • <strong>字段控制</strong>：显示内容由上方的<strong>显示字段</strong>配置控制
                <br/>
                • <strong>时间排序</strong>：同组内事件按时间升序自动排列
            </div>
        </div>
    );
}
