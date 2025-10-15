/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore } from '@state/AppStore';
import { 
    Box, Typography, TextField, Button, Stack 
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useState, useMemo } from 'preact/hooks';
import { TemplateEditorModal } from '../components/TemplateEditorModal';
import type { BlockTemplate, ThemeDefinition, ThemeOverride } from '@core/domain/schema';
import { ThemeManager } from '@core/services/ThemeManager';
import { dataStore } from '@state/storeRegistry';

// 导入服务
import { ThemeMatrixService } from './services/ThemeMatrixService';
import { ThemeScanService } from './services/ThemeScanService';

// 导入类型
import type { ThemeMatrixProps } from './types';

// 导入工具函数
import { buildThemeTree } from './utils/themeTreeBuilder';

// 导入组件
import { ThemeToolbar } from './components/ThemeToolbar';
import { ContextualToolbar } from './components/ContextualToolbar';
import { ThemeTable } from './components/ThemeTable';
import { ThemeImportButton } from './components/ThemeImportButton';

// 导入新的Hooks
import { useThemeMatrixEditor } from './hooks/useThemeMatrixEditor';
import { useBatchOperations, type BatchOperation } from './hooks/useBatchOperations';

// 主组件
export function ThemeMatrix({ appStore }: ThemeMatrixProps) {
    const { blocks, themes, overrides } = useStore(state => state.settings.inputSettings);
    const [newThemePath, setNewThemePath] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [modalData, setModalData] = useState<{ block: BlockTemplate; theme: ThemeDefinition; override: ThemeOverride | null } | null>(null);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [showArchived, setShowArchived] = useState(false); // 暂时保留，后续会移到过滤菜单
    
    // 新的编辑器状态 Hook
    const {
        editorState,
        toggleEditMode,
        handleSelectionChange,
        clearSelection,
        getSelectionStats,
        handleSelectAll,
        handleSelectBlockColumn,
    } = useThemeMatrixEditor();

    // 初始化服务
    const themeManager = useMemo(() => new ThemeManager(), []);
    
    // 批量操作 Hook
    const { executeBatchOperation, isProcessing } = useBatchOperations({
        appStore,
        themeManager,
        onOperationComplete: clearSelection,
    });
    const themeService = useMemo(() => new ThemeMatrixService({ appStore, themeManager }), [appStore, themeManager]);
    
    // 主题扫描服务
    const themeScanService = useMemo(() => new ThemeScanService({ 
        appStore, 
        dataStore, 
        themeManager 
    }), [appStore, themeManager]);
    
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
    
    // 处理节点展开/折叠
    const handleToggleExpand = (themeId: string) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(themeId)) {
            newExpanded.delete(themeId);
        } else {
            newExpanded.add(themeId);
        }
        setExpandedNodes(newExpanded);
    };
    
    const handleAddTheme = () => {
        const path = newThemePath.trim();
        if (path && !themes.some(t => t.path === path)) {
            appStore.addTheme(path);
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
                // 传递 appStore 用于内联编辑等
                appStore={appStore}
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
                    appStore={appStore}
                />
            )}
        </Box>
    );
}
