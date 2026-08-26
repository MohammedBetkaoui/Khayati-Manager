/// <reference types="vite/client" />

interface Window {
  electron?: {
    appVersion: string;
    platform: string;
    isPackaged: boolean;
    backend?: {
      baseUrl: string;
    };
    windowControls?: {
      minimize(): Promise<boolean>;
      toggleMaximize(): Promise<boolean>;
      close(): Promise<boolean>;
    };
  };
}
