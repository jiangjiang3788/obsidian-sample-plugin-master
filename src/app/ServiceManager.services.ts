import type { DataStore, ActionService, TimerStateService, InputService, ItemService, SettingsRepository, ChatSessionStore } from '@core/public';
import type { RendererService } from '@/features/settings/RendererService';
import type { TimerService } from '@features/timer/TimerService';
import type { FloatingTimerWidget } from '@features/timer/FloatingTimerWidget';
import type { UseCases } from '@/app/usecases';

/**
 * ServiceManager 内部服务缓存（仅用于 app 层编排，不作为对外 API）。
 *
 * 注意：这里刻意保持为 Partial，以便按启动步骤逐步填充。
 */
export type ServiceManagerServices = Partial<{
    settingsRepository: SettingsRepository;
    dataStore: DataStore;
    rendererService: RendererService;
    actionService: ActionService;
    timerService: TimerService;
    timerStateService: TimerStateService;
    inputService: InputService;
    timerWidget: FloatingTimerWidget;
    itemService: ItemService;
    useCases: UseCases;
    chatSessionStore: ChatSessionStore;
}>;
