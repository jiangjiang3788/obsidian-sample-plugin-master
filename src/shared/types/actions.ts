// src/shared/types/actions.ts

/**
 * shared/ui 只依赖“事件合同”，不直接依赖 core 的 Service 类。
 * 这些 handler 由 feature 层桥接（例如 LayoutRenderer）。
 */

import type { EnergyTaskExecutionStart, Item, TaskBlock, ThemeDefinition, ViewInstance } from '@core/types/public';
import type { MessageRenderPort } from '@core/ports/public';

export type MarkDoneHandler = (id: string) => void;


export type NoticeHandler = (message: string) => void;
export type CategoryColorMap = Record<string, string>;
export type UpdateCategoryColorsHandler = (nextColors: CategoryColorMap) => void | Promise<void>;
export type ResolveResourcePathHandler = (path: string) => string;
export type OpenRecordOriginHandler = (item: Item) => void | Promise<void>;

export interface StatisticsPopoverRequest {
  widgetId: string;
  title: string;
  blocks: Item[];
  module: ViewInstance;
  timerService: TimerController;
  timers: any[];
  allThemes: ThemeDefinition[];
  messageRenderPort?: MessageRenderPort;
  onOpenRecord?: OpenRecordHandler;
  onOpenRecordOrigin?: OpenRecordOriginHandler;
  resolveResourcePath?: ResolveResourcePathHandler;
  onClose: () => void;
  onExport: () => void;
  onQuickCreate?: () => void;
  canQuickCreate: boolean;
}

export type OpenStatisticsPopoverHandler = (request: StatisticsPopoverRequest) => void;
export type CloseStatisticsPopoverHandler = (widgetId: string) => void;


export type OpenRecordHandler = (item: Item) => void | Promise<void>;

/**
 * shared/ui 只表达“在时间轴某一天/时刻创建记录”的意图。
 * 具体打开 QuickInput、推断模板、写入记录等都由 feature/app 层桥接。
 */
export interface TimelineCreatePayload {
  day: string;
  event: MouseEvent | TouchEvent;
  inputBlocks: any[];
  hourHeight: number;
  dayBlocks: TaskBlock[];
}

export type OpenTimelineCreateHandler = (payload: TimelineCreatePayload) => void;


export interface HeatmapCreateRequest {
  sourceBlockId: string;
  date: string;
  item?: Item;
  themePath?: string;
  goalPath?: string;
  goalId?: string;
  templateId?: string;
  templateVariantId?: string;
  themesByPath: Map<string, ThemeDefinition>;
}

export type OpenHeatmapCreateHandler = (request: HeatmapCreateRequest) => void;

export interface OpenCheckinManagerRequest {
  date: string;
  items: Item[];
  onAddRecord: () => void;
  onDeleteRecord?: (item: Item) => Promise<boolean> | boolean | void;
}

export type OpenCheckinManagerHandler = (request: OpenCheckinManagerRequest) => void;

/**
 * shared/ui 只需要启动/恢复计时的最小能力，不依赖 app public barrel。
 */
export interface TimerController {
  startOrResume(taskId: string): Promise<void>;
  /** Starts a task with the current Energy baseline; Timer remains the execution UI. */
  startEnergyTask?(taskId: string, context: EnergyTaskExecutionStart): Promise<void>;
}

export interface StatisticsQuickCreatePayload {
  /** 目标总览等非统计视图可透传到 QuickInput 的初始上下文。 */
  context?: Record<string, unknown>;
  /** 可选建议 Block，后续 actionService 可用于精确选择核心 block。 */
  preferredBlockId?: string;
  cellIdentifier?: {
    type?: string;
    category?: string;
    date?: string;
    week?: number;
    month?: number;
    quarter?: number;
    year?: number;
  } | null;
  blocks?: Item[];
  title?: string;
}

/**
 * 打开“快捷创建”的 UI 行为。
 * 具体怎么拿 config / 写入什么，由 feature 层决定。
 */
export type OpenQuickCreateHandler = (payload?: StatisticsQuickCreatePayload) => void;
