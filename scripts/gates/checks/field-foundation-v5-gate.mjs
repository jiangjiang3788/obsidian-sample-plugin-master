import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const codec = read('src/core/records/codec/MarkdownRecordCodec.ts');
const fields = read('src/core/fields/FieldRegistry.ts');
const settings = read('src/core/settings/currentSettingsSchema.ts');
const bootstrap = read('src/app/bootstrap/register.ts');
const main = read('src/main.ts');

// Record Grammar V5: only explicit ASCII double-colon metadata is grammar.
if (!codec.includes("/^([^:\\r\\n]{1,64})::\\s*(.*)$/")) {
  failures.push('MarkdownRecordCodec must recognize only strict `key:: value` metadata');
}
if (codec.includes('[:：]{1,2}') || codec.includes('[:：]+')) {
  failures.push('single-colon / Chinese-colon metadata compatibility is forbidden');
}
if (!codec.includes('supportsBody') || !codec.includes('contentStarted')) {
  failures.push('codec must use schema-aware optional terminal body handling');
}
if (!codec.includes("customFields")) {
  failures.push('unknown Record KV must be gated by the schema customFields capability');
}

// Field Foundation V5: the picker is curated, not a dump of runtime Record keys.
if (!fields.includes('VIEW_FIELD_PICKER_KEYS')) {
  failures.push('FieldRegistry must define an explicit view-field picker capability set');
}
if (!fields.includes('VIEW_FIELD_PICKER_KEYS.has')) {
  failures.push('FieldRegistry must filter built-in fields through VIEW_FIELD_PICKER_KEYS');
}
if (!fields.includes("key.length > 64") || !fields.includes("/[\\r\\n:：]/.test(key)")) {
  failures.push('dynamic custom fields must be safety-checked before entering the picker');
}

// Settings Compact V5: runtime CoreBlocks are computed, never persisted as legacy inputSettings.blocks.
if (!settings.includes('export function toPersistedThinkSettings')) {
  failures.push('currentSettingsSchema must expose the persistence projection');
}
if (!settings.includes('delete out.inputSettings.blocks')) {
  failures.push('persistence projection must drop inputSettings.blocks');
}
if (!bootstrap.includes('toPersistedThinkSettings(settings)') || !main.includes('toPersistedThinkSettings(settings)')) {
  failures.push('all settings save boundaries must use the compact persistence projection');
}
if (exists('src/core/recordInput/legacyTemplateCompatibility.ts')) {
  failures.push('legacyTemplateCompatibility must stay deleted in current-only architecture');
}

if (failures.length) {
  console.error('[field-foundation-v5-gate] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('[field-foundation-v5-gate] PASS (strict Record grammar; curated fields; compact settings)');
