// test/unit/lib/patterns/CRUDStore.test.ts
import { CRUDStore } from '../../../../src/lib/patterns/CRUDStore';

// 测试用的实体接口
interface TestItem {
    id: string;
    name: string;
    value: number;
    active?: boolean;
}

// 测试用的 Store 实现
class TestStore extends CRUDStore<TestItem> {
    public persistCallCount = 0;
    public shouldFailValidation = false;
    public shouldFailPersist = false;

    protected getIdPrefix(): string {
        return 'test';
    }

    protected validateItem(item: TestItem): boolean {
        if (this.shouldFailValidation) {
            return false;
        }
        return !!item.name && item.value >= 0;
    }

    protected async persist(): Promise<void> {
        this.persistCallCount++;
        if (this.shouldFailPersist) {
            throw new Error('Persist failed');
        }
        return Promise.resolve();
    }

    // 公开items用于测试
    public getItems(): TestItem[] {
        return this.items;
    }

    // 重置计数器
    public resetCounters(): void {
        this.persistCallCount = 0;
    }
}

describe('CRUDStore', () => {
    let store: TestStore;

    beforeEach(() => {
        store = new TestStore();
        store.resetCounters();
    });

    describe('基础查询操作', () => {
        it('should return all items', () => {
            const items = store.getItems();
            items.push({ id: 'test_1', name: 'Test', value: 1 });
            
            const result = store.getAll();
            expect(result.length).toBe(1);
            // 应该返回副本，不是原数组
            expect(result).not.toBe(items);
        });

        it('should get item by id', async () => {
            const item = await store.add({ name: 'Test', value: 42 });
            const found = store.getById(item.id);
            
            expect(found).toBeDefined();
            expect(found?.name).toBe('Test');
            expect(found?.value).toBe(42);
        });

        it('should return undefined for non-existent id', () => {
            const found = store.getById('nonexistent');
            expect(found).toBeUndefined();
        });

        it('should find item by predicate', async () => {
            await store.add({ name: 'Test1', value: 1 });
            await store.add({ name: 'Test2', value: 2 });
            
            const found = store.find(item => item.value === 2);
            expect(found?.name).toBe('Test2');
        });

        it('should filter items by predicate', async () => {
            await store.add({ name: 'Test1', value: 1 });
            await store.add({ name: 'Test2', value: 2 });
            await store.add({ name: 'Test3', value: 3 });
            
            const filtered = store.filter(item => item.value > 1);
            expect(filtered.length).toBe(2);
        });

        it('should return correct count', async () => {
            expect(store.count()).toBe(0);
            await store.add({ name: 'Test1', value: 1 });
            expect(store.count()).toBe(1);
            await store.add({ name: 'Test2', value: 2 });
            expect(store.count()).toBe(2);
        });

        it('should check if item exists', async () => {
            const item = await store.add({ name: 'Test', value: 1 });
            expect(store.exists(item.id)).toBe(true);
            expect(store.exists('nonexistent')).toBe(false);
        });
    });

    describe('添加操作', () => {
        it('should add item with generated id', async () => {
            const item = await store.add({ name: 'Test', value: 42 });
            
            expect(item.id).toBeDefined();
            expect(item.id).toContain('test_');
            expect(item.name).toBe('Test');
            expect(store.count()).toBe(1);
        });

        it('should call persist after add', async () => {
            await store.add({ name: 'Test', value: 42 });
            expect(store.persistCallCount).toBe(1);
        });

        it('should throw error if validation fails', async () => {
            store.shouldFailValidation = true;
            await expect(store.add({ name: 'Test', value: 42 })).rejects.toThrow('Invalid item');
        });

        it('should generate unique ids', async () => {
            const item1 = await store.add({ name: 'Test1', value: 1 });
            const item2 = await store.add({ name: 'Test2', value: 2 });
            
            expect(item1.id).not.toBe(item2.id);
        });
    });

    describe('更新操作', () => {
        it('should update item', async () => {
            const item = await store.add({ name: 'Test', value: 42 });
            store.resetCounters();
            
            await store.update(item.id, { value: 100 });
            
            const updated = store.getById(item.id);
            expect(updated?.value).toBe(100);
            expect(updated?.name).toBe('Test'); // 不变
            expect(store.persistCallCount).toBe(1);
        });

        it('should throw error if item not found', async () => {
            await expect(store.update('nonexistent', { value: 100 })).rejects.toThrow('Item not found');
        });

        it('should throw error if updated item fails validation', async () => {
            const item = await store.add({ name: 'Test', value: 42 });
            store.shouldFailValidation = true;
            
            await expect(store.update(item.id, { value: 100 })).rejects.toThrow('Invalid item');
        });

        it('should allow partial updates', async () => {
            const item = await store.add({ name: 'Test', value: 42, active: true });
            await store.update(item.id, { value: 100 });
            
            const updated = store.getById(item.id);
            expect(updated?.active).toBe(true); // 保持不变
        });
    });

    describe('删除操作', () => {
        it('should delete item', async () => {
            const item = await store.add({ name: 'Test', value: 42 });
            store.resetCounters();
            
            await store.delete(item.id);
            
            expect(store.exists(item.id)).toBe(false);
            expect(store.count()).toBe(0);
            expect(store.persistCallCount).toBe(1);
        });

        it('should throw error if item not found', async () => {
            await expect(store.delete('nonexistent')).rejects.toThrow('Item not found');
        });

        it('should not call persist if item not found', async () => {
            try {
                await store.delete('nonexistent');
            } catch {
                // 忽略错误
            }
            expect(store.persistCallCount).toBe(0);
        });
    });

    describe('批量添加', () => {
        it('should add multiple items', async () => {
            const items = await store.batchAdd([
                { name: 'Test1', value: 1 },
                { name: 'Test2', value: 2 },
                { name: 'Test3', value: 3 }
            ]);
            
            expect(items.length).toBe(3);
            expect(store.count()).toBe(3);
            expect(store.persistCallCount).toBe(1);
        });

        it('should generate unique ids for all items', async () => {
            const items = await store.batchAdd([
                { name: 'Test1', value: 1 },
                { name: 'Test2', value: 2 }
            ]);
            
            expect(items[0].id).not.toBe(items[1].id);
        });

        it('should throw error if any item fails validation', async () => {
            store.shouldFailValidation = true;
            await expect(store.batchAdd([
                { name: 'Test1', value: 1 },
                { name: 'Test2', value: 2 }
            ])).rejects.toThrow('Invalid item');
        });
    });

    describe('批量更新', () => {
        it('should update multiple items', async () => {
            const item1 = await store.add({ name: 'Test1', value: 1 });
            const item2 = await store.add({ name: 'Test2', value: 2 });
            const item3 = await store.add({ name: 'Test3', value: 3 });
            store.resetCounters();
            
            await store.batchUpdate([item1.id, item3.id], item => ({ value: item.value * 10 }));
            
            expect(store.getById(item1.id)?.value).toBe(10);
            expect(store.getById(item2.id)?.value).toBe(2); // 未更新
            expect(store.getById(item3.id)?.value).toBe(30);
            expect(store.persistCallCount).toBe(1);
        });

        it('should not call persist if no items updated', async () => {
            await store.batchUpdate(['nonexistent'], () => ({ value: 100 }));
            expect(store.persistCallCount).toBe(0);
        });

        it('should throw error if updated item fails validation', async () => {
            const item = await store.add({ name: 'Test', value: 42 });
            store.shouldFailValidation = true;
            
            await expect(store.batchUpdate([item.id], () => ({ value: 100 }))).rejects.toThrow('Invalid item');
        });
    });

    describe('批量删除', () => {
        it('should delete multiple items', async () => {
            const item1 = await store.add({ name: 'Test1', value: 1 });
            const item2 = await store.add({ name: 'Test2', value: 2 });
            const item3 = await store.add({ name: 'Test3', value: 3 });
            store.resetCounters();
            
            await store.batchDelete([item1.id, item3.id]);
            
            expect(store.exists(item1.id)).toBe(false);
            expect(store.exists(item2.id)).toBe(true);
            expect(store.exists(item3.id)).toBe(false);
            expect(store.count()).toBe(1);
            expect(store.persistCallCount).toBe(1);
        });

        it('should not call persist if no items deleted', async () => {
            await store.batchDelete(['nonexistent']);
            expect(store.persistCallCount).toBe(0);
        });
    });

    describe('订阅机制', () => {
        it('should notify listeners on add', async () => {
            let callCount = 0;
            store.subscribe(() => callCount++);
            
            await store.add({ name: 'Test', value: 42 });
            expect(callCount).toBe(1);
        });

        it('should notify listeners on update', async () => {
            const item = await store.add({ name: 'Test', value: 42 });
            let callCount = 0;
            store.subscribe(() => callCount++);
            
            await store.update(item.id, { value: 100 });
            expect(callCount).toBe(1);
        });

        it('should notify listeners on delete', async () => {
            const item = await store.add({ name: 'Test', value: 42 });
            let callCount = 0;
            store.subscribe(() => callCount++);
            
            await store.delete(item.id);
            expect(callCount).toBe(1);
        });

        it('should allow unsubscribe', async () => {
            let callCount = 0;
            const unsubscribe = store.subscribe(() => callCount++);
            
            await store.add({ name: 'Test1', value: 1 });
            expect(callCount).toBe(1);
            
            unsubscribe();
            await store.add({ name: 'Test2', value: 2 });
            expect(callCount).toBe(1); // 不再增加
        });

        it('should handle multiple listeners', async () => {
            let count1 = 0, count2 = 0;
            store.subscribe(() => count1++);
            store.subscribe(() => count2++);
            
            await store.add({ name: 'Test', value: 42 });
            expect(count1).toBe(1);
            expect(count2).toBe(1);
        });

        it('should unsubscribe all listeners', async () => {
            let count1 = 0, count2 = 0;
            store.subscribe(() => count1++);
            store.subscribe(() => count2++);
            
            store.unsubscribeAll();
            await store.add({ name: 'Test', value: 42 });
            
            expect(count1).toBe(0);
            expect(count2).toBe(0);
        });

        it('should catch listener errors', async () => {
            const consoleError = jest.spyOn(console, 'error').mockImplementation();
            
            store.subscribe(() => {
                throw new Error('Listener error');
            });
            
            await store.add({ name: 'Test', value: 42 });
            
            expect(consoleError).toHaveBeenCalled();
            consoleError.mockRestore();
        });
    });

    describe('清空操作', () => {
        it('should clear all items', async () => {
            await store.add({ name: 'Test1', value: 1 });
            await store.add({ name: 'Test2', value: 2 });
            store.resetCounters();
            
            await store.clear();
            
            expect(store.count()).toBe(0);
            expect(store.persistCallCount).toBe(1);
        });

        it('should not call persist if already empty', async () => {
            await store.clear();
            expect(store.persistCallCount).toBe(0);
        });

        it('should notify listeners', async () => {
            await store.add({ name: 'Test', value: 1 });
            let callCount = 0;
            store.subscribe(() => callCount++);
            
            await store.clear();
            expect(callCount).toBe(1);
        });
    });

    describe('替换所有项', () => {
        it('should replace all items', async () => {
            await store.add({ name: 'Old1', value: 1 });
            await store.add({ name: 'Old2', value: 2 });
            store.resetCounters();
            
            const newItems: TestItem[] = [
                { id: 'test_new1', name: 'New1', value: 10 },
                { id: 'test_new2', name: 'New2', value: 20 }
            ];
            
            await store.replaceAll(newItems);
            
            expect(store.count()).toBe(2);
            expect(store.getById('test_new1')).toBeDefined();
            expect(store.exists('test_new1')).toBe(true);
            expect(store.persistCallCount).toBe(1);
        });

        it('should validate all items', async () => {
            const newItems: TestItem[] = [
                { id: 'test_1', name: 'Test1', value: 1 }
            ];
            
            store.shouldFailValidation = true;
            await expect(store.replaceAll(newItems)).rejects.toThrow('Invalid item');
        });
    });

    describe('错误处理', () => {
        it('should propagate persist errors', async () => {
            store.shouldFailPersist = true;
            await expect(store.add({ name: 'Test', value: 42 })).rejects.toThrow('Persist failed');
        });

        it('should handle validation with negative values', async () => {
            await expect(store.add({ name: 'Test', value: -1 })).rejects.toThrow('Invalid item');
        });

        it('should handle empty name', async () => {
            await expect(store.add({ name: '', value: 42 })).rejects.toThrow('Invalid item');
        });
    });

    describe('性能测试', () => {
        it('should handle large number of items', async () => {
            const items = Array.from({ length: 1000 }, (_, i) => ({
                name: `Test${i}`,
                value: i
            }));
            
            const start = Date.now();
            await store.batchAdd(items);
            const duration = Date.now() - start;
            
            expect(store.count()).toBe(1000);
            expect(duration).toBeLessThan(1000); // 应该在1秒内完成
        });

        it('should filter large dataset efficiently', async () => {
            await store.batchAdd(
                Array.from({ length: 1000 }, (_, i) => ({
                    name: `Test${i}`,
                    value: i
                }))
            );
            
            const start = Date.now();
            const filtered = store.filter(item => item.value > 500);
            const duration = Date.now() - start;
            
            expect(filtered.length).toBe(499);
            expect(duration).toBeLessThan(100); // 应该很快
        });
    });
});
