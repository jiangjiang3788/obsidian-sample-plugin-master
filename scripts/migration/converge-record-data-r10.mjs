import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    out[key.slice(2)] = argv[i + 1];
    i += 1;
  }
  return out;
}

const args = parseArgs(process.argv);
const vaultIn = args.vault ? path.resolve(args.vault) : null;
const settingsIn = args.settings ? path.resolve(args.settings) : null;
const outRoot = args.out ? path.resolve(args.out) : null;
if (!vaultIn || !settingsIn || !outRoot) {
  console.error('Usage: node scripts/migration/converge-record-data-r10.mjs --vault <vault-dir> --settings <data.json> --out <output-dir>');
  process.exit(2);
}

const vaultOut = path.join(outRoot, '01');
const settingsOut = path.join(outRoot, 'data.json');
fs.rmSync(outRoot, { recursive: true, force: true });
fs.mkdirSync(vaultOut, { recursive: true });

const audit = {
  version: 'R10',
  sourceVault: vaultIn,
  sourceSettings: settingsIn,
  recordCount: 0,
  recordTypes: {},
  recordIds: [],
  removedFields: {},
  addedFields: {},
  renamedFields: {},
  settings: {
    oldSchemaVersion: null,
    newSchemaVersion: 3,
    removedOutputTemplates: 0,
    removedMigrationMarkers: [],
    thoughtCategoryFieldsMigrated: 0,
    evidenceCategoryFieldsRemoved: 0,
    inputSettingsOverridesRemoved: false,
  },
  thoughtSubtype: { 感受: 0, 思考: 0, unmapped: [] },
  habitImage: { renamed: 0, emptyDropped: 0, conflicts: 0 },
  emptyTagsRemoved: 0,
  taskSeriesCarryDefaultsRemoved: 0,
  changes: [],
};

const inc = (obj, key, n = 1) => { obj[key] = (obj[key] || 0) + n; };

function copyTreeAndTransform(srcDir, dstDir) {
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dst = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(dst, { recursive: true });
      copyTreeAndTransform(src, dst);
    } else if (entry.isFile()) {
      if (entry.name.toLowerCase().endsWith('.md')) {
        const text = fs.readFileSync(src, 'utf8');
        fs.writeFileSync(dst, transformMarkdown(text, path.relative(vaultIn, src).replaceAll('\\', '/')), 'utf8');
      } else {
        fs.copyFileSync(src, dst);
      }
    }
  }
}

function splitKv(line) {
  const match = line.match(/^([^:：]{1,64})[:：]{1,2}\s?(.*)$/);
  return match ? { key: match[1].trim(), value: match[2] ?? '' } : null;
}

function thoughtSubtypeFromLegacy(value) {
  const v = String(value || '').trim();
  if (v === '闪念/感受' || v === '感受') return '感受';
  if (v === '闪念/思考' || v === '思考') return '思考';
  return null;
}

const REMOVE_ALWAYS = new Set([
  '模板ID', '模板来源',
  '迁移旧实际时长', '迁移旧时间', '迁移旧结束', '迁移旧计划时间', '迁移旧计划结束',
]);

function transformBlock(blockText, filePath) {
  const lines = blockText.split(/\r?\n/);
  if (lines[0]?.trim() !== '<!-- start -->' || lines.at(-1)?.trim() !== '<!-- end -->') return blockText;

  const body = lines.slice(1, -1);
  const pairs = body.map((line, index) => ({ line, index, kv: splitKv(line) }));
  const map = new Map();
  for (const pair of pairs) if (pair.kv) map.set(pair.kv.key, pair.kv.value.trim());
  const recordId = map.get('记录ID') || '';
  const coreBlock = map.get('核心Block') || '';
  if (!recordId || !coreBlock) throw new Error(`R10 requires v2 Record envelope: ${filePath} record=${recordId || '(missing)'}`);

  audit.recordCount += 1;
  audit.recordIds.push(recordId);
  inc(audit.recordTypes, coreBlock);

  let subtypeToInsert = null;
  const legacyThoughtCategory = coreBlock === 'thought' ? (map.get('分类') ?? null) : null;
  if (legacyThoughtCategory !== null && !map.has('记录子类型')) {
    subtypeToInsert = thoughtSubtypeFromLegacy(legacyThoughtCategory);
    if (subtypeToInsert) {
      inc(audit.thoughtSubtype, subtypeToInsert);
      inc(audit.addedFields, '记录子类型');
    } else {
      audit.thoughtSubtype.unmapped.push({ recordId, file: filePath, value: legacyThoughtCategory });
    }
  }

  const hasImage = map.has('图片') && String(map.get('图片') || '').trim() !== '';
  const pintuValue = map.has('pintu') ? String(map.get('pintu') || '').trim() : null;
  if (coreBlock === 'habit' && hasImage && pintuValue) {
    audit.habitImage.conflicts += 1;
    throw new Error(`R10 image conflict: ${recordId} has both 图片 and pintu`);
  }

  const out = ['<!-- start -->'];
  let subtypeInserted = false;
  for (const { line, kv } of pairs) {
    if (!kv) { out.push(line); continue; }
    const { key, value } = kv;
    const trimmed = String(value || '').trim();

    if (REMOVE_ALWAYS.has(key)) {
      inc(audit.removedFields, key);
      audit.changes.push({ recordId, file: filePath, action: 'remove', field: key, before: trimmed, after: '' });
      continue;
    }

    if (key === '分类') {
      inc(audit.removedFields, key);
      audit.changes.push({ recordId, file: filePath, action: coreBlock === 'thought' && subtypeToInsert ? 'migrate' : 'remove', field: key, before: trimmed, after: subtypeToInsert ? `记录子类型=${subtypeToInsert}` : '' });
      if (coreBlock === 'thought' && subtypeToInsert && !subtypeInserted) {
        out.push(`记录子类型:: ${subtypeToInsert}`);
        subtypeInserted = true;
      }
      continue;
    }

    if ((coreBlock === 'plan' || coreBlock === 'review') && (key === '周期ID' || key === '周期')) {
      inc(audit.removedFields, key);
      audit.changes.push({ recordId, file: filePath, action: 'remove-derived', field: key, before: trimmed, after: '' });
      continue;
    }

    if (coreBlock === 'energy' && key === '精力档位') {
      inc(audit.removedFields, key);
      audit.changes.push({ recordId, file: filePath, action: 'remove-derived', field: key, before: trimmed, after: '' });
      continue;
    }

    if (coreBlock === 'habit' && key === 'pintu') {
      inc(audit.removedFields, key);
      if (trimmed) {
        out.push(`图片:: ${trimmed}`);
        audit.habitImage.renamed += 1;
        inc(audit.addedFields, '图片');
        inc(audit.renamedFields, 'pintu→图片');
        audit.changes.push({ recordId, file: filePath, action: 'rename', field: 'pintu', before: trimmed, after: `图片=${trimmed}` });
      } else {
        audit.habitImage.emptyDropped += 1;
        audit.changes.push({ recordId, file: filePath, action: 'remove-empty', field: 'pintu', before: '', after: '' });
      }
      continue;
    }

    if (key === '标签' && !trimmed) {
      audit.emptyTagsRemoved += 1;
      inc(audit.removedFields, key);
      audit.changes.push({ recordId, file: filePath, action: 'remove-empty', field: key, before: '', after: '' });
      continue;
    }

    if (coreBlock === 'task-series' && key === '滚动策略' && trimmed === 'carry') {
      audit.taskSeriesCarryDefaultsRemoved += 1;
      inc(audit.removedFields, key);
      audit.changes.push({ recordId, file: filePath, action: 'omit-default', field: key, before: trimmed, after: '' });
      continue;
    }

    out.push(line);
  }
  if (subtypeToInsert && !subtypeInserted) out.splice(4, 0, `记录子类型:: ${subtypeToInsert}`);
  out.push('<!-- end -->');
  return out.join('\n');
}

function transformMarkdown(text, filePath) {
  return text.replace(/<!-- start -->[\s\S]*?<!-- end -->/g, block => transformBlock(block, filePath));
}

function normalizeThoughtField(field) {
  if (!field || typeof field !== 'object' || field.key !== '分类') return field;
  const options = Array.isArray(field.options)
    ? field.options
        .map((option) => {
          const raw = String(option?.value ?? option?.label ?? '').trim();
          const mapped = thoughtSubtypeFromLegacy(raw);
          return mapped ? { ...option, value: mapped, label: mapped } : null;
        })
        .filter(Boolean)
    : [{ value: '感受', label: '感受' }, { value: '思考', label: '思考' }];
  const deduped = [];
  const seen = new Set();
  for (const option of options) {
    if (seen.has(option.value)) continue;
    seen.add(option.value);
    deduped.push(option);
  }
  return { ...field, key: '记录子类型', label: '记录子类型', semantic: 'recordSubtype', options: deduped };
}

function transformTemplate(template) {
  if (!template || typeof template !== 'object') return template;
  const next = { ...template };
  if (Object.prototype.hasOwnProperty.call(next, 'outputTemplate')) {
    delete next.outputTemplate;
    audit.settings.removedOutputTemplates += 1;
  }
  if (Array.isArray(next.fields)) {
    if (next.coreBlockId === 'core.thought') {
      next.fields = next.fields.map((field) => {
        if (field?.key === '分类') audit.settings.thoughtCategoryFieldsMigrated += 1;
        return normalizeThoughtField(field);
      });
    } else if (next.coreBlockId === 'core.evidence') {
      const before = next.fields.length;
      next.fields = next.fields.filter((field) => field?.key !== '分类');
      audit.settings.evidenceCategoryFieldsRemoved += before - next.fields.length;
    }
  }
  if (Array.isArray(next.requiredFields)) {
    if (next.coreBlockId === 'core.thought') next.requiredFields = next.requiredFields.map((key) => key === '分类' ? '记录子类型' : key);
    if (next.coreBlockId === 'core.evidence') next.requiredFields = next.requiredFields.filter((key) => key !== '分类');
    if (!next.requiredFields.length) delete next.requiredFields;
  }
  if (next.defaultValues && typeof next.defaultValues === 'object') {
    const defaults = { ...next.defaultValues };
    if (next.coreBlockId === 'core.thought' && Object.prototype.hasOwnProperty.call(defaults, '分类')) {
      const mapped = thoughtSubtypeFromLegacy(defaults['分类']);
      delete defaults['分类'];
      if (mapped) defaults['记录子类型'] = mapped;
    } else if (next.coreBlockId === 'core.evidence') {
      delete defaults['分类'];
    }
    next.defaultValues = defaults;
  }
  return next;
}

function transformSettings(inputPath, outputPath) {
  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  audit.settings.oldSchemaVersion = raw.schemaVersion ?? null;
  raw.schemaVersion = 3;
  for (const key of Object.keys(raw)) {
    if (/^goalCore.*Version$/i.test(key)) {
      audit.settings.removedMigrationMarkers.push(key);
      delete raw[key];
    }
  }
  if (raw.inputSettings && typeof raw.inputSettings === 'object') {
    if (Object.prototype.hasOwnProperty.call(raw.inputSettings, 'overrides')) {
      delete raw.inputSettings.overrides;
      audit.settings.inputSettingsOverridesRemoved = true;
    }
    if (Array.isArray(raw.inputSettings.blocks)) raw.inputSettings.blocks = raw.inputSettings.blocks.map(transformTemplate);
  }
  if (raw.goalSettings && Array.isArray(raw.goalSettings.goalTemplates)) {
    raw.goalSettings.goalTemplates = raw.goalSettings.goalTemplates.map(transformTemplate);
  }
  if (raw.coreBlockSettings && Array.isArray(raw.coreBlockSettings.patches)) {
    raw.coreBlockSettings.patches = raw.coreBlockSettings.patches.map((patch) => {
      const next = { ...patch };
      if (Object.prototype.hasOwnProperty.call(next, 'outputTemplate')) {
        delete next.outputTemplate;
        audit.settings.removedOutputTemplates += 1;
      }
      return next;
    });
  }
  fs.writeFileSync(outputPath, `${JSON.stringify(raw, null, 2)}\n`, 'utf8');
}

copyTreeAndTransform(vaultIn, vaultOut);
transformSettings(settingsIn, settingsOut);

const idSet = new Set(audit.recordIds);
if (idSet.size !== audit.recordIds.length) throw new Error(`Duplicate record IDs after R10: ${audit.recordIds.length - idSet.size}`);
delete audit.recordIds;

const auditPath = path.join(outRoot, 'R10_MIGRATION_AUDIT.json');
fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
const csv = ['recordId,file,action,field,before,after'];
const esc = (value) => `"${String(value ?? '').replaceAll('"', '""').replaceAll('\r', ' ').replaceAll('\n', '\\n')}"`;
for (const row of audit.changes) csv.push([row.recordId,row.file,row.action,row.field,row.before,row.after].map(esc).join(','));
fs.writeFileSync(path.join(outRoot, 'R10_RECORD_CHANGES.csv'), `${csv.join('\n')}\n`, 'utf8');
console.log(JSON.stringify({
  recordCount: audit.recordCount,
  recordTypes: audit.recordTypes,
  removedFields: audit.removedFields,
  addedFields: audit.addedFields,
  thoughtSubtype: audit.thoughtSubtype,
  habitImage: audit.habitImage,
  emptyTagsRemoved: audit.emptyTagsRemoved,
  taskSeriesCarryDefaultsRemoved: audit.taskSeriesCarryDefaultsRemoved,
  settings: audit.settings,
}, null, 2));
