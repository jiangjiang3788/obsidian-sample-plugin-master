import type { PluginHost } from '@core/ports/public';
import type { FeatureRegistry, UIFeatureBootContext } from '@capabilities';
import { openThinkWhiteboardView, registerThinkWhiteboardView } from '@/platform/obsidian/public';

export function registerWhiteboardFeature(
  registry: FeatureRegistry<UIFeatureBootContext>,
  deps: { plugin: PluginHost },
): void {
  registry.register({
    id: 'whiteboard',
    description: 'ThinkOS standalone whiteboard workspace',
    bootMode: 'blocking',
    boot: () => {
      registerThinkWhiteboardView(deps.plugin);
      deps.plugin.addRibbonIcon('panels-top-left', 'ThinkOS 白板', () => { void openThinkWhiteboardView(deps.plugin); });
      deps.plugin.addCommand({
        id: 'think-open-whiteboard',
        name: '打开 ThinkOS 白板',
        callback: () => { void openThinkWhiteboardView(deps.plugin); },
      });
    },
  });
}
