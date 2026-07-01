// src/app/store/mutations/layoutSettingsMutations.ts
/** Pure settings mutations for layout state. */

import type { Layout, ThinkSettings, ViewPlacement } from '@core/types/public';
import { filterViewPlacementsForLayout } from '@core/layout/public';
import { generateId, moveItemInArray } from '@core/utils/public';

export function makeLayoutSettingsDraft(name: string, parentId: string | null = null): Layout {
    return {
        id: generateId('layout'),
        name,
        viewInstanceIds: [],
        globalFilters: [],
        displayMode: 'list',
        initialView: '月',
        initialDateFollowsNow: true,
        parentId,
    };
}

export function cloneLayoutSettingsDraft(original: Layout): Layout {
    return {
        ...original,
        id: generateId('layout'),
        name: `${original.name} (副本)`,
        gridConfig: original.gridConfig ? { ...original.gridConfig } : undefined,
        freeformConfig: original.freeformConfig ? { ...original.freeformConfig } : undefined,
        viewPlacements: original.viewPlacements
            ? Object.fromEntries(
                Object.entries(original.viewPlacements).map(([viewId, placement]) => [viewId, { ...placement }]),
            )
            : undefined,
    };
}

function ensureLayoutSettingsList(draft: ThinkSettings): Layout[] {
    if (!draft.layouts) draft.layouts = [];
    return draft.layouts;
}

function findLayoutSettingsDraft(draft: ThinkSettings, id: string): Layout | undefined {
    return draft.layouts?.find((layout) => layout.id === id);
}

export function addLayoutSettingsDraft(draft: ThinkSettings, layout: Layout): void {
    ensureLayoutSettingsList(draft).push(layout);
}

export function patchLayoutSettingsDraft(draft: ThinkSettings, id: string, updates: Partial<Layout>): void {
    const layout = findLayoutSettingsDraft(draft, id);
    if (layout) Object.assign(layout, updates);
}

export function deleteLayoutSettingsDraft(draft: ThinkSettings, id: string): void {
    draft.layouts = draft.layouts?.filter((layout) => layout.id !== id) || [];
}

export function moveLayoutSettingsDraft(draft: ThinkSettings, id: string, direction: 'up' | 'down'): void {
    draft.layouts = moveItemInArray(draft.layouts || [], id, direction);
}

export function reorderLayoutSettingsDraft(draft: ThinkSettings, orderedIds: string[]): void {
    const layouts = draft.layouts || [];
    const layoutMap = new Map(layouts.map((layout) => [layout.id, layout]));
    const reordered = orderedIds
        .map((id) => layoutMap.get(id))
        .filter((layout): layout is Layout => layout !== undefined);
    const orderedSet = new Set(orderedIds);
    const remaining = layouts.filter((layout) => !orderedSet.has(layout.id));
    draft.layouts = [...reordered, ...remaining];
}

export function batchPatchLayoutSettingsDraft(
    draft: ThinkSettings,
    layoutIds: string[],
    updates: Partial<Layout>,
): void {
    layoutIds.forEach((id) => patchLayoutSettingsDraft(draft, id, updates));
}

export function batchDeleteLayoutSettingsDraft(draft: ThinkSettings, layoutIds: string[]): void {
    const layoutIdSet = new Set(layoutIds);
    draft.layouts = draft.layouts?.filter((layout) => !layoutIdSet.has(layout.id)) || [];
}

export function moveLayoutSettingsParentDraft(
    draft: ThinkSettings,
    layoutId: string,
    newParentId: string | null,
): void {
    const layout = findLayoutSettingsDraft(draft, layoutId);
    if (layout) layout.parentId = newParentId;
}

export function addLayoutSettingsViewInstance(
    draft: ThinkSettings,
    layoutId: string,
    viewInstanceId: string,
): void {
    const layout = findLayoutSettingsDraft(draft, layoutId);
    if (layout && !layout.viewInstanceIds.includes(viewInstanceId)) {
        layout.viewInstanceIds.push(viewInstanceId);
    }
}

export function removeLayoutSettingsViewInstance(
    draft: ThinkSettings,
    layoutId: string,
    viewInstanceId: string,
): void {
    const layout = findLayoutSettingsDraft(draft, layoutId);
    if (!layout) return;
    layout.viewInstanceIds = layout.viewInstanceIds.filter((id) => id !== viewInstanceId);
    if (layout.viewPlacements) delete layout.viewPlacements[viewInstanceId];
}

export function reorderLayoutSettingsViewInstances(
    draft: ThinkSettings,
    layoutId: string,
    viewInstanceIds: string[],
): void {
    const layout = findLayoutSettingsDraft(draft, layoutId);
    if (layout) layout.viewInstanceIds = viewInstanceIds;
}

export function updateLayoutSettingsViewPlacement(
    draft: ThinkSettings,
    layoutId: string,
    viewInstanceId: string,
    placement: ViewPlacement,
): void {
    const layout = findLayoutSettingsDraft(draft, layoutId);
    if (!layout || !layout.viewInstanceIds.includes(viewInstanceId)) return;
    if (!layout.viewPlacements) layout.viewPlacements = {};
    layout.viewPlacements[viewInstanceId] = { ...placement };
}

export function replaceLayoutSettingsViewPlacements(
    draft: ThinkSettings,
    layoutId: string,
    placements: Record<string, ViewPlacement>,
): void {
    const layout = findLayoutSettingsDraft(draft, layoutId);
    if (!layout) return;
    layout.viewPlacements = filterViewPlacementsForLayout(layout.viewInstanceIds, placements);
}

export function resetLayoutSettingsFreeform(draft: ThinkSettings, layoutId: string): void {
    const layout = findLayoutSettingsDraft(draft, layoutId);
    if (layout) layout.viewPlacements = {};
}
