// src/features/settings/ui/hooks/useSettingsManager.ts
import { App } from 'obsidian';
import { useCallback } from 'preact/hooks';
import { AppStore } from '@core/stores/AppStore';
import { NamePromptModal } from '@shared/ui/composites/dialogs/NamePromptModal';
import { DEFAULT_NAMES } from '@/core/types/constants';
import type { GroupType } from '@/core/types/schema';
import type { TreeItem } from './SettingsTreeView';

// [修改] Hook 接收的参数类型增加了 appStore
interface SettingsManagerProps {
    app: App;
    appStore: AppStore;
    type: GroupType;
    itemNoun: string; // 例如: '数据源', '视图', '布局'
}

export const useSettingsManager = ({ app, appStore, type, itemNoun }: SettingsManagerProps) => {
    // [移除] 不再需要 store 的本地引用，直接使用 appStore
    // const store = appStore;

    const defaultName = {
        dataSource: DEFAULT_NAMES.NEW_DATASOURCE,
        viewInstance: DEFAULT_NAMES.NEW_VIEW,
        layout: DEFAULT_NAMES.NEW_LAYOUT,
    }[type];

    const onAddItem = useCallback((parentId: string | null) => {
        new NamePromptModal(
            app,
            `创建新${itemNoun}`,
            `请输入新${itemNoun}的名称...`,
            defaultName,
            (newName) => {
                switch (type) {
                    case 'dataSource': appStore.addDataSource(newName, parentId); break;
                    case 'viewInstance': appStore.addViewInstance(newName, parentId); break;
                    case 'layout': appStore.addLayout(newName, parentId); break;
                }
            }
        ).open();
    }, [app, type, itemNoun, defaultName, appStore]);

    const onAddGroup = useCallback((parentId: string | null) => {
        new NamePromptModal(
            app,
            "创建新分组",
            "请输入分组名称...",
            "新分组",
            (newName) => appStore.addGroup(newName, parentId, type)
        ).open();
    }, [app, type, appStore]);

    const onDeleteItem = useCallback((item: TreeItem) => {
        const confirmText = item.isGroup
            ? `确认删除分组 "${item.name}" 吗？\n其内部所有内容将被移至上一级。`
            : `确认删除${itemNoun} "${item.name}" 吗？\n相关的引用可能会失效。`;
        
        if (confirm(confirmText)) {
            if (item.isGroup) {
                appStore.deleteGroup(item.id);
            } else {
                switch (type) {
                    case 'dataSource': appStore.deleteDataSource(item.id); break;
                    case 'viewInstance': appStore.deleteViewInstance(item.id); break;
                    case 'layout': appStore.deleteLayout(item.id); break;
                }
            }
        }
    }, [type, itemNoun, appStore]);

    const onUpdateItemName = useCallback((item: TreeItem, newName: string) => {
        if (item.isGroup) {
            appStore.updateGroup(item.id, { name: newName });
        } else {
            switch (type) {
                case 'dataSource': appStore.updateDataSource(item.id, { name: newName }); break;
                case 'viewInstance': appStore.updateViewInstance(item.id, { title: newName }); break;
                case 'layout': appStore.updateLayout(item.id, { name: newName }); break;
            }
        }
    }, [type, appStore]);

    const onMoveItem = useCallback((item: TreeItem, direction: 'up' | 'down') => {
        if (!item.isGroup) {
            switch (type) {
                case 'dataSource': appStore.moveDataSource(item.id, direction); break;
                case 'viewInstance': appStore.moveViewInstance(item.id, direction); break;
                case 'layout': appStore.moveLayout(item.id, direction); break;
            }
        }
    }, [type, appStore]);

    const onDuplicateItem = useCallback((item: TreeItem) => {
        if (item.isGroup) {
            appStore.duplicateGroup(item.id);
        } else {
            switch (type) {
                case 'dataSource': appStore.duplicateDataSource(item.id); break;
                case 'viewInstance': appStore.duplicateViewInstance(item.id); break;
                case 'layout': appStore.duplicateLayout(item.id); break;
            }
        }
    }, [type, appStore]);

    return {
        onAddItem,
        onAddGroup,
        onDeleteItem,
        onUpdateItemName,
        onMoveItem,
        onDuplicateItem,
    };
};
