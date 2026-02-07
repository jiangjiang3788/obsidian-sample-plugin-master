// src/types/dayjs-isoWeekYear.d.ts
// ---------------------------------------------------------------------------
// Dayjs plugin type augmentation
// ---------------------------------------------------------------------------
// We use dayjs + `isoWeek` plugin at runtime.
// Some TS setups may not include `isoWeekYear()` on Dayjs, which previously
// forced a local `@ts-ignore`.
//
// Centralize the fix here so UI/core code stays clean.

import 'dayjs';

declare module 'dayjs' {
  interface Dayjs {
    isoWeekYear(): number;
  }
}
