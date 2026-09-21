/** @jsxImportSource preact */
import { h } from 'preact';
import { ItemView } from 'obsidian';
import type { WorkspaceLeaf } from 'obsidian';
import type { PluginHost } from '@core/ports/public';
import { createServices, type Services, mountWithServices, unmountPreact } from '@/app/public';
import { WhiteboardRoot } from '@features/whiteboard/public';

export const THINK_WHITEBOARD_VIEW_TYPE = 'think-os-whiteboard';

export class ThinkWhiteboardView extends ItemView {
  private services: Services;

  constructor(leaf: WorkspaceLeaf, private plugin: PluginHost) {
    super(leaf);
    this.services = createServices();
  }

  getViewType(): string { return THINK_WHITEBOARD_VIEW_TYPE; }
  getDisplayText(): string { return '思考系统白板'; }
  getIcon(): string { return 'panels-top-left'; }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass('think-whiteboard-workspace-view');
    mountWithServices(this.contentEl, <WhiteboardRoot app={this.plugin.app} />, this.services);
  }

  async onClose(): Promise<void> {
    unmountPreact(this.contentEl);
    this.contentEl.empty();
  }
}

export function registerThinkWhiteboardView(plugin: PluginHost): void {
  plugin.registerView(THINK_WHITEBOARD_VIEW_TYPE, (leaf) => new ThinkWhiteboardView(leaf, plugin));
}

export async function openThinkWhiteboardView(plugin: PluginHost): Promise<void> {
  const workspace = plugin.app.workspace;
  const existingLeaf = workspace.getLeavesOfType(THINK_WHITEBOARD_VIEW_TYPE)[0];
  const leaf = existingLeaf || workspace.getLeaf('tab');
  await leaf.setViewState({ type: THINK_WHITEBOARD_VIEW_TYPE, active: true });
  workspace.revealLeaf(leaf);
}
