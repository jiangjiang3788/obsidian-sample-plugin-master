import { runGateGroup } from './run-group.mjs';
runGateGroup("records", [
  "settings-schema-gate.mjs",
  "record-platform-gate.mjs"
]);
