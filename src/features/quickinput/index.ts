import type ThinkPlugin from '@main';
import { registerQuickInputCommands } from './registerCommands';

/**
 * QuickInput feature ownership root.
 *
 * The editor and modal content live under this feature. Platform keeps only the
 * Obsidian Modal adapter, while app/public re-exports stable entrypoints for
 * existing callers.
 */
export interface QuickInputDependencies {
    plugin: ThinkPlugin;
}

export function setup(deps: QuickInputDependencies) {
    registerQuickInputCommands(deps.plugin);
}

export { QuickInputEditor, finalizeQuickInputFormData } from './editor';
export type { QuickInputEditorProps, QuickInputEditorState } from './editor';
export { QuickInputModalContent } from './modal/QuickInputModalContent';
export type { QuickInputModalContentProps } from './modal/QuickInputModalContent';
