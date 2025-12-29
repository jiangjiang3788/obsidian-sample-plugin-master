/**
 * immutableListOps 单元测试
 */

import {
    addAtEnd,
    removeAt,
    updateAt,
    replaceAt,
    insertAt
} from '@/shared/utils/immutableListOps';

describe('addAtEnd', () => {
    it('should add item at the end of list', () => {
        const list = ['a', 'b', 'c'];
        const result = addAtEnd(list, 'd');
        
        expect(result).toEqual(['a', 'b', 'c', 'd']);
        expect(result).not.toBe(list); // 确保返回新数组
    });

    it('should work with empty list', () => {
        const list: string[] = [];
        const result = addAtEnd(list, 'first');
        
        expect(result).toEqual(['first']);
    });
});

describe('removeAt', () => {
    it('should remove item at specified index', () => {
        const list = ['a', 'b', 'c'];
        const result = removeAt(list, 1);
        
        expect(result).toEqual(['a', 'c']);
        expect(result).not.toBe(list);
    });

    it('should return same list for out-of-bounds index', () => {
        const list = ['a', 'b', 'c'];
        
        expect(removeAt(list, -1)).toBe(list);
        expect(removeAt(list, 5)).toBe(list);
    });

    it('should handle removing first item', () => {
        const list = ['a', 'b', 'c'];
        const result = removeAt(list, 0);
        
        expect(result).toEqual(['b', 'c']);
    });

    it('should handle removing last item', () => {
        const list = ['a', 'b', 'c'];
        const result = removeAt(list, 2);
        
        expect(result).toEqual(['a', 'b']);
    });
});

describe('updateAt', () => {
    it('should update item with patch object', () => {
        const list = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
        const result = updateAt(list, 0, { name: 'Updated' });
        
        expect(result[0]).toEqual({ id: 1, name: 'Updated' });
        expect(result).not.toBe(list);
    });

    it('should update item with updater function', () => {
        const list = [{ id: 1, count: 5 }];
        const result = updateAt(list, 0, item => ({ count: item.count + 1 }));
        
        expect(result[0].count).toBe(6);
    });

    it('should return same list for out-of-bounds index', () => {
        const list = [{ id: 1 }];
        
        expect(updateAt(list, -1, { id: 2 })).toBe(list);
        expect(updateAt(list, 5, { id: 2 })).toBe(list);
    });
});

describe('replaceAt', () => {
    it('should replace item at specified index', () => {
        const list = ['a', 'b', 'c'];
        const result = replaceAt(list, 1, 'X');
        
        expect(result).toEqual(['a', 'X', 'c']);
        expect(result).not.toBe(list);
    });

    it('should return same list for out-of-bounds index', () => {
        const list = ['a', 'b', 'c'];
        
        expect(replaceAt(list, -1, 'X')).toBe(list);
        expect(replaceAt(list, 5, 'X')).toBe(list);
    });
});

describe('insertAt', () => {
    it('should insert item at specified index', () => {
        const list = ['a', 'c'];
        const result = insertAt(list, 1, 'b');
        
        expect(result).toEqual(['a', 'b', 'c']);
        expect(result).not.toBe(list);
    });

    it('should insert at beginning for index 0', () => {
        const list = ['b', 'c'];
        const result = insertAt(list, 0, 'a');
        
        expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should insert at end for index >= length', () => {
        const list = ['a', 'b'];
        const result = insertAt(list, 10, 'c');
        
        expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should clamp negative index to 0', () => {
        const list = ['b', 'c'];
        const result = insertAt(list, -5, 'a');
        
        expect(result).toEqual(['a', 'b', 'c']);
    });
});
