# Think OS 1.0.43 · Energy Recommendation V2

Date: 2026-08-12

## Goal

Turn Energy from “an Energy chart with a subtly reordered task list” into a real current-action decision layer, while keeping the existing Task / TaskSeries / Timer / TaskSession system as the business truth.

V2 follows this decision order:

**Availability → Value / Urgency → Energy Opportunity → Duration → Personal Learning**

It deliberately does **not** infer context or workload from task titles. A task with no context restriction remains available everywhere until the user explicitly classifies it.

---

## 1. Task duration is no longer the same thing as an Energy work block

The old recommendation path could inflate short tasks because Energy policy treated a missing/short duration like a generic focus block and imposed minimum/fallback values.

V2 separates the semantics:

- `expectedDurationMinutes` = how long the Task itself normally takes.
- Energy action-policy cap = how much of a long/open task is sensible to do in the current Energy window.

Rules:

1. Explicit Task duration wins.
2. If a recurring Task has no explicit duration, learn the median duration from TaskSessions in the **same TaskSeries**.
3. If a one-off Task has no explicit duration, use same-Task history if available.
4. Do not borrow Goal/Theme duration as if it were the duration of a specific Task.
5. Explicit and learned durations support **1 minute** minimum.
6. Generic 30/45/60 minute work blocks are used only when the real Task duration is unknown.

This means a 1-minute calcium task stays a 1-minute countdown instead of being converted into 10/30 minutes.

---

## 2. Canonical Task recommendation metadata

Task and TaskSeries now have canonical recommendation fields:

- `expectedDurationMinutes`
- `energyDemand`
- `brainDemand`
- `physicalDemand`
- `availabilityContexts`
- `recoveryIntent`

Demand fields use `low / medium / high`.

Availability contexts use:

- `any`
- `work`
- `home`
- `commute`
- `out`

These fields are part of Record schema, Markdown codec, parser, repository patching, cache, capture fields and TaskSeries recurrence inheritance.

The recommendation engine no longer reads the old `extra['精力要求']` style compatibility fields.

---

## 3. Current context is a hard execution boundary

EnergyView now has a lightweight current-context selector:

- 任意
- 工作
- 家
- 通勤
- 外出

Context is persisted in the Energy View config.

Recommendation behavior:

- A task without `availabilityContexts` is unrestricted.
- `any` is unrestricted.
- When the current context is `work`, a Task explicitly marked only `home` is removed **before ranking**.
- Context filtering affects the Top recommendations, not the full Task list; the Task still exists and remains visible under “全部任务”.

No title guessing exists. Think OS will not infer that “整理房间” is home-only from its name.

---

## 4. High-Energy opportunity cost

V2 no longer treats every short/light Task as an equally good recommendation during a high-Energy window.

The recommendation band is now shared with Energy management:

- low / recovery window: score <= 40
- steady / available window: between low and high
- high / use-capacity window: score >= 80

At high Energy:

- urgent / high-priority work gets stronger weight;
- high-brain work is favored when brain Energy is high;
- high-physical work is favored when physical Energy is high;
- low-demand micro tasks receive an opportunity-cost penalty unless they are urgent/high-value;
- recovery-intent tasks are deprioritized.

At low Energy:

- recovery-intent and low-load tasks are favored;
- high-brain/high-physical tasks are penalized when current capacity is low.

This is still deterministic and inspectable; it does not guess task semantics from titles.

---

## 5. Recurring Task metadata survives future occurrences

`TaskCompletionMutation` now copies canonical recommendation metadata from TaskSeries to the next Task occurrence:

- duration
- Energy demand
- brain demand
- physical demand
- availability contexts
- recovery intent

Editing the current recurring Task also synchronizes these defaults back to its TaskSeries for future occurrences (`includeCurrent: false` because the current Task has already been written).

Therefore a recurring task can be classified once through the normal Task edit UI instead of being configured every day.

---

## 6. Energy recommendation UI

Energy now has a distinct, flat recommendation section above the full Goal/Cadence task structure:

- `现在适合`
- current Energy state + score
- current context selector
- Top 3 Tasks
- countdown duration
- play affordance

It is deliberately **not a card UI**.

Recommendation reasons/evidence are not shown in the main interface. They are available only through hover `title`, together with the countdown and interaction hints.

The existing complete task structure remains under `全部任务`.

---

## 7. Countdown restored

Energy-started Timers now use the recommended duration as a visible countdown:

- 1-minute Task → `01:00`
- 45-minute focus block → `45:00`
- after the target is exceeded → `+00:01:23` style overtime

Normal non-Energy timers remain count-up timers.

The Energy timer minimum is now 1 minute instead of 10 minutes.

---

## 8. Personal Energy learning loop repaired

The previous runtime dropped the latest Energy Record ID before starting a Task, which prevented TaskSession from reliably storing a before-Energy reference.

V2 carries:

`Energy Record ID → EnergyTaskListModel.latestEnergy.itemId → EnergyView.startEnergyTask() → baselineEnergyItemId → Timer → TaskSession.startEnergyRecordId`

When the next Energy snapshot is recorded after the work session, the existing linking path can attach it as `endEnergyRecordId` and calculate:

- `energyDelta`
- `brainDelta`
- `physicalDelta`

Energy-started timer completion/end notices now gently remind the user that a new Energy snapshot can improve personalization. This is post-action learning feedback, not visible recommendation explanation.

---

## 9. Cache schema

Cache schema version increased:

- 13 → **14**

The new Task recommendation metadata is persisted in `CachedItem`, avoiding a runtime where the source Record has recommendation metadata but cached items silently lose it.

---

## 10. Current calcium Task data correction

The user explicitly stated that `吃钙片` normally takes about one minute.

A non-destructive copy of the current vault was prepared where only the active calcium TaskSeries and its current open Task are changed:

- `taskseries.01KKWHF700YCJ797NYPHEN3C06` → `预计时长:: 1`
- `task.01KMBZVH003MD00WCRA9MMWEFT` → `预计时长:: 1`

Record count remains unchanged.

No availability context, brain demand, physical demand or recovery intent was guessed from task titles.

---

## 11. Governance

The Energy platform gate now protects the V2 architecture, including:

- canonical Task recommendation fields;
- no legacy `extra` demand reads;
- context hard filtering;
- same-series duration learning;
- 1-minute duration support;
- TaskSeries inheritance;
- recurring edit → TaskSeries synchronization;
- baseline Energy Record ID propagation;
- countdown timer behavior;
- flat Top recommendations with hover-only explanation;
- cache v14 recommendation metadata;
- high-Energy opportunity-cost logic.

---

## 12. Validation

Final `npm run gate`:

- 8 aggregate gate groups: **PASS**
- 37 referenced internal checks: **PASS**
- Energy Recommendation V2 gate: **PASS**

Changed TS/TSX files were checked through TypeScript `transpileModule`:

- **35 changed TS/TSX files: PASS**

Full Jest / build / typecheck are not claimed in this delivery environment:

- Jest binary is not installed (`jest: not found`).
- Vite binary is not installed (`vite: not found`).
- source typecheck bootstrap lacks `@types/node`, `preact`, and `vite/client` type definitions.

