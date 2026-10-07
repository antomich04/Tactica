/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend stream address used by production builds. */
  readonly VITE_WS_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
