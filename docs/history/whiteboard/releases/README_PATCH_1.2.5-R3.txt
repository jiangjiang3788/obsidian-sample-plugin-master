ThinkOS Whiteboard 1.2.5 R3 reliability patch

Base: ThinkOS 1.2.5 R2
Scope:
- Nested exit buttons directly gated by activeGroupId
- Content-aware Home at 100%
- Universal Fit Current Canvas recovery
- Nested enter/parent/root use real-content Home
- Recovery/navigation regression tests

After applying source patch, rebuild the runtime bundle before opening Obsidian:
  npm run build:debug
Then run the R3 test commands in doc/Whiteboard_1.2.5_R3_TEST_REPORT.md.
