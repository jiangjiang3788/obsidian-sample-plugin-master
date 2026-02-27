// src/types/dayjs-isBetween.d.ts
// ---------------------------------------------------------------------------
// Dayjs plugin type augmentation: isBetween
// ---------------------------------------------------------------------------
// Runtime: we extend dayjs with `isBetween` in src/core/utils/date.ts.
// TS: dayjs' base types don't include it unless you add an augmentation.

import 'dayjs';

declare module 'dayjs' {
  interface Dayjs {
    isBetween(
      a: import('dayjs').ConfigType,
      b: import('dayjs').ConfigType,
      unit?: import('dayjs').OpUnitType | null,
      inclusivity?: string
    ): boolean;
  }
}
