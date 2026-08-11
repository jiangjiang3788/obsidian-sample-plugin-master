# Think OS Energy 1.0.22 — Evidence-gated Energy Management

## Goal

Turn the existing observational Energy analytics into conservative, explainable **current-state management cues** without inventing causality, medical claims, or synthetic body-battery scores.

## What is new

EnergyView adds **“现在怎么用这份精力”** after the rhythm/pattern section.

It combines:

- latest total Energy and optional brain / physical dimensions;
- repeated activity before/after effects;
- ≥120min continuous-work observations;
- high-Energy continuation / late-night stopping proxy.

## Evidence gates

Personalized recovery/depletion candidates require all of the following:

1. the activity direction is stable in existing effect analytics;
2. at least `N >= 3` paired before/after samples;
3. the aggregate is not `insufficient`.

`N < 3` stays observation-only and never becomes a recommendation candidate.

## Current-state bands

- `0–40`: 低精力
- `41–60`: 需要节制
- `61–79`: 可用精力
- `>=80`: 高精力

These labels are UI management bands only. The raw 0–100 Energy value remains the source of truth.

## Brain / physical imbalance

When detailed data exists and brain / physical differ by at least 15 points, the panel names the lower dimension. Candidate ranking then gives extra weight to historical changes in that same dimension. The raw aggregate is never changed.

Example:

- latest: total 80 / brain 60 / physical 100;
- walking history: total +22.7 / brain +28.4 / N=9;
- code history: total -38.2 / brain -51.4 / N=9.

EnergyView can highlight walking as a recovery candidate and long code work as a caution candidate while preserving the underlying evidence.

## Preserve-capacity guardrails

A high-Energy guardrail appears only when there are at least 3 high-Energy → work continuation observations and the stopping proxy shows a repeated pattern such as:

- >=50% continue for at least 120 minutes; or
- >=40% continue into the configured late-night period.

A second guardrail can appear when >=120min continuous sessions have at least 3 paired Energy endpoints and an average change <= -8.

The copy says “预先设停止点 / 值得防守的区间”; it does not claim low self-control or a diagnosis.

## Demo dataset

`demo/ThinkOS Energy Demo/` contains synthetic data designed to exercise Energy 1.0.18–1.0.22 immediately:

- one explicit Missing day;
- realtime + retrospective capture;
- quick + detailed records;
- repeated code depletion;
- repeated walking recovery;
- daily sleep/body/exercise context;
- +6h/+12h/+24h Lag pairs;
- >=120min continuous work;
- high-Energy continuation samples;
- latest total 80 / brain 60 / physical 100.

The demo is isolated under a dedicated Goal `精力研究示例` and can be removed by deleting the demo folder.
