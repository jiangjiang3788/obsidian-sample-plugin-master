/**
 * Minimal structural contract for the Obsidian plugin host used by app/features.
 *
 * R8 rule: internal modules depend on host capabilities, never on main.ts / ThinkPlugin.
 * The real ThinkPlugin extends Obsidian Plugin and satisfies this contract at runtime.
 *
 * The three optional service getters are a legacy bridge used only by FloatingTimerWidget;
 * they stay deliberately outside the command/lifecycle contract and can disappear once the
 * widget is fully constructor-injected.
 */
export interface PluginHost {
  app: any;
  manifest: { id: string };
  addCommand(command: unknown): unknown;
  register(callback: unknown): unknown;
  addSettingTab(tab: unknown): unknown;
  registerView(type: string, creator: (leaf: any) => unknown): unknown;
  registerMarkdownCodeBlockProcessor(language: string, processor: (...args: unknown[]) => unknown): unknown;
  loadData(): Promise<unknown>;
  saveData(data: unknown): Promise<unknown>;
  actionService?: any;
  timerService?: any;
  dataStore?: any;
}
