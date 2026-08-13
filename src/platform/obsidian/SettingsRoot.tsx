/** @jsxImportSource preact */

import type { App } from 'obsidian';
import { getThinkDeviceProfileAttributes } from '@shared/utils/public';
import { useLocalStorage } from '@shared/hooks/public';
import { LOCAL_STORAGE_KEYS } from '@core/types/public';

import { SettingsNavigation } from '@features/settings/components/SettingsNavigation';
import { LayoutSettings } from '@features/settings/tabs/LayoutSettings';
import { GeneralSettings } from '@features/settings/tabs/GeneralSettings';
import { AiSettings } from '@features/settings/tabs/AiSettings';
import { DataManagementSettings } from '@features/settings/tabs/DataManagementSettings';

function TabPanel(props: { children?: any; value: number; index: number; }) {
    const { children, value, index } = props;
    return (
        <section
            className="think-settings-panel"
            role="tabpanel"
            hidden={value !== index}
            id={`settings-tabpanel-${index}`}
            aria-label={['数据管理', '布局', '通用', 'AI'][index]}
        >
            {value === index ? children : null}
        </section>
    );
}

const SETTINGS_TABS_NO_QUICK_INPUT_KEY = `${LOCAL_STORAGE_KEYS.SETTINGS_TABS}:data-v2`;
const SETTINGS_TAB_COUNT = 4;
const PRIMARY_TABS = [
    { value: '0', label: '数据管理' },
    { value: '1', label: '布局' },
    { value: '2', label: '通用' },
    { value: '3', label: 'AI' },
] as const;

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
            <div className="think-settings-workspace">
                <aside className="think-settings-workspace__rail">
                    <SettingsNavigation
                        label="Think OS 设置"
                        variant="primary"
                        value={String(tabIndex)}
                        options={PRIMARY_TABS}
                        onChange={(value) => setStoredTabIndex(clampTabIndex(value))}
                        className="think-settings-primary-nav"
                    />
                </aside>
                <main className="think-settings-workspace__content">
                    <TabPanel value={tabIndex} index={0}><DataManagementSettings /></TabPanel>
                    <TabPanel value={tabIndex} index={1}><LayoutSettings app={app} /></TabPanel>
                    <TabPanel value={tabIndex} index={2}><GeneralSettings /></TabPanel>
                    <TabPanel value={tabIndex} index={3}><AiSettings /></TabPanel>
                </main>
            </div>
        </div>
    );
}
