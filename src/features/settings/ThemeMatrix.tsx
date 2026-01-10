/** @jsxImportSource preact */
/**
 * ThemeMatrix - 主题配置矩阵组件
 * 
 * 【S6 架构约束】
 * - 读：使用 useZustandAppStore selector 读取 theme 相关 settings
 * - 写：通过 useCases.theme.* 进行状态管理
 * - 遵循单向数据流：UI → UseCase → Zustand Store → UI
 * 
 * ⚠️ 禁止事项：
 * - 不得直接 import AppStore / useStore
 * - 不得直接调用 slice actions
 * - 不得直接调用 SettingsRepository
 * - UI 临时态（选中态/展开态）不得写入 settings
 */
import { h } from 'preact';
import { useZustandAppStore, useUseCases, useDataStore } from '@/app/AppStoreContext';
import { 
    Box, Typography, TextField, Button, Stack 
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useState, useMemo } from 'preact/hooks';
import { TemplateEditorModal } from '@features/settings/TemplateEditorModal';
import type { BlockTemplate, ThemeDefinition, ThemeOverride } from '@/core/types/schema';

// 导入服务
import { ThemeMatrixService } from '@/core/theme-matrix/ThemeMatrixService';
import { ThemeScanService } from '@/core/theme-matrix/ThemeScanService';

// 导入类型
import type { ThemeTreeNode } from '@/core/theme-matrix/theme.types';

// 导入工具函数
import { buildThemeTree } from '@/core/theme-matrix/themeTreeBuilder';

// 导入组件
import { ThemeToolbar } from './ThemeToolbar';
import { ContextualToolbar } from './ContextualToolbar';
import { ThemeTable } from './ThemeTable';
import { ThemeImportButton } from './ThemeImportButton';

// 导入新的Hooks
import { useThemeMatrixEditor } from './useThemeMatrixEditor';
import { useBatchOperations, type BatchOperation } from './useBatchOperations';

/**
 * ThemeMatrix 主组件
 * 
 * 【S6 数据流】
 * - 读取：useZustandAppStore(state => state.settings.inputSettings.*)
 * - 写入：useCases.theme.*
 * - UI 临时态：组件内部 useState 管理
 */
export function ThemeMatrix() {
    // 【S6】通过 Zustand selector 读取 theme 相关 settings
    const blocks = useZustandAppStore(state => state.settings.inputSettings?.blocks || []);
    const themes = useZustandAppStore(state => state.settings.inputSettings?.themes || []);
    const overrides = useZustandAppStore(state => state.settings.inputSettings?.overrides || []);
    const settings = useZustandAppStore(state => state.settings);
    
    // 【S6】获取 useCases 用于写操作
    const useCases = useUseCases();
    const dataStore = useDataStore();
    
    // 【UI 临时态】这些状态不写入 settings
    const [newThemePath, setNewThemePath] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [modalData, setModalData] = useState<{ block: BlockTemplate; theme: ThemeDefinition; override: ThemeOverride | null } | null>(null);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [showArchived, setShowArchived] = useState(false);
    
    // 新的编辑器状态 Hook（UI 临时态）
    const {
        editorState,
        toggleEditMode,
        handleSelectionChange,
        clearSelection,
        getSelectionStats,
        handleSelectAll,
        handleSelectBlockColumn,
    } = useThemeMatrixEditor();

    // 批量操作 Hook - 通过 useUseCases 获取
    const { executeBatchOperation, isProcessing } = useBatchOperations({
        onOperationComplete: clearSelection,
    });
    
    // 【S6】ThemeMatrixService - 使用 useCases 作为写入口
    const themeService = useMemo(() => new ThemeMatrixService({
        getSettings: () => settings,
        writeOps: {
            addTheme: (path: string) => { useCases.theme.addTheme(path); },
            updateTheme: (themeId: string, updates: any) => { useCases.theme.updateTheme(themeId, updates); },
            deleteTheme: (themeId: string) => { useCases.theme.deleteTheme(themeId); },
            deleteOverride: async (blockId: string, themeId: string) => { await useCases.theme.deleteOverride(blockId, themeId); },
            upsertOverride: async (override: any) => { await useCases.theme.upsertOverride(override); },
            batchUpdateThemeStatus: async (themeIds: string[], status: 'active' | 'inactive') => { await useCases.theme.batchUpdateThemeStatus(themeIds, status); },
        },
    }), [settings, useCases]);
    
    // 【S6】ThemeScanService - 使用 useCases 作为写入口
    const themeScanService = useMemo(() => new ThemeScanService({ 
        getSettings: () => settings,
        writeOps: {
            addTheme: (path: string) => { useCases.theme.addTheme(path); },
            batchUpdateThemeStatus: async (themeIds: string[], status: 'active' | 'inactive') => { await useCases.theme.batchUpdateThemeStatus(themeIds, status); },
        },
        dataStore, 
    }), [settings, useCases, dataStore]);
    
    // 获取扩展的主题信息
    const extendedThemes = useMemo(() => {
        return themeService.getExtendedThemes(themes);
    }, [themes, themeService]);
    
    // 提取所有主题ID，用于全选操作
    const allThemeIds = useMemo(() => extendedThemes.map(t => t.id), [extendedThemes]);
    
    // 构建主题树
    const themeTree = useMemo(() => {
        return buildThemeTree(extendedThemes, expandedNodes);
    }, [extendedThemes, expandedNodes]);
    
    // 分组主题（激活和归档）
    const { activeThemes, archivedThemes } = useMemo(() => {
        return themeService.groupThemesByStatus(themeTree);
    }, [themeTree, themeService]);
    
    const overridesMap = useMemo(() => {
        const map = new Map<string, ThemeOverride>();
        overrides.forEach(o => map.set(`${o.themeId}:${o.blockId}`, o));
        return map;
    }, [overrides]);
    
    // 处理节点展开/折叠（UI 临时态）
    const handleToggleExpand = (themeId: string) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(themeId)) {
            newExpanded.delete(themeId);
        } else {
            newExpanded.add(themeId);
        }
        setExpandedNodes(newExpanded);
    };
    
    // 【S6】添加主题 - 通过 useCases.theme
    const handleAddTheme = () => {
        const path = newThemePath.trim();
        if (path && !themes.some(t => t.path === path)) {
            useCases.theme.addTheme(path);
            setNewThemePath('');
        }
    };
    
    const handleCellClick = (block: BlockTemplate, theme: ThemeDefinition) => {
        // 在编辑模式下，点击单元格是用于选择，而不是打开模态框
        if (editorState.mode === 'edit') {
            const cellId = `${theme.id}:${block.id}`;
            const isSelected = editorState.selectedCells.has(cellId);
            handleSelectionChange('block', cellId, !isSelected);
            return;
        }
        // 只有在预览模式下才打开编辑器
        const override = overridesMap.get(`${theme.id}:${block.id}`) || null;
        setModalData({ block, theme, override });
        setModalOpen(true);
    };

    const handleBatchAction = (operation: BatchOperation) => {
        const { selectionType, selectedThemes, selectedCells } = editorState;

        if (selectionType === 'theme') {
            executeBatchOperation({
                operation,
                themeIds: Array.from(selectedThemes),
            });
        } else if (selectionType === 'block') {
            executeBatchOperation({
                operation,
                cellIds: Array.from(selectedCells),
            });
        }
    };

    // 主题扫描处理函数
    const handleThemeScan = async (config: any) => {
        return await themeScanService.scanThemesFromData(config);
    };

    // 主题导入处理函数
    const handleThemeImport = async (themes: string[]) => {
        return await themeScanService.importThemes(themes);
    };

    return (
        // @ts-ignore - MUI与Preact类型兼容性问题
        <Box sx={{ maxWidth: '1200px', mx: 'auto', padding: 2 }}>
            <Typography variant="h4" gutterBottom>
                主题配置矩阵
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                管理不同主题对各类Block的配置。进入编辑模式以进行批量操作。
            </Typography>
            
            {/* 工具栏 */}
            <ThemeToolbar
                mode={editorState.mode}
                onToggleEditMode={toggleEditMode}
            />
            
            {/* @ts-ignore - MUI与Preact类型兼容性问题 */}
            <ContextualToolbar
                editorState={editorState}
                onAction={handleBatchAction}
                onClearSelection={clearSelection}
            />

            {/* 主题表格 */}
            <ThemeTable
                blocks={blocks}
                activeThemes={activeThemes}
                archivedThemes={archivedThemes}
                showArchived={showArchived}
                overridesMap={overridesMap}
                editorState={editorState}
                onCellClick={handleCellClick}
                onToggleExpand={handleToggleExpand}
                onSelectionChange={handleSelectionChange}
                onSelectAllThemes={(isSelected: boolean) => handleSelectAll(allThemeIds, isSelected)}
                onSelectBlockColumn={(blockId: string, isSelected: boolean) => handleSelectBlockColumn(blockId, allThemeIds, isSelected)}
                useCases={useCases}
            />
            
            {/* 添加新主题 */}
            {/* @ts-ignore - MUI与Preact类型兼容性问题 */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
                <TextField 
                    placeholder="新主题路径 (如: 个人/习惯)" 
                    value={newThemePath} 
                    onChange={e => setNewThemePath((e.target as HTMLInputElement).value)} 
                    onKeyDown={e => e.key === 'Enter' && handleAddTheme()} 
                    size="small" 
                    variant="outlined" 
                    sx={{ flexGrow: 1, maxWidth: '400px' }} 
                />
                {/* @ts-ignore - MUI与Preact类型兼容性问题 */}
                <Button onClick={handleAddTheme} variant="outlined" size="small" startIcon={<AddIcon />}>
                    添加主题
                </Button>
                
                <ThemeImportButton 
                    onScan={handleThemeScan}
                    onImport={handleThemeImport}
                />
            </Stack>
            
            {/* 模板编辑器模态框 */}
            {modalData && (
                <TemplateEditorModal 
                    isOpen={modalOpen} 
                    onClose={() => setModalOpen(false)} 
                    block={modalData.block} 
                    theme={modalData.theme} 
                    existingOverride={modalData.override} 
                    useCases={useCases}
                />
            )}
        </Box>
    );
}
