export const RECORD_SCHEMA_VERSION = 2;

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function encodeTime(time: number, length = 10): string {
  let value = Math.max(0, Math.floor(time));
  let output = '';
  for (let i = 0; i < length; i++) {
    output = CROCKFORD[value % 32] + output;
    value = Math.floor(value / 32);
  }
  return output;
}

function randomChars(length: number): string {
  const values = new Uint8Array(length);
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(values);
  } else {
    for (let i = 0; i < values.length; i++) values[i] = Math.floor(Math.random() * 256);
  }
  let output = '';
  for (const value of values) output += CROCKFORD[value % 32];
  return output;
}

export type RecordIdPrefix = 'rec' | 'task' | 'taskseries' | 'tasksession' | 'energy';

export function recordIdPrefixForCoreBlock(coreBlock: string | null | undefined): RecordIdPrefix {
  switch (String(coreBlock || '').trim().toLowerCase()) {
    case 'task': return 'task';
    case 'task-series': return 'taskseries';
    case 'task-session': return 'tasksession';
    case 'energy': return 'energy';
    default: return 'rec';
  }
}

export function createRecordId(coreBlock?: string | null, now = Date.now()): string {
  const prefix = recordIdPrefixForCoreBlock(coreBlock);
  return `${prefix}.${encodeTime(now)}${randomChars(16)}`;
}

export function isStableRecordId(value: unknown): value is string {
  return /^(?:rec|task|taskseries|tasksession|energy)\.[0-9A-HJKMNP-TV-Z]{26}$/.test(String(value || '').trim());
}
