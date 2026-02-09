// src/features/settings/ui/SettingsTab.tsx
/** @jsxImportSource preact */
import { createServices, type Services, mountWithServices, unmountPreact } from '@/app/public';
import { PluginSettingTab, App } from 'obsidian';
import { ThemeProvider, CssBaseline, Box, Tabs, Tab } from '@mui/material';
import type ThinkPlugin from '@main';
import { useLocalStorage } from '@shared/public';
import { LOCAL_STORAGE_KEYS } from '@core/public';
import { theme as baseTheme } from '@shared/public';

import { LayoutSettings } from './LayoutSettings';
import { InputSettings } from './InputSettings';
import { GeneralSettings } from './GeneralSettings';
import { AiSettings } from './AiSettings';

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

function SettingsRoot({ app }: { app: App }) {
    const [tabIndex, setTabIndex] = useLocalStorage(LOCAL_STORAGE_KEYS.SETTINGS_TABS, 0);

    return (
        <ThemeProvider theme={baseTheme}>
            <CssBaseline />
            <Box sx={{ width: '100%' }} class="think-setting-root">
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tabIndex} onChange={(_, newValue) => setTabIndex(newValue)} aria-label="settings tabs">
                        <Tab label="快速输入" {...a11yProps(0)} />
                        <Tab label="布局" {...a11yProps(1)} />
                        <Tab label="通用" {...a11yProps(2)} />
                        <Tab label="AI" {...a11yProps(3)} />
                    </Tabs>
                </Box>
                <TabPanel value={tabIndex} index={0}><InputSettings /></TabPanel>
                <TabPanel value={tabIndex} index={1}><LayoutSettings app={app} /></TabPanel>
                <TabPanel value={tabIndex} index={2}><GeneralSettings /></TabPanel>
                <TabPanel value={tabIndex} index={3}><AiSettings /></TabPanel>
            </Box>
        </ThemeProvider>
    );
}

export class SettingsTab extends PluginSettingTab {
    id: string;
    private services: Services;

    constructor(public app: App, private plugin: ThinkPlugin) {
        super(app, plugin);
        this.id = plugin.manifest.id;
        // Phase 4.3: 禁止在 features 层 import tsyringe container
        // - Services 只能通过 app/public 的 createServices() 获取
        this.services = createServices();
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        mountWithServices(containerEl, <SettingsRoot app={this.app} />, this.services);
    }

    hide(): void {
        unmountPreact(this.containerEl);
    }
}
