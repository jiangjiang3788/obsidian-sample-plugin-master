import { runGateGroup } from './run-group.mjs';
runGateGroup("product", [
  "secret-gate.mjs",
  "product-release-gate.mjs",
  "single-user-convergence-gate.mjs",
  "docs-governance-gate.mjs"
]);
