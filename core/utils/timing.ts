// utils/timing.ts
export function throttle<T extends (...args: any[]) => void>(
  fn: T,
  wait = 250
): T {
  let last = 0, timer: any = null;
  return function (...args: Parameters<T>) {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn.apply(this, args);
    } else {
      clearTimeout(timer);
      timer = setTimeout(() => {
        last = Date.now();
        fn.apply(this, args);
      }, wait - (now - last));
    }
  } as T;
}