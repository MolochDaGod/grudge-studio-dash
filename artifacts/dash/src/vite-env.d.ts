/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_URL: string;
  readonly VITE_API_URL: string;
  readonly VITE_ACCOUNT_URL: string;
  readonly VITE_LAUNCHER_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_MINIO_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
