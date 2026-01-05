/// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly VITE_GOOGLE_CLIENT_ID: string;
    readonly VITE_GOOGLE_API_KEY: string;
    readonly VITE_PHOTOS_MAX_ITEM_COUNT?: string;
  }
}
