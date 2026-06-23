// src/platform/ThinkSettingsView.tsx
/** @jsxImportSource preact */

import { ItemView } from 'obsidian';
import type { WorkspaceLeaf } from 'obsidian';
import type ThinkPlugin from '@main';
import { createServices, type Services, mountWithServices, unmountPreact } from '@/app/public';
import { SettingsRoot } from './SettingsRoot';

export const THINK_SETTINGS_VIEW_TYPE = 'think-os-settings-view';

export class ThinkSettingsView extends ItemView {
    private services: Services;

    constructor(leaf: WorkspaceLeaf, private plugin: ThinkPlugin) {
        super(leaf);
        this.services = createServices();
    }

    getViewType(): string {
        return THINK_SETTINGS_VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'Think OS 控制台';
    }

    getIcon(): string {
        return 'layout-dashboard';
    }

    async onOpen(): Promise<void> {
        this.contentEl.empty();
        this.contentEl.addClass('think-settings-workspace-view');
        mountWithServices(this.contentEl, <SettingsRoot app={this.plugin.app} variant="workspace" />, this.services);
    }

    async onClose(): Promise<void> {
        unmountPreact(this.contentEl);
        this.contentEl.empty();
    }
}

export function registerThinkSettingsWorkspaceView(plugin: ThinkPlugin): void {
    plugin.registerView(
        THINK_SETTINGS_VIEW_TYPE,
        (leaf) => new ThinkSettingsView(leaf, plugin)
    );
}

export async function openThinkSettingsWorkspaceView(plugin: ThinkPlugin): Promise<void> {
    const workspace = plugin.app.workspace;
    const existingLeaf = workspace.getLeavesOfType(THINK_SETTINGS_VIEW_TYPE)[0];
    const leaf = existingLeaf || (workspace as any).getLeaf('tab');
    await leaf.setViewState({ type: THINK_SETTINGS_VIEW_TYPE, active: true });
    workspace.revealLeaf(leaf);
}
