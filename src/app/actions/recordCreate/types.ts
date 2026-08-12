import type { QuickInputModal } from '@/app/ui/modals/QuickInputModal';
import type { RecordInputSource } from '@core/recordInput/public';
import type { ActionService } from '@core/services/public';
import type { RecordViewItem, TaskBlock, ThemeDefinition, ViewInstance } from '@core/types/public';
import type { Dayjs } from '@core/utils/public';
import type { UiPort } from '@core/ports/public';

export type QuickInputApp = ConstructorParameters<typeof QuickInputModal>[0];

export type QuickCreateSource = Extract<RecordInputSource, 'quickinput' | 'view_quick_create'>;


export type StatisticsPeriodType = 'day' | 'week' | 'month' | 'quarter' | 'year';

export type QuickInputBlockLike = { id: string; name?: string | null };

export interface StatisticsCellIdentifier {
  type?: StatisticsPeriodType | string;
  category?: string;
  date?: string;
  week?: number;
  month?: number;
  quarter?: number;
  year?: number;
}

export interface StatisticsCreatePayload {
  /** 目标总览等入口透传给 QuickInput 的上下文字段。 */
  context?: Record<string, unknown>;
  /** 建议使用的核心 block，兼容后续更精确的 actionService 选择。 */
  preferredBlockId?: string;
  cellIdentifier?: StatisticsCellIdentifier | null;
  blocks?: RecordViewItem[];
  title?: string;
}

export interface TimelineCreateParams {
  app: QuickInputApp;
  uiPort: UiPort;
  inputBlocks: QuickInputBlockLike[];
  hourHeight: number;
  dayBlocks: TaskBlock[];
  day: string;
  event: MouseEvent | TouchEvent;
}

export interface HeatmapCreateParams {
  app: QuickInputApp;
  sourceBlockId?: string | null;
  date: string;
  item?: RecordViewItem;
  themePath?: string;
  goalPath?: string;
  goalId?: string;
  templateId?: string;
  templateVariantId?: string;
  themesByPath?: Map<string, ThemeDefinition>;
  notice?: (message: string) => void;
}

export interface StatisticsCreateParams {
  app: QuickInputApp;
  actionService: ActionService;
  uiPort: UiPort;
  viewInstance: ViewInstance;
  currentView: '年' | '季' | '月' | '周' | '天';
  fallbackDate: Dayjs;
  payload?: StatisticsCreatePayload;
}

export interface HeaderCreateParams {
  app: QuickInputApp;
  actionService: ActionService;
  viewInstance: ViewInstance;
  dateContext: Dayjs;
  periodContext: string;
}


