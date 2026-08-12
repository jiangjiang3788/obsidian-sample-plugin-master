import { runGateGroup } from './run-group.mjs';
runGateGroup("ui-runtime", [
  "shared-view-convergence-gate.mjs",
  "non-shared-view-convergence-gate.mjs",
  "settings-persistence-gate.mjs",
  "ui-compatibility-gate.mjs",
  "freeform-layout-boundary-gate.mjs",
  "css-boundary-gate.mjs",
  "settings-view-runtime-gate.mjs"
]);
