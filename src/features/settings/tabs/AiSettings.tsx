// src/features/settings/tabs/AiSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useMemo, useRef, useEffect } from 'preact/hooks';
import {
    Alert,
    Box,
    Divider,
    FormControlLabel,
    Switch,
    Typography,
} from '@shared/public';
import { useUseCases, selectAiSettings, selectInputSettings, useSelector } from '@/app/public';
import type { AiSettings as AiSettingsType } from '@core/public';
import { DEFAULT_AI_SETTINGS, CUSTOM_PROMPT_EXAMPLES, AiHttpClient } from '@core/public';
import { CancelledError, createTakeLatest, useIsMounted } from '@shared/public';
import { AiAdvancedSettingsSection } from './AiAdvancedSettingsSection';
import { AiApiConfigSection } from './AiApiConfigSection';
import { AiPromptRulesSection } from './AiPromptRulesSection';
import { AiScopeSection } from './AiScopeSection';
import { AiSettingsFooter } from './AiSettingsFooter';
import { getAiSettingsReadiness, getApiKeyPersistenceMessage } from './aiSettingsReadiness';
import type { AiTestStatus } from './aiSettingsUiTypes';

interface AiSettingsProps {
    // 保留空接口以便未来扩展
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

function getTestConnectionErrorMessage(error: unknown): string {
    if (error instanceof Error && error.name === 'AbortError') {
        return '请求已取消或超时，请检查网络、端点和超时设置。';
    }
    return getErrorMessage(error);
}

export function AiSettings(_props: AiSettingsProps) {
    const useCases = useUseCases();
    const aiSettings = useSelector(selectAiSettings) ?? DEFAULT_AI_SETTINGS;
    const inputSettings = useSelector(selectInputSettings);
    const blocks = inputSettings?.blocks ?? [];
    const themes = inputSettings?.themes ?? [];

    const [localSettings, setLocalSettings] = useState<AiSettingsType>(aiSettings);
    const [testStatus, setTestStatus] = useState<AiTestStatus>('idle');
    const [testMessage, setTestMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatusMessage, setSaveStatusMessage] = useState('');
    const [saveStatusSeverity, setSaveStatusSeverity] = useState<'success' | 'error' | 'info'>('info');

    const isMountedRef = useIsMounted();
    const takeLatestRef = useRef(createTakeLatest());

    useEffect(() => {
        return () => {
            takeLatestRef.current.dispose();
        };
    }, []);

    const httpClientRef = useRef<AiHttpClient | null>(null);
    if (!httpClientRef.current) {
        httpClientRef.current = new AiHttpClient();
    }

    const updateLocal = (updates: Partial<AiSettingsType>) => {
        setSaveStatusMessage('');
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

    const validBlockIds = useMemo(() => new Set(blocks.map((block: any) => block.id)), [blocks]);
    const staleEnabledBlockIds = useMemo(() => (localSettings.enabledBlockIds || []).filter((id) => !validBlockIds.has(id)), [localSettings.enabledBlockIds, validBlockIds]);

    const readiness = useMemo(() => getAiSettingsReadiness(localSettings), [localSettings]);
    const apiKeyPersistenceMessage = useMemo(() => getApiKeyPersistenceMessage(localSettings), [localSettings]);

    const handleTestConnection = async () => {
        if (!readiness.ready) {
            setTestStatus('error');
            setTestMessage(readiness.message);
            return;
        }

        if (isMountedRef.current) {
            setTestStatus('testing');
            setTestMessage('正在测试连接...');
        }

        try {
            await takeLatestRef.current.run((signal) =>
                httpClientRef.current!.chatCompletion({
                    baseURL: localSettings.apiEndpoint,
                    apiKey: localSettings.apiKey,
                    model: localSettings.model,
                    temperature: 0,
                    max_tokens: 10,
                    messages: [
                        { role: 'system', content: 'You are a test assistant.' },
                        { role: 'user', content: 'ping' },
                    ],
                    timeoutMs: localSettings.requestTimeoutMs,
                    signal,
                })
            );
            if (isMountedRef.current) {
                setTestStatus('success');
                setTestMessage('连接成功！API 配置正确。');
            }
        } catch (error: unknown) {
            if (error instanceof CancelledError) return;
            if (isMountedRef.current) {
                setTestStatus('error');
                setTestMessage(`连接失败: ${getTestConnectionErrorMessage(error)}`);
            }
        }
    };

    const handleInitAllBlocks = () => {
        updateLocal({ enabledBlockIds: blocks.map(b => b.id) });
    };

    const handleClearStaleBlockIds = () => {
        const stale = new Set(staleEnabledBlockIds);
        updateLocal({ enabledBlockIds: (localSettings.enabledBlockIds || []).filter((id) => !stale.has(id)) });
    };

    const toggleBlock = (blockId: string) => {
        const allIds = blocks.map((block: any) => block.id);
        const current = localSettings.enabledBlockIds ?? [];
        if (current.length === 0) {
            updateLocal({ enabledBlockIds: allIds.filter(id => id !== blockId) });
            return;
        }
        const next = current.includes(blockId)
            ? current.filter(id => id !== blockId)
            : [...current, blockId];
        updateLocal({ enabledBlockIds: next.length === allIds.length ? [] : next });
    };

    const handleInsertExample = () => {
        updateLocal({ customPrompt: CUSTOM_PROMPT_EXAMPLES });
    };

    const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(aiSettings);

    return (
        <Box sx={{ maxWidth: 800 }}>
            <Typography variant="h6" gutterBottom>
                AI 自然语言快速记录
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                启用后，可以通过自然语言描述快速创建记录，AI 会自动识别并填充相应字段。
            </Typography>

            <FormControlLabel
                control={
                    <Switch
                        checked={localSettings.enabled}
                        onChange={(e) => updateLocal({ enabled: (e.target as HTMLInputElement).checked })}
                    />
                }
                label="启用 AI 快速记录"
            />
            {localSettings.enabled && !readiness.ready && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                    {readiness.message} 开启开关不会立即发起请求，但实际使用前需要补齐配置。
                </Alert>
            )}

            <Divider sx={{ my: 3 }} />

            <AiApiConfigSection
                settings={localSettings}
                onUpdate={updateLocal}
                readiness={readiness}
                apiKeyPersistenceMessage={apiKeyPersistenceMessage}
                testStatus={testStatus}
                testMessage={testMessage}
                onTestConnection={handleTestConnection}
            />
            <AiPromptRulesSection
                settings={localSettings}
                onUpdate={updateLocal}
                onInsertExample={handleInsertExample}
            />
            <AiScopeSection
                settings={localSettings}
                onUpdate={updateLocal}
                blocks={blocks}
                themes={themes}
                staleEnabledBlockIds={staleEnabledBlockIds}
                onInitAllBlocks={handleInitAllBlocks}
                onClearStaleBlockIds={handleClearStaleBlockIds}
                onToggleBlock={toggleBlock}
            />
            <AiAdvancedSettingsSection settings={localSettings} onUpdate={updateLocal} />

            <Divider sx={{ my: 3 }} />

            <AiSettingsFooter
                hasChanges={hasChanges}
                isSaving={isSaving}
                saveStatusMessage={saveStatusMessage}
                saveStatusSeverity={saveStatusSeverity}
                onSave={handleSave}
            />
        </Box>
    );
}
