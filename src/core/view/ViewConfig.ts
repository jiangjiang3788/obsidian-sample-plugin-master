export interface Groupable {
  id: string;
  parentId: string | null;
}

export type GroupType = 'viewInstance' | 'layout';
export interface Group extends Groupable {
  name: string;
  type: GroupType;
  collapsed?: boolean;
}

export const VIEW_OPTIONS = [
  'BlockView',
  'TableView',
  'ExcelView',
  'TimelineView',
  'StatisticsView',
  'HeatmapView',
  'EventTimelineView',
  'ProgressView',
  'EnergyView',
] as const;
export type ViewName = (typeof VIEW_OPTIONS)[number];

export interface ViewInstance extends Groupable {
  title: string;
  viewType: ViewName;
  /** Legacy persisted setting. New views do not use dataSourceId. */
  dataSourceId?: string;
  collapsed?: boolean;
  fields?: string[];
  group?: string;
  groupFields?: string[];
  viewConfig?: Record<string, any>;
  actions?: ActionConfig[];
  filters?: FilterRule[];
  sort?: SortRule[];
}

export type LayoutDisplayMode = 'list' | 'grid' | 'freeform';

export interface ViewPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
  locked?: boolean;
  collapsed?: boolean;
}

export type FreeformLayoutTemplate = 'balanced' | 'focus';

export interface FreeformLayoutConfig {
  defaultTemplate?: FreeformLayoutTemplate;
  snapToGrid?: boolean;
  gridSize?: number;
  defaultItemWidth?: number;
  defaultItemHeight?: number;
  minItemWidth?: number;
  minItemHeight?: number;
  minCanvasWidth?: number;
  minCanvasHeight?: number;
}

export interface Layout extends Groupable {
  name: string;
  viewInstanceIds: string[];
  hideToolbar?: boolean;
  initialView?: string;
  initialDate?: string;
  initialDateFollowsNow?: boolean;
  isOverviewMode?: boolean;
  useFieldGranularity?: boolean;
  globalFilters?: FilterRule[];
  displayMode?: LayoutDisplayMode;
  gridConfig?: { columns?: number };
  viewPlacements?: Record<string, ViewPlacement>;
  freeformConfig?: FreeformLayoutConfig;
}

export interface ActionConfig {
  id: string;
  label: string;
  type: 'create_item';
  targetFile: string;
  template: string;
  promptedFields: {
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'select';
    options?: string[];
  }[];
}

export type FilterOperator =
  | '='
  | '!='
  | 'includes'
  | 'regex'
  | '>'
  | '<'
  | 'in'
  | 'notIn'
  | 'between'
  | 'empty'
  | 'notEmpty';

export interface FilterRule {
  field: string;
  op: FilterOperator;
  value: any;
  logic?: 'and' | 'or';
}

export interface SortRule {
  field: string;
  dir: 'asc' | 'desc';
}
