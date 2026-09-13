# Record model

## Canonical envelope

Every persisted Record uses the codec-owned block/envelope and stable fields:

```text
记录ID
记录版本
记录类型
```

Record ID is identity. Source file, line, display label and debug metadata are not identity.

## Field categories

Persist fields when they are business facts, stable references, intentionally retained readable snapshots, or required measurement facts.

Do not persist values that are safely derivable, creation provenance that has no continuing business meaning, debug/source details, or migration residue.

Examples:

- Goal ID is canonical; a readable Goal snapshot may be retained for human-readable Markdown.
- Energy value is a fact; Energy tier is derived.
- Plan/Review period identifiers are derived from date + period grain.
- Template ID/source are creation provenance, not a permanent Record parent.

## Template authority

A capture template may control:

- enabled fields;
- field order;
- labels and input controls;
- defaults and options;
- requiredness within system invariants;
- target file/heading and Goal/Theme defaults;
- safe custom user fields.

A template must not define raw Markdown grammar. The codec serializes selected standard/custom fields uniformly.

Changing a template affects future capture behavior. Existing Records remain historical facts and must not silently lose fields merely because a current template changed.

## Record types

Primary user-facing kinds:

- Task
- Plan
- Review
- Thought
- Habit
- Evidence
- Blocker
- Milestone
- Energy

Special internal/domain records:

- TaskSeries
- TaskSession


## Capture resolution

For goal-bindable user RecordTypes, create capture always resolves from an explicit pair: `recordTypeId + goalPath` and requires an enabled direct GoalTemplate. No direct GoalTemplate means Quick Input creation is unavailable. The registered RecordType template is the structural base merged into an enabled GoalTemplate and remains available to edit/backfill flows; it is not a create fallback.

Goal selection is system context, not a removable template field. Entry points may preselect it when they already know the Goal (for example a Heatmap cell), but they must never guess the first Goal or first RecordType.

## Record presentation (1.6.0)

A persisted field and a human-facing representative value are not the same concept.

- `title` is the real title. Empty means empty.
- `primaryText` / “主显示值” is a derived Field used when a compact UI needs one human-readable identity value.
- Explicit title always wins inside `primaryText`.
- Value-shaped types can derive natural values when title is absent (for example `精力 65`, `打卡 · 评分 4`, `任务工作块 · 120 分钟`).
- Text-shaped types use content and finally the schema-owned Record Type label as fallback.
- The resolver remains exhaustive for all 12 technical Record kinds and never mutates Markdown or Record storage.

Canonical **user-facing** presentation order is:

```text
任务 → 精力 → 打卡 → 事件 → 感受 → 思考 → 总结 → 计划 → 阻碍项 → 里程碑
```

`TaskSession` and `TaskSeries` remain internal technical records. They normalize to the Task presentation identity and never own a separate user-facing order, label or color. The order above applies when UI enumerates or groups user Record Types. It must not override a user-selected date/title/custom sort. Category remains retired; Goal remains an independent domain keyed by `goalPath`.

Each user-facing Record Type owns one semantic color token (`--think-record-type-*`). Product CSS owns defaults; Settings persists only valid user overrides. Views consume the global semantic token rather than inventing local color maps.

### Display-field priority

```text
user explicit ViewInstance.fields
        > View default fields
        > generic Record presentation default
```

A View configured to show `title` shows the actual title even when it is empty. A View gets type-aware identity only by choosing `primaryText` (or by using it as that View's default identity field).
