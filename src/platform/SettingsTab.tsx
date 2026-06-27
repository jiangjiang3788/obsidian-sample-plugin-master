/** @jsxImportSource preact */

import { createServices, type Services, mountWithServices, unmountPreact } from '@/app/public';
import { PluginSettingTab, App, Notice } from 'obsidian';
import type ThinkPlugin from '@main';
import { Button } from '@shared/public';
import { SettingsRoot } from './SettingsRoot';
import { openThinkSettingsWorkspaceView } from './ThinkSettingsView';

function SettingsLauncher({ onOpenWorkspace }: { onOpenWorkspace: () => void }) {
    return (
        <section className="think-os think-os--settings think-setting-root think-setting-root--launcher">
                <h2 className="think-settings-launcher__title">Think OS 控制台</h2>
                <p className="think-settings-launcher__description">
                    完整设置已经收敛到 Obsidian 工作区标签页，那里空间更适合管理目标、记录预设、布局和 AI。
                    原生插件设置页只保留这个入口，避免继续塞入大型表单。
                </p>
                <Button variant="contained" onClick={onOpenWorkspace}>打开 Think OS 控制台</Button>
                <small className="think-settings-launcher__hint">
                    也可以通过命令面板执行：打开 Think OS 控制台（标签页）。
                </small>
        </section>
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
