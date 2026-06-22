import { useState } from "react";

const SPLASH_KEY = "ankerd-splash-shown";

function shouldShowSplash(): boolean {
  try {
    return !sessionStorage.getItem(SPLASH_KEY);
  } catch {
    return false;
  }
}

export function useSplash() {
  const [visible, setVisible] = useState(shouldShowSplash);

  function dismiss() {
    try {
      sessionStorage.setItem(SPLASH_KEY, "1");
    } catch {}
    setVisible(false);
  }

  return { visible, dismiss };
}
