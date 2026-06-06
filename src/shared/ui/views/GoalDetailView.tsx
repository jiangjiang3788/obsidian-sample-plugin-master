/** @jsxImportSource preact */
import { h } from 'preact';
import type { GoalOverviewModel } from '@core/public';
import type { OpenQuickCreateHandler, OpenRecordHandler, OpenRecordOriginHandler } from '../../types/actions';
import { GoalOverviewView } from './GoalOverviewView';

interface GoalDetailViewProps {
  goalDetailModel?: GoalOverviewModel;
  goalOverviewModel?: GoalOverviewModel;
  onOpenRecord?: OpenRecordHandler;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  onQuickCreate?: OpenQuickCreateHandler;
}

export function GoalDetailView({ goalDetailModel, goalOverviewModel, onOpenRecord, onOpenRecordOrigin, onQuickCreate }: GoalDetailViewProps) {
  const model = goalDetailModel || goalOverviewModel;
  if (!model) return <div>暂无目标详情数据</div>;
  if (!model.selectedRow && model.rows.length !== 1) {
    return <div style={{ color: 'var(--text-muted)' }}>请在视图配置中填写固定目标路径，以展示单目标详情。</div>;
  }
  return (
    <div class="goal-detail-view" style={{ display: 'grid', gap: '12px' }}>
      <div style={{ border: '1px solid var(--background-modifier-border)', borderRadius: '12px', padding: '12px', background: 'var(--background-secondary)' }}>
        <div style={{ fontSize: '16px', fontWeight: 700 }}>目标详情</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>单目标执行视图：显示当前目标的周期、指标、快捷创建和最近记录。</div>
      </div>
      <GoalOverviewView goalOverviewModel={model} onOpenRecord={onOpenRecord} onOpenRecordOrigin={onOpenRecordOrigin} onQuickCreate={onQuickCreate} />
    </div>
  );
}
