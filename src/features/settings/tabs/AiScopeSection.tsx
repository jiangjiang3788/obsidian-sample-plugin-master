/** @jsxImportSource preact */
import { h } from 'preact';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { ExpandMoreIcon } from '@shared/public';
import type { AiScopeSectionProps } from './aiSettingsUiTypes';

export function AiScopeSection({
  settings,
  blocks,
  themes,
  onUpdate,
  onInitAllBlocks,
  onToggleBlock,
}: AiScopeSectionProps) {
  return (
    <>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Block 参与范围</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            选择哪些 Block 模板参与 AI 识别。留空表示全部参与。
          </Typography>
          <Button variant="outlined" size="small" onClick={onInitAllBlocks} sx={{ mb: 2 }}>
            初始化为全部 Block
          </Button>
          <FormGroup>
            {blocks.map(block => (
              <FormControlLabel
                key={block.id}
                control={
                  <Checkbox
                    checked={(settings.enabledBlockIds ?? []).includes(block.id)}
                    onChange={() => onToggleBlock(block.id)}
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

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">默认主题设置</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              当 AI 无法从用户输入中识别出主题时，将使用此默认主题。建议设置一个常用的主题作为默认值。
            </Typography>
            <FormControl fullWidth>
              <InputLabel>默认主题</InputLabel>
              <Select
                value={settings.defaultThemeId ?? ''}
                label="默认主题"
                onChange={(e) => onUpdate({ defaultThemeId: (e.target as HTMLInputElement).value || undefined })}
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
              提示：AI 会尝试从您的输入中识别主题关键词（如"英语"、"工作"等），并匹配到相应的主题路径。如果无法识别，则使用此默认主题。
            </Alert>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </>
  );
}
