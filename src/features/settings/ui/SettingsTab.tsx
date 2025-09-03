// src/features/settings/ui/SettingsTab.tsx
/** @jsxImportSource preact */
import { render } from 'preact';
import { unmountComponentAtNode } from 'preact/compat';
import { PluginSettingTab, App } from 'obsidian';
import { ThemeProvider, CssBaseline, Box, Tabs, Tab } from '@mui/material';
import type ThinkPlugin from '../../../main';
import { usePersistentState } from '@shared/hooks/usePersistentState';
import { LOCAL_STORAGE_KEYS } from '@core/domain/constants';
import { theme as baseTheme } from '@shared/styles/mui-theme';

import { DataSourceSettings } from './DataSourceSettings';
import { ViewInstanceSettings } from './ViewInstanceSettings';
import { LayoutSettings } from './LayoutSettings';
import { InputSettings } from './InputSettings';
import { AppStore } from '@state/AppStore'; // [新增] 导入 AppStore 类型

function a11yProps(index: number) {
    return { id: `settings-tab-${index}`, 'aria-controls': `settings-tabpanel-${index}` };
}

function TabPanel(props: { children?: any; value: number; index: number; }) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} id={`settings-tabpanel-${index}`} {...other}>
            {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
        </div>
    );
}

// [修改] SettingsRoot 现在接收 app 和 appStore 作为 props
function SettingsRoot({ app, appStore }: { app: App, appStore: AppStore }) {
    const [tabIndex, setTabIndex] = usePersistentState(LOCAL_STORAGE_KEYS.SETTINGS_TABS, 0);

    return (
        <ThemeProvider theme={baseTheme}>
            <CssBaseline />
            <Box sx={{ width: '100%' }} class="think-setting-root">
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tabIndex} onChange={(_, newValue) => setTabIndex(newValue)} aria-label="settings tabs">
                        <Tab label="布局" {...a11yProps(0)} />
                        <Tab label="视图" {...a11yProps(1)} />
                        <Tab label="数据源" {...a11yProps(2)} />
                        <Tab label="快速输入" {...a11yProps(3)} />
                    </Tabs>
                </Box>
                {/* [修改] 将 app 和 appStore prop 传递给每个设置页面 */}
                <TabPanel value={tabIndex} index={0}><LayoutSettings app={app} appStore={appStore} /></TabPanel>
                <TabPanel value={tabIndex} index={1}><ViewInstanceSettings app={app} appStore={appStore} /></TabPanel>
                <TabPanel value={tabIndex} index={2}><DataSourceSettings app={app} appStore={appStore} /></TabPanel>
                <TabPanel value={tabIndex} index={3}><InputSettings appStore={appStore} /></TabPanel>
            </Box>
        </ThemeProvider>
    );
}

export class SettingsTab extends PluginSettingTab {
    id: string;

    constructor(public app: App, private plugin: ThinkPlugin) {
        super(app, plugin);
        this.id = plugin.manifest.id;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        // [修改] 将 this.app 和 this.plugin.appStore 传递给根组件
        render(<SettingsRoot app={this.app} appStore={this.plugin.appStore} />, containerEl);
    }

    hide(): void {
        unmountComponentAtNode(this.containerEl);
    }
}