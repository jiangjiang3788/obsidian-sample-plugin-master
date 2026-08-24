#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const failures = [];

const definitionSource = read('src/core/config/views/registry.ts');
const runtimeSource = read('src/features/views/registry.ts');
const editorSource = read('src/features/settings/views/editors/registry.tsx');
const viewConfigSource = read('src/core/view/ViewConfig.ts');
const freeformSource = read('src/core/layout/freeformLayoutConfig.ts');
const viewportSource = read('src/app/dashboard/ViewportDeferredView.tsx');
const createSource = read('src/app/actions/recordCreate/viewHeaderCreateAction.ts');
const exportSource = read('src/core/utils/exportUtils.ts');
const settingsSource = read('src/features/settings/layout/ModuleSettingsModal.tsx');

function sortedUnique(matches) {
  return [...new Set(matches)].sort();
}

const definitionNames = sortedUnique(
  [...definitionSource.matchAll(/^  ([A-Za-z][A-Za-z0-9]*View): \{/gm)].map((match) => match[1]),
);
const runtimeNames = sortedUnique(
  [...runtimeSource.matchAll(/^  ([A-Za-z][A-Za-z0-9]*View),$/gm)].map((match) => match[1]),
);
const editorNames = sortedUnique(
  [...editorSource.matchAll(/^  ([A-Za-z][A-Za-z0-9]*View): [A-Za-z][A-Za-z0-9]*ViewEditor,$/gm)].map((match) => match[1]),
);

if (!definitionNames.length) failures.push('VIEW_DEFINITIONS must register at least one view');
if (JSON.stringify(runtimeNames) !== JSON.stringify(definitionNames)) {
  failures.push(`runtime bindings must exactly match VIEW_DEFINITIONS: definitions=${definitionNames.join(',')} runtime=${runtimeNames.join(',')}`);
}
if (JSON.stringify(editorNames) !== JSON.stringify(definitionNames)) {
  failures.push(`editor bindings must exactly match VIEW_DEFINITIONS: definitions=${definitionNames.join(',')} editors=${editorNames.join(',')}`);
}

if (!viewConfigSource.includes("type ViewName = RegisteredViewName")) {
  failures.push('ViewName must derive from the canonical view registry');
}
if (viewConfigSource.includes("'TableView',") || viewConfigSource.includes("'BlockView',")) {
  failures.push('ViewConfig must not keep a second hard-coded VIEW_OPTIONS list');
}
if (!freeformSource.includes('getViewDefinition(viewType)')) {
  failures.push('freeform default sizes must come from VIEW_DEFINITIONS.layout');
}
if (freeformSource.includes('recommendations: Partial<Record<ViewName')) {
  failures.push('freeformLayoutConfig must not keep a per-view size map');
}
if (!viewportSource.includes('getViewDefinition(viewType)?.layout.deferredMinHeight')) {
  failures.push('deferred viewport height must come from VIEW_DEFINITIONS.layout');
}
if (viewportSource.includes('DEFAULT_HEIGHT_BY_VIEW')) {
  failures.push('ViewportDeferredView must not keep a per-view height map');
}
if (!createSource.includes("viewHasCapability(viewType, 'headerCreate')")) {
  failures.push('view header create availability must come from VIEW_DEFINITIONS.capabilities');
}
if (createSource.includes('MODULE_HEADER_CREATE_ALLOWLIST')) {
  failures.push('view header create must not keep an allowlist');
}
if (!exportSource.includes('getViewExportConfig(viewType)')) {
  failures.push('view export config must come from VIEW_DEFINITIONS');
}
if (exportSource.includes('configMap: Record<string, ExportViewConfig>')) {
  failures.push('exportUtils must not keep a second view export map');
}
if (!settingsSource.includes('getViewLabel(v)')) {
  failures.push('view settings labels must come from VIEW_DEFINITIONS');
}
if (settingsSource.includes('Partial<Record<ViewName, string>>')) {
  failures.push('view settings must not keep a local label map');
}

if (failures.length) {
  console.error('[view-registry-convergence] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`[view-registry-convergence] PASS (${definitionNames.length} views; metadata is canonical and runtime/editor bindings are exhaustive)`);
