import type { ModalPort } from '@core/ports/public';
import type { TimerService } from '@features/timer/TimerService';

export interface CapabilityDeps {
  modalPort: ModalPort;
  timerService?: TimerService;
}
