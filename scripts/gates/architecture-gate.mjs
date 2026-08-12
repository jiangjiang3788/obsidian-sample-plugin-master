import { runGateGroup } from './run-group.mjs';
runGateGroup("architecture", [
  "public-api-gate.mjs",
  "capability-gate.mjs",
  "arch-gate.mjs",
  "feature-gate.mjs",
  "di-gate.mjs",
  "dual-system-gate.mjs",
  "release-governance-gate.mjs",
  "runtime-boundaries-gate.mjs",
  "domain-convergence-gate.mjs",
  "dependency-public-gate.mjs"
]);
