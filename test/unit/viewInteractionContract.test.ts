import { createRecordGestureHandlers, RECORD_GESTURE_MULTI_ACTIVATION_MS } from '@shared/ui/public';

const item: any = { id: 'record.1', title: 'Record 1', coreBlock: 'thought' };

function event(overrides: Record<string, unknown> = {}) {
  return {
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    ...overrides,
  } as any;
}

describe('view interaction contract', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('single Record click resolves to primary action once', () => {
    const primary = jest.fn();
    const origin = jest.fn();
    const gesture = createRecordGestureHandlers({ item, onPrimary: primary, onOpenOrigin: origin });

    gesture.onClick(event());
    expect(primary).not.toHaveBeenCalled();
    jest.advanceTimersByTime(RECORD_GESTURE_MULTI_ACTIVATION_MS);
    expect(primary).toHaveBeenCalledTimes(1);
    expect(origin).not.toHaveBeenCalled();
  });

  test('double click cancels primary action and opens origin once', () => {
    const primary = jest.fn();
    const origin = jest.fn();
    const gesture = createRecordGestureHandlers({ item, onPrimary: primary, onOpenOrigin: origin });

    gesture.onClick(event());
    gesture.onClick(event());
    gesture.onDblClick(event());
    jest.advanceTimersByTime(RECORD_GESTURE_MULTI_ACTIVATION_MS * 2);

    expect(primary).not.toHaveBeenCalled();
    expect(origin).toHaveBeenCalledTimes(1);
    expect(origin).toHaveBeenCalledWith(item);
  });

  test('Ctrl/Meta click opens origin immediately', () => {
    const primary = jest.fn();
    const origin = jest.fn();
    const gesture = createRecordGestureHandlers({ item, onPrimary: primary, onOpenOrigin: origin });

    gesture.onClick(event({ metaKey: true }));
    expect(origin).toHaveBeenCalledTimes(1);
    expect(primary).not.toHaveBeenCalled();
  });

  test('keyboard activation uses primary, modifier keyboard activation uses origin', () => {
    const primary = jest.fn();
    const origin = jest.fn();
    const gesture = createRecordGestureHandlers({ item, onPrimary: primary, onOpenOrigin: origin });

    gesture.onKeyDown(event({ key: 'Enter' }));
    gesture.onKeyDown(event({ key: 'Enter', ctrlKey: true }));

    expect(primary).toHaveBeenCalledTimes(1);
    expect(origin).toHaveBeenCalledTimes(1);
  });
});
