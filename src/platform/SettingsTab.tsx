/** @jsxImportSource preact */

import { createServices, type Services, mountWithServices, unmountPreact } from '@/app/public';
import { PluginSettingTab, App, Notice } from 'obsidian';
import type ThinkPlugin from '@main';
import { Box, Button, CssBaseline, ThemeProvider, Typography, theme as baseTheme } from '@shared/public';
import { SettingsRoot } from './SettingsRoot';
import { openThinkSettingsWorkspaceView } from './ThinkSettingsView';

function SettingsLauncher({ onOpenWorkspace }: { onOpenWorkspace: () => void }) {
    return (
        <ThemeProvider theme={baseTheme}>
            <CssBaseline />
            <Box class="think-setting-root think-setting-root--launcher" sx={{ p: 2, maxWidth: 760 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Think OS 控制台</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.7 }}>
                    完整设置已经收敛到 Obsidian 工作区标签页，那里空间更适合管理目标、记录预设、布局和 AI。
                    原生插件设置页只保留这个入口，避免继续塞入大型表单。
                </Typography>
                <Button variant="contained" onClick={onOpenWorkspace}>打开 Think OS 控制台</Button>
                <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'text.secondary' }}>
                    也可以通过命令面板执行：打开 Think OS 控制台（标签页）。
                </Typography>
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
        this.services = createServices();
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        mountWithServices(
            containerEl,
            <SettingsLauncher
                onOpenWorkspace={() => {
                    void openThinkSettingsWorkspaceView(this.plugin).catch((error) => {
                        new Notice(`打开 Think OS 控制台失败：${error instanceof Error ? error.message : String(error)}`);
                    });
                }}
            />,
            this.services,
        );
    }

    hide(): void {
        unmountPreact(this.containerEl);
    }
}

export { SettingsRoot };
