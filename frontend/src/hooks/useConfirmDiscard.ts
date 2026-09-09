import { useState } from "react";

/**
 * Guards a "close this panel" action behind a confirm step when there are
 * unsaved changes. Admin drawers close from several different triggers (the
 * X button, Escape, a backdrop click, and the footer's Cancel button) that
 * all need to funnel through the same confirmation, so callers pass
 * `requestClose` wherever they'd otherwise pass `onClose` directly.
 */
export function useConfirmDiscard(isDirty: boolean, onClose: () => void) {
  const [confirming, setConfirming] = useState(false);

  function requestClose() {
    if (isDirty) setConfirming(true);
    else onClose();
  }

  function confirmDiscard() {
    setConfirming(false);
    onClose();
  }

  function cancelDiscard() {
    setConfirming(false);
  }

  return { requestClose, confirming, confirmDiscard, cancelDiscard };
}
