// src/features/settings/tabs/GeneralSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import {
  selectDevConsoleStackEnabled,
  selectFloatingTimerEnabled,
  useSelector,
  useUseCases,
} from '@/app/public';
import { ThinkCheckbox } from '@shared/ui/public';
import { RecordTypeColorSettingsSection } from './RecordTypeColorSettingsSection';

/** 通用设置：模块开关。Record Type 颜色设置在 1.6.0 Presentation Convergence 引入。 */
export function GeneralSettings() {
  const floatingTimerEnabled = useSelector(selectFloatingTimerEnabled);
  const devConsoleStackEnabled = useSelector(selectDevConsoleStackEnabled);
  const useCases = useUseCases();

  return (
    <div className="think-settings-page">
      <RecordTypeColorSettingsSection />
      <section className="think-settings-section">
        <h2 className="think-settings-section__title">模块开关</h2>
        <div className="think-settings-stack think-settings-stack--tight">
          <div className="think-settings-row">
            <span className="think-settings-row__label">悬浮计时器</span>
            <div className="think-settings-row__body">
              <ThinkCheckbox
                checked={floatingTimerEnabled}
                onChange={(event) => useCases.settings.setFloatingTimerEnabled((event.currentTarget as HTMLInputElement).checked)}
                label="启用"
                compact
              />
            </div>
          </div>
          <div className="think-settings-row think-settings-row--top">
            <span className="think-settings-row__label think-settings-row__label--top">开发错误</span>
            <div className="think-settings-row__body">
              <ThinkCheckbox
                checked={devConsoleStackEnabled}
                onChange={(event) => useCases.settings.setDevConsoleStackEnabled((event.currentTarget as HTMLInputElement).checked)}
                label="同时输出控制台堆栈"
                compact
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
