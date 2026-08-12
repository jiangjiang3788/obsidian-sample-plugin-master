import { runGateGroup } from './run-group.mjs';
runGateGroup("task-session", [
  "task-platform-gate.mjs",
  "timer-view-runtime-boundary-gate.mjs"
]);
