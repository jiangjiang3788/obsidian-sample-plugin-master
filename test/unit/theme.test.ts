// test/unit/theme.test.ts

import type { Theme } from '@core/domain/theme';
import { 
  createTheme, 
  parseThemeHierarchy, 
  isValidThemePath, 
  sortThemes 
} from '@core/domain/theme';
import { CORE_FIELDS, type Item } from '@core/domain/schema';

describe('主题系统数据结构测试', () => {
  describe('Theme接口', () => {
    test('Theme接口应包含所有必需字段', () => {
      const theme: Theme = {
        id: 'theme_001',
        path: '生活/日常',
        name: '日常',
        icon: '🏠',
        parentId: null,
        status: 'active',
        source: 'predefined',
        usageCount: 10,
        lastUsed: Date.now(),
        order: 1
      };

      expect(theme.id).toBeDefined();
      expect(theme.path).toBeDefined();
      expect(theme.name).toBeDefined();
      expect(theme.status).toMatch(/^(active|inactive)$/);
      expect(theme.source).toMatch(/^(predefined|discovered)$/);
      expect(typeof theme.usageCount).toBe('number');
      expect(typeof theme.order).toBe('number');
    });

    test('Theme可选字段应正确处理', () => {
      const theme: Theme = {
        id: 'theme_002',
        path: '工作',
        name: '工作',
        parentId: null,
        status: 'inactive',
        source: 'discovered',
        usageCount: 0,
        order: 999
      };

      expect(theme.icon).toBeUndefined();
      expect(theme.lastUsed).toBeUndefined();
    });
  });

  describe('Item接口更新', () => {
    test('Item应包含theme字段', () => {
      const item: Item = {
        id: 'item_001',
        title: '测试任务',
        content: '任务内容',
        type: 'task',
        tags: ['tag1'],
        theme: '生活/日常',  // 新增的theme字段
        categoryKey: 'todo',
        recurrence: '',
        created: Date.now(),
        modified: Date.now(),
        extra: {}
      };

      expect(item.theme).toBe('生活/日常');
    });

    test('theme字段应为可选', () => {
      const item: Item = {
        id: 'item_002',
        title: '测试任务2',
        content: '任务内容2',
        type: 'task',
        tags: [],
        categoryKey: 'todo',
        recurrence: '',
        created: Date.now(),
        modified: Date.now(),
        extra: {}
      };

      expect(item.theme).toBeUndefined();
    });
  });

  describe('CORE_FIELDS更新', () => {
    test('CORE_FIELDS应包含theme', () => {
      expect(CORE_FIELDS).toContain('theme');
    });

    test('CORE_FIELDS应保持原有字段', () => {
      const expectedFields = [
        'id', 'type', 'title', 'content', 'categoryKey', 
        'tags', 'theme', 'recurrence', 'icon', 'priority', 
        'date', 'header', 'startTime', 'endTime', 'duration', 
        'period', 'rating', 'pintu', 'folder', 'periodCount'
      ];

      expectedFields.forEach(field => {
        expect(CORE_FIELDS).toContain(field);
      });
    });
  });

  describe('createTheme辅助函数', () => {
    test('应正确创建预定义主题', () => {
      const theme = createTheme('生活/日常', 'predefined', {
        icon: '🏠',
        order: 1
      });

      expect(theme.path).toBe('生活/日常');
      expect(theme.name).toBe('日常');
      expect(theme.source).toBe('predefined');
      expect(theme.status).toBe('active');
      expect(theme.icon).toBe('🏠');
      expect(theme.order).toBe(1);
      expect(theme.usageCount).toBe(0);
      expect(theme.id).toMatch(/^theme_/);
    });

    test('应正确创建发现的主题', () => {
      const theme = createTheme('工作/会议', 'discovered');

      expect(theme.path).toBe('工作/会议');
      expect(theme.name).toBe('会议');
      expect(theme.source).toBe('discovered');
      expect(theme.status).toBe('inactive');
      expect(theme.order).toBe(999);
    });

    test('应正确处理单层路径', () => {
      const theme = createTheme('日常', 'predefined');

      expect(theme.path).toBe('日常');
      expect(theme.name).toBe('日常');
    });

    test('应允许覆盖默认值', () => {
      const theme = createTheme('测试主题', 'discovered', {
        name: '自定义名称',
        usageCount: 5,
        lastUsed: 1234567890,
        status: 'active'  // 覆盖discovered的默认inactive
      });

      expect(theme.name).toBe('自定义名称');
      expect(theme.usageCount).toBe(5);
      expect(theme.lastUsed).toBe(1234567890);
      expect(theme.status).toBe('active');
    });
  });

  describe('parseThemeHierarchy函数', () => {
    test('应正确解析单层主题', () => {
      const hierarchy = parseThemeHierarchy('生活');
      expect(hierarchy).toEqual(['生活']);
    });

    test('应正确解析多层主题', () => {
      const hierarchy = parseThemeHierarchy('生活/日常/购物');
      expect(hierarchy).toEqual(['生活', '生活/日常', '生活/日常/购物']);
    });

    test('应过滤空路径段', () => {
      const hierarchy = parseThemeHierarchy('生活//日常/');
      expect(hierarchy).toEqual(['生活', '生活/日常']);
    });

    test('应处理空字符串', () => {
      const hierarchy = parseThemeHierarchy('');
      expect(hierarchy).toEqual([]);
    });
  });

  describe('isValidThemePath函数', () => {
    test('应接受有效的主题路径', () => {
      expect(isValidThemePath('生活')).toBe(true);
      expect(isValidThemePath('生活/日常')).toBe(true);
      expect(isValidThemePath('Work/Meeting/Weekly')).toBe(true);
      expect(isValidThemePath('学习-编程')).toBe(true);
    });

    test('应拒绝无效的主题路径', () => {
      expect(isValidThemePath('')).toBe(false);
      expect(isValidThemePath('   ')).toBe(false);
      expect(isValidThemePath(null as any)).toBe(false);
      expect(isValidThemePath(undefined as any)).toBe(false);
    });

    test('应拒绝包含非法字符的路径', () => {
      expect(isValidThemePath('生活#日常')).toBe(false);
      expect(isValidThemePath('工作@会议')).toBe(false);
      expect(isValidThemePath('学习$编程')).toBe(false);
      expect(isValidThemePath('运动*健身')).toBe(false);
    });

    test('应拒绝路径段为空的情况', () => {
      expect(isValidThemePath('生活//日常')).toBe(false);
      expect(isValidThemePath('/生活/日常')).toBe(false);
      expect(isValidThemePath('生活/日常/')).toBe(false);
    });

    test('应正确处理首尾空格', () => {
      expect(isValidThemePath('  生活/日常  ')).toBe(true);
    });
  });

  describe('sortThemes函数', () => {
    let themes: Theme[];

    beforeEach(() => {
      themes = [
        createTheme('主题1', 'predefined', { 
          status: 'inactive', 
          usageCount: 10, 
          order: 2 
        }),
        createTheme('主题2', 'discovered', { 
          status: 'active', 
          usageCount: 5, 
          order: 1 
        }),
        createTheme('主题3', 'predefined', { 
          status: 'active', 
          usageCount: 10, 
          order: 3 
        }),
        createTheme('主题4', 'discovered', { 
          status: 'active', 
          usageCount: 10, 
          lastUsed: Date.now() - 1000, 
          order: 1 
        }),
        createTheme('主题5', 'predefined', { 
          status: 'active', 
          usageCount: 10, 
          lastUsed: Date.now(), 
          order: 1 
        }),
      ];
    });

    test('应优先显示active状态的主题', () => {
      const sorted = sortThemes(themes);
      expect(sorted[0].status).toBe('active');
      expect(sorted[1].status).toBe('active');
      expect(sorted[2].status).toBe('active');
      expect(sorted[3].status).toBe('active');
      expect(sorted[4].status).toBe('inactive');
    });

    test('相同状态下应按使用次数降序排序', () => {
      const activeThemes = themes.filter(t => t.status === 'active');
      const sorted = sortThemes(activeThemes);
      
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i - 1].usageCount).toBeGreaterThanOrEqual(sorted[i].usageCount);
      }
    });

    test('相同使用次数应按最后使用时间降序排序', () => {
      const sameUsageThemes = themes.filter(t => 
        t.status === 'active' && t.usageCount === 10 && t.lastUsed
      );
      const sorted = sortThemes(sameUsageThemes);
      
      expect(sorted[0].lastUsed).toBeGreaterThan(sorted[1].lastUsed!);
    });

    test('其他条件相同时应按order升序排序', () => {
      const testThemes = [
        createTheme('A', 'predefined', { 
          status: 'active', 
          usageCount: 5, 
          order: 3 
        }),
        createTheme('B', 'predefined', { 
          status: 'active', 
          usageCount: 5, 
          order: 1 
        }),
        createTheme('C', 'predefined', { 
          status: 'active', 
          usageCount: 5, 
          order: 2 
        }),
      ];

      const sorted = sortThemes(testThemes);
      expect(sorted[0].order).toBe(1);
      expect(sorted[1].order).toBe(2);
      expect(sorted[2].order).toBe(3);
    });

    test('最后应按名称字母顺序排序', () => {
      const testThemes = [
        createTheme('主题C', 'predefined', { 
          status: 'active', 
          usageCount: 5, 
          order: 1 
        }),
        createTheme('主题A', 'predefined', { 
          status: 'active', 
          usageCount: 5, 
          order: 1 
        }),
        createTheme('主题B', 'predefined', { 
          status: 'active', 
          usageCount: 5, 
          order: 1 
        }),
      ];

      const sorted = sortThemes(testThemes);
      expect(sorted[0].name).toBe('主题A');
      expect(sorted[1].name).toBe('主题B');
      expect(sorted[2].name).toBe('主题C');
    });
  });
});
