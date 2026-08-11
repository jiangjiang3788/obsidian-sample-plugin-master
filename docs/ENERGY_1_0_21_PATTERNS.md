# Think OS Energy 1.0.21 — Rhythm / Lag / Continuous Work / Stop Proxy

## Goal
Use sparse Energy + existing Task timing data to surface personal temporal patterns without inventing missing values or causal conclusions.

## Added analytics
- Daypart rhythm: 00–06, 06–10, 10–14, 14–18, 18–22, 22–24; mean, median, N, optional brain/physical means.
- Lag observations: nearest real sample around +6h / +12h / +24h with explicit tolerances. No target sample means Missing, never interpolation.
- Continuous work sessions: adjacent task intervals with gaps <=15 minutes are merged; duration buckets are <30 / 30–59 / 60–89 / 90–119 / >=120 minutes.
- Session Energy change is only computed when a real Energy sample exists shortly before the session and shortly after it.
- High-energy stop proxy: for Energy >=80, observe whether work is active/starts within 60 minutes, time until that session ends, >=120 minute continuations, and 23:00+/cross-midnight continuations.
- Stop proxy is explicitly behavioral and is not labeled as a psychological ability score.

## UI
EnergyView gets a dedicated `节律 · Lag · 连续工作 · 停止代理` panel. The analysis window is configurable from 7 to 90 days (default 30).

## Data rules
- Missing remains Unknown.
- No cross-goal mixing; EnergyView builds patterns inside each goal panel.
- N<3 = observation only, N=3–4 = exploratory, N>=5 = relatively supported.
- Runtime only: no Energy or Task Markdown is rewritten.
