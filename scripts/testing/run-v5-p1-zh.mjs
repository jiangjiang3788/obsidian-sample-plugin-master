#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const files = [
  'test/unit/dataManagementSettingsNavigation.test.tsx',
  'test/unit/goalMetricSection.test.tsx',
  'test/unit/blockManagerUi.test.tsx',
  'test/unit/generalSettingsUi.test.tsx',
  'test/unit/aiSettingsUi.test.tsx',
  'test/unit/aiChatModalView.test.tsx',
  'test/unit/quickInputFieldRendererUi.test.tsx',
  'test/unit/fieldsEditorUi.test.tsx',
  'test/unit/goalTemplateEditorUi.test.tsx',
  'test/unit/ruleBuilderUi.test.tsx',
  'test/integration/featureRegistrationComposition.test.ts',
  'test/integration/dashboardCodeblockComposition.test.ts',
  'test/integration/goalMetricsLifecycle.test.ts',
  'test/integration/blockManagerRegistryComposition.test.tsx',
  'test/integration/generalSettingsLifecycle.test.ts',
  'test/integration/aiSettingsLifecycle.test.ts',
  'test/integration/aiChatContainerFlow.test.tsx',
  'test/integration/viewRegistryRuntimeComposition.test.ts',
  'test/integration/quickInputFieldDefaultsComposition.test.ts',
  'test/integration/goalPeriodPolicyFlow.test.ts',
  'test/integration/energyTaskDemandRecommendationFlow.test.ts',
  'test/integration/aiHttpObsidianTransportFlow.test.ts',
  'test/integration/aiNaturalParserFlow.test.ts',
  'test/integration/retrievalIndexFilterFlow.test.ts',
  'test/integration/viewToolbarInteraction.test.tsx',
  'test/integration/viewHeaderCreateFlow.test.ts',
  'test/integration/dataFilterPanelFlow.test.tsx',
];

console.log(`【P1 v5 专项】准备执行 ${files.length} 个单元/组合测试文件。`);
const runner = path.resolve('scripts', 'testing', 'run-jest-zh.mjs');
const child = spawn(process.execPath, [
  runner,
  '--label', 'P1 v5 专项测试',
  '--config', 'test/configs/jest.config.js',
  '--runInBand',
  '--runTestsByPath',
  ...files,
], { stdio: 'inherit', shell: false, env: process.env });
child.on('error', () => {
  console.error('【P1 v5 专项】无法启动中文 Jest 运行层。');
  process.exit(1);
});
child.on('exit', (code, signal) => {
  if (signal) {
    console.error('【P1 v5 专项】测试进程被系统终止。');
    process.exit(1);
  }
  process.exit(code ?? 1);
});
