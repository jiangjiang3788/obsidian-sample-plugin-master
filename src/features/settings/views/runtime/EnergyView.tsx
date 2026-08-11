/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import type { Item } from '@core/types/public';
import type { OpenRecordOriginHandler, TimerController } from '@shared/types/public';
import type { EnergyViewRenderModel } from '../models/energyViewModel';
import type { EnergyTaskListItemVM } from '../models/energyTaskListModel';
import { EnergyPeriodMap, type EnergyMapSelection } from './EnergyPeriodMap';
import { EnergyPeriodReview } from './EnergyPeriodReview';
import { EnergySampleDetail } from './EnergySampleDetail';
import { EnergyTaskList } from './EnergyTaskList';

interface EnergyViewProps {
  energyModel?: EnergyViewRenderModel;
  onOpenRecord?: (item: Item) => void;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  timerService?: TimerController;
}

function selectionKey(selection: EnergyMapSelection | null): string | null {
  if (!selection) return null;
  return selection.kind === 'sample' ? selection.sample.id : `day:${selection.day.date}`;
}

function GoalEnergyPanel({ panel, model, onOpenRecord }: {
  panel: EnergyViewRenderModel['goalPanels'][number];
  model: EnergyViewRenderModel;
  onOpenRecord?: (item: Item) => void;
}) {
  const [selection, setSelection] = useState<EnergyMapSelection | null>(null);
  return (
    <section class="think-energy-view__goal">
      <div class="think-energy-view__primary">
        {model.config.showTimeline ? (
          <EnergyPeriodMap period={panel.period} selectedKey={selectionKey(selection)} onSelect={setSelection} />
        ) : <div class="think-energy-view__timeline-off">精力地图已关闭。</div>}

        {selection ? (
          <EnergySampleDetail
            selection={selection}
            management={model.config.showManagement ? panel.management : null}
            onBack={() => setSelection(null)}
            onOpenRecord={onOpenRecord}
          />
        ) : (
          <EnergyPeriodReview periodLabel={model.periodLabel} lines={panel.reviewLines} />
        )}
      </div>
    </section>
  );
}

function EmptyEnergyPanel() {
  return (
    <section class="think-energy-view__goal think-energy-view__goal--empty">
      <div class="think-energy-view think-energy-view--empty">
        <strong>还没有可展示的精力记录</strong>
        <span>任务仍可直接从下方开始；精力记录可继续使用现有快捷入口。</span>
      </div>
    </section>
  );
}


export function EnergyView({ energyModel, onOpenRecord, onOpenRecordOrigin, timerService }: EnergyViewProps) {
  if (!energyModel) return <div class="think-energy-view think-energy-view--empty">精力视图尚未初始化。</div>;

  const startTask = async (task: EnergyTaskListItemVM) => {
    const baseline = energyModel.taskList.latestEnergy;
    if (baseline && timerService?.startEnergyTask) {
      await timerService.startEnergyTask(task.itemId, {
        baselineScore: baseline.score,
        baselineBrainScore: baseline.brainScore,
        baselinePhysicalScore: baseline.physicalScore,
        baselineDate: baseline.date,
        baselineTime: baseline.time,
        suggestedDurationMinutes: task.suggestedDurationMinutes,
      });
      return;
    }
    await timerService?.startOrResume(task.itemId);
  };

  const [firstPanel, ...otherPanels] = energyModel.goalPanels;
  return (
    <div class="think-energy-view">
      <div class="think-energy-view__goals">
        {firstPanel
          ? <GoalEnergyPanel panel={firstPanel} model={energyModel} onOpenRecord={onOpenRecord} />
          : <EmptyEnergyPanel />}

        <EnergyTaskList
          model={energyModel.taskList}
          currentView={energyModel.currentView}
          onStartTask={timerService ? startTask : undefined}
          onOpenRecord={onOpenRecord}
          onOpenRecordOrigin={onOpenRecordOrigin}
        />

        {otherPanels.map((panel) => (
          <GoalEnergyPanel key={panel.key} panel={panel} model={energyModel} onOpenRecord={onOpenRecord} />
        ))}
      </div>
    </div>
  );
}
