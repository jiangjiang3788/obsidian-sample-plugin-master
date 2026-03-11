export interface ProgressBreakdownRow {
  key: string;
  points: number;
  count: number;
}

export interface ProgressResult {
  totalPoints: number;
  level: number;
  currentLevelPoints: number;
  nextLevelPoints: number;
  progressRatio: number;
  matchedCount: number;
  categoryBreakdown: ProgressBreakdownRow[];
  themeBreakdown: ProgressBreakdownRow[];
}
