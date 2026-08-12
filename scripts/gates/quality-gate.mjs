import { runGateGroup } from './run-group.mjs';
runGateGroup("quality", [
  "quality-contracts-gate.mjs",
  "any-budget-gate.mjs",
  "refactor-budget-gate.mjs"
]);
