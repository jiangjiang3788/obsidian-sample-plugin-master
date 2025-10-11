/**
 * ThemeMatrixService 测试
 */
import { ThemeMatrixService } from '@features/settings/ui/ThemeMatrix/services/ThemeMatrixService';
import type { AppStore } from '@state/AppStore';
import type { ThemeManager } from '@core/services/ThemeManager';
import type { ThemeDefinition, ThemeOverride } from '@core/domain/schema';
import type { ExtendedTheme } from '@features/settings/ui/ThemeMatrix/types';

describe('ThemeMatrixService', () => {
    let service: ThemeMatrixService;
    let mockAppStore: jest.Mocked<AppStore>;
    let mockThemeManager: jest.Mocked<ThemeManager>;
    
    beforeEach(() => {
        // 创建 mock AppStore
        mockAppStore = {
            getState: jest.fn().mockReturnValue({
                settings: {
                    inputSettings: {
                        themes: [],
                        overrides: []
                    }
                }
            }),
            addTheme: jest.fn(),
            updateTheme: jest.fn(),
            deleteTheme: jest.fn(),
            upsertOverride: jest.fn(),
            deleteOverride: jest.fn()
        } as any;
        
        // 创建 mock ThemeManager
        mockThemeManager = {
            getThemeByPath: jest.fn(),
            activateTheme: jest.fn(),
            deactivateTheme: jest.fn()
        } as any;
        
        service = new ThemeMatrixService({
            appStore: mockAppStore,
            themeManager: mockThemeManager
        });
    });
    
    describe('getExtendedThemes', () => {
        it('应该返回扩展的主题信息', () => {
            const themes: ThemeDefinition[] = [
                { id: '1', path: 'personal', icon: '📁' },
                { id: '2', path: 'work', icon: '💼' }
            ];
            
            mockThemeManager.getThemeByPath.mockImplementation((path) => {
                if (path === 'personal') {
                    return { status: 'active', usageCount: 5, lastUsed: 1000 };
                }
                return null;
            });
            
            const result = service.getExtendedThemes(themes);
            
            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject({
                id: '1',
                path: 'personal',
                icon: '📁',
                status: 'active',
                source: 'predefined',
                usageCount: 5,
                lastUsed: 1000
            });
            expect(result[1]).toMatchObject({
                id: '2',
                path: 'work',
                icon: '💼',
                status: 'active',
                source: 'predefined',
                usageCount: 0
            });
        });
    });
    
    describe('addTheme', () => {
        beforeEach(() => {
            mockAppStore.getState.mockReturnValue({
                settings: {
                    inputSettings: {
                        themes: [
                            { id: '1', path: 'existing', icon: '📁' }
                        ],
                        overrides: []
                    }
                }
            });
        });
        
        it('应该成功添加有效主题', () => {
            const result = service.addTheme('personal/habits');
            
            expect(result.success).toBe(true);
            expect(mockAppStore.addTheme).toHaveBeenCalledWith('personal/habits');
        });
        
        it('应该规范化路径', () => {
            const result = service.addTheme('  personal//habits/  ');
            
            expect(result.success).toBe(true);
            expect(mockAppStore.addTheme).toHaveBeenCalledWith('personal/habits');
        });
        
        it('应该拒绝无效路径', () => {
            const result = service.addTheme('personal<habits');
            
            expect(result.success).toBe(false);
            expect(result.message).toContain('非法字符');
            expect(mockAppStore.addTheme).not.toHaveBeenCalled();
        });
        
        it('应该拒绝已存在的路径', () => {
            const result = service.addTheme('existing');
            
            expect(result.success).toBe(false);
            expect(result.message).toContain('已存在');
            expect(mockAppStore.addTheme).not.toHaveBeenCalled();
        });
    });
    
    describe('updateTheme', () => {
        beforeEach(() => {
            mockAppStore.getState.mockReturnValue({
                settings: {
                    inputSettings: {
                        themes: [
                            { id: '1', path: 'personal', icon: '📁' },
                            { id: '2', path: 'work', icon: '💼' }
                        ],
                        overrides: []
                    }
                }
            });
        });
        
        it('应该成功更新主题', () => {
            const result = service.updateTheme('1', { icon: '👤' });
            
            expect(result.success).toBe(true);
            expect(mockAppStore.updateTheme).toHaveBeenCalledWith('1', { icon: '👤' });
        });
        
        it('应该验证新路径', () => {
            const result = service.updateTheme('1', { path: 'personal/new' });
            
            expect(result.success).toBe(true);
            expect(mockAppStore.updateTheme).toHaveBeenCalledWith('1', { path: 'personal/new' });
        });
        
        it('应该拒绝无效的新路径', () => {
            const result = service.updateTheme('1', { path: 'personal<invalid' });
            
            expect(result.success).toBe(false);
            expect(result.message).toContain('非法字符');
            expect(mockAppStore.updateTheme).not.toHaveBeenCalled();
        });
        
        it('应该拒绝与其他主题冲突的路径', () => {
            const result = service.updateTheme('1', { path: 'work' });
            
            expect(result.success).toBe(false);
            expect(result.message).toContain('已被使用');
            expect(mockAppStore.updateTheme).not.toHaveBeenCalled();
        });
    });
    
    describe('deleteTheme', () => {
        beforeEach(() => {
            mockAppStore.getState.mockReturnValue({
                settings: {
                    inputSettings: {
                        themes: [
                            { id: '1', path: 'personal', icon: '📁' },
                            { id: '2', path: 'personal/habits', icon: '📁' },
                            { id: '3', path: 'personal/habits/morning', icon: '📁' },
                            { id: '4', path: 'work', icon: '💼' }
                        ],
                        overrides: []
                    }
                }
            });
        });
        
        it('应该删除单个主题', () => {
            const result = service.deleteTheme('4', false);
            
            expect(result.success).toBe(true);
            expect(result.deletedCount).toBe(1);
            expect(mockAppStore.deleteTheme).toHaveBeenCalledTimes(1);
            expect(mockAppStore.deleteTheme).toHaveBeenCalledWith('4');
        });
        
        it('应该删除主题及其子主题', () => {
            const result = service.deleteTheme('1', true);
            
            expect(result.success).toBe(true);
            expect(result.deletedCount).toBe(3); // personal, habits, morning
            expect(mockAppStore.deleteTheme).toHaveBeenCalledTimes(3);
            expect(mockAppStore.deleteTheme).toHaveBeenCalledWith('1');
            expect(mockAppStore.deleteTheme).toHaveBeenCalledWith('2');
            expect(mockAppStore.deleteTheme).toHaveBeenCalledWith('3');
        });
        
        it('应该处理不存在的主题', () => {
            const result = service.deleteTheme('non-existent', false);
            
            expect(result.success).toBe(false);
            expect(result.deletedCount).toBe(0);
            expect(mockAppStore.deleteTheme).not.toHaveBeenCalled();
        });
    });
    
    describe('performBatchOperation', () => {
        const mockThemes: ExtendedTheme[] = [
            {
                id: '1',
                path: 'personal',
                icon: '📁',
                status: 'active',
                source: 'predefined',
                usageCount: 0
            },
            {
                id: '2',
                path: 'work',
                icon: '💼',
                status: 'inactive',
                source: 'discovered',
                usageCount: 0
            }
        ];
        
        beforeEach(() => {
            mockAppStore.getState.mockReturnValue({
                settings: {
                    inputSettings: {
                        themes: mockThemes as ThemeDefinition[],
                        overrides: []
                    }
                }
            });
        });
        
        it('应该批量激活主题', async () => {
            const result = await service.performBatchOperation('activate', ['1', '2']);
            
            expect(result.success).toBe(2);
            expect(result.failed).toBe(0);
            expect(mockThemeManager.activateTheme).toHaveBeenCalledTimes(2);
            expect(mockThemeManager.activateTheme).toHaveBeenCalledWith('personal');
            expect(mockThemeManager.activateTheme).toHaveBeenCalledWith('work');
        });
        
        it('应该批量归档主题', async () => {
            const result = await service.performBatchOperation('archive', ['1', '2']);
            
            expect(result.success).toBe(2);
            expect(result.failed).toBe(0);
            expect(mockThemeManager.deactivateTheme).toHaveBeenCalledTimes(2);
        });
        
        it('应该批量删除主题（跳过预定义主题）', async () => {
            const result = await service.performBatchOperation('delete', ['1', '2']);
            
            expect(result.success).toBe(1); // 只删除 custom 主题
            expect(result.failed).toBe(1); // 预定义主题失败
            expect(result.errors).toContain('无法删除预定义主题 personal');
            expect(mockAppStore.deleteTheme).toHaveBeenCalledTimes(1);
            expect(mockAppStore.deleteTheme).toHaveBeenCalledWith('2');
        });
        
        it('应该处理不存在的主题', async () => {
            const result = await service.performBatchOperation('activate', ['non-existent']);
            
            expect(result.success).toBe(0);
            expect(result.failed).toBe(1);
            expect(result.errors).toContain('主题 non-existent 不存在');
        });
    });
    
    describe('updateThemeOverride', () => {
        it('应该添加新的覆盖', async () => {
            const override: Partial<ThemeOverride> = {
                status: 'enabled',
                outputTemplate: 'template'
            };
            
            await service.updateThemeOverride('theme1', 'block1', override);
            
            expect(mockAppStore.upsertOverride).toHaveBeenCalledWith({
                themeId: 'theme1',
                blockId: 'block1',
                status: 'enabled',
                outputTemplate: 'template',
                targetFile: '',
                appendUnderHeader: ''
            });
        });
        
        it('应该删除覆盖当传入 null', async () => {
            await service.updateThemeOverride('theme1', 'block1', null);
            
            expect(mockAppStore.deleteOverride).toHaveBeenCalledWith('block1', 'theme1');
            expect(mockAppStore.upsertOverride).not.toHaveBeenCalled();
        });
    });
    
    describe('validatePath', () => {
        it('应该验证有效路径', () => {
            const result = service.validatePath('personal/habits');
            expect(result.valid).toBe(true);
        });
        
        it('应该拒绝无效路径', () => {
            const result = service.validatePath('personal<habits');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('非法字符');
        });
    });
    
    describe('getThemeStatistics', () => {
        it('应该返回正确的统计信息', () => {
            const themes: ExtendedTheme[] = [
                {
                    id: '1',
                    path: 'personal',
                    icon: '📁',
                    status: 'active',
                    source: 'predefined',
                    usageCount: 10,
                    lastUsed: 2000
                },
                {
                    id: '2',
                    path: 'work',
                    icon: '💼',
                    status: 'inactive',
                    source: 'predefined',
                    usageCount: 5,
                    lastUsed: 1000
                },
                {
                    id: '3',
                    path: 'archive',
                    icon: '📦',
                    status: 'inactive',
                    source: 'predefined',
                    usageCount: 0
                }
            ];
            
            mockAppStore.getState.mockReturnValue({
                settings: {
                    inputSettings: {
                        themes: [],
                        overrides: [
                            { id: 'o1', themeId: '1', blockId: 'b1', status: 'enabled' },
                            { id: 'o2', themeId: '1', blockId: 'b2', status: 'enabled' }
                        ] as ThemeOverride[]
                    }
                }
            });
            
            const stats = service.getThemeStatistics(themes);
            
            expect(stats.total).toBe(3);
            expect(stats.active).toBe(1);
            expect(stats.archived).toBe(2);
            expect(stats.withOverrides).toBe(1);
            expect(stats.mostUsed?.id).toBe('1');
        });
    });
    
    describe('exportThemeConfigurations', () => {
        beforeEach(() => {
            mockAppStore.getState.mockReturnValue({
                settings: {
                    inputSettings: {
                        themes: [
                            { id: '1', path: 'personal', icon: '📁' },
                            { id: '2', path: 'work', icon: '💼' },
                            { id: '3', path: 'archive', icon: '📦' }
                        ],
                        overrides: [
                            { id: 'o1', themeId: '1', blockId: 'b1', status: 'enabled' },
                            { id: 'o2', themeId: '2', blockId: 'b1', status: 'enabled' },
                            { id: 'o3', themeId: '3', blockId: 'b1', status: 'enabled' }
                        ] as ThemeOverride[]
                    }
                }
            });
        });
        
        it('应该导出指定的主题和覆盖', () => {
            const result = service.exportThemeConfigurations(['1', '2']);
            
            expect(result.themes).toHaveLength(2);
            expect(result.themes[0].id).toBe('1');
            expect(result.themes[1].id).toBe('2');
            
            expect(result.overrides).toHaveLength(2);
            expect(result.overrides[0].themeId).toBe('1');
            expect(result.overrides[1].themeId).toBe('2');
        });
        
        it('应该处理空列表', () => {
            const result = service.exportThemeConfigurations([]);
            
            expect(result.themes).toHaveLength(0);
            expect(result.overrides).toHaveLength(0);
        });
    });
    
    describe('importThemeConfigurations', () => {
        beforeEach(() => {
            mockAppStore.getState.mockReturnValue({
                settings: {
                    inputSettings: {
                        themes: [
                            { id: '1', path: 'existing', icon: '📁' }
                        ],
                        overrides: []
                    }
                }
            });
        });
        
        it('应该导入新主题', () => {
            const data = {
                themes: [
                    { id: 'new1', path: 'personal', icon: '👤' },
                    { id: 'new2', path: 'work', icon: '💼' }
                ] as ThemeDefinition[],
                overrides: []
            };
            
            const result = service.importThemeConfigurations(data);
            
            expect(result.imported).toBe(2);
            expect(result.skipped).toBe(0);
            expect(mockAppStore.addTheme).toHaveBeenCalledTimes(2);
            expect(mockAppStore.addTheme).toHaveBeenCalledWith('personal');
            expect(mockAppStore.addTheme).toHaveBeenCalledWith('work');
        });
        
        it('应该跳过已存在的主题', () => {
            const data = {
                themes: [
                    { id: 'new1', path: 'existing', icon: '📁' },
                    { id: 'new2', path: 'personal', icon: '👤' }
                ] as ThemeDefinition[],
                overrides: []
            };
            
            const result = service.importThemeConfigurations(data);
            
            expect(result.imported).toBe(1);
            expect(result.skipped).toBe(1);
            expect(mockAppStore.addTheme).toHaveBeenCalledTimes(1);
            expect(mockAppStore.addTheme).toHaveBeenCalledWith('personal');
        });
        
        it('应该处理导入错误', () => {
            mockAppStore.addTheme.mockImplementation(() => {
                throw new Error('添加失败');
            });
            
            const data = {
                themes: [
                    { id: 'new1', path: 'personal', icon: '👤' }
                ] as ThemeDefinition[],
                overrides: []
            };
            
            const result = service.importThemeConfigurations(data);
            
            expect(result.imported).toBe(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toContain('导入主题 personal 失败');
        });
    });
});
