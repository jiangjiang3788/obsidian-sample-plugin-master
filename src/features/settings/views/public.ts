/**
 * Settings views feature public facade.
 *
 * Runtime dashboard views and settings view editors live in the settings
 * feature because they depend on Think OS view semantics. Shared UI should
 * only expose reusable primitives, not business views.
 */
export * from './runtime';
export * from './runtime/ViewToolbar';
export * from './runtime/timeline-parser';
export * from './editors/registry';
export * from './editors/settingsEditorUi';
export * from './models/viewModelRegistry';
