/** @jsxImportSource preact */

import type { App } from 'obsidian';
import { Tab, Tabs, getThinkDeviceProfileAttributes, useLocalStorage } from '@shared/public';
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
        <div
            className="think-settings-panel"
            role="tabpanel"
            hidden={value !== index}
            id={`settings-tabpanel-${index}`}
            {...other}
        >
            {value === index ? children : null}
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
    const deviceProfileAttrs = getThinkDeviceProfileAttributes();
    const [storedTabIndex, setStoredTabIndex] = useLocalStorage(SETTINGS_TABS_NO_QUICK_INPUT_KEY, 0);
    const tabIndex = clampTabIndex(storedTabIndex);

    return (
        <div className={`think-os think-os--settings think-setting-root think-setting-root--${variant}`} {...deviceProfileAttrs}>
                <div className="think-settings-tabs">
                    <Tabs value={tabIndex} onChange={(_: unknown, newValue: number) => setStoredTabIndex(clampTabIndex(newValue))} aria-label="settings tabs" variant="scrollable" scrollButtons="auto">
                        <Tab label="数据管理" {...a11yProps(0)} />
                        <Tab label="布局" {...a11yProps(1)} />
                        <Tab label="通用" {...a11yProps(2)} />
                        <Tab label="AI" {...a11yProps(3)} />
                    </Tabs>
                </div>
                <TabPanel value={tabIndex} index={0}><DataManagementSettings /></TabPanel>
                <TabPanel value={tabIndex} index={1}><LayoutSettings app={app} /></TabPanel>
                <TabPanel value={tabIndex} index={2}><GeneralSettings /></TabPanel>
                <TabPanel value={tabIndex} index={3}><AiSettings /></TabPanel>
        </div>
    );
}
