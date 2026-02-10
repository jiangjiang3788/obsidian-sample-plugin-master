/** @jsxImportSource preact */
/**
 * ThemeMatrixView - 纯视图组件（不直接订阅 store）
 * Round3: 容器/视图分离；容器负责 selectors/useCases/dataStore 注入。
 */
import { h } from 'preact';
import { Box, Typography, TextField, Button, Stack } from '@shared/public';
import AddIcon from '@mui/icons-material/Add';
import { useState, useMemo } from 'preact/hooks';
import { TemplateEditorModal } from '@features/settings/TemplateEditorModal';
import type { BlockTemplate, ThemeDefinition, ThemeOverride } from '@core/public';
import { ThemeMatrixService, ThemeScanService, buildThemeMatrixTree as buildThemeTree } from '@core/public';
import type { ThemeMatrixTreeNode as ThemeTreeNode } from '@core/public';

import { ThemeToolbar } from './ThemeToolbar';
import { ContextualToolbar } from './ContextualToolbar';
import { ThemeTable } from './ThemeTable';
import { ThemeImportButton } from './ThemeImportButton';
import { useThemeMatrixEditor } from './useThemeMatrixEditor';
import { useBatchOperations, type BatchOperation } from './useBatchOperations';

export interface ThemeMatrixViewProps {
    blocks: any[];
    themes: any[];
    overrides: any[];
    settings: any;
    useCases: any;
    dataStore: any;
}

export function ThemeMatrixView({ blocks, themes, overrides, settings, useCases, dataStore }: ThemeMatrixViewProps) {
    
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
    
    // 【P0-5】ThemeMatrixService - 只用于读/计算，已移除 writeOps
    const themeService = useMemo(() => new ThemeMatrixService({
        getSettings: () => settings,
    }), [settings]);
    
    // 【P0-5】ThemeScanService - 只用于扫描/预览，已移除 writeOps
    const themeScanService = useMemo(() => new ThemeScanService({ 
        getSettings: () => settings,
        dataStore, 
    }), [settings, dataStore]);
    
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

    // 主题扫描处理函数（纯读操作，由 service 提供）
    const handleThemeScan = async (config: any) => {
        return await themeScanService.scanThemesFromData(config);
    };

    // 【P0-5】主题导入处理函数 - 通过 useCases.theme 执行写入
    const handleThemeImport = async (themePaths: string[]) => {
        // 使用 service 过滤可导入的主题
        const importableThemes = themeScanService.getImportableThemes(themePaths);
        
        let imported = 0;
        let skipped = themePaths.length - importableThemes.length;
        const errors: string[] = [];
        
        // 通过 useCases.theme.addTheme 执行写入
        for (const path of importableThemes) {
            try {
                await useCases.theme.addTheme(path);
                imported++;
            } catch (error) {
                errors.push(`导入主题 "${path}" 失败: ${error}`);
            }
        }
        
        return { imported, skipped, failed: errors.length, errors };
    };

    return (
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