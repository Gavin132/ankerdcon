/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
/** True in a build made with APP_ENV=dev (the dev site). */
declare const __DEV_BUILD__: boolean;
declare const __BUILD_ID__: string;

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
