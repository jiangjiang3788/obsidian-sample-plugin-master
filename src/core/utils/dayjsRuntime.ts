import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import customParse from 'dayjs/plugin/customParseFormat';
import isoWeek from 'dayjs/plugin/isoWeek';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(quarterOfYear);
dayjs.extend(weekOfYear);
dayjs.extend(customParse);
dayjs.extend(isoWeek);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

export { dayjs };
export type { Dayjs } from 'dayjs';
