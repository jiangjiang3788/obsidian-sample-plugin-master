import { RecordRepository } from '@/core/records/RecordRepository';
import { asTaskRecord } from '@/core/records/task/taskDomain';
import { taskClassificationForQuadrant, type EisenhowerQuadrant } from '@/core/records/task/taskQuadrant';

export class TaskQuadrantMutation {
  constructor(private readonly repository: RecordRepository) {}

  async move(taskId: string, quadrant: EisenhowerQuadrant): Promise<void> {
    const task = asTaskRecord(await this.repository.getById(taskId));
    if (!task) throw new Error(`task_record_required:${taskId}`);
    const classification = taskClassificationForQuadrant(quadrant);
    await this.repository.update(taskId, classification);
  }
}
