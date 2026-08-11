# Energy 1.0.19 — Recovery / Depletion Candidate Analytics

## Goal

Turn sparse Energy snapshots plus completed task intervals into conservative, reviewable **before/after associations** without writing inferred causes back to Markdown.

This version answers exploratory questions such as:

- Which repeated activities are followed by higher or lower Energy?
- Do brain and physical Energy move differently after the same activity?
- Are longer activity blocks associated with different Energy changes?
- Is there enough data to say anything yet?

It does **not** claim causation and does not produce management recommendations.

## Pairing rule

An activity is eligible when it is a task-like record with a resolvable start/end interval.

A candidate sample requires:

1. one Energy observation at/before activity start within 120 minutes;
2. one Energy observation at/after activity end within 90 minutes;
3. both observations belong to the same Goal as the activity;
4. the before and after observations are different records;
5. there is no other same-Goal task of at least 10 minutes materially between the two Energy observations.

Ambiguous activities are excluded rather than force-attributed.

### Confidence

- `high`: baseline gap <= 60 min and result gap <= 30 min;
- `medium`: still inside the pairing windows but outside the high-confidence thresholds.

The UI reports total paired activities and high-confidence pairs.

## Delta model

For every paired activity:

- `deltaScore = after overall Energy - before overall Energy`
- `deltaBrain` exists only when **both** Energy observations contain detailed brain scores;
- `deltaPhysical` exists only when **both** observations contain detailed physical scores.

Missing dimensions remain missing. No dimension is imputed from the overall score.

## Aggregation dimensions

The same candidate samples are aggregated three ways:

1. **Activity** — transparent rule-based categories for common repeated activities (code/development, meetings, reading/learning, writing/recording, sleep/nap, exercise/activity, phone/short-video, meals, family/companionship, housework/organizing). Unknown activity text falls back to the task title.
2. **Theme** — `themePath`, then `theme`, then root/leaf theme, else `未标主题`.
3. **Duration** — `<30min`, `30–59min`, `60–89min`, `90–119min`, `>=120min`.

Each aggregate reports:

- N
- mean overall delta
- median overall delta
- mean brain delta when available
- mean physical delta when available
- mean duration

## Small-sample protection

Trend labels use both sample count and robust direction:

- `N < 3`: `观察中` / insufficient — never labeled recovery or depletion.
- `N = 3–4`: exploratory evidence.
- `N >= 5`: supported evidence for personal review.

When evidence is sufficient:

- recovery candidate: mean >= +8 and median >= +5;
- depletion candidate: mean <= -8 and median <= -5;
- otherwise: mixed.

These labels mean **personal before/after association only**, not causal effect.

## Goal UI

Expanded Goal Energy now shows:

1. sparse Energy timeline and coverage (1.0.18);
2. `活动前后变化` analysis;
3. candidate discovery summary, when evidence is sufficient;
4. groups by activity / theme / duration;
5. overall, brain, physical deltas and N;
6. explicit causal disclaimer.

Example:

```text
活动前后变化                  可配对 8/21 · 高可信 5
可能恢复：睡眠 / 午睡 +18 · N=4
可能消耗：代码 / 开发 -22 · N=5

按活动
代码 / 开发    偏消耗 · N=5 · 样本较充分    综合 -22   脑 -28   体 -13
睡眠 / 午睡    偏恢复 · N=4 · 初步样本      综合 +18   脑 +12   体 +25
```

## Storage and compatibility

- No new Markdown field is required.
- Existing Energy records are not modified.
- Existing tasks are not modified.
- Analytics are recomputed at runtime from current records.
- Missing Energy remains unknown.
- Goal XP remains unaffected by Energy.
