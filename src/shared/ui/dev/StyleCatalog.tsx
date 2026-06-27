/** @jsxImportSource preact */
/**
 * Development-only visual contract catalog.
 * It is intentionally not mounted in the normal plugin UI. Import it from a
 * temporary development view when capturing visual baselines.
 */
import {
  Button as MuiButton,
  Chip as MuiChip,
  TextField,
} from '../muiCompat';
import {
  ThinkBadge,
  ThinkButton,
  ThinkCard,
  ThinkChip,
  ThinkEmptyState,
  ThinkField,
  ThinkIconButton,
  ThinkSection,
  ThinkTag,
  ThinkToolbar,
  ThinkToolbarGroup,
  ThinkToolbarSpacer,
} from '../primitives';

export function StyleCatalog() {
  return (
    <div className="think-os think-os--style-catalog">
      <ThinkSection title="Buttons" description="Native primitive and MUI bridge must share the same dimensions and states.">
        <ThinkToolbar wrap>
          <ThinkButton variant="primary">Primary</ThinkButton>
          <ThinkButton variant="secondary">Secondary</ThinkButton>
          <ThinkButton variant="ghost">Ghost</ThinkButton>
          <ThinkButton variant="danger">Danger</ThinkButton>
          <ThinkButton loading>Loading</ThinkButton>
          <ThinkButton disabled>Disabled</ThinkButton>
          <MuiButton variant="contained">MUI Primary</MuiButton>
          <MuiButton variant="outlined">MUI Secondary</MuiButton>
        </ThinkToolbar>
      </ThinkSection>

      <ThinkSection title="Controls">
        <ThinkCard>
          <ThinkField label="名称" description="32px control height and shared focus treatment." htmlFor="style-catalog-name">
            <input id="style-catalog-name" className="think-input" placeholder="输入名称" />
          </ThinkField>
          <ThinkField label="说明" htmlFor="style-catalog-description">
            <textarea id="style-catalog-description" className="think-textarea" placeholder="输入说明" />
          </ThinkField>
          <TextField label="MUI TextField" fullWidth />
        </ThinkCard>
      </ThinkSection>

      <ThinkSection title="Chips and toolbar">
        <ThinkToolbar wrap>
          <ThinkToolbarGroup>
            <ThinkChip selected>Selected</ThinkChip>
            <ThinkTag>Static tag</ThinkTag>
            <ThinkBadge>12</ThinkBadge>
            <MuiChip label="MUI Chip" color="primary" />
          </ThinkToolbarGroup>
          <ThinkToolbarSpacer />
          <ThinkIconButton label="更多" icon={<span aria-hidden="true">⋯</span>} />
        </ThinkToolbar>
      </ThinkSection>

      <ThinkSection title="Empty state">
        <ThinkCard>
          <ThinkEmptyState
            icon="◇"
            title="暂无内容"
            description="空状态由统一标题、说明和单一主操作组成。"
            action={<ThinkButton variant="primary">新建</ThinkButton>}
          />
        </ThinkCard>
      </ThinkSection>
    </div>
  );
}
