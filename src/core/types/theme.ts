import type { ActiveStatus } from './common';

export interface Theme {
  id: string;
  path: string;
  name: string;
  icon?: string;
  parentId: string | null;
  status: ActiveStatus;
  source: 'predefined' | 'discovered';
  usageCount: number;
  lastUsed?: number;
  order: number;
}

export interface IThemeMatcher {
  findThemeByPartialMatch(headerText: string): string | null;
}

export const THEME_MATCHER_TOKEN = Symbol('IThemeMatcher');
