// Build stamp baked in by Vite `define` (see vite.config.ts). No top-level
// import/export so these stay global ambient declarations.
declare const __BUILD_VERSION__: string; // CalVer from package.json, e.g. "2026.06.25"
declare const __BUILD_SHA__: string; // short git commit, e.g. "c0084d7"
