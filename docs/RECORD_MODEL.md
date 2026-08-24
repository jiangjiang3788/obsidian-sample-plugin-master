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
