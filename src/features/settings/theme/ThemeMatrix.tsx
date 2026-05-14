/** @jsxImportSource preact */
/**
 * ThemeMatrix - Container
 * Round3: 负责订阅 store（selectors）与依赖注入；View 负责渲染与 UI 临时态。
 */
import { h } from 'preact';
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
        <ThemeMatrixView
            blocks={blocks}
            themes={themes}
            overrides={overrides}
            settings={settings}
            useCases={useCases}
            dataStore={dataStore}
        />
    );
}
