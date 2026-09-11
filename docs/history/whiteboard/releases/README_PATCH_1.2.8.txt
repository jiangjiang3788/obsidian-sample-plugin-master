ThinkOS Whiteboard 1.2.8 — Semantic Overview batch

Base: 1.2.5 R3 SOURCE
Final package version: 1.2.8

Included milestones:
- 1.2.6 Semantic Zoom / LOD
- 1.2.7 Fixed-screen Card / Workbench / Annotation locators
- 1.2.8 Click locator to recover the real world position at 100%

Important behavior:
- >=35%: normal detail UI
- 10%~35%: compact fixed-screen Card + Workbench locators
- <10%: overview dots/locators
- minimum 0.5% zoom still keeps locators visible via 1/zoom compensation
- locator focus changes only camera/zoom; durable whiteboard data is untouched

All new delivery documentation is under doc/.
