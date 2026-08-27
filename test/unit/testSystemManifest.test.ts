import fs from 'node:fs';
import path from 'node:path';

type Risk = 'P0' | 'P1' | 'P2';

type Feature = {
  id: string;
  area: string;
  name: string;
  risk: Risk;
  sources: string[];
  required: string[];
  evidence?: Record<string, string[]>;
};

type Manifest = {
  schemaVersion: number;
  dimensions: Record<string, string>;
  features: Feature[];
};

const root = path.resolve(__dirname, '../..');
const manifestPath = path.join(root, 'test/system/feature-test-map.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Manifest;

describe('测试体系功能总账', () => {
  test('功能编号唯一且第一版至少登记 50 个功能', () => {
    expect(manifest.features.length).toBeGreaterThanOrEqual(50);
    const ids = manifest.features.map((feature) => feature.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('所有功能都使用有效风险等级与测试维度', () => {
    const dimensions = new Set(Object.keys(manifest.dimensions));
    for (const feature of manifest.features) {
      expect(['P0', 'P1', 'P2']).toContain(feature.risk);
      expect(feature.area.trim()).not.toBe('');
      expect(feature.name.trim()).not.toBe('');
      expect(feature.required.length).toBeGreaterThan(0);
      for (const dimension of feature.required) {
        expect(dimensions.has(dimension)).toBe(true);
      }
      for (const dimension of Object.keys(feature.evidence || {})) {
        expect(dimensions.has(dimension)).toBe(true);
      }
    }
  });

  test('功能来源与已有测试证据文件都真实存在', () => {
    for (const feature of manifest.features) {
      for (const source of feature.sources) {
        expect(fs.existsSync(path.join(root, source))).toBe(true);
      }
      for (const files of Object.values(feature.evidence || {})) {
        for (const file of files) {
          expect(fs.existsSync(path.join(root, file))).toBe(true);
        }
      }
    }
  });

  test('P0 功能至少声明一个可追溯的源码入口', () => {
    for (const feature of manifest.features.filter((item) => item.risk === 'P0')) {
      expect(feature.sources.length).toBeGreaterThan(0);
    }
  });
});
