import { useCallback, useEffect, useState } from "react";
import { subscribePush, unsubscribePush } from "../services/push.service";
import { getPushState, subscribeToPush, unsubscribeFromPush, type PushState } from "../utils/push";

/** Live push-subscription state for this device/browser, plus the two
 * actions to change it — the state reflects the real browser subscription
 * (via the Push API), not a preference stored on the profile, so it's always
 * correct even across devices, reinstalls or a permission revoked outside
 * the app. */
export function usePush() {
  const [state, setState] = useState<PushState | "loading">("loading");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    getPushState().then(setState);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      await subscribeToPush({ subscribe: subscribePush, unsubscribe: unsubscribePush });
      setState("on");
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      await unsubscribeFromPush({ subscribe: subscribePush, unsubscribe: unsubscribePush });
      setState("off");
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, enable, disable, refresh };
}
