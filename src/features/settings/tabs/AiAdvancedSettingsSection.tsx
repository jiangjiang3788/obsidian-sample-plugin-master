/** @jsxImportSource preact */
import { h } from 'preact';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@shared/public';
import { ExpandMoreIcon } from '@shared/public';
import type { AiSettingsSectionProps } from './aiSettingsUiTypes';

export function AiAdvancedSettingsSection({ settings, onUpdate }: AiSettingsSectionProps) {
  return (
    <>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">多结果设置</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.allowMultipleResults}
                  onChange={(e) => onUpdate({ allowMultipleResults: (e.target as HTMLInputElement).checked })}
                />
              }
              label="允许多条结果"
            />
            <TextField
              fullWidth
              label="最大结果数量"
              type="number"
              value={settings.maxResults}
              onChange={(e) => onUpdate({ maxResults: parseInt((e.target as HTMLInputElement).value, 10) || 5 })}
              disabled={!settings.allowMultipleResults}
            />
            <FormControl fullWidth>
              <InputLabel>确认模式</InputLabel>
              <Select
                value={settings.confirmMode}
                label="确认模式"
                onChange={(e) => onUpdate({ confirmMode: (e.target as HTMLInputElement).value as 'single' | 'batch' })}
              >
                <MenuItem value="single">单条确认</MenuItem>
                <MenuItem value="batch">批量确认</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">性能设置</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.preloadConfigOnStartup}
                  onChange={(e) => onUpdate({ preloadConfigOnStartup: (e.target as HTMLInputElement).checked })}
                />
              }
              label="启动时预加载配置"
            />
            <TextField
              fullWidth
              label="配置缓存 TTL (秒)"
              type="number"
              value={settings.configCacheTTLSeconds}
              onChange={(e) => onUpdate({ configCacheTTLSeconds: parseInt((e.target as HTMLInputElement).value, 10) || 300 })}
              helperText="配置快照的缓存时间，避免每次调用都重新构建"
            />
          </Stack>
        </AccordionDetails>
      </Accordion>
    </>
  );
}
