import type { Item } from '@/core/types/schema';

export interface RecordLocation {
  recordId: string;
  path: string;
  startLine: number;
  endLine: number;
  modified: number;
}

export type RecordIntegrityIssueCode =
  | 'record_id_missing'
  | 'record_id_duplicate'
  | 'record_reference_orphan'
  | 'task_series_reference_orphan'
  | 'task_session_reference_orphan'
  | 'record_block_malformed'
  | 'record_scan_failed'
  | 'record_transaction_recovery_required';

export interface RecordIntegrityIssue {
  code: RecordIntegrityIssueCode;
  recordId?: string;
  path?: string;
  message: string;
}

/** Stable-ID runtime index. Location is mutable metadata, never identity. */
export class RecordIndex {
  private readonly itemsById = new Map<string, Item>();
  private readonly locationsById = new Map<string, RecordLocation[]>();
  private issues: RecordIntegrityIssue[] = [];

  clear(): void {
    this.itemsById.clear();
    this.locationsById.clear();
    this.issues = [];
  }

  rebuild(fileIndex: Map<string, Item[]>): Item[] {
    this.clear();
    const all: Item[] = [];
    for (const [path, items] of fileIndex.entries()) {
      for (const item of items) {
        const id = String(item.id || '').trim();
        if (!id) {
          this.issues.push({ code: 'record_id_missing', path, message: `Record in ${path} has no 记录ID.` });
          continue;
        }
        const source = item.source;
        const line = source?.startLine ?? item.file?.line ?? 0;
        const location: RecordLocation = {
          recordId: id,
          path,
          startLine: line,
          endLine: source?.endLine ?? line,
          modified: source?.modified ?? item.modified ?? 0,
        };
        const locations = this.locationsById.get(id) || [];
        locations.push(location);
        this.locationsById.set(id, locations);
        all.push(item);
      }
    }

    const unique: Item[] = [];
    for (const item of all) {
      const locations = this.locationsById.get(item.id) || [];
      if (locations.length !== 1) continue;
      if (this.itemsById.has(item.id)) continue;
      this.itemsById.set(item.id, item);
      unique.push(item);
    }

    for (const [recordId, locations] of this.locationsById.entries()) {
      if (locations.length > 1) {
        this.issues.push({
          code: 'record_id_duplicate',
          recordId,
          message: `Duplicate 记录ID ${recordId}: ${locations.map(location => `${location.path}:${location.startLine}`).join(', ')}`,
        });
      }
    }

    // Relation projection + integrity diagnostics. Task instances may receive structured
    // recurrenceInfo from their Series, but no recurrence prose is persisted or projected.
    const openTasksBySeries = new Map<string, Item[]>();
    for (const item of unique) {
      if (item.coreBlock === 'task' && item.seriesId && item.status === 'open') {
        const group = openTasksBySeries.get(item.seriesId) || [];
        group.push(item);
        openTasksBySeries.set(item.seriesId, group);
      }
      if (item.coreBlock === 'task' && item.seriesId) {
        const series = this.itemsById.get(item.seriesId);
        if (!series || series.coreBlock !== 'task-series') {
          this.issues.push({
            code: 'task_series_reference_orphan',
            recordId: item.id,
            path: item.source?.path,
            message: `Task ${item.id} references missing Task Series ${item.seriesId}.`,
          });
          continue;
        }
        item.recurrenceInfo = series.recurrenceInfo;
      }
      if (item.coreBlock === 'task-session') {
        const task = item.taskId ? this.itemsById.get(item.taskId) : null;
        const series = item.seriesId ? this.itemsById.get(item.seriesId) : null;
        const taskInvalid = !task || task.coreBlock !== 'task';
        const seriesInvalid = Boolean(item.seriesId) && (!series || series.coreBlock !== 'task-series');
        const relationMismatch = Boolean(task && item.seriesId && task.seriesId !== item.seriesId);
        const energyRefs = [item.startEnergyRecordId, item.endEnergyRecordId].filter(Boolean) as string[];
        const invalidEnergyRef = energyRefs.find(recordId => this.itemsById.get(recordId)?.coreBlock !== 'energy');
        if (taskInvalid || seriesInvalid || relationMismatch || invalidEnergyRef) {
          this.issues.push({
            code: 'task_session_reference_orphan',
            recordId: item.id,
            path: item.source?.path,
            message: taskInvalid
              ? `Task Session ${item.id} references missing Task ${item.taskId || ""}.`
              : seriesInvalid
                ? `Task Session ${item.id} references missing Task Series ${item.seriesId || ""}.`
                : relationMismatch
                  ? `Task Session ${item.id} series reference does not match Task ${item.taskId}.`
                  : `Task Session ${item.id} references missing Energy Record ${invalidEnergyRef || ""}.`,
          });
        }
      }
      if (item.coreBlock === 'task-series') {
        if (item.status === 'active' && !item.currentTaskId) {
          this.issues.push({
            code: 'record_reference_orphan',
            recordId: item.id,
            path: item.source?.path,
            message: `Active Task Series ${item.id} has no currentTaskId.`,
          });
        } else if (item.currentTaskId) {
          const current = this.itemsById.get(item.currentTaskId);
          const relationInvalid = !current || current.coreBlock !== 'task' || current.seriesId !== item.id;
          const activePointerInvalid = item.status === 'active' && current?.status !== 'open';
          if (relationInvalid || activePointerInvalid) {
            this.issues.push({
              code: 'record_reference_orphan',
              recordId: item.id,
              path: item.source?.path,
              message: relationInvalid
                ? `Task Series ${item.id} currentTaskId ${item.currentTaskId} is missing or points outside the series.`
                : `Active Task Series ${item.id} currentTaskId ${item.currentTaskId} is not open.`,
            });
          }
        }
      }
    }
    for (const [seriesId, openTasks] of openTasksBySeries.entries()) {
      if (openTasks.length > 1) {
        this.issues.push({
          code: 'record_reference_orphan',
          recordId: seriesId,
          message: `Task Series ${seriesId} has ${openTasks.length} open instances; single-active-instance requires at most one.`,
        });
      }
    }
    return unique;
  }

  getById(recordId: string): Item | null {
    return this.itemsById.get(recordId) || null;
  }

  getLocation(recordId: string): RecordLocation | null {
    const locations = this.locationsById.get(recordId) || [];
    return locations.length === 1 ? locations[0] : null;
  }

  getLocations(recordId: string): RecordLocation[] {
    return [...(this.locationsById.get(recordId) || [])];
  }

  getIssues(): RecordIntegrityIssue[] {
    return this.issues.map(issue => ({ ...issue }));
  }
}
