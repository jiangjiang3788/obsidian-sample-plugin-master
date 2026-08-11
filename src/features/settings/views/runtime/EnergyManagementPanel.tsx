/** @jsxImportSource preact */
import { h } from 'preact';
import type { EnergyManagementCandidate, EnergyManagementModel } from '@core/energy/public';

interface EnergyManagementPanelProps {
  management?: EnergyManagementModel | null;
}

function signed(value: number): string {
  return `${value > 0 ? '+' : ''}${value}`;
}

function evidence(value: EnergyManagementCandidate['evidence']): string {
  if (value === 'supported') return '样本较充分';
  if (value === 'exploratory') return '初步样本';
  return '观察中';
}

function CandidateList({ title, rows, emptyText }: { title: string; rows: EnergyManagementCandidate[]; emptyText: string }) {
  return (
    <div class="think-energy-management__candidate-group">
      <div class="think-energy-management__subheading"><strong>{title}</strong><span>{rows.length ? `${rows.length} 个候选` : '暂无'}</span></div>
      {rows.length === 0 ? <div class="think-energy-management__empty">{emptyText}</div> : (
        <div class="think-energy-management__candidates">
          {rows.map((row) => (
            <div class="think-energy-management__candidate" key={row.key}>
              <div><strong>{row.label}</strong><span>{evidence(row.evidence)}</span></div>
              <b>{signed(row.meanDelta)}</b>
              <small>中位 {signed(row.medianDelta)} · {row.reason}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EnergyManagementPanel({ management }: EnergyManagementPanelProps) {
  if (!management) return null;
  const latest = management.latest;
  return (
    <section class="think-energy-management" aria-label="精力管理候选">
      <div class="think-energy-view__section-title">
        <strong>现在怎么用这份精力</strong>
        <span>个人历史证据驱动；不把关联写成因果</span>
      </div>

      <div class="think-energy-management__hero">
        <div class="think-energy-management__state">
          <span>{latest.stateLabel}</span>
          <strong>{latest.score}</strong>
          {latest.dimensionLabel && <small>{latest.dimensionLabel}</small>}
        </div>
        <div class="think-energy-management__message">
          <strong>{management.headline}</strong>
          <span>{management.guidance}</span>
          <small>{management.readiness.message}</small>
        </div>
      </div>

      <div class="think-energy-management__candidate-grid">
        <CandidateList title="恢复候选" rows={management.recoveryCandidates} emptyText="还没有达到最小样本门槛的个人恢复候选。" />
        <CandidateList title="消耗候选 / 谨慎使用" rows={management.cautionCandidates} emptyText="还没有达到最小样本门槛的个人消耗候选。" />
      </div>

      {management.guardrails.length > 0 && (
        <div class="think-energy-management__guardrails">
          {management.guardrails.map((row) => (
            <div class={`think-energy-management__guardrail think-energy-management__guardrail--${row.level}`} key={row.key}>
              <strong>{row.title}</strong>
              <span>{row.detail}</span>
              <small>N={row.sampleCount} · {row.evidence === 'supported' ? '样本较充分' : row.evidence === 'exploratory' ? '初步样本' : '观察中'}</small>
            </div>
          ))}
        </div>
      )}

      <div class="think-energy-management__disclaimer">{management.disclaimer}</div>
    </section>
  );
}
