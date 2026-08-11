# Think OS Energy 1.0.23 — Weekly Review + N-of-1 Experiment

## Goal

Turn the existing Energy observations into a compact **recent-week review** and one conservative **N-of-1 before/after experiment slot** without introducing a new record type, causal claims, or synthetic scores.

## Weekly review

EnergyView adds `最近一周复盘`, ending on the latest valid Energy sample. It summarizes:

- sampled / Missing days;
- sample count and realtime / retrospective split;
- day-balanced total / brain / physical means;
- median day-level Energy;
- higher / lower sampled dayparts when each has at least 2 observations;
- recovery / depletion candidates only when the existing effect model has stable direction and `N>=3`;
- >=120min continuous-work paired change when available.

### Recording-density protection

Weekly total / brain / physical means are **day-balanced**: the system first computes each sampled day's mean, then averages sampled days. A day with ten captures therefore does not automatically outweigh a day with one capture.

Missing remains Unknown and is never imputed.

## N-of-1 experiment slot

EnergyView settings now support one lightweight experiment definition:

- experiment name;
- optional hypothesis;
- intervention start date;
- before/after window length, default 7 days.

The comparison uses:

- baseline = N calendar days immediately before the intervention date;
- intervention = intervention date through the next N-1 days.

Both period means are also day-balanced.

### Readiness gate

The experiment is only marked `ready` when **both** periods have:

- at least 3 sampled days; and
- at least 5 Energy samples.

Otherwise it remains `collecting` and trend is `insufficient`.

When ready, the UI shows the difference in:

- total mean Energy;
- brain mean Energy, when available;
- physical mean Energy, when available.

A difference of at least +5 is labelled `干预期更高`; <= -5 is `干预期更低`; smaller differences are `差异较小`.

These are observational time-period differences only. The experiment panel explicitly warns about concurrent sleep, workload, season, and other changes.

## Demo

The bundled demo adds four lower-Energy baseline days (2026-07-28 through 2026-07-31). To exercise the experiment UI, configure:

- name: `代码每 60min 后休息 15min`
- hypothesis: `干预后综合精力会更高`
- intervention date: `2026-08-04`
- window: `7`

The synthetic result is intentionally positive for UI verification; it is not evidence that the named intervention works.
