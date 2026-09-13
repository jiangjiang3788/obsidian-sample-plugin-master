// src/features/settings/tabs/AiSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useMemo, useRef, useEffect } from 'preact/hooks';
import { ThinkNotice, ThinkToggle } from '@shared/ui/public';
import { useUseCases, selectAiSettings, selectInputSettings, useSelector } from '@/app/public';
import type { AiSettings as AiSettingsType } from '@core/types/public';
import { DEFAULT_AI_SETTINGS, CUSTOM_PROMPT_EXAMPLES } from '@core/types/public';
import { AiHttpClient } from '@core/ai/public';
import { CancelledError, createTakeLatest } from '@shared/utils/public';
import { useIsMounted } from '@shared/hooks/public';
import { AiAdvancedSettingsSection } from './AiAdvancedSettingsSection';
import { AiApiConfigSection } from './AiApiConfigSection';
import { AiPromptRulesSection } from './AiPromptRulesSection';
import { AiScopeSection } from './AiScopeSection';
import { AiSettingsFooter } from './AiSettingsFooter';
import { getAiApiAccessReadiness, getAiSettingsReadiness, getApiKeyPersistenceMessage } from './aiSettingsReadiness';
import type { AiModelFetchStatus, AiTestStatus } from './aiSettingsUiTypes';

interface AiSettingsProps {
    // 保留空接口以便未来扩展
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

function getConnectionErrorMessage(error: unknown): string {
    if (error instanceof Error && error.name === 'AbortError') {
        return '请求已取消或超时，请检查网络、端点和超时设置。';
    }
    return getErrorMessage(error);
}

export function AiSettings(_props: AiSettingsProps) {
    const useCases = useUseCases();
    const aiSettings = useSelector(selectAiSettings) ?? DEFAULT_AI_SETTINGS;
    const inputSettings = useSelector(selectInputSettings);
    const recordTypes = inputSettings?.recordTypes ?? [];

    const [localSettings, setLocalSettings] = useState<AiSettingsType>(aiSettings);
    const [testStatus, setTestStatus] = useState<AiTestStatus>('idle');
    const [testMessage, setTestMessage] = useState('');
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [modelFetchStatus, setModelFetchStatus] = useState<AiModelFetchStatus>('idle');
    const [modelFetchMessage, setModelFetchMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatusMessage, setSaveStatusMessage] = useState('');
    const [saveStatusSeverity, setSaveStatusSeverity] = useState<'success' | 'error' | 'info'>('info');

    const isMountedRef = useIsMounted();
    const testTakeLatestRef = useRef(createTakeLatest());
    const modelTakeLatestRef = useRef(createTakeLatest());

    useEffect(() => {
        return () => {
            testTakeLatestRef.current.dispose();
            modelTakeLatestRef.current.dispose();
        };
    }, []);

    const httpClientRef = useRef<AiHttpClient | null>(null);
    if (!httpClientRef.current) {
        httpClientRef.current = new AiHttpClient();
    }

    const updateLocal = (updates: Partial<AiSettingsType>) => {
        setSaveStatusMessage('');

        if ('apiEndpoint' in updates || 'apiKey' in updates) {
            setAvailableModels([]);
            setModelFetchStatus('idle');
            setModelFetchMessage('');
            setTestStatus('idle');
            setTestMessage('');
        }

        setLocalSettings(prev => ({ ...prev, ...updates }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveStatusMessage('正在保存 AI 设置...');
        setSaveStatusSeverity('info');
        try {
            await useCases.settings.updateAiSettings(localSettings);
            if (isMountedRef.current) {
                setSaveStatusSeverity('success');
                setSaveStatusMessage('AI 设置已保存。');
            }
        } catch (error: unknown) {
            if (isMountedRef.current) {
                setSaveStatusSeverity('error');
                setSaveStatusMessage(`保存失败：${getErrorMessage(error)}`);
            }
        } finally {
            if (isMountedRef.current) {
                setIsSaving(false);
            }
        }
    };

    const validRecordTypeIds = useMemo(() => new Set(recordTypes.map((recordType: any) => recordType.id)), [recordTypes]);
    const staleEnabledRecordTypeIds = useMemo(() => (localSettings.enabledRecordTypeIds || []).filter((id) => !validRecordTypeIds.has(id)), [localSettings.enabledRecordTypeIds, validRecordTypeIds]);

    const readiness = useMemo(() => getAiSettingsReadiness(localSettings), [localSettings]);
    const apiAccessReadiness = useMemo(() => getAiApiAccessReadiness(localSettings), [localSettings]);
    const apiKeyPersistenceMessage = useMemo(() => getApiKeyPersistenceMessage(localSettings), [localSettings]);

    const requestModels = (signal: AbortSignal) => httpClientRef.current!.listModels({
        baseURL: localSettings.apiEndpoint,
        apiKey: localSettings.apiKey,
        timeoutMs: localSettings.requestTimeoutMs,
        signal,
    });

    const handleTestConnection = async () => {
        if (!apiAccessReadiness.ready) {
            setTestStatus('error');
            setTestMessage(apiAccessReadiness.message);
            return;
        }

        if (isMountedRef.current) {
            setTestStatus('testing');
            setTestMessage('正在测试 API 并读取模型接口...');
        }

        try {
            const models = await testTakeLatestRef.current.run(requestModels);
            if (!isMountedRef.current) return;

            setAvailableModels(models);
            setTestStatus('success');
            setTestMessage(models.length > 0
                ? `连接成功，模型接口返回 ${models.length} 个模型。`
                : '连接成功，但模型接口没有返回可用模型。');
        } catch (error: unknown) {
            if (error instanceof CancelledError) return;
            if (isMountedRef.current) {
                setTestStatus('error');
                setTestMessage(`连接失败：${getConnectionErrorMessage(error)}`);
            }
        }
    };

    const handleFetchModels = async () => {
        if (!apiAccessReadiness.ready) {
            setModelFetchStatus('error');
            setModelFetchMessage(`无法拉取模型：${apiAccessReadiness.message}`);
            return;
        }

        setModelFetchStatus('loading');
        setModelFetchMessage('正在拉取模型列表...');

        try {
            const models = await modelTakeLatestRef.current.run(requestModels);
            if (!isMountedRef.current) return;

            setAvailableModels(models);
            if (models.length === 0) {
                setModelFetchStatus('error');
                setModelFetchMessage('接口请求成功，但没有返回可用模型。');
                return;
            }

            setModelFetchStatus('success');
            setModelFetchMessage(`已拉取 ${models.length} 个模型，可从下拉列表选择。`);
        } catch (error: unknown) {
            if (error instanceof CancelledError) return;
            if (isMountedRef.current) {
                setModelFetchStatus('error');
                setModelFetchMessage(`拉取模型失败：${getConnectionErrorMessage(error)}`);
            }
        }
    };

    const handleInitAllRecordTypes = () => {
        updateLocal({ enabledRecordTypeIds: recordTypes.map((recordType) => recordType.id) });
    };

    const handleClearStaleRecordTypeIds = () => {
        const stale = new Set(staleEnabledRecordTypeIds);
        updateLocal({ enabledRecordTypeIds: (localSettings.enabledRecordTypeIds || []).filter((id) => !stale.has(id)) });
    };

    const toggleRecordType = (recordTypeId: string) => {
        const allIds = recordTypes.map((recordType: any) => recordType.id);
        const current = localSettings.enabledRecordTypeIds ?? [];
        if (current.length === 0) {
            updateLocal({ enabledRecordTypeIds: allIds.filter(id => id !== recordTypeId) });
            return;
        }
        const next = current.includes(recordTypeId)
            ? current.filter(id => id !== recordTypeId)
            : [...current, recordTypeId];
        updateLocal({ enabledRecordTypeIds: next.length === allIds.length ? [] : next });
    };

    const handleInsertExample = () => {
        updateLocal({ customPrompt: CUSTOM_PROMPT_EXAMPLES });
    };

    const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(aiSettings);

    return (
        <div className="think-settings-page">
            <div className="think-settings-row">
                <span className="think-settings-row__label">AI 快速记录</span>
                <div className="think-settings-row__body"><ThinkToggle checked={localSettings.enabled} onChange={(e) => updateLocal({ enabled: (e.currentTarget as HTMLInputElement).checked })} label="启用" /></div>
            </div>
            {localSettings.enabled && !readiness.ready && (
                <ThinkNotice tone="warning">{readiness.message}</ThinkNotice>
            )}

            <AiApiConfigSection
                settings={localSettings}
                onUpdate={updateLocal}
                readiness={readiness}
                apiAccessReadiness={apiAccessReadiness}
                apiKeyPersistenceMessage={apiKeyPersistenceMessage}
                testStatus={testStatus}
                testMessage={testMessage}
                onTestConnection={handleTestConnection}
                availableModels={availableModels}
                modelFetchStatus={modelFetchStatus}
                modelFetchMessage={modelFetchMessage}
                onFetchModels={handleFetchModels}
            />
            <AiPromptRulesSection
                settings={localSettings}
                onUpdate={updateLocal}
                onInsertExample={handleInsertExample}
            />
            <AiScopeSection
                settings={localSettings}
                onUpdate={updateLocal}
                recordTypes={recordTypes}
                staleEnabledRecordTypeIds={staleEnabledRecordTypeIds}
                onInitAllRecordTypes={handleInitAllRecordTypes}
                onClearStaleRecordTypeIds={handleClearStaleRecordTypeIds}
                onToggleRecordType={toggleRecordType}
            />
            <AiAdvancedSettingsSection settings={localSettings} onUpdate={updateLocal} />

            <AiSettingsFooter
                hasChanges={hasChanges}
                isSaving={isSaving}
                saveStatusMessage={saveStatusMessage}
                saveStatusSeverity={saveStatusSeverity}
                onSave={handleSave}
            />
        </div>
    );
}
