/** @jsxImportSource preact */
import { h } from 'preact';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  FormControlLabel,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@shared/ui/public';
import { ExpandMoreIcon } from '@shared/ui/public';
import type { AiApiConfigSectionProps } from './aiSettingsUiTypes';

export function AiApiConfigSection({
  settings,
  onUpdate,
  readiness,
  apiKeyPersistenceMessage,
  testStatus,
  testMessage,
  onTestConnection,
}: AiApiConfigSectionProps) {
  return (
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
            value={settings.apiEndpoint}
            onChange={(e) => onUpdate({ apiEndpoint: (e.target as HTMLInputElement).value })}
            helperText="OpenAI 兼容的 API 端点，例如 https://api.openai.com/v1"
          />
          <TextField
            fullWidth
            label="API 密钥"
            type="password"
            value={settings.apiKey}
            onChange={(e) => onUpdate({ apiKey: (e.target as HTMLInputElement).value })}
            helperText="您的 API 密钥。默认只保存在当前内存中；开启下方开关后才会写入插件数据。"
          />

          <FormControlLabel
            control={
              <Switch
                checked={settings.persistApiKey === true}
                onChange={(e) => onUpdate({ persistApiKey: (e.target as HTMLInputElement).checked })}
              />
            }
            label="保存 API 密钥到设置（不推荐：明文存储，可能被同步）"
          />
          <Alert severity={settings.persistApiKey ? 'warning' : 'info'}>
            {apiKeyPersistenceMessage}
          </Alert>
          <TextField
            fullWidth
            label="模型名称"
            placeholder="gpt-4"
            value={settings.model}
            onChange={(e) => onUpdate({ model: (e.target as HTMLInputElement).value })}
            helperText="要使用的模型，例如 gpt-4, gpt-3.5-turbo"
          />
          <Box>
            <Typography gutterBottom>温度 (Temperature): {settings.temperature}</Typography>
            <Slider
              value={settings.temperature}
              onChange={(_, value) => onUpdate({ temperature: value as number })}
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
            value={settings.maxTokens}
            onChange={(e) => onUpdate({ maxTokens: parseInt((e.target as HTMLInputElement).value, 10) || 4096 })}
          />
          <TextField
            fullWidth
            label="请求超时 (毫秒)"
            type="number"
            value={settings.requestTimeoutMs}
            onChange={(e) => onUpdate({ requestTimeoutMs: parseInt((e.target as HTMLInputElement).value, 10) || 30000 })}
          />
          <Box>
            <Button
              variant="outlined"
              onClick={onTestConnection}
              disabled={testStatus === 'testing' || !readiness.ready}
            >
              {testStatus === 'testing' ? '测试中...' : '测试连接'}
            </Button>
            {!readiness.ready && (
              <Alert severity="info" sx={{ mt: 1 }}>
                {readiness.message}
              </Alert>
            )}
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
  );
}
