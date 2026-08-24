# Think OS Context Regression Matrix

> Baseline: v1.0.65 context-hardening pass  
> Purpose: lock the complete path from a UI invocation context to QuickInput hydration, user edits, submit normalization, persistence, and view re-projection.  
> Filename policy: project filenames are ASCII-only; Chinese is allowed inside Markdown/source content.

---

## 1. What “context” means in Think OS

Think OS currently has several different sources of initial values. They must not be treated as one undifferentiated object.

| Layer | Typical source | Example | Ownership | May overwrite user input? | Persist directly? |
|---|---|---|---|---|---|
| User | QuickInput interaction | user edits `startAt` | `user` | N/A | yes, after validation |
| View invocation | Timeline / Heatmap / Statistics / View Header | clicked date/time, rating, filter value | `context` / invocation context | **no** | only if consumed by a real template field |
| Goal context | selected Goal or nested UI Goal context | `goalPath`, root/leaf Goal | `goal_context` | no after user ownership | canonical Goal fields only |
| Edit backfill | existing Record | current content/time/rating | `edit_backfill` | only through explicit user edit | yes |
| Template default | GoalTemplate/CoreBlock | default status / option | `template_default` | no | yes if retained |
| System auto | derived value | duration from start/end | `system_auto` | no | yes if part of schema |
| UI metadata | `__recordUiContext` | source kind, clicked minute, filter diagnostics | metadata only | never | **never** |

### Required precedence

For a field that already belongs to the user:

`user > invocation context > goal context/template defaults/system auto`

For Goal identity specifically, current canonical precedence is:

`explicit selectedGoalPath > formData.goalPath/目标 > direct context.goalPath/目标 > nested __recordUiContext.goalContext > existing item.goalPath`

The tests must fail if a lower-priority source silently overwrites a higher-priority source.

---

## 2. Context producers that must remain covered

### 2.1 Timeline click create — P0

Producer: `src/app/actions/recordCreate/timelineCreateAction.ts`

Required context:

- Record type: `core.task`
- `日期`: clicked Timeline day
- canonical `startAt`
- canonical `endAt` when a valid following boundary exists
- legacy `时间` / `结束` aliases only for old GoalTemplate compatibility
- `__recordUiContext.kind = timeline_create`
- `__recordUiContext.timeContext` with:
  - clicked date
  - `clickedMinute`
  - `suggestedStartMinute`
  - `suggestedEndMinute`
  - start source
  - end source
  - previous block identity
  - next block identity

The metadata is diagnostic context and must never become Record fields.

### 2.2 Heatmap cell create — P0

Producer: `src/app/actions/recordCreate/heatmapCreateAction.ts`

Required context where available:

- `日期`
- Goal path in both canonical direct context and nested Goal context
- copied content when the source cell/item supplies it
- rating value/label pair
- `__recordUiContext.kind = heatmap_create`
- date and Goal metadata

### 2.3 Statistics cell create — P0

Producer: `src/app/actions/recordCreate/statisticsCreateAction.ts`

Required context:

- period type and anchor date
- concrete category
- Goal context when supplied
- filter diagnostics
- source cell coordinates (day/week/month/quarter/year values)
- `__recordUiContext.kind = statistics_create`

A Statistics cell without a concrete category must not create a Record.

### 2.4 View-header create — P1

Producer: `src/app/actions/recordCreate/viewHeaderCreateAction.ts` + `ActionService`

Required behavior:

- preserve the QuickInput context returned by `ActionService`
- preserve date / period / equality-filter-derived field context
- Energy header create may carry a Goal path without requiring GoalTemplate

### 2.5 Edit entry — P0

Producer: `src/app/actions/recordEditActions.ts`

Required metadata:

- `kind = entry_edit`
- Record identity
- source path / source line when known
- category
- opening surface (`timeline`, `timer`, etc.)

Actual editable values must come from canonical edit backfill, not from this diagnostic envelope.

### 2.6 Timer create — P1

Producer: `TimerView` / `ActionService.getQuickInputConfigForNewTimer()`

Required behavior:

- creates `core.task`
- timer source stays distinct from generic QuickInput source
- successful create can start the created Task
- no fake date/time should be invented merely because the entry point is Timer

### 2.7 Manual QuickInput command — P1

Required behavior:

- no view context is assumed
- defaults come from GoalTemplate/system policy only
- switching type/Goal must not retain incompatible context

---

## 3. Timeline context product contract

This is a P0 interaction contract because it directly controls the historical time record.

### 3.1 Gap-filling rule

Assume the clicked day has:

- Task A: 00:40–01:20
- Task B: 02:00–03:00

If the user clicks the empty gap at 01:30:

- clicked minute = 90
- previous block end = 80
- next block start = 120
- suggested start = **01:20**, not 01:30
- suggested end = **02:00**
- derived duration = **40 minutes**

This restores the original “click the Timeline and fill the previous unrecorded period” workflow.

### 3.2 Before the first block

Example:

- first Task begins at 02:00
- user clicks 01:00

Expected:

- start = 01:00 (clicked slot)
- end = 02:00 (next block start)
- duration = 60

There is no previous block, so the system must not invent one.

### 3.3 Between blocks

Expected:

- start = nearest previous block end
- end = nearest next block start
- block order in the incoming array must not matter

The resolver must choose boundaries by time, not by array position.

### 3.4 After the last block

Example:

- final Task ends at 03:00
- user clicks 04:00

Expected:

- start = 03:00
- end = blank/open

This allows the user to enter the untracked activity that followed the last known Task.

### 3.5 Exact touching boundary

If Task A ends exactly when Task B starts, clicking that exact boundary must not create a fake zero-minute range.

Expected:

- start may be the boundary
- end remains open unless a strictly later next boundary exists

### 3.6 Canonical datetime requirement

Timeline context must populate:

- `startAt = YYYY-MM-DDTHH:mm`
- `endAt = YYYY-MM-DDTHH:mm`

It is not sufficient to populate only the legacy clock fields `时间` / `结束`, because the current Task schema uses canonical datetime fields.

### 3.7 Hydration closure

The test must prove:

`Timeline click -> context.startAt/endAt -> QuickInput template hydration -> expectedDurationMinutes`

For 01:20–02:00 the editor state must contain:

- `startAt = 2026-05-13T01:20`
- `endAt = 2026-05-13T02:00`
- `expectedDurationMinutes = 40`
- start/end source = `context`
- duration source = `system_auto`

### 3.8 User ownership after hydration

After Timeline context fills a time, if the user changes `startAt`, any later hydration pass must keep the user value.

This guards against the common regression:

1. context fills value;
2. user edits value;
3. component rerenders;
4. context silently overwrites the user edit.

### 3.9 Persistence closure

The integration test must prove:

`Timeline context -> QuickInput hydration -> OutputPlanner -> Markdown -> parser`

The parsed Task must retain exactly the inferred start/end/duration.

A UI-only assertion is not enough.

---

## 4. Timeline scenario matrix

| ID | Previous block | Click | Next block | Expected start | Expected end | Expected source |
|---|---:|---:|---:|---:|---:|---|
| TL-C01 | none | 01:00 | 02:00 | 01:00 | 02:00 | clicked → next |
| TL-C02 | ends 01:20 | 01:30 | starts 02:00 | 01:20 | 02:00 | previous → next |
| TL-C03 | ends 03:00 | 04:00 | none | 03:00 | blank | previous → open |
| TL-C04 | ends 02:00 | 02:00 | starts 02:00 | 02:00 | blank | boundary, no zero duration |
| TL-C05 | several previous blocks | 05:00 | later block | **latest qualifying end** | earliest next start | chronological selection |
| TL-C06 | blocks passed out of order | between | out of order | same as sorted input | same | order-independent |
| TL-C07 | none | negative geometry | none | 00:00 | blank | clamped |
| TL-C08 | none | beyond day | none | 23:59 | blank | clamped |
| TL-C09 | valid gap | between | valid | canonical datetime | canonical datetime | new Task fields |
| TL-C10 | valid gap | between | valid | user edits start | context end remains | user start wins |
| TL-C11 | valid gap | between | valid | persisted value | persisted value | Markdown round trip |
| TL-C12 | metadata present | any | any | no metadata field in form | no metadata field | metadata non-persistence |

---

## 5. Goal-context matrix

| ID | Sources present | Expected Goal |
|---|---|---|
| GC-C01 | selected + form + direct + nested + item | selected |
| GC-C02 | form + direct + nested + item | form |
| GC-C03 | direct + nested + item | direct context |
| GC-C04 | nested + item | nested UI Goal context |
| GC-C05 | item only | item Goal |
| GC-C06 | valid deep Goal | root/leaf derived | 
| GC-C07 | Goal context applied | source marked `goal_context` |
| GC-C08 | user-owned Goal field | context must not silently seize ownership |

---

## 6. Hydration and field-source matrix

| ID | Existing source | New context | Expected result |
|---|---|---|---|
| HY-C01 | empty | context by field key | context fills |
| HY-C02 | empty | context by field label | context fills |
| HY-C03 | template default | context | context wins |
| HY-C04 | system auto | context | context wins |
| HY-C05 | context | updated context | context may refresh |
| HY-C06 | `user` | context | **user wins** |
| HY-C07 | select field | context label | resolves to canonical option object |
| HY-C08 | UI metadata only | no matching field | metadata stays out of formData |

---

## 7. Save-boundary rules

A context test is incomplete until these boundaries are checked:

1. UI metadata (`__recordUiContext`) is not serialized as Record metadata.
2. Goal context becomes canonical Goal identity only.
3. Canonical Task time fields remain datetime values.
4. Start + end derives duration without changing lifecycle status.
5. Context-filled fields remain editable.
6. User edits survive rerender/hydration.
7. Parsed Record data equals the intended semantic values, not merely the displayed text.

---

## 8. Automated tests added/extended

### P0 Timeline

- `test/unit/timelineCreateContext.test.ts`
  - chronological previous/next resolution
  - array-order independence
  - before-first / between / after-last
  - exact boundary / zero-duration protection
  - day-boundary clamping
  - canonical Task datetime hydration
  - derived duration
  - user ownership after hydration

- `test/integration/timelineContextPersistence.test.ts`
  - Timeline invocation context
  - QuickInput hydration
  - OutputPlanner
  - Markdown serialization
  - parser round trip

- `test/unit/app/actions/recordUiActions.test.ts`
  - actual modal invocation receives canonical Timeline fields and metadata

### P0/P1 General context

- `test/unit/recordContextContract.test.ts`
  - Goal precedence
  - root/leaf derivation
  - context vs defaults
  - field key/label matching
  - user ownership
  - metadata non-leak

- `test/unit/app/actions/recordUiActions.test.ts`
  - Heatmap context
  - Statistics context
  - View-header context
  - Edit context

- existing `test/unit/recordInputSession.test.ts`
  - session context/state preservation

- existing `test/unit/quickInputEditorModel.test.ts`
  - initial selection and field-source behavior

- existing `test/unit/recordInputClosure.test.ts`
  - Goal context closure and direct GoalTemplate create contract

---

## 9. Manual Obsidian acceptance checklist

Automated tests cannot fully reproduce pointer geometry, Modal lifecycle, Obsidian theme/runtime, or real vault persistence. Before release, manually run these P0 checks.

### Timeline

- [ ] Create two Tasks with a visible gap on the same day.
- [ ] Click near the middle of the gap.
- [ ] Confirm QuickInput start equals **previous Task end**, not mouse time.
- [ ] Confirm end equals next Task start.
- [ ] Confirm derived duration equals the whole gap.
- [ ] Edit the start manually; confirm it does not jump back.
- [ ] Save; confirm the new Task appears in the exact intended Timeline gap.
- [ ] Reload Obsidian; confirm the range remains identical.
- [ ] Click before the first Task; confirm click time → first Task start.
- [ ] Click after the last Task; confirm previous Task end → open end.
- [ ] Test a day with no Tasks; confirm start follows click time.
- [ ] Test touch/double-tap behavior on mobile if mobile Timeline creation is enabled.

### Heatmap

- [ ] Create from a dated cell.
- [ ] Confirm date, Goal and rating context are prefilled.
- [ ] Change a prefilled value manually and save.
- [ ] Confirm the user change wins.

### Statistics

- [ ] Create from a concrete category cell.
- [ ] Confirm period/date/category context.
- [ ] Confirm a cell with “全部” does not create.

### Edit

- [ ] Open a Timeline Task for edit.
- [ ] Confirm edit values come from the existing Record, not create-context defaults.
- [ ] Save one field and confirm unrelated fields remain unchanged.

---

## 10. Filename/ZIP encoding contract

To avoid the previously observed `#U4ea4#...` filename corruption:

- all project filenames created by this delivery are ASCII-only;
- Chinese documentation content remains UTF-8;
- `docs/文档治理.md` has been renamed to `docs/DOCUMENT_GOVERNANCE.md`;
- the old Chinese delivery note has been moved to `docs/reports/LEGACY_DELIVERY_NOTES_1.0.61.md`;
- root implementation reports are moved under `docs/reports/`;
- ZIP creation must preserve path strings exactly and must not transform Unicode filenames into `#Uxxxx` placeholders.

This also aligns with the repository governance test that expects only `README.md` at project root.

---

## 11. AI modification protocol for context-sensitive changes

Before changing QuickInput, Timeline, Heatmap, Statistics, Goal selection, or edit flows, AI must answer these questions first:

1. Which context producer is changing?
2. Which fields are canonical and which are compatibility aliases?
3. What is the field-source ownership after hydration?
4. Can this change overwrite a user-owned value?
5. Does metadata stay non-persistent?
6. Which Goal precedence case is affected?
7. Which Timeline scenario IDs are affected?
8. Does the change survive Markdown round-trip?
9. Which automated tests were run?
10. Which manual Obsidian checks remain necessary?

A context-sensitive change is not complete if only the rendering component was tested.
