import { useCallback, useEffect, useState } from "react";
import { subscribePush, unsubscribePush } from "../services/push.service";
import { getPushState, immediatePushState, subscribeToPush, unsubscribeFromPush, type PushState } from "../utils/push";

/** Live push-subscription state for this device/browser, plus the two
 * actions to change it — the state reflects the real browser subscription
 * (via the Push API), not a preference stored on the profile, so it's always
 * correct even across devices, reinstalls or a permission revoked outside
 * the app. */
export function usePush() {
  // What is known at once (no support, install first, blocked) is there on the first render;
  // only "is this device subscribed" has to be looked up.
  const [state, setState] = useState<PushState | "loading">(() => immediatePushState() ?? "loading");
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
