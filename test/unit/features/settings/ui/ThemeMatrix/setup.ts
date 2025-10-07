/**
 * ThemeMatrix 测试设置和工具
 */
import type { AppStore } from '@state/AppStore';
import type { ThemeManager } from '@core/services/ThemeManager';
import type { ThinkSettings } from '@core/domain/schema';
import { DEFAULT_SETTINGS } from '@core/domain/schema';

/**
 * 创建模拟的 AppStore
 */
export function createMockAppStore(): AppStore {
    const mockSettings: ThinkSettings = {
        ...DEFAULT_SETTINGS,
        inputSettings: {
            ...DEFAULT_SETTINGS.inputSettings,
            themes: [],
            blocks: [],
            overrides: []
        }
    };

    return {
        getState: jest.fn(() => ({
            settings: mockSettings,
            timers: [],
            isTimerWidgetVisible: false
        })),
        getSettings: jest.fn(() => mockSettings),
        addTheme: jest.fn(),
        updateTheme: jest.fn(),
        deleteTheme: jest.fn(),
        upsertOverride: jest.fn(),
        deleteOverride: jest.fn(),
        subscribe: jest.fn(() => () => {}),
        _updateSettingsAndPersist: jest.fn()
    } as any as AppStore;
}

/**
 * 创建模拟的 ThemeManager
 */
export function createMockThemeManager(): ThemeManager {
    return {
        getThemeByPath: jest.fn((path: string) => ({
            path,
            status: 'active' as const,
            usageCount: 0,
            lastUsed: Date.now()
        })),
        activateTheme: jest.fn(),
        deactivateTheme: jest.fn(),
        getAllThemes: jest.fn(() => []),
        getActiveThemes: jest.fn(() => []),
        getArchivedThemes: jest.fn(() => [])
    } as any as ThemeManager;
}

/**
 * 创建测试主题数据
 */
export function createTestThemes() {
    return [
        { id: 'thm_1', path: 'personal', icon: '👤' },
        { id: 'thm_2', path: 'personal/habits', icon: '🔄' },
        { id: 'thm_3', path: 'personal/habits/morning', icon: '🌅' },
        { id: 'thm_4', path: 'work', icon: '💼' },
        { id: 'thm_5', path: 'work/projects', icon: '📁' }
    ];
}

/**
 * 创建测试 Block 数据
 */
export function createTestBlocks() {
    return [
        {
            id: 'blk_1',
            name: '日记',
            fields: [],
            outputTemplate: '',
            targetFile: '',
            appendUnderHeader: ''
        },
        {
            id: 'blk_2',
            name: '任务',
            fields: [],
            outputTemplate: '',
            targetFile: '',
            appendUnderHeader: ''
        }
    ];
}

/**
 * 创建测试覆盖配置数据
 */
export function createTestOverrides() {
    return [
        {
            id: 'ovr_1',
            themeId: 'thm_1',
            blockId: 'blk_1',
            status: 'enabled' as const,
            outputTemplate: '自定义模板',
            targetFile: '',
            appendUnderHeader: ''
        },
        {
            id: 'ovr_2',
            themeId: 'thm_2',
            blockId: 'blk_2',
            status: 'disabled' as const,
            outputTemplate: '',
            targetFile: '',
            appendUnderHeader: ''
        }
    ];
}

/**
 * 等待异步更新
 */
export async function waitForUpdates() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * 创建带有测试数据的 AppStore
 */
export function createPopulatedMockAppStore() {
    const store = createMockAppStore();
    const state = store.getState();
    
    state.settings.inputSettings.themes = createTestThemes();
    state.settings.inputSettings.blocks = createTestBlocks();
    state.settings.inputSettings.overrides = createTestOverrides();
    
    return store;
}
