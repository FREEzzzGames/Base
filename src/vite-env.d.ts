/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FREEZZ_DEV_TOOLS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
