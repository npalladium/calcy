// Service-worker registration from @vite-pwa/sveltekit. The plugin ships this
// ambient module under a subpath (vite-plugin-pwa/vanillajs) the project's
// module-resolution mode doesn't pick up via a triple-slash reference, so we
// declare the slice we use here. This file has no top-level import/export, so it
// stays a global ambient declaration (an `app.d.ts`-style module file would
// scope it and TS wouldn't apply it — see docs-md.d.ts).
declare module 'virtual:pwa-register' {
  interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegisteredSW?: (swUrl: string, r: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: unknown) => void;
  }
  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}
