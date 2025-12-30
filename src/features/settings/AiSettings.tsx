// src/features/settings/AiSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useMemo, useRef } from 'preact/hooks';
import {
    Box,
    Typography,
    Switch,
    FormControlLabel,
    TextField,
    Slider,
    Button,
    Divider,
    Checkbox,
    FormGroup,
    Alert,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    Stack,
    Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { AppStore, useStore } from '@/app/AppStore';
import type { AiSettings as AiSettingsType } from '@/core/types/ai-schema';
import { DEFAULT_AI_SETTINGS, CUSTOM_PROMPT_EXAMPLES } from '@/core/types/ai-schema';
import { AiHttpClient } from '@/core/ai';

interface AiSettingsProps {
    appStore: AppStore;
}

export function AiSettings({ appStore }: AiSettingsProps) {
    const settings = useStore(state => state.settings);
    const aiSettings = settings.aiSettings ?? DEFAULT_AI_SETTINGS;
    const blocks = settings.inputSettings?.blocks ?? [];
    const themes = settings.inputSettings?.themes ?? [];

    // 本地状态用于表单编辑
    const [localSettings, setLocalSettings] = useState<AiSettingsType>(aiSettings);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState('');
    
    // 复用 AiHttpClient 实例
    const httpClientRef = useRef<AiHttpClient | null>(null);
    if (!httpClientRef.current) {
        httpClientRef.current = new AiHttpClient();
    }

    // 更新本地设置
    const updateLocal = (updates: Partial<AiSettingsType>) => {
        setLocalSettings(prev => ({ ...prev, ...updates }));
    };

    // 保存设置
    const handleSave = async () => {
        await appStore._updateSettingsAndPersist(draft => {
            draft.aiSettings = localSettings;
        });
    };

    // 测试连接 - 使用 AiHttpClient 统一处理鉴权、超时和错误
    const handleTestConnection = async () => {
        if (!localSettings.apiEndpoint || !localSettings.apiKey || !localSettings.model) {
            setTestStatus('error');
            setTestMessage('请先填写 API 端点、密钥和模型名称');
            return;
        }

        setTestStatus('testing');
        setTestMessage('正在测试连接...');

        try {
            // 调用 AiHttpClient.chatCompletion 进行测试
            // 使用最小化 payload：简短消息 + 限制 max_tokens
            await httpClientRef.current!.chatCompletion({
                baseURL: localSettings.apiEndpoint,
                apiKey: localSettings.apiKey,
                model: localSettings.model,
                temperature: 0,
                max_tokens: 10,
                messages: [
                    { role: 'system', content: 'You are a test assistant.' },
                    { role: 'user', content: 'ping' }
                ],
                timeoutMs: localSettings.requestTimeoutMs,
            });

            setTestStatus('success');
            setTestMessage('连接成功！API 配置正确。');
        } catch (e: any) {
            setTestStatus('error');
            setTestMessage(`连接失败: ${e.message || e}`);
        }
    };

    // 初始化为全部 block
    const handleInitAllBlocks = () => {
        updateLocal({ enabledBlockIds: blocks.map(b => b.id) });
    };

    // 切换 block 启用状态
    const toggleBlock = (blockId: string) => {
        const current = localSettings.enabledBlockIds ?? [];
        if (current.includes(blockId)) {
            updateLocal({ enabledBlockIds: current.filter(id => id !== blockId) });
        } else {
            updateLocal({ enabledBlockIds: [...current, blockId] });
        }
    };

    // 插入示例提示词
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

            {/* 启用开关 */}
            <FormControlLabel
                control={
                    <Switch
                        checked={localSettings.enabled}
                        onChange={(e) => updateLocal({ enabled: (e.target as HTMLInputElement).checked })}
                    />
                }
                label="启用 AI 快速记录"
            />

            <Divider sx={{ my: 3 }} />

            {/* API 配置 */}
            <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1">API 配置</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Stack spacing={2}>
                        <TextField
                            fullWidth
                            label="API 端点 (baseURL)"
                            placeholder="https://api.openai.com/v1"
                            value={localSettings.apiEndpoint}
                            onChange={(e) => updateLocal({ apiEndpoint: (e.target as HTMLInputElement).value })}
                            helperText="OpenAI 兼容的 API 端点，例如 https://api.openai.com/v1"
                        />
                        <TextField
                            fullWidth
                            label="API 密钥"
                            type="password"
                            value={localSettings.apiKey}
                            onChange={(e) => updateLocal({ apiKey: (e.target as HTMLInputElement).value })}
                            helperText="您的 API 密钥"
                        />
                        <TextField
                            fullWidth
                            label="模型名称"
                            placeholder="gpt-4"
                            value={localSettings.model}
                            onChange={(e) => updateLocal({ model: (e.target as HTMLInputElement).value })}
                            helperText="要使用的模型，例如 gpt-4, gpt-3.5-turbo"
                        />
                        <Box>
                            <Typography gutterBottom>温度 (Temperature): {localSettings.temperature}</Typography>
                            <Slider
                                value={localSettings.temperature}
                                onChange={(_, value) => updateLocal({ temperature: value as number })}
                                min={0}
                                max={2}
                                step={0.1}
                                marks={[
                                    { value: 0, label: '0' },
                                    { value: 1, label: '1' },
                                    { value: 2, label: '2' },
                                ]}
                            />
                        </Box>
                        <TextField
                            fullWidth
                            label="最大 Token 数"
                            type="number"
                            value={localSettings.maxTokens}
                            onChange={(e) => updateLocal({ maxTokens: parseInt((e.target as HTMLInputElement).value) || 4096 })}
                        />
                        <TextField
                            fullWidth
                            label="请求超时 (毫秒)"
                            type="number"
                            value={localSettings.requestTimeoutMs}
                            onChange={(e) => updateLocal({ requestTimeoutMs: parseInt((e.target as HTMLInputElement).value) || 30000 })}
                        />
                        <Box>
                            <Button
                                variant="outlined"
                                onClick={handleTestConnection}
                                disabled={testStatus === 'testing'}
                            >
                                {testStatus === 'testing' ? '测试中...' : '测试连接'}
                            </Button>
                            {testStatus !== 'idle' && (
                                <Alert
                                    severity={testStatus === 'success' ? 'success' : testStatus === 'error' ? 'error' : 'info'}
                                    sx={{ mt: 1 }}
                                >
                                    {testMessage}
                                </Alert>
                            )}
                        </Box>
                    </Stack>
                </AccordionDetails>
            </Accordion>

            {/* 个性化规则 - 自定义提示词 */}
            <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1">个性化规则（自定义提示词）</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Stack spacing={2}>
                        <Alert severity="info">
                            在这里定义您的个性化映射规则，告诉 AI 如何理解您的输入习惯。
                            例如：当您说"心情好"时应该用哪个 Block，"写文章"应该归类到哪个主题等。
                        </Alert>
                        <TextField
                            fullWidth
                            multiline
                            rows={8}
                            label="自定义提示词/规则"
                            placeholder={CUSTOM_PROMPT_EXAMPLES}
                            value={localSettings.customPrompt ?? ''}
                            onChange={(e) => updateLocal({ customPrompt: (e.target as HTMLInputElement).value })}
                            helperText="定义您的个性化规则，AI 会根据这些规则来理解您的输入"
                        />
                        <Box>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={handleInsertExample}
                            >
                                插入示例规则
                            </Button>
                        </Box>
                        <Alert severity="warning">
                            提示：规则越具体，AI 识别越准确。建议包含：
                            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                                <li>关键词与 Block 类型的对应关系</li>
                                <li>特定词汇与主题的对应关系</li>
                                <li>字段填写的默认规则</li>
                                <li>不确定时的默认行为</li>
                            </ul>
                        </Alert>
                    </Stack>
                </AccordionDetails>
            </Accordion>

            {/* Block 参与范围 */}
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1">Block 参与范围</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        选择哪些 Block 模板参与 AI 识别。留空表示全部参与。
                    </Typography>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={handleInitAllBlocks}
                        sx={{ mb: 2 }}
                    >
                        初始化为全部 Block
                    </Button>
                    <FormGroup>
                        {blocks.map(block => (
                            <FormControlLabel
                                key={block.id}
                                control={
                                    <Checkbox
                                        checked={(localSettings.enabledBlockIds ?? []).includes(block.id)}
                                        onChange={() => toggleBlock(block.id)}
                                    />
                                }
                                label={block.name}
                            />
                        ))}
                    </FormGroup>
                    {blocks.length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                            暂无 Block 模板，请先在"快速输入"设置中创建。
                        </Typography>
                    )}
                </AccordionDetails>
            </Accordion>

            {/* 默认主题设置 */}
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1">默认主题设置</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Stack spacing={2}>
                        <Typography variant="body2" color="text.secondary">
                            当 AI 无法从用户输入中识别出主题时，将使用此默认主题。
                            建议设置一个常用的主题作为默认值。
                        </Typography>
                        <FormControl fullWidth>
                            <InputLabel>默认主题</InputLabel>
                            <Select
                                value={localSettings.defaultThemeId ?? ''}
                                label="默认主题"
                                onChange={(e: any) => updateLocal({ defaultThemeId: e.target.value || undefined })}
                            >
                                <MenuItem value="">
                                    <em>不设置默认主题</em>
                                </MenuItem>
                                {themes.map(theme => (
                                    <MenuItem key={theme.id} value={theme.path}>
                                        {theme.path}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        {themes.length === 0 && (
                            <Alert severity="info">
                                暂无主题，请先在"快速输入"设置中创建主题。
                            </Alert>
                        )}
                        <Alert severity="info">
                            提示：AI 会尝试从您的输入中识别主题关键词（如"英语"、"工作"等），
                            并匹配到相应的主题路径。如果无法识别，则使用此默认主题。
                        </Alert>
                    </Stack>
                </AccordionDetails>
            </Accordion>

            {/* 多结果设置 */}
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1">多结果设置</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Stack spacing={2}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={localSettings.allowMultipleResults}
                                    onChange={(e) => updateLocal({ allowMultipleResults: (e.target as HTMLInputElement).checked })}
                                />
                            }
                            label="允许多条结果"
                        />
                        <TextField
                            fullWidth
                            label="最大结果数量"
                            type="number"
                            value={localSettings.maxResults}
                            onChange={(e) => updateLocal({ maxResults: parseInt((e.target as HTMLInputElement).value) || 5 })}
                            disabled={!localSettings.allowMultipleResults}
                        />
                        <FormControl fullWidth>
                            <InputLabel>确认模式</InputLabel>
                            <Select
                                value={localSettings.confirmMode}
                                label="确认模式"
                                onChange={(e: any) => updateLocal({ confirmMode: e.target.value as 'single' | 'batch' })}
                            >
                                <MenuItem value="single">单条确认</MenuItem>
                                <MenuItem value="batch">批量确认</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </AccordionDetails>
            </Accordion>

            {/* 性能设置 */}
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1">性能设置</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Stack spacing={2}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={localSettings.preloadConfigOnStartup}
                                    onChange={(e) => updateLocal({ preloadConfigOnStartup: (e.target as HTMLInputElement).checked })}
                                />
                            }
                            label="启动时预加载配置"
                        />
                        <TextField
                            fullWidth
                            label="配置缓存 TTL (秒)"
                            type="number"
                            value={localSettings.configCacheTTLSeconds}
                            onChange={(e) => updateLocal({ configCacheTTLSeconds: parseInt((e.target as HTMLInputElement).value) || 300 })}
                            helperText="配置快照的缓存时间，避免每次调用都重新构建"
                        />
                    </Stack>
                </AccordionDetails>
            </Accordion>

            <Divider sx={{ my: 3 }} />

            {/* 保存按钮 */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                {hasChanges && (
                    <Chip label="有未保存的更改" color="warning" size="small" />
                )}
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={!hasChanges}
                >
                    保存设置
                </Button>
            </Box>
        </Box>
    );
}
