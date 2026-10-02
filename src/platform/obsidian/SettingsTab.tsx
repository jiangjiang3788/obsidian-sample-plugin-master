/** @jsxImportSource preact */

import { createServices, type Services, mountWithServices, unmountPreact } from '@/app/public';
import { PluginSettingTab, App, Notice } from 'obsidian';
import type { PluginHost } from '@core/ports/public';
import { ThinkButton } from '@shared/ui/public';
import { DevBuildUpdateControl } from '@features/settings/components/DevBuildUpdateControl';
import { getThinkDeviceProfileAttributes } from '@shared/utils/public';
import { SettingsRoot } from './SettingsRoot';
import { openThinkSettingsWorkspaceView } from './ThinkSettingsView';
import { pullGitHubDevBuild } from './GitHubDevUpdater';

function SettingsLauncher({
    onOpenWorkspace,
    onPullDevBuild,
    currentVersion,
}: {
    onOpenWorkspace: () => void;
    onPullDevBuild: () => Promise<{ remoteVersion: string; branch: string }>;
    currentVersion?: string;
}) {
    const deviceProfileAttrs = getThinkDeviceProfileAttributes();
    return (
        <section className="think-os think-os--settings think-setting-root think-setting-root--launcher" {...deviceProfileAttrs}>
                <h2 className="think-settings-launcher__title">思考系统控制台</h2>
                <ThinkButton variant="primary" size="sm" onClick={onOpenWorkspace}>打开 思考系统控制台</ThinkButton>
                <DevBuildUpdateControl currentVersion={currentVersion} onPullDevBuild={onPullDevBuild} />
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
                currentVersion={this.plugin.manifest.version}
                onPullDevBuild={() => pullGitHubDevBuild(this.plugin)}
                onOpenWorkspace={() => {
                    void openThinkSettingsWorkspaceView(this.plugin).catch((error) => {
                        new Notice(`打开 思考系统控制台失败：${error instanceof Error ? error.message : String(error)}`);
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
