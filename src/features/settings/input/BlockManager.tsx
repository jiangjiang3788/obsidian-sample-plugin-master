/** @jsxImportSource preact */
import { useState } from 'preact/hooks';
import { getEffectiveRecordTypes, ENERGY_RECORD_TYPE_ID, normalizeRecordTypePresentationKey } from '@core/recordTypes/public';
import { ThinkIcon, ThinkIconButton } from '@shared/ui/public';
import { EnergyRecordTypeSettings } from './EnergyRecordTypeSettings';

/**
 * RecordTypes are code-registered domain definitions.
 * This screen is intentionally read-only for schema/capture defaults; per-Goal
 * differences belong to GoalTemplate overrides, not mutable runtime Block rows.
 */
export function BlockManager() {
  const recordTypes = getEffectiveRecordTypes();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="think-block-manager think-block-editor think-settings-section">
      <div className="think-management-toolbar think-block-manager__toolbar">
        <div>
          <div className="think-settings-subheading">已注册记录类型</div>
          <div className="think-settings-caption">
            {recordTypes.length} 个。记录类型由代码统一注册；目标差异请在“目标模板”中配置。
          </div>
        </div>
      </div>

      <div className="think-block-manager__list">
        {recordTypes.map((recordType) => {
          const open = openId === recordType.id;
          return (
            <div key={recordType.id} className="think-block-accordion think-block-accordion--builtin">
              <div className="think-block-accordion__summary">
                <span className="think-block-accordion__drag think-block-accordion__drag--placeholder" aria-hidden="true">
                  <ThinkIcon name="database" />
                </span>
                <button
                  type="button"
                  className="think-block-accordion__title"
                  onClick={() => setOpenId(open ? null : recordType.id)}
                >
                  <span className="think-record-type-marker" data-record-type={normalizeRecordTypePresentationKey(recordType.coreBlock)}>{recordType.name}</span>
                </button>
                <span className="think-block-accordion__meta">
                  {recordType.captureMode === 'template' ? '模板录入' : recordType.captureMode === 'direct' ? '直接记录' : '内部记录'}
                </span>
                <ThinkIconButton
                  label={open ? '收起' : '展开'}
                  icon={<ThinkIcon name={open ? 'chevron-up' : 'chevron-down'} />}
                  size="sm"
                  onClick={() => setOpenId(open ? null : recordType.id)}
                />
              </div>

              {open && (
                <div className="think-block-accordion__details think-settings-stack think-settings-stack--tight">
                  <div className="think-settings-row"><span className="think-settings-row__label">注册 ID</span><code>{recordType.id}</code></div>
                  <div className="think-settings-row"><span className="think-settings-row__label">记录 key</span><code>{recordType.coreBlock}</code></div>
                  <div className="think-settings-row"><span className="think-settings-row__label">目标</span><span>{recordType.capabilities.goalBindable ? '必选系统上下文' : '不绑定目标'}</span></div>
                  {recordType.captureMode === 'template' && (
                    <>
                      <div className="think-settings-row"><span className="think-settings-row__label">默认文件</span><span>{recordType.targetFile || '—'}</span></div>
                      <div className="think-settings-row"><span className="think-settings-row__label">默认字段</span><span>{recordType.fields.map((field) => field.label || field.key).join('、') || '—'}</span></div>
                    </>
                  )}
                  {recordType.id === ENERGY_RECORD_TYPE_ID && <EnergyRecordTypeSettings />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
