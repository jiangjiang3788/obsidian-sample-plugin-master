import type { RecordEntity, TaskRecordEntity } from '@/core/records/RecordEntity';
import { asTaskRecord, asTaskSeriesRecord } from '@/core/records/task/taskDomain';
import { asTaskSessionRecord } from '@/core/records/task/taskSession';

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
  private readonly recordsById = new Map<string, RecordEntity>();
  private readonly locationsById = new Map<string, RecordLocation[]>();
  private issues: RecordIntegrityIssue[] = [];

  clear(): void {
    this.recordsById.clear();
    this.locationsById.clear();
    this.issues = [];
  }

  rebuild(fileIndex: Map<string, RecordEntity[]>): RecordEntity[] {
    this.clear();
    const all: RecordEntity[] = [];
    for (const [path, records] of fileIndex.entries()) {
      for (const record of records) {
        const id = String(record.id || '').trim();
        if (!id) {
          this.issues.push({ code: 'record_id_missing', path, message: `Record in ${path} has no 记录ID.` });
          continue;
        }
        const source = record.source;
        const line = source?.startLine ?? record.file?.line ?? 0;
        const location: RecordLocation = {
          recordId: id,
          path,
          startLine: line,
          endLine: source?.endLine ?? line,
          modified: source?.modified ?? record.modified ?? 0,
        };
        const locations = this.locationsById.get(id) || [];
        locations.push(location);
        this.locationsById.set(id, locations);
        all.push(record);
      }
    }

    const unique: RecordEntity[] = [];
    for (const record of all) {
      const locations = this.locationsById.get(record.id) || [];
      if (locations.length !== 1) continue;
      if (this.recordsById.has(record.id)) continue;
      this.recordsById.set(record.id, record);
      unique.push(record);
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

    // Relation projection + integrity diagnostics. Internal foundation code narrows
    // RecordEntity to typed domain projections before reading domain-only fields.
    const openTasksBySeries = new Map<string, TaskRecordEntity[]>();
    for (const record of unique) {
      const task = asTaskRecord(record);
      if (task?.seriesId && task.status === 'open') {
        const group = openTasksBySeries.get(task.seriesId) || [];
        group.push(task);
        openTasksBySeries.set(task.seriesId, group);
      }

      if (task?.seriesId) {
        const series = asTaskSeriesRecord(this.recordsById.get(task.seriesId));
        if (!series) {
          this.issues.push({
            code: 'task_series_reference_orphan',
            recordId: task.id,
            path: task.source?.path,
            message: `Task ${task.id} references missing Task Series ${task.seriesId}.`,
          });
        } else {
          task.recurrenceInfo = series.recurrenceInfo;
        }
      }

      const session = asTaskSessionRecord(record);
      if (session) {
        const sessionTask = asTaskRecord(this.recordsById.get(session.taskId));
        const sessionSeries = session.seriesId ? asTaskSeriesRecord(this.recordsById.get(session.seriesId)) : null;
        const taskInvalid = !sessionTask;
        const seriesInvalid = Boolean(session.seriesId) && !sessionSeries;
        const relationMismatch = Boolean(sessionTask && session.seriesId && sessionTask.seriesId !== session.seriesId);
        const energyRefs = [session.startEnergyRecordId, session.endEnergyRecordId].filter(Boolean) as string[];
        const invalidEnergyRef = energyRefs.find(recordId => this.recordsById.get(recordId)?.coreBlock !== 'energy');
        if (taskInvalid || seriesInvalid || relationMismatch || invalidEnergyRef) {
          this.issues.push({
            code: 'task_session_reference_orphan',
            recordId: session.id,
            path: session.source?.path,
            message: taskInvalid
              ? `Task Session ${session.id} references missing Task ${session.taskId || ''}.`
              : seriesInvalid
                ? `Task Session ${session.id} references missing Task Series ${session.seriesId || ''}.`
                : relationMismatch
                  ? `Task Session ${session.id} series reference does not match Task ${session.taskId}.`
                  : `Task Session ${session.id} references missing Energy Record ${invalidEnergyRef || ''}.`,
          });
        }
      }

      const series = asTaskSeriesRecord(record);
      if (series) {
        if (series.status === 'active' && !series.currentTaskId) {
          this.issues.push({
            code: 'record_reference_orphan',
            recordId: series.id,
            path: series.source?.path,
            message: `Active Task Series ${series.id} has no currentTaskId.`,
          });
        } else if (series.currentTaskId) {
          const current = asTaskRecord(this.recordsById.get(series.currentTaskId));
          const relationInvalid = !current || current.seriesId !== series.id;
          const activePointerInvalid = series.status === 'active' && current?.status !== 'open';
          if (relationInvalid || activePointerInvalid) {
            this.issues.push({
              code: 'record_reference_orphan',
              recordId: series.id,
              path: series.source?.path,
              message: relationInvalid
                ? `Task Series ${series.id} currentTaskId ${series.currentTaskId} is missing or points outside the series.`
                : `Active Task Series ${series.id} currentTaskId ${series.currentTaskId} is not open.`,
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

  getById(recordId: string): RecordEntity | null {
    return this.recordsById.get(recordId) || null;
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
