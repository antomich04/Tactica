/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend address, e.g. http://localhost:8080. Setting it turns the login screen on. Empty = offline demo. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
