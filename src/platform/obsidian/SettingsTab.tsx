/** @jsxImportSource preact */

import { createServices, type Services, mountWithServices, unmountPreact } from '@/app/public';
import { PluginSettingTab, App, Notice } from 'obsidian';
import type { PluginHost } from '@core/ports/public';
import { ThinkButton } from '@shared/ui/public';
import { getThinkDeviceProfileAttributes } from '@shared/utils/public';
import { SettingsRoot } from './SettingsRoot';
import { openThinkSettingsWorkspaceView } from './ThinkSettingsView';

function SettingsLauncher({ onOpenWorkspace }: { onOpenWorkspace: () => void }) {
    const deviceProfileAttrs = getThinkDeviceProfileAttributes();
    return (
        <section className="think-os think-os--settings think-setting-root think-setting-root--launcher" {...deviceProfileAttrs}>
                <h2 className="think-settings-launcher__title">Think OS 控制台</h2>
                <ThinkButton variant="primary" size="sm" onClick={onOpenWorkspace}>打开 Think OS 控制台</ThinkButton>
        </section>
    );
}

export class SettingsTab extends PluginSettingTab {
    id: string;
    private services: Services;

    constructor(public app: App, private plugin: PluginHost) {
        super(app, plugin as any);
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
