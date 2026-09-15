/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CARTO_API_KEY?: string;
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
