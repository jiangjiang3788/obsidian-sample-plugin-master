/** @jsxImportSource preact */
import { h, type ComponentChildren } from 'preact';
import { Box, Stack, Typography } from '@shared/ui/public';

type Children = ComponentChildren;

export function ViewEditorShell({ title, description, children, className = 'think-view-editor-shell', spacing = 2 }: {
  title?: Children; description?: Children; children?: Children; className?: string; spacing?: number;
}) {
  return (
    <Stack spacing={spacing} class={className}>
      {(title || description) && <div>
        {title && <Typography variant="subtitle2" class="think-view-editor-shell__title">{title}</Typography>}
        {description && <Typography variant="body2" color="text.secondary" class="think-view-editor-shell__description">{description}</Typography>}
      </div>}
      {children}
    </Stack>
  );
}

export function ConfigSection({ title, description, children, className, titleClassName, descriptionClassName }: {
  title?: Children; description?: Children; children?: Children; className?: string; titleClassName?: string; descriptionClassName?: string;
}) {
  const sectionClass = ['think-view-editor-section', className].filter(Boolean).join(' ');
  const titleClass = ['think-view-editor-section__title', titleClassName].filter(Boolean).join(' ');
  const descriptionClass = ['think-view-editor-section__description', descriptionClassName].filter(Boolean).join(' ');
  return <Box class={sectionClass}>{title && <Typography class={titleClass} variant="subtitle2">{title}</Typography>}{description && <Typography class={descriptionClass} variant="body2" color="text.secondary">{description}</Typography>}{children}</Box>;
}

export function ConfigFieldRow({ label, description, children, alignItems = 'center', labelWidth = 92 }: {
  label: Children; description?: Children; children: Children; alignItems?: 'center' | 'flex-start'; labelWidth?: number;
}) {
  const labelClass = [
    'think-view-editor-field-row__label',
    labelWidth === 80 ? 'think-view-editor-field-row__label--narrow' : '',
    labelWidth === 104 ? 'think-view-editor-field-row__label--wide' : '',
    alignItems === 'flex-start' ? 'think-view-editor-field-row__label--top' : '',
  ].filter(Boolean).join(' ');
  return (
    <Stack direction="row" spacing={1.5} alignItems={alignItems}>
      <Typography class={labelClass}>{label}</Typography>
      <Box class="think-view-editor-field-row__control">
        {children}
        {description && <Typography variant="caption" color="text.secondary" class="think-view-editor-field-row__description">{description}</Typography>}
      </Box>
    </Stack>
  );
}

export function ReadonlyViewEditorNotice({ title, description }: { title: Children; description: Children }) {
  return <ViewEditorShell title={title} description={description} spacing={1} />;
}
