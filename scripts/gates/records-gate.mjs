import { runGateGroup } from './run-group.mjs';
runGateGroup("records", [
  "settings-schema-gate.mjs",
  "goal-domain-gate.mjs",
  "field-foundation-v5-gate.mjs",
  "record-platform-gate.mjs"
]);
