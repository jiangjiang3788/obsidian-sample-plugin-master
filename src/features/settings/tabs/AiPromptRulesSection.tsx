/** @jsxImportSource preact */
import { h } from 'preact';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ExpandMoreIcon } from '@shared/public';
import { CUSTOM_PROMPT_EXAMPLES } from '@core/public';
import type { AiPromptRulesSectionProps } from './aiSettingsUiTypes';

export function AiPromptRulesSection({ settings, onUpdate, onInsertExample }: AiPromptRulesSectionProps) {
  return (
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
            value={settings.customPrompt ?? ''}
            onChange={(e) => onUpdate({ customPrompt: (e.target as HTMLInputElement).value })}
            helperText="定义您的个性化规则，AI 会根据这些规则来理解您的输入"
          />
          <Box>
            <Button variant="outlined" size="small" onClick={onInsertExample}>
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
  );
}
