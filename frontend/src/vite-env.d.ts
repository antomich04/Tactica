/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend API base URL; omit trailing slashes. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
