#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jestEntry = path.resolve('node_modules', 'jest', 'bin', 'jest.js');

function failInstall(message, detail) {
  console.error(`\n【测试准备】${message}`);
  if (detail) console.error(`【测试准备】技术原因：${detail}`);
  console.error('【测试准备】请关闭 Obsidian 后，在项目目录运行：npm ci');
  console.error('【测试准备】安装完成后直接运行：npm test');
  process.exit(1);
}

if (!fs.existsSync(jestEntry)) {
  failInstall('没有找到 Jest，项目依赖尚未安装完整。');
}

try {
  // 不只检查“目录存在”，而是真正加载 Jest 的 jsdom 测试环境。
  // 这样可以在测试开始前发现 symbol-tree 等传递依赖缺文件/损坏，
  // 避免把一个环境问题扩散成数百个“套件失败”。
  require('jest-environment-jsdom');
} catch (error) {
  const raw = error instanceof Error ? error.message : String(error);
  const firstLine = raw.split(/\r?\n/, 1)[0];

  if (raw.includes("Cannot find module './TreePosition'") || raw.includes('symbol-tree')) {
    failInstall(
      'Jest 的 jsdom 依赖不完整：symbol-tree 缺少运行文件。这是本机 node_modules 损坏，不是业务测试失败。',
      firstLine,
    );
  }

  failInstall('Jest 的 jsdom 测试环境无法加载，依赖可能安装不完整或已损坏。', firstLine);
}

try {
  require.resolve('ts-jest');
} catch (error) {
  const raw = error instanceof Error ? error.message : String(error);
  failInstall('没有找到 ts-jest，TypeScript 测试转换器未安装完整。', raw.split(/\r?\n/, 1)[0]);
}

console.log('【测试准备】测试运行环境健康，开始执行日常测试。');
