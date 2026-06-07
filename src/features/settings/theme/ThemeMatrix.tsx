/** @jsxImportSource preact */
/**
 * ThemeMatrix - Container
 * Round3: 负责订阅 store（selectors）与依赖注入；View 负责渲染与 UI 临时态。
 */
import { h } from 'preact';
import { Alert, Box } from '@shared/public';
import {
    useSelector,
    selectInputBlocks,
    selectInputThemes,
    selectInputOverrides,
    selectSettings,
    useUseCases,
    useDataStore,
} from '@/app/public';
import { ThemeMatrixView } from './ThemeMatrixView';

export function ThemeMatrix() {
    const blocks = useSelector(selectInputBlocks);
    const themes = useSelector(selectInputThemes);
    const overrides = useSelector(selectInputOverrides);
    const settings = useSelector(selectSettings, (a, b) => a.inputSettings === b.inputSettings);

    const useCases = useUseCases();
    const dataStore = useDataStore();

    return (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
            <Alert severity="warning">
                ThemeMatrix 已降级为 legacy 兼容入口。新记录预设请到“数据管理 → 目标中心 → 记录预设”配置；主题现在只管理图标、颜色和领域路径。
            </Alert>
            <ThemeMatrixView
                blocks={blocks}
                themes={themes}
                overrides={overrides}
                settings={settings}
                useCases={useCases}
                dataStore={dataStore}
            />
        </Box>
    );
}
