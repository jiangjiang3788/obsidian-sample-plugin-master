# DATA Review — MVP6

Checked source: `data.from-html-presets(1).json`

## Raw data status
- goals: 9
- template variants: 88
- themes: 47
- blocks: 8
- `inputSettings.overrides`: 0
- goals with legacy `granularity`: 9
- templates with legacy `granularity`: 88
- templates with formal `periodPolicy`: 0
- templates with legacy defaultValues (`legacyOverrideId` / `legacyThemePath`): 88
- variants whose id starts with `legacy-`: 84
- cells with duplicate default variants: 3
- cells without a default variant: 5

## Cleaned data status
Use `data.mvp6-cleaned.json`.

- goals: 9
- template variants: 88
- themes: 47
- blocks: 8
- `inputSettings.overrides`: 0
- goals with legacy `granularity`: 0
- templates with legacy `granularity`: 0
- templates with formal `periodPolicy`: 20
- templates with legacy defaultValues: 0
- variants whose id starts with `legacy-`: 0
- cells with duplicate default variants: 0
- cells without a default variant: 0

Conclusion: raw data is not suitable for the new runtime; cleaned data is suitable for MVP6.
