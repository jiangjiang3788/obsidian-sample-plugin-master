// src/app/store/stores/SettingsStore.ts
/**
 * Settings Store - 管理应用设置
 * 
 * 注意：这是新的独立 Store，暂时不影响 AppStore
 * 稍后会逐步将 AppStore 的设置相关方法迁移到这里
 * 
 * 架构说明：DataSource 已被移除，筛选和排序功能整合到 ViewInstance 中
 */

import { CRUDStore } from '@/lib/patterns/CRUDStore';
import type { ThinkSettings, ViewInstance, Layout, Group } from '@lib/types/domain/schema';

export class SettingsStore extends CRUDStore<ViewInstance> {
    private settings: ThinkSettings;
    private persistCallback?: (settings: ThinkSettings) => Promise<void>;

    constructor(initialSettings: ThinkSettings) {
        super();
        this.settings = initialSettings;
        this.items = initialSettings.viewInstances || [];
    }

    /**
     * 设置持久化回调
     * 这个回调将由 AppStore 或 Plugin 提供
     */
    public setPersistCallback(callback: (settings: ThinkSettings) => Promise<void>): void {
        this.persistCallback = callback;
    }

    // ===== CRUDStore 实现 =====
    
    protected getIdPrefix(): string {
        return 'view';
    }

    protected validateItem(item: ViewInstance): boolean {
        // ViewInstance 必须有 title 和 viewType
        return !!item.title && !!item.viewType;
    }

    protected async persist(): Promise<void> {
        if (this.persistCallback) {
            // 同步 items 到 settings
            this.settings.viewInstances = this.items;
            await this.persistCallback(this.settings);
        }
    }

    // ===== Settings 访问 =====
    
    /**
     * 获取完整设置对象
     */
    public getSettings(): ThinkSettings {
        return this.settings;
    }

    /**
     * 更新设置（通用方法）
     */
    public async updateSettings(updater: (draft: ThinkSettings) => void): Promise<void> {
        const newSettings = JSON.parse(JSON.stringify(this.settings));
        updater(newSettings);
        this.settings = newSettings;
        this.items = newSettings.viewInstances || [];
        await this.persist();
        this.notifyListeners();
    }

    // ===== ViewInstance 管理 =====

    /**
     * 获取所有视图实例
     */
    public getViewInstances(): ViewInstance[] {
        return this.getAll();
    }

    /**
     * 根据ID获取视图实例
     */
    public getViewInstanceById(id: string): ViewInstance | undefined {
        return this.getById(id);
    }

    /**
     * 添加视图实例
     */
    public async addViewInstance(viewInstance: Omit<ViewInstance, 'id'>): Promise<ViewInstance> {
        return this.add(viewInstance);
    }

    /**
     * 更新视图实例
     */
    public async updateViewInstance(id: string, updates: Partial<ViewInstance>): Promise<void> {
        return this.update(id, updates);
    }

    /**
     * 删除视图实例
     */
    public async deleteViewInstance(id: string): Promise<void> {
        await this.delete(id);
        
        // 同时从 layouts 中移除引用
        await this.updateSettings(draft => {
            draft.layouts?.forEach(layout => {
                if (layout.viewInstanceIds) {
                    layout.viewInstanceIds = layout.viewInstanceIds.filter(vid => vid !== id);
                }
            });
        });
    }

    /**
     * 根据父ID获取视图实例
     */
    public getViewInstancesByParent(parentId: string | null): ViewInstance[] {
        return this.filter(vi => vi.parentId === parentId);
    }

    // ===== Layout 管理 =====

    /**
     * 获取所有布局
     */
    public getLayouts(): Layout[] {
        return this.settings.layouts || [];
    }

    /**
     * 根据ID获取布局
     */
    public getLayoutById(id: string): Layout | undefined {
        return this.settings.layouts?.find(l => l.id === id);
    }

    /**
     * 添加布局
     */
    public async addLayout(layout: Omit<Layout, 'id'>): Promise<Layout> {
        const newLayout: Layout = {
            ...layout,
            id: this.generateLayoutId()
        };

        await this.updateSettings(draft => {
            if (!draft.layouts) {
                draft.layouts = [];
            }
            draft.layouts.push(newLayout);
        });

        return newLayout;
    }

    /**
     * 更新布局
     */
    public async updateLayout(id: string, updates: Partial<Layout>): Promise<void> {
        await this.updateSettings(draft => {
            const index = draft.layouts?.findIndex(l => l.id === id);
            if (index !== undefined && index > -1 && draft.layouts) {
                draft.layouts[index] = {
                    ...draft.layouts[index],
                    ...updates
                };
            }
        });
    }

    /**
     * 删除布局
     */
    public async deleteLayout(id: string): Promise<void> {
        await this.updateSettings(draft => {
            if (draft.layouts) {
                draft.layouts = draft.layouts.filter(l => l.id !== id);
            }
        });
    }

    /**
     * 根据父ID获取布局
     */
    public getLayoutsByParent(parentId: string | null): Layout[] {
        return this.getLayouts().filter(l => l.parentId === parentId);
    }

    // ===== Group 管理 =====

    /**
     * 获取所有分组
     */
    public getGroups(): Group[] {
        return this.settings.groups || [];
    }

    /**
     * 根据ID获取分组
     */
    public getGroupById(id: string): Group | undefined {
        return this.settings.groups?.find(g => g.id === id);
    }

    /**
     * 添加分组
     */
    public async addGroup(group: Omit<Group, 'id'>): Promise<Group> {
        const newGroup: Group = {
            ...group,
            id: this.generateGroupId()
        };

        await this.updateSettings(draft => {
            if (!draft.groups) {
                draft.groups = [];
            }
            draft.groups.push(newGroup);
        });

        return newGroup;
    }

    /**
     * 更新分组
     */
    public async updateGroup(id: string, updates: Partial<Group>): Promise<void> {
        await this.updateSettings(draft => {
            const index = draft.groups?.findIndex(g => g.id === id);
            if (index !== undefined && index > -1 && draft.groups) {
                draft.groups[index] = {
                    ...draft.groups[index],
                    ...updates
                };
            }
        });
    }

    /**
     * 删除分组
     */
    public async deleteGroup(id: string): Promise<void> {
        await this.updateSettings(draft => {
            // 获取被删除分组的父ID
            const groupToDelete = draft.groups?.find(g => g.id === id);
            const newParentId = groupToDelete?.parentId || null;
            
            // 重新分配子分组
            draft.groups?.forEach(g => {
                if (g.parentId === id) {
                    g.parentId = newParentId;
                }
            });
            
            // 重新分配子视图实例和布局
            draft.viewInstances?.forEach(vi => {
                if (vi.parentId === id) {
                    vi.parentId = newParentId;
                }
            });
            draft.layouts?.forEach(l => {
                if (l.parentId === id) {
                    l.parentId = newParentId;
                }
            });
            
            // 删除分组
            if (draft.groups) {
                draft.groups = draft.groups.filter(g => g.id !== id);
            }
        });
    }

    /**
     * 根据父ID获取分组
     */
    public getGroupsByParent(parentId: string | null): Group[] {
        return this.getGroups().filter(g => g.parentId === parentId);
    }

    /**
     * 根据类型获取分组
     */
    public getGroupsByType(type: Group['type']): Group[] {
        return this.getGroups().filter(g => g.type === type);
    }

    // ===== 辅助方法 =====

    /**
     * 为布局生成ID
     */
    private generateLayoutId(): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `layout_${timestamp}_${random}`;
    }

    /**
     * 为分组生成ID
     */
    private generateGroupId(): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `group_${timestamp}_${random}`;
    }

    /**
     * 更新浮动计时器设置
     */
    public async updateFloatingTimerEnabled(enabled: boolean): Promise<void> {
        await this.updateSettings(draft => {
            draft.floatingTimerEnabled = enabled;
        });
    }

    /**
     * 更新激活的主题路径
     */
    public async updateActiveThemePaths(paths: string[]): Promise<void> {
        await this.updateSettings(draft => {
            draft.activeThemePaths = paths;
        });
    }
}
