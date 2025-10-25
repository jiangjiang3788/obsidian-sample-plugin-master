// test/unit/lib/utils/array.test.ts
import { 
    moveInArray, 
    duplicateInArray, 
    generateId, 
    batchUpdate, 
    batchDelete,
    reorderArray,
    batchMove
} from '../../../../src/lib/utils/array';

describe('Array Utils', () => {
    describe('moveInArray', () => {
        it('should move item up', () => {
            const arr = [
                { id: '1', name: 'A' },
                { id: '2', name: 'B' },
                { id: '3', name: 'C' }
            ];
            const result = moveInArray(arr, '2', 'up');
            expect(result[0].id).toBe('2');
            expect(result[1].id).toBe('1');
            expect(result[2].id).toBe('3');
        });

        it('should move item down', () => {
            const arr = [
                { id: '1', name: 'A' },
                { id: '2', name: 'B' },
                { id: '3', name: 'C' }
            ];
            const result = moveInArray(arr, '2', 'down');
            expect(result[0].id).toBe('1');
            expect(result[1].id).toBe('3');
            expect(result[2].id).toBe('2');
        });

        it('should not move if at top boundary', () => {
            const arr = [
                { id: '1', name: 'A' }, 
                { id: '2', name: 'B' }
            ];
            const result = moveInArray(arr, '1', 'up');
            expect(result).toEqual(arr);
        });

        it('should not move if at bottom boundary', () => {
            const arr = [
                { id: '1', name: 'A' }, 
                { id: '2', name: 'B' }
            ];
            const result = moveInArray(arr, '2', 'down');
            expect(result).toEqual(arr);
        });

        it('should return original array if item not found', () => {
            const arr = [{ id: '1', name: 'A' }];
            const result = moveInArray(arr, 'nonexistent', 'up');
            expect(result).toEqual(arr);
        });
    });

    describe('duplicateInArray', () => {
        it('should duplicate item with new id', () => {
            const arr = [
                { id: 'item_1', name: 'Original' }
            ];
            const result = duplicateInArray(arr, 'item_1', 'name');
            
            expect(result.length).toBe(2);
            expect(result[0].id).toBe('item_1');
            expect(result[1].name).toBe('Original (副本)');
            expect(result[1].id).not.toBe('item_1');
            expect(result[1].id).toContain('item_');
        });

        it('should insert duplicate after original', () => {
            const arr = [
                { id: '1', name: 'A' },
                { id: '2', name: 'B' },
                { id: '3', name: 'C' }
            ];
            const result = duplicateInArray(arr, '2', 'name');
            
            expect(result.length).toBe(4);
            expect(result[1].id).toBe('2');
            expect(result[2].name).toBe('B (副本)');
            expect(result[3].id).toBe('3');
        });

        it('should return original array if item not found', () => {
            const arr = [{ id: '1', name: 'A' }];
            const result = duplicateInArray(arr, 'nonexistent', 'name');
            expect(result).toEqual(arr);
        });
    });

    describe('generateId', () => {
        it('should generate id with prefix', () => {
            const id = generateId('test');
            expect(id).toContain('test_');
        });

        it('should generate unique ids', () => {
            const id1 = generateId('test');
            const id2 = generateId('test');
            expect(id1).not.toBe(id2);
        });

        it('should use default prefix if not provided', () => {
            const id = generateId();
            expect(id).toContain('id_');
        });
    });

    describe('batchUpdate', () => {
        it('should update multiple items', () => {
            const arr = [
                { id: '1', value: 1 },
                { id: '2', value: 2 },
                { id: '3', value: 3 }
            ];
            const result = batchUpdate(arr, ['1', '3'], item => ({ value: item.value * 10 }));
            
            expect(result[0].value).toBe(10);
            expect(result[1].value).toBe(2);
            expect(result[2].value).toBe(30);
        });

        it('should not modify items not in ids list', () => {
            const arr = [
                { id: '1', value: 1 },
                { id: '2', value: 2 }
            ];
            const result = batchUpdate(arr, ['1'], () => ({ value: 100 }));
            
            expect(result[0].value).toBe(100);
            expect(result[1].value).toBe(2);
        });

        it('should handle empty ids array', () => {
            const arr = [{ id: '1', value: 1 }];
            const result = batchUpdate(arr, [], () => ({ value: 100 }));
            expect(result).toEqual(arr);
        });
    });

    describe('batchDelete', () => {
        it('should delete multiple items', () => {
            const arr = [
                { id: '1', name: 'A' },
                { id: '2', name: 'B' },
                { id: '3', name: 'C' }
            ];
            const result = batchDelete(arr, ['1', '3']);
            
            expect(result.length).toBe(1);
            expect(result[0].id).toBe('2');
        });

        it('should handle empty ids array', () => {
            const arr = [{ id: '1', name: 'A' }];
            const result = batchDelete(arr, []);
            expect(result).toEqual(arr);
        });

        it('should handle non-existent ids', () => {
            const arr = [{ id: '1', name: 'A' }];
            const result = batchDelete(arr, ['nonexistent']);
            expect(result).toEqual(arr);
        });
    });

    describe('reorderArray', () => {
        it('should reorder items according to id list', () => {
            const arr = [
                { id: '1', name: 'A' },
                { id: '2', name: 'B' },
                { id: '3', name: 'C' }
            ];
            const result = reorderArray(arr, ['3', '1', '2']);
            
            expect(result[0].id).toBe('3');
            expect(result[1].id).toBe('1');
            expect(result[2].id).toBe('2');
        });

        it('should append items not in ordered list at the end', () => {
            const arr = [
                { id: '1', name: 'A' },
                { id: '2', name: 'B' },
                { id: '3', name: 'C' }
            ];
            const result = reorderArray(arr, ['3', '1']);
            
            expect(result[0].id).toBe('3');
            expect(result[1].id).toBe('1');
            expect(result[2].id).toBe('2');
        });

        it('should handle empty ordered list', () => {
            const arr = [
                { id: '1', name: 'A' },
                { id: '2', name: 'B' }
            ];
            const result = reorderArray(arr, []);
            expect(result).toEqual(arr);
        });
    });

    describe('batchMove', () => {
        it('should move multiple items to new parent', () => {
            const arr = [
                { id: '1', name: 'A', parentId: null },
                { id: '2', name: 'B', parentId: null },
                { id: '3', name: 'C', parentId: null }
            ];
            const result = batchMove(arr, ['1', '3'], 'parent_1');
            
            expect(result[0].parentId).toBe('parent_1');
            expect(result[1].parentId).toBe(null);
            expect(result[2].parentId).toBe('parent_1');
        });

        it('should handle moving to null parent', () => {
            const arr = [
                { id: '1', name: 'A', parentId: 'parent_1' }
            ];
            const result = batchMove(arr, ['1'], null);
            expect(result[0].parentId).toBe(null);
        });

        it('should handle empty ids array', () => {
            const arr = [
                { id: '1', name: 'A', parentId: null }
            ];
            const result = batchMove(arr, [], 'parent_1');
            expect(result).toEqual(arr);
        });
    });
});
