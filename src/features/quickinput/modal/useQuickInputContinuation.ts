import { useCallback, useEffect, useState } from 'preact/hooks';
import { openRecordContinuationOption, useModalPort } from '@/app/public';
import type { RecordContinuationFollowUp, RecordContinuationOption } from '@core/recordInput/public';

export function useQuickInputContinuation(
  closeCurrentModal: () => void,
  onOutsideClickCloseChange?: (enabled: boolean) => void,
) {
  const modalPort = useModalPort();
  const [continuation, setContinuation] = useState<RecordContinuationFollowUp | null>(null);

  useEffect(() => {
    onOutsideClickCloseChange?.(Boolean(continuation?.dismissOnOutsideClick));
    return () => onOutsideClickCloseChange?.(false);
  }, [continuation?.dismissOnOutsideClick, onOutsideClickCloseChange]);

  const continueWithOption = useCallback((option: RecordContinuationOption) => {
    closeCurrentModal();
    openRecordContinuationOption(modalPort, option);
  }, [closeCurrentModal, modalPort]);

  return {
    continuation,
    showContinuation: setContinuation,
    continueWithOption,
  };
}
