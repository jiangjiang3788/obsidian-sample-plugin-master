// src/app/store/mutations/settingsMutationRunner.ts
/**
 * Shared SettingsRepository mutation runner for Zustand slices.
 *
 * The store slices still own UI-facing loading/error flags, but the repetitive
 * initialized-check / loading / repository.update / error-message plumbing is
 * centralized here. Business data mutation stays in small pure mutation
 * modules, and SettingsRepository remains the only persistent write boundary.
 */

import type { SettingsRepository } from '@core/services/public';
import type { ThinkSettings } from '@core/types/public';
import { createSliceMeta } from '@core/types/public';
import { devError } from '@core/utils/public';

export interface StoreMutationState {
    settings: ThinkSettings;
    isInitialized: boolean;
}

export interface SettingsMutationOperation<R> {
    action: string;
    fallbackError: string;
    mutate: (draft: ThinkSettings) => void;
    onSuccess?: () => R;
    onUninitialized?: () => R;
    onError?: (error: unknown) => R;
}

export interface SettingsMutationRunnerOptions<TState extends StoreMutationState> {
    sliceName: string;
    repository: SettingsRepository;
    getState: () => TState;
    setStatus: (loading: boolean, error: string | null) => void;
}

export function getStoreMutationErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'object' && error !== null && 'message' in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim()) return message;
    }
    if (typeof error === 'string' && error.trim()) return error;
    return fallback;
}

function getActionShortName(action: string): string {
    const parts = action.split('.').filter(Boolean);
    return parts[parts.length - 1] || action;
}

export function createSettingsMutationRunner<TState extends StoreMutationState>(
    options: SettingsMutationRunnerOptions<TState>,
) {
    return async function runSettingsMutation<R = void>(
        operation: SettingsMutationOperation<R>,
    ): Promise<R | undefined> {
        const state = options.getState();
        if (!state.isInitialized) {
            devError(`[${options.sliceName}] Store 未初始化`);
            return operation.onUninitialized?.();
        }

        options.setStatus(true, null);
        try {
            await options.repository.update(operation.mutate, createSliceMeta(operation.action));
            options.setStatus(false, null);
            return operation.onSuccess?.();
        } catch (error: unknown) {
            const message = getStoreMutationErrorMessage(error, operation.fallbackError);
            devError(`[${options.sliceName}] ${getActionShortName(operation.action)} 失败:`, error);
            options.setStatus(false, message);
            return operation.onError?.(error);
        }
    };
}
