// src/core/settings/ui/hooks/useSettingsManager.ts
import { App } from 'obsidian';
import { useCallback } from 'preact/hooks';
import { AppStore } from '@state/AppStore';
import { NamePromptModal } from '@shared/components/dialogs/NamePromptModal';
import { DEFAULT_NAMES } from '@core/domain/constants';
import type { GroupType } from '@core/domain/schema';
import type { TreeItem } from '../components/SettingsTreeView';

// 定义 Hook 接收的参数类型
interface SettingsManagerProps {
    app: App;
    type: GroupType;
    itemNoun: string; // 例如: '数据源', '视图', '布局'
}

/**
 * 这是一个自定义 Hook，用于封装 SettingsTreeView 的所有通用操作逻辑。
 * 它根据传入的类型，自动调用 AppStore 中对应的方法，并处理用户交互（如弹窗）。
 * @param props - 配置参数
 * @returns 返回一个包含所有事件处理函数的对象
 */
export const useSettingsManager = ({ app, type, itemNoun }: SettingsManagerProps) => {
    const store = AppStore.instance;

    // 根据类型获取对应的默认名称
    const defaultName = {
        dataSource: DEFAULT_NAMES.NEW_DATASOURCE,
        viewInstance: DEFAULT_NAMES.NEW_VIEW,
        layout: DEFAULT_NAMES.NEW_LAYOUT,
    }[type];

    // 使用 useCallback 避免不必要的函数重渲染
    const onAddItem = useCallback((parentId: string | null) => {
        new NamePromptModal(
            app,
            `创建新${itemNoun}`,
            `请输入新${itemNoun}的名称...`,
            defaultName,
            (newName) => {
                switch (type) {
                    case 'dataSource': store.addDataSource(newName, parentId); break;
                    case 'viewInstance': store.addViewInstance(newName, parentId); break;
                    case 'layout': store.addLayout(newName, parentId); break;
                }
            }
        ).open();
    }, [app, type, itemNoun, defaultName, store]);

    const onAddGroup = useCallback((parentId: string | null) => {
        new NamePromptModal(
            app,
            "创建新分组",
            "请输入分组名称...",
            "新分组",
            (newName) => store.addGroup(newName, parentId, type)
        ).open();
    }, [app, type, store]);

    const onDeleteItem = useCallback((item: TreeItem) => {
        const confirmText = item.isGroup
            ? `确认删除分组 "${item.name}" 吗？\n其内部所有内容将被移至上一级。`
            : `确认删除${itemNoun} "${item.name}" 吗？\n相关的引用可能会失效。`;
        
        if (confirm(confirmText)) {
            if (item.isGroup) {
                store.deleteGroup(item.id);
            } else {
                switch (type) {
                    case 'dataSource': store.deleteDataSource(item.id); break;
                    case 'viewInstance': store.deleteViewInstance(item.id); break;
                    case 'layout': store.deleteLayout(item.id); break;
                }
            }
        }
    }, [type, itemNoun, store]);

    const onUpdateItemName = useCallback((item: TreeItem, newName: string) => {
        if (item.isGroup) {
            store.updateGroup(item.id, { name: newName });
        } else {
            switch (type) {
                case 'dataSource': store.updateDataSource(item.id, { name: newName }); break;
                case 'viewInstance': store.updateViewInstance(item.id, { title: newName }); break;
                case 'layout': store.updateLayout(item.id, { name: newName }); break;
            }
        }
    }, [type, store]);

    const onMoveItem = useCallback((item: TreeItem, direction: 'up' | 'down') => {
        if (!item.isGroup) {
            switch (type) {
                case 'dataSource': store.moveDataSource(item.id, direction); break;
                case 'viewInstance': store.moveViewInstance(item.id, direction); break;
                case 'layout': store.moveLayout(item.id, direction); break;
            }
        }
    }, [type, store]);

    const onDuplicateItem = useCallback((item: TreeItem) => {
        if (item.isGroup) {
            store.duplicateGroup(item.id);
        } else {
            switch (type) {
                case 'dataSource': store.duplicateDataSource(item.id); break;
                case 'viewInstance': store.duplicateViewInstance(item.id); break;
                case 'layout': store.duplicateLayout(item.id); break;
            }
        }
    }, [type, store]);

    // 返回所有处理函数
    return {
        onAddItem,
        onAddGroup,
        onDeleteItem,
        onUpdateItemName,
        onMoveItem,
        onDuplicateItem,
    };
};