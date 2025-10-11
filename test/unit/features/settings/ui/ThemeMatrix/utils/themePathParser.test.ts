/**
 * ThemePathParser 工具函数测试
 */
import {
    parsePath,
    getPathDepth,
    isChildPath,
    isDirectChildPath,
    getCommonParentPath,
    normalizePath,
    generateUniqueChildPath,
    getRelativePath,
    comparePathsForSort,
    validatePathCharacters,
    type PathSegment
} from '@features/settings/ui/ThemeMatrix/utils/themePathParser';

describe('ThemePathParser Utils', () => {
    describe('parsePath', () => {
        it('应该正确解析简单路径', () => {
            const result = parsePath('personal');
            expect(result).toEqual([
                { name: 'personal', fullPath: 'personal', depth: 0 }
            ]);
        });

        it('应该正确解析多级路径', () => {
            const result = parsePath('personal/habits/morning');
            expect(result).toEqual([
                { name: 'personal', fullPath: 'personal', depth: 0 },
                { name: 'habits', fullPath: 'personal/habits', depth: 1 },
                { name: 'morning', fullPath: 'personal/habits/morning', depth: 2 }
            ]);
        });

        it('应该处理空路径', () => {
            expect(parsePath('')).toEqual([]);
            expect(parsePath('   ')).toEqual([]);
        });

        it('应该过滤空段', () => {
            const result = parsePath('personal//habits');
            expect(result).toEqual([
                { name: 'personal', fullPath: 'personal', depth: 0 },
                { name: 'habits', fullPath: 'personal/habits', depth: 1 }
            ]);
        });
    });

    describe('getPathDepth', () => {
        it('应该返回正确的深度', () => {
            expect(getPathDepth('')).toBe(0);
            expect(getPathDepth('personal')).toBe(0);
            expect(getPathDepth('personal/habits')).toBe(1);
            expect(getPathDepth('personal/habits/morning')).toBe(2);
        });

        it('应该处理带有多余斜杠的路径', () => {
            expect(getPathDepth('personal//habits')).toBe(1);
            expect(getPathDepth('/personal/habits/')).toBe(1);
        });
    });

    describe('isChildPath', () => {
        it('应该正确判断子路径关系', () => {
            expect(isChildPath('personal/habits', 'personal')).toBe(true);
            expect(isChildPath('personal/habits/morning', 'personal')).toBe(true);
            expect(isChildPath('personal/habits/morning', 'personal/habits')).toBe(true);
        });

        it('应该正确判断非子路径关系', () => {
            expect(isChildPath('personal', 'personal')).toBe(false);
            expect(isChildPath('work', 'personal')).toBe(false);
            expect(isChildPath('personal', 'personal/habits')).toBe(false);
            expect(isChildPath('personalinfo', 'personal')).toBe(false);
        });

        it('应该处理空路径', () => {
            expect(isChildPath('', 'personal')).toBe(false);
            expect(isChildPath('personal', '')).toBe(false);
            expect(isChildPath('', '')).toBe(false);
        });
    });

    describe('isDirectChildPath', () => {
        it('应该正确判断直接子路径', () => {
            expect(isDirectChildPath('personal/habits', 'personal')).toBe(true);
            expect(isDirectChildPath('work/projects', 'work')).toBe(true);
        });

        it('应该正确判断非直接子路径', () => {
            expect(isDirectChildPath('personal/habits/morning', 'personal')).toBe(false);
            expect(isDirectChildPath('personal', 'personal')).toBe(false);
            expect(isDirectChildPath('work', 'personal')).toBe(false);
        });
    });

    describe('getCommonParentPath', () => {
        it('应该找到公共父路径', () => {
            const paths = [
                'personal/habits/morning',
                'personal/habits/evening',
                'personal/habits/weekly'
            ];
            expect(getCommonParentPath(paths)).toBe('personal/habits');
        });

        it('应该处理没有公共父路径的情况', () => {
            const paths = ['personal/habits', 'work/projects'];
            expect(getCommonParentPath(paths)).toBe(null);
        });

        it('应该处理空数组', () => {
            expect(getCommonParentPath([])).toBe(null);
        });

        it('应该处理单个路径', () => {
            expect(getCommonParentPath(['personal/habits'])).toBe('personal');
            expect(getCommonParentPath(['personal'])).toBe(null);
        });

        it('应该处理部分公共路径', () => {
            const paths = [
                'personal/habits/morning',
                'personal/goals/2024'
            ];
            expect(getCommonParentPath(paths)).toBe('personal');
        });
    });

    describe('normalizePath', () => {
        it('应该规范化路径', () => {
            expect(normalizePath('  personal/habits  ')).toBe('personal/habits');
            expect(normalizePath('/personal/habits/')).toBe('personal/habits');
            expect(normalizePath('personal//habits')).toBe('personal/habits');
            expect(normalizePath('///personal///habits///')).toBe('personal/habits');
        });

        it('应该处理空路径', () => {
            expect(normalizePath('')).toBe('');
            expect(normalizePath(null as any)).toBe('');
            expect(normalizePath(undefined as any)).toBe('');
        });
    });

    describe('generateUniqueChildPath', () => {
        it('应该生成唯一的子路径', () => {
            const existingPaths = ['personal/habits', 'personal/goals'];
            const result = generateUniqueChildPath('personal', 'habits', existingPaths);
            expect(result).toBe('personal/habits_1');
        });

        it('应该处理多个冲突', () => {
            const existingPaths = [
                'personal/habits',
                'personal/habits_1',
                'personal/habits_2'
            ];
            const result = generateUniqueChildPath('personal', 'habits', existingPaths);
            expect(result).toBe('personal/habits_3');
        });

        it('应该处理没有冲突的情况', () => {
            const existingPaths = ['personal/goals'];
            const result = generateUniqueChildPath('personal', 'habits', existingPaths);
            expect(result).toBe('personal/habits');
        });

        it('应该处理空父路径', () => {
            const existingPaths = ['habits', 'goals'];
            const result = generateUniqueChildPath('', 'habits', existingPaths);
            expect(result).toBe('habits_1');
        });
    });

    describe('getRelativePath', () => {
        it('应该返回相对路径', () => {
            expect(getRelativePath('personal/habits/morning', 'personal')).toBe('habits/morning');
            expect(getRelativePath('personal/habits', 'personal')).toBe('habits');
        });

        it('应该处理以斜杠开始的相对路径', () => {
            expect(getRelativePath('personal/habits', 'personal/')).toBe('habits');
        });

        it('应该返回完整路径当不是子路径时', () => {
            expect(getRelativePath('work/projects', 'personal')).toBe('work/projects');
            expect(getRelativePath('personal', 'personal/habits')).toBe('personal');
        });
    });

    describe('comparePathsForSort', () => {
        it('应该按深度排序', () => {
            const paths = [
                'personal/habits/morning',
                'work',
                'personal/habits',
                'personal'
            ];
            const sorted = paths.sort(comparePathsForSort);
            expect(sorted).toEqual([
                'personal',  // 深度0，按字母顺序 p 在 w 前面
                'work',      // 深度0
                'personal/habits',  // 深度1
                'personal/habits/morning'  // 深度2
            ]);
        });

        it('应该在同深度时按字母顺序排序', () => {
            const paths = ['work', 'personal', 'archive'];
            const sorted = paths.sort(comparePathsForSort);
            expect(sorted).toEqual(['archive', 'personal', 'work']);
        });

        it('应该正确处理中文路径', () => {
            const paths = ['工作', '个人', '归档'];
            const sorted = paths.sort(comparePathsForSort);
            // 中文按拼音排序
            expect(sorted[0]).toBe('个人');
        });
    });

    describe('validatePathCharacters', () => {
        it('应该验证有效路径', () => {
            expect(validatePathCharacters('personal/habits')).toEqual({ valid: true });
            expect(validatePathCharacters('work_projects')).toEqual({ valid: true });
            expect(validatePathCharacters('2024/goals')).toEqual({ valid: true });
            expect(validatePathCharacters('个人/习惯')).toEqual({ valid: true });
        });

        it('应该拒绝空路径', () => {
            const result = validatePathCharacters('');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('路径不能为空');
        });

        it('应该拒绝包含非法字符的路径', () => {
            const invalidChars = ['<', '>', ':', '"', '|', '?', '*', '\\'];
            invalidChars.forEach(char => {
                const result = validatePathCharacters(`personal${char}habits`);
                expect(result.valid).toBe(false);
                expect(result.message).toContain('非法字符');
            });
        });

        it('应该拒绝空路径段', () => {
            const result = validatePathCharacters('personal//habits');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('路径段不能为空');
        });

        it('应该拒绝以点开始或结束的路径段', () => {
            expect(validatePathCharacters('.personal/habits')).toEqual({
                valid: false,
                message: '路径段不能以点开始或结束'
            });
            expect(validatePathCharacters('personal/habits.')).toEqual({
                valid: false,
                message: '路径段不能以点开始或结束'
            });
            expect(validatePathCharacters('personal/.habits')).toEqual({
                valid: false,
                message: '路径段不能以点开始或结束'
            });
        });

        it('应该接受路径段中间的点', () => {
            expect(validatePathCharacters('personal.backup/habits')).toEqual({ valid: true });
            expect(validatePathCharacters('v1.0/features')).toEqual({ valid: true });
        });
    });
});
