/// <reference types="vite/client" />

interface Window {
  electron?: {
    appVersion: string;
    platform: string;
    isPackaged: boolean;
    windowControls?: {
      minimize(): Promise<boolean>;
      toggleMaximize(): Promise<boolean>;
      close(): Promise<boolean>;
    };
  };
}