// src/platform/obsidian/ThinkSettingsView.tsx
/** @jsxImportSource preact */

import { ItemView } from 'obsidian';
import type { WorkspaceLeaf } from 'obsidian';
import type { PluginHost } from '@core/ports/public';
import { createServices, type Services, mountWithServices, unmountPreact } from '@/app/public';
import { SettingsRoot } from './SettingsRoot';
import { getGitHubDevBuildInfo, pullGitHubDevBuild } from './GitHubDevUpdater';
import { recordThinkDiagnostic } from './ThinkDiagnostics';

export const THINK_SETTINGS_VIEW_TYPE = 'think-os-settings-view';

export class ThinkSettingsView extends ItemView {
    private services: Services;

    constructor(leaf: WorkspaceLeaf, private plugin: PluginHost) {
        super(leaf);
        this.services = createServices();
    }

    getViewType(): string {
        return THINK_SETTINGS_VIEW_TYPE;
    }

    getDisplayText(): string {
        return '思考系统控制台';
    }

    getIcon(): string {
        return 'layout-dashboard';
    }

    async onOpen(): Promise<void> {
        const startedAt = performance.now();
        this.contentEl.empty();
        this.contentEl.addClass('think-settings-workspace-view');
        mountWithServices(
            this.contentEl,
            <SettingsRoot
                app={this.plugin.app}
                variant="workspace"
                currentVersion={this.plugin.manifest.version}
                onInspectDevBuild={() => getGitHubDevBuildInfo(this.plugin.manifest.id)}
                onPullDevBuild={(preview) => pullGitHubDevBuild(this.plugin, preview)}
            />,
            this.services,
        );
        recordThinkDiagnostic('settings.open', performance.now() - startedAt, undefined, 'settings');
    }

    async onClose(): Promise<void> {
        recordThinkDiagnostic('settings.close', undefined, undefined, 'settings');
        unmountPreact(this.contentEl);
        this.contentEl.empty();
    }
}

export function registerThinkSettingsWorkspaceView(plugin: PluginHost): void {
    plugin.registerView(
        THINK_SETTINGS_VIEW_TYPE,
        (leaf) => new ThinkSettingsView(leaf, plugin)
    );
}

export async function openThinkSettingsWorkspaceView(plugin: PluginHost): Promise<void> {
    const workspace = plugin.app.workspace;
    const existingLeaf = workspace.getLeavesOfType(THINK_SETTINGS_VIEW_TYPE)[0];
    const leaf = existingLeaf || (workspace as any).getLeaf('tab');
    await leaf.setViewState({ type: THINK_SETTINGS_VIEW_TYPE, active: true });
    workspace.revealLeaf(leaf);
}
