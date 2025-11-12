// src/lib/patterns/CRUDStore.ts
/**
 * CRUD Store 抽象基类
 * 提供通用的增删改查功能
 * 
 * 这是一个抽象基类，用于减少 Store 中的重复代码
 * 子类需要实现抽象方法以定制行为
 */

export abstract class CRUDStore<T extends { id: string }> {
    protected items: T[] = [];
    protected listeners: Set<() => void> = new Set();

    // ===== 抽象方法 - 子类必须实现 =====
    
    /**
     * 获取 ID 前缀
     * 例如: 'ds' for DataSource, 'view' for ViewInstance
     */
    protected abstract getIdPrefix(): string;
    
    /**
     * 验证项是否有效
     * 在添加或更新前调用
     */
    protected abstract validateItem(item: T): boolean;
    
    /**
     * 持久化数据
     * 在任何修改操作后调用
     */
    protected abstract persist(): Promise<void>;

    // ===== 查询方法 =====
    
    /**
     * 获取所有项（返回副本）
     */
    public getAll(): T[] {
        return [...this.items];
    }

    /**
     * 根据ID获取项
     */
    public getById(id: string): T | undefined {
        return this.items.find(item => item.id === id);
    }

    /**
     * 查找满足条件的项
     */
    public find(predicate: (item: T) => boolean): T | undefined {
        return this.items.find(predicate);
    }

    /**
     * 查找所有满足条件的项
     */
    public filter(predicate: (item: T) => boolean): T[] {
        return this.items.filter(predicate);
    }

    /**
     * 获取项数量
     */
    public count(): number {
        return this.items.length;
    }

    // ===== CRUD 操作 =====
    
    /**
     * 添加新项
     */
    public async add(item: Omit<T, 'id'>): Promise<T> {
        const newItem = {
            ...item,
            id: this.generateId()
        } as T;

        if (!this.validateItem(newItem)) {
            throw new Error(`Invalid item: validation failed`);
        }

        this.items.push(newItem);
        await this.persist();
        this.notifyListeners();
        
        return newItem;
    }

    /**
     * 更新项
     */
    public async update(id: string, updates: Partial<T>): Promise<void> {
        const index = this.items.findIndex(item => item.id === id);
        if (index === -1) {
            throw new Error(`Item not found: ${id}`);
        }

        const updatedItem = { ...this.items[index], ...updates };
        
        if (!this.validateItem(updatedItem)) {
            throw new Error(`Invalid item: validation failed`);
        }

        this.items[index] = updatedItem;
        await this.persist();
        this.notifyListeners();
    }

    /**
     * 删除项
     */
    public async delete(id: string): Promise<void> {
        const initialLength = this.items.length;
        this.items = this.items.filter(item => item.id !== id);
        
        if (this.items.length === initialLength) {
            throw new Error(`Item not found: ${id}`);
        }

        await this.persist();
        this.notifyListeners();
    }

    // ===== 批量操作 =====
    
    /**
     * 批量更新
     */
    public async batchUpdate(
        ids: string[],
        updater: (item: T) => Partial<T>
    ): Promise<void> {
        const idSet = new Set(ids);
        let hasChanges = false;

        this.items = this.items.map(item => {
            if (idSet.has(item.id)) {
                const updates = updater(item);
                const updatedItem = { ...item, ...updates };
                
                if (!this.validateItem(updatedItem)) {
                    throw new Error(`Invalid item: validation failed for ${item.id}`);
                }
                
                hasChanges = true;
                return updatedItem;
            }
            return item;
        });

        if (hasChanges) {
            await this.persist();
            this.notifyListeners();
        }
    }

    /**
     * 批量删除
     */
    public async batchDelete(ids: string[]): Promise<void> {
        const initialLength = this.items.length;
        const idSet = new Set(ids);
        this.items = this.items.filter(item => !idSet.has(item.id));

        if (this.items.length < initialLength) {
            await this.persist();
            this.notifyListeners();
        }
    }

    /**
     * 批量添加
     */
    public async batchAdd(items: Array<Omit<T, 'id'>>): Promise<T[]> {
        const newItems: T[] = items.map(item => ({
            ...item,
            id: this.generateId()
        } as T));

        // 验证所有项
        for (const item of newItems) {
            if (!this.validateItem(item)) {
                throw new Error(`Invalid item: validation failed`);
            }
        }

        this.items.push(...newItems);
        await this.persist();
        this.notifyListeners();

        return newItems;
    }

    // ===== 订阅机制 =====
    
    /**
     * 订阅变更通知
     * @returns 取消订阅函数
     */
    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * 取消所有订阅
     */
    public unsubscribeAll(): void {
        this.listeners.clear();
    }

    // ===== 辅助方法 =====
    
    /**
     * 生成唯一ID
     */
    protected generateId(): string {
        const prefix = this.getIdPrefix();
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `${prefix}_${timestamp}_${random}`;
    }

    /**
     * 通知所有监听器
     */
    protected notifyListeners(): void {
        this.listeners.forEach(listener => {
            try {
                listener();
            } catch (error) {
                console.error('Error in listener:', error);
            }
        });
    }

    /**
     * 清空所有项（慎用！）
     */
    public async clear(): Promise<void> {
        if (this.items.length > 0) {
            this.items = [];
            await this.persist();
            this.notifyListeners();
        }
    }

    /**
     * 检查项是否存在
     */
    public exists(id: string): boolean {
        return this.items.some(item => item.id === id);
    }

    /**
     * 替换所有项（用于批量导入等场景）
     */
    public async replaceAll(newItems: T[]): Promise<void> {
        // 验证所有项
        for (const item of newItems) {
            if (!this.validateItem(item)) {
                throw new Error(`Invalid item: validation failed for ${item.id}`);
            }
        }

        this.items = [...newItems];
        await this.persist();
        this.notifyListeners();
    }
}
