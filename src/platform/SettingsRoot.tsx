/** @jsxImportSource preact */

import type { App } from 'obsidian';
import { Box, CssBaseline, Tab, Tabs, ThemeProvider, theme as baseTheme, useLocalStorage } from '@shared/public';
import { LOCAL_STORAGE_KEYS } from '@core/public';

import { LayoutSettings } from '@features/settings/tabs/LayoutSettings';
import { GeneralSettings } from '@features/settings/tabs/GeneralSettings';
import { AiSettings } from '@features/settings/tabs/AiSettings';
import { DataManagementSettings } from '@features/settings/tabs/DataManagementSettings';

function a11yProps(index: number) {
    return { id: `settings-tab-${index}`, 'aria-controls': `settings-tabpanel-${index}` };
}

function TabPanel(props: { children?: any; value: number; index: number; }) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} id={`settings-tabpanel-${index}`} {...other}>
            {value === index && <Box sx={{ p: 2, pt: 3 }}>{children}</Box>}
        </div>
    );
}

const SETTINGS_TABS_NO_QUICK_INPUT_KEY = `${LOCAL_STORAGE_KEYS.SETTINGS_TABS}:data-v2`;
const SETTINGS_TAB_COUNT = 4;

function clampTabIndex(value: unknown): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.min(Math.max(0, Math.floor(numeric)), SETTINGS_TAB_COUNT - 1);
}

export function SettingsRoot({ app, variant = 'workspace' }: { app: App; variant?: 'settings-tab' | 'workspace' }) {
    const [storedTabIndex, setStoredTabIndex] = useLocalStorage(SETTINGS_TABS_NO_QUICK_INPUT_KEY, 0);
    const tabIndex = clampTabIndex(storedTabIndex);

    return (
        <ThemeProvider theme={baseTheme}>
            <CssBaseline />
            <Box sx={{ width: '100%', maxWidth: variant === 'workspace' ? 1320 : 'none', mx: variant === 'workspace' ? 'auto' : 0 }} class={`think-setting-root think-setting-root--${variant}`}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--background-primary)' }}>
                    <Tabs value={tabIndex} onChange={(_, newValue) => setStoredTabIndex(clampTabIndex(newValue))} aria-label="settings tabs" variant="scrollable" scrollButtons="auto">
                        <Tab label="数据管理" {...a11yProps(0)} />
                        <Tab label="布局" {...a11yProps(1)} />
                        <Tab label="通用" {...a11yProps(2)} />
                        <Tab label="AI" {...a11yProps(3)} />
                    </Tabs>
                </Box>
                <TabPanel value={tabIndex} index={0}><DataManagementSettings /></TabPanel>
                <TabPanel value={tabIndex} index={1}><LayoutSettings app={app} /></TabPanel>
                <TabPanel value={tabIndex} index={2}><GeneralSettings /></TabPanel>
                <TabPanel value={tabIndex} index={3}><AiSettings /></TabPanel>
            </Box>
        </ThemeProvider>
    );
}
