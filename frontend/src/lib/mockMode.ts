/**
 * Mock mode: the app running on made-up data with no sign-in, for looking at every screen at phone sizes
 * (docs/local-development.md#mock-mode). Development builds only: `main.tsx` loads `src/dev/mock` behind
 * `import.meta.env.DEV`, so none of it is in a production build. This flag is all the rest of the app knows:
 * it keeps the sign-in listener quiet and keeps made-up data out of the saved cache.
 */
let active = false;

export const isMockMode = (): boolean => active;

export function setMockMode(value: boolean): void {
  active = value;
}
