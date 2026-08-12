import { runGateGroup } from './run-group.mjs';
runGateGroup("stability", [
  "stability-runtime-gate.mjs",
  "governance-gate.mjs"
]);
