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
} from '@shared/ui/public';
import { ExpandMoreIcon } from '@shared/ui/public';
import type { AiScopeSectionProps } from './aiSettingsUiTypes';

export function AiScopeSection({
  settings,
  blocks,
  themes,
  onUpdate,
  staleEnabledBlockIds = [],
  onInitAllBlocks,
  onClearStaleBlockIds,
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
            选择哪些记录类型参与 AI 识别。留空表示全部参与；AI 会先选目标，再选记录类型，最后选目标 × Block 记录预设。
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} useFlexGap flexWrap="wrap">
            <Button variant="outlined" size="small" onClick={onInitAllBlocks}>
              初始化为全部记录类型
            </Button>
            {staleEnabledBlockIds.length > 0 && onClearStaleBlockIds && (
              <Button variant="outlined" size="small" color="warning" onClick={onClearStaleBlockIds}>
                清理旧 Block ID
              </Button>
            )}
          </Stack>
          {staleEnabledBlockIds.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              当前 AI 范围里还有 {staleEnabledBlockIds.length} 个旧 Block ID，可能来自旧 data。建议清理，否则会影响 AI 快照。
            </Alert>
          )}
          <FormGroup>
            {blocks.map(block => (
              <FormControlLabel
                key={block.id}
                control={
                  <Checkbox
                    checked={(settings.enabledBlockIds ?? []).length === 0 || (settings.enabledBlockIds ?? []).includes(block.id)}
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
              当目标和记录预设都没有提供主题时，才使用此默认主题。主题只是上下文字段，不再决定模板。
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
              提示：AI 优先使用目标 × Block 记录预设里的主题；没有匹配时再使用目标默认主题，最后才使用这里的默认主题。
            </Alert>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </>
  );
}
