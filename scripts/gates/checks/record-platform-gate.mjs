#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function check_record_schema_contract_gate() {
  const root = process.cwd();
  const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
  const fail = (message) => { console.error(`[record-schema-contract] ${message}`); process.exitCode = 1; };

  const contracts = read('src/core/records/schema/contracts.ts');
  const registry = read('src/core/records/schema/registry.ts');
  const recordTypes = read('src/core/recordTypes/registry.ts');
  const recordsPublic = read('src/core/records/public.ts');

  const requiredBlocks = ['thought','evidence','habit','plan','review','blocker','milestone','task','task-series','task-session','energy'];
  const schemaMarkers = {
    thought: "coreBlock: 'thought'",
    evidence: "coreBlock: 'evidence'",
    habit: "coreBlock: 'habit'",
    plan: "periodRecord('plan'",
    review: "periodRecord('review'",
    blocker: "simpleGoalRecord('blocker'",
    milestone: "simpleGoalRecord('milestone'",
    task: "coreBlock: 'task'",
    'task-series': "coreBlock: 'task-series'",
    'task-session': "coreBlock: 'task-session'",
    energy: "coreBlock: 'energy'",
  };
  for (const block of requiredBlocks) {
    if (!contracts.includes(schemaMarkers[block])) fail(`missing schema contract for ${block}`);
  }

  const requiredSemanticMarkers = [
    "f('记录子类型'",
    "allowedValues: ['感受', '思考']",
    "f('周期粒度'",
    "f('图片'",
    "f('精力值'",
    "f('评分模式'",
    "f('记录方式'",
    "f('时间精度'",
  ];
  for (const marker of requiredSemanticMarkers) {
    if (!contracts.includes(marker)) fail(`missing canonical field decision marker: ${marker}`);
  }

  const forbiddenLegacyContractMarkers = [
    "'creation-provenance'",
    "'migration-residue'",
    "'transitional'",
    "f('模板ID'",
    "f('模板来源'",
    "f('分类'",
    "f('精力档位'",
    "f('迁移旧实际时长'",
  ];
  for (const marker of forbiddenLegacyContractMarkers) {
    if (contracts.includes(marker)) fail(`R10 legacy contract marker must be absent: ${marker}`);
  }

  if (!registry.includes('inspectRecordFieldsAgainstSchema')) fail('missing advisory schema inspector');
  if (!registry.includes('getTargetPersistedRecordFields')) fail('missing target-persistence projection');
  if (!recordTypes.includes('RECORD_SCHEMA_DEFINITIONS') && !recordTypes.includes('ENERGY_DEFINITION')) fail('RecordType catalog must derive from authoritative Record Schema Definitions');
  if (!recordsPublic.includes("export * from './schema';")) fail('Record Schema must be exported through records public facade');

  if (!process.exitCode) console.log(`[record-schema-contract] PASS (${requiredBlocks.length} Record schemas)`);
}

check_record_schema_contract_gate();

function check_record_entity_r2_gate() {
  const root = process.cwd();
  const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
  const fail = (message) => { console.error(`[record-entity-r2-gate] FAIL: ${message}`); process.exitCode = 1; };

  const entityPath = 'src/core/records/RecordEntity.ts';
  const entity = read(entityPath);
  const index = read('src/core/services/dataStore/DataStoreIndex.ts');
  const store = read('src/core/services/DataStore.ts');
  const repo = read('src/core/records/RecordRepository.ts');
  const taskDomain = read('src/core/records/task/taskDomain.ts');
  const taskSession = read('src/core/records/task/taskSession.ts');

  if (!/export interface RecordEntity\s*\{/.test(entity)) fail('RecordEntity must be an independent interface.');
  if (/RecordEntity\s*=\s*RecordViewItem|RecordEntity\s+extends\s+RecordViewItem/.test(entity)) fail('RecordEntity must not depend on RecordViewItem.');
  if (!/export interface RecordViewItem extends RecordEntity/.test(entity)) fail('RecordViewItem must be an explicit consumer projection over RecordEntity.');

  const baseMatch = entity.match(/export interface RecordEntity\s*\{([\s\S]*?)\n\}/);
  if (!baseMatch) fail('Cannot inspect RecordEntity base interface.');
  else {
    const forbiddenBaseFields = [
      'status', 'seriesId', 'recurrenceInfo', 'seriesStartDate', 'currentTaskId', 'rolloverPolicy',
      'priority', 'expectedDurationMinutes', 'taskId', 'sessionStartedAt', 'sessionEndedAt',
      'sessionDurationMinutes', 'sessionResult', 'sessionSource', 'suggestedDurationMinutes',
      'startEnergyRecordId', 'endEnergyRecordId', 'energyDelta', 'brainDelta', 'physicalDelta',
      'rating', 'image', 'pintu', 'displayCount', 'levelCount', 'countForLevel', 'manuallyEdited',
    ];
    for (const field of forbiddenBaseFields) {
      if (new RegExp(`\\b${field}\\??\\s*:`).test(baseMatch[1])) fail(`domain-only field leaked back into RecordEntity: ${field}`);
    }
  }

  if (fs.existsSync(path.join(root, 'src/core/types/schema.ts'))) fail('R8 requires the legacy high-fan-in core/types/schema.ts router to stay deleted.');

  const scanRoots = ['src'];
  for (const scanRoot of scanRoots) {
    const stack = [path.join(root, scanRoot)];
    while (stack.length) {
      const current = stack.pop();
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else if (/\.(ts|tsx)$/.test(entry.name)) {
          const text = fs.readFileSync(full, 'utf8');
          if (/\b(?:interface|type)\s+Item\b/.test(text)) fail(`legacy Item type declaration remains: ${path.relative(root, full)}`);
        }
      }
    }
  }

  if (!/Map<string, RecordEntity\[\]>/.test(index)) fail('DataStoreIndex file index must store RecordEntity[].');
  if (!/private records: RecordEntity\[\]/.test(index)) fail('DataStoreIndex canonical in-memory collection must be RecordEntity[].');
  if (!/getRecordEntityById\(recordId: string\): RecordEntity \| null/.test(store)) fail('DataStore must expose canonical entity lookup.');
  if (!/Promise<RecordEntity \| null>/.test(repo)) fail('RecordRepository getById must return RecordEntity.');
  if (!/type TaskRecord = RuntimeTaskRecord/.test(taskDomain) || !/RecordEntity \| null \| undefined/.test(taskDomain)) fail('Task domain must narrow from RecordEntity.');
  if (!/type TaskSessionRecord = RuntimeTaskSessionRecord/.test(taskSession) || !/RecordEntity \| null \| undefined/.test(taskSession)) fail('TaskSession domain must narrow from RecordEntity.');

  if (!process.exitCode) console.log('[record-entity-r2-gate] PASS: canonical RecordEntity is separated from RecordViewItem and domain-only fields stay typed.');
}

check_record_entity_r2_gate();

function check_record_schema_definition_r3_gate() {
  const root = process.cwd();
  const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
  const fail = (message) => { console.error(`[record-schema-r3] ${message}`); process.exitCode = 1; };

  const types = read('src/core/records/schema/types.ts');
  const definitions = read('src/core/records/schema/definitions.ts');
  const coreBlocks = read('src/core/blocks/defaultCoreBlocks.ts');
  const coreBlockTypes = read('src/core/blocks/types.ts');
  const recordTypeRegistry = read('src/core/recordTypes/registry.ts');
  const sourceFiles = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) sourceFiles.push(full);
    }
  }
  walk(path.join(root, 'src'));
  const allSource = sourceFiles.map((p) => fs.readFileSync(p, 'utf8')).join('\n');

  if (!types.includes('interface RecordSchemaDefinition extends RecordSchemaContract')) fail('missing authoritative RecordSchemaDefinition');
  if (!types.includes("RecordCaptureMode = 'template' | 'direct' | 'internal'")) fail('capture mode must live in schema definition types');
  if (!definitions.includes('RECORD_SCHEMA_DEFINITIONS')) fail('missing canonical definition catalog');
  for (const marker of ['THOUGHT_DEFINITION','EVIDENCE_DEFINITION','HABIT_DEFINITION','PLAN_DEFINITION','REVIEW_DEFINITION','BLOCKER_DEFINITION','MILESTONE_DEFINITION','TASK_DEFINITION','TASK_SERIES_DEFINITION','TASK_SESSION_DEFINITION','ENERGY_DEFINITION']) {
    if (!definitions.includes(marker)) fail(`missing canonical definition: ${marker}`);
  }
  if (!coreBlocks.includes('RECORD_SCHEMA_DEFINITIONS') || coreBlocks.includes('block({')) fail('DEFAULT_CORE_BLOCKS must be derived, not independently declared');
  if (!recordTypeRegistry.includes('RECORD_SCHEMA_DEFINITIONS') || !recordTypeRegistry.includes('ENERGY_DEFINITION')) fail('record type registry must derive from schema definitions');
  if (/\bRecordTypeDefinition\b/.test(allSource)) fail('RecordTypeDefinition must be retired; use RecordSchemaDefinition');
  if (/interface\s+CoreBlockDefinition\b/.test(coreBlockTypes)) fail('CoreBlockDefinition must not be an independent interface');
  if (/\bBlockTemplate\b/.test(allSource)) fail('legacy BlockTemplate type name must be retired; use RecordCaptureTemplate');
  if (!allSource.includes('RecordCaptureTemplate')) fail('RecordCaptureTemplate boundary missing');

  if (!process.exitCode) console.log('[record-schema-r3] PASS (single RecordSchemaDefinition authority)');
}

check_record_schema_definition_r3_gate();

function check_generic_record_codec_r4_gate() {
  const failures = [];
  const read = (file) => fs.readFileSync(file, 'utf8');
  const requireText = (file, text) => {
    if (!read(file).includes(text)) failures.push(`${file} must include ${JSON.stringify(text)}`);
  };
  const forbidText = (file, text) => {
    if (read(file).includes(text)) failures.push(`${file} must not include ${JSON.stringify(text)}`);
  };

  const draft = read('src/core/records/RecordDraft.ts');
  const planner = read('src/core/recordInput/snapshot/OutputPlanner.ts');
  const definitions = read('src/core/records/schema/definitions.ts');
  const blockResolver = read('src/core/blocks/resolveCoreBlocks.ts');
  const templateResolver = read('src/core/services/GoalTemplateResolver.ts');
  const goalPatch = read('src/features/settings/goalTemplates/model/GoalTemplatePatchModel.ts');

  for (const marker of [
    'export interface RecordDraft',
    'buildGenericRecordDraft(',
    "schema.family !== 'generic'",
    'targetContract(',
    "case '记录子类型'",
    "case '评分'",
    "case '图片'",
    "case '周期粒度'",
  ]) {
    if (!draft.includes(marker)) failures.push(`RecordDraft missing ${marker}`);
  }

  for (const marker of [
    'buildGenericRecordDraft',
    'encodeRecordDraft',
    "schema?.family === 'generic'",
    'unknown_record_schema:${coreBlock}',
  ]) {
    if (!planner.includes(marker)) failures.push(`OutputPlanner missing ${marker}`);
  }

  // Canonical schema definitions no longer own Markdown grammar strings.
  if (/outputTemplate:\s*[`'"]<!-- start -->/.test(definitions)) {
    failures.push('canonical RecordSchemaDefinition must not contain Markdown output grammar');
  }

  if (blockResolver.includes('patch.outputTemplate')) failures.push('CoreBlock patches must not override canonical Record grammar');
  if (templateResolver.includes('patch.outputTemplate')) failures.push('GoalTemplateResolver must not merge outputTemplate grammar overrides');
  if (goalPatch.includes('outputTemplate')) failures.push('GoalTemplate save path must not expose outputTemplate after R10 hard cut');

  requireText('src/core/records/codec/MarkdownRecordCodec.ts', 'export function encodeRecordDraft');

  requireText('src/core/records/codec/MarkdownRecordCodec.ts', "['记录子类型', 'recordsubtype', 'subtype']");
  requireText('src/core/utils/parser.ts', 'recordSubtype: parsed.recordSubtype');
  requireText('src/core/utils/parser.ts', '`闪念/${parsed.recordSubtype}`');
  forbidText('src/core/goal/templateMode.ts', 'patch.outputTemplate');
  requireText('src/features/settings/input/BlockManager.tsx', 'Canonical Record 的 Markdown Block 由 RecordSchemaDefinition + Record Codec 统一生成');
  requireText('src/features/settings/goalTemplates/GoalTemplateEditorModal.tsx', 'Goal Template 只定义字段、默认值与保存位置，不覆盖存储 grammar');

  for (const forbidden of ['模板ID', '模板来源', '周期ID', "fields['分类']", "fields.分类"]) {
    if (draft.includes(forbidden) && !["模板ID", "模板来源", "周期ID"].includes(forbidden)) {
      failures.push(`RecordDraft must not explicitly emit transitional field ${forbidden}`);
    }
  }

  if (failures.length) {
    console.error('[generic-record-codec-r4] failed');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log('[generic-record-codec-r4] PASS (generic RecordDraft -> schema -> codec; canonical template grammar disabled)');
}

check_generic_record_codec_r4_gate();

function check_field_system_r5_gate() {
  const failures = [];
  const read = (file) => fs.readFileSync(file, 'utf8');
  const requireText = (file, text) => { if (!read(file).includes(text)) failures.push(`${file} must include ${JSON.stringify(text)}`); };
  const forbidText = (file, text) => { if (read(file).includes(text)) failures.push(`${file} must not include ${JSON.stringify(text)}`); };

  const fieldSchema = read('src/core/fields/FieldSchema.ts');
  const fieldDefinition = read('src/core/fields/FieldDefinition.ts');
  const captureTemplate = read('src/core/recordInput/CaptureTemplate.ts');
  const resolver = read('src/core/fields/CaptureFieldResolver.ts');
  const registry = read('src/core/fields/FieldRegistry.ts');
  const draft = read('src/core/records/RecordDraft.ts');
  const planner = read('src/core/recordInput/snapshot/OutputPlanner.ts');
  const recordSchemaTypes = read('src/core/records/schema/types.ts');
  const recordRegistry = read('src/core/records/schema/registry.ts');
  const ai = read('src/core/ai/AiConfigSnapshot.ts');

  for (const marker of ['export interface FieldSchema', 'export interface CaptureFieldConfig', 'valueType: FieldValueType', 'fieldValueTypeForInputType']) {
    if (!fieldSchema.includes(marker)) failures.push(`FieldSchema missing ${marker}`);
  }
  if (!fieldDefinition.includes('FieldSchema as FieldDefinition')) failures.push('FieldDefinition must be a compatibility alias to FieldSchema');
  if (!captureTemplate.includes('export type TemplateField = CaptureFieldConfig')) failures.push('TemplateField must be a settings DTO alias, not a second runtime field schema');
  if (captureTemplate.includes('export interface TemplateField')) failures.push('TemplateField interface must not duplicate FieldSchema');

  for (const marker of ['resolveCaptureFieldSchema', "source: 'extra'", "storage: { scope: 'extra', markdownKey: key }"]) {
    if (!resolver.includes(marker)) failures.push(`CaptureFieldResolver missing ${marker}`);
  }
  if (registry.includes("type: 'string'")) failures.push('FieldRegistry must use FieldSchema.valueType rather than a second `type` meaning');
  if (!registry.includes("valueType: 'string'")) failures.push('FieldRegistry must define canonical valueType');

  for (const marker of [
    'buildCustomCaptureFields(',
    'captureFields?: readonly TemplateField[]',
    "schema.capabilities.customFields",
    'Template freedom wins',
    'isSafeMarkdownFieldKey(markdownKey)',
    'RecordTemplate controls enabled fields, order, defaults and arbitrary safe',
  ]) {
    if (!draft.includes(marker)) failures.push(`RecordDraft missing ${marker}`);
  }

  for (const marker of [
    "buildCustomCaptureFields('task', renderData, input.template.fields)",
    'buildGenericRecordDraft(schema.coreBlock, renderData, input.template.fields)',
  ]) {
    if (!planner.includes(marker)) failures.push(`OutputPlanner missing ${marker}`);
  }

  if (!recordSchemaTypes.includes('customFields?: boolean')) failures.push('RecordSchema capability must explicitly declare custom-field freedom');
  if (!recordRegistry.includes('isSafeCustomRecordFieldKey')) failures.push('schema inspection must distinguish safe custom KV from unknown invalid fields');
  if (!recordRegistry.includes('if (isSafeCustomRecordFieldKey(schema.coreBlock, key)) continue;')) failures.push('safe custom KV must not be reported as schema corruption');

  if (!ai.includes('resolveCaptureFieldSchema(field)')) failures.push('AI field snapshot must consume resolved FieldSchema');

  // R4 safety remains: template freedom controls fields, never Markdown grammar.
  forbidText('src/features/settings/goalTemplates/model/GoalTemplatePatchModel.ts', 'outputTemplate');
  forbidText('src/core/blocks/resolveCoreBlocks.ts', 'patch.outputTemplate');
  forbidText('src/core/services/GoalTemplateResolver.ts', 'patch.outputTemplate');

  if (failures.length) {
    console.error('[field-system-r5] failed');
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log('[field-system-r5] PASS (Schema semantics + Template field freedom + Codec-only grammar)');
}

check_field_system_r5_gate();

function check_record_query_r6_gate() {
  const failures = [];
  const read = (file) => fs.readFileSync(file, 'utf8');
  const requireText = (file, text) => { if (!read(file).includes(text)) failures.push(`${file} must include ${JSON.stringify(text)}`); };
  const forbidText = (file, text) => { if (read(file).includes(text)) failures.push(`${file} must not include ${JSON.stringify(text)}`); };

  const queryFile = 'src/core/query/RecordQuery.ts';
  const viewQueryFile = 'src/core/query/ViewRecordQuery.ts';

  for (const marker of [
    'export interface RecordQuerySpec',
    'filterGroups?:',
    'date?: RecordQueryDateConstraint',
    'sort?: readonly SortRule[]',
    'groupBy?: readonly string[]',
    'export function executeRecordQuery',
    'export function queryRecordItems',
  ]) requireText(queryFile, marker);

  for (const marker of ['buildViewRecordQuery', 'queryViewRecords', 'queryViewBaseRecords']) requireText(viewQueryFile, marker);
  requireText('src/core/view/public.ts', "export * from '../query/RecordQuery';");
  forbidText('src/core/utils/public.ts', "export * from './itemFilter';");
  requireText('src/core/services/dataStore/DataStoreIndex.ts', 'queryRecordItems(');
  requireText('src/app/dashboard/useViewData.ts', 'queryViewRecords(');
  requireText('src/features/views/runtime/EventTimelineView/EventTimelineViewModel.ts', 'executeRecordQuery(');
  requireText('src/features/views/runtime/BlockViewModel.ts', 'executeRecordQuery(');
  requireText('src/features/views/runtime/TimelineView/TimelineViewModel.ts', "record.coreBlock === 'task-session'");

  // Canonical task closure semantics must never regress to category/raw text inference.
  forbidText(queryFile, 'categoryKey');
  forbidText(queryFile, 'rawSource');
  requireText(queryFile, "item.status === 'done'");

  // View/features must consume RecordQuery instead of rebuilding filter/sort/group primitives.
  const forbiddenCalls = ['filterByRules(', 'sortItems(', 'filterByDateRange(', 'filterByKeyword(', 'filterByPeriod(', 'groupItemsByFields('];
  const roots = ['src/features', 'src/shared', 'src/app'];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) {
        const text = read(full);
        for (const marker of forbiddenCalls) {
          if (text.includes(marker)) failures.push(`${full} must use core/query instead of ${marker}`);
        }
      }
    }
  }
  for (const root of roots) if (fs.existsSync(root)) walk(root);

  // Physical simplification removes the compatibility delegate once no runtime consumer remains.
  if (fs.existsSync('src/core/utils/viewQueryPipeline.ts')) failures.push('legacy viewQueryPipeline compatibility delegate must stay removed');

  if (failures.length) {
    console.error('[record-query-r6] failed');
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log('[record-query-r6] PASS (one selection engine for filter/keyword/date/sort/group)');
}

check_record_query_r6_gate();
