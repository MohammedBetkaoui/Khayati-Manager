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
  khayatiBackup?: {
    createBackup(options: BackupDialogOptions): Promise<BackupCreateResult>;
    createExternalBackup(
      options: BackupDialogOptions,
    ): Promise<BackupCreateResult>;
    getStatus(): Promise<BackupStatus>;
    openBackupLocation(locationId: string): Promise<BackupActionResult>;
    selectRestoreFile(
      options: BackupDialogOptions,
    ): Promise<BackupInspectionResult>;
    restoreBackup(options: BackupRestoreOptions): Promise<BackupRestoreResult>;
    acknowledgeRestoreNotice(): Promise<BackupActionResult>;
    onRestoreProgress(
      callback: (progress: BackupRestoreProgress) => void,
    ): () => void;
  };
}

type BackupLocationType = "MANUAL" | "EXTERNAL";

interface BackupDialogOptions {
  language: "ar" | "fr";
}

interface BackupWarningSummary {
  code: string;
  assetKind?: "WORKSHOP_LOGO" | "WORKSHOP_STAMP";
}

interface BackupActionResult {
  success: boolean;
  cancelled?: boolean;
  errorCode?: string;
}

interface BackupCreateResult extends BackupActionResult {
  fileName?: string;
  size?: number;
  createdAt?: string;
  warnings?: BackupWarningSummary[];
  locationId?: string;
  locationType?: BackupLocationType;
  statePersisted?: boolean;
}

interface BackupStatus {
  hasBackup: boolean;
  lastBackupAt?: string;
  lastBackupFileName?: string;
  lastBackupSize?: number;
  lastBackupLocationType?: BackupLocationType;
  lastRestoreAt?: string;
  restoredBackupFileName?: string;
  restoredBackupCreatedAt?: string;
  restoreNoticePending?: boolean;
}

interface BackupInspectionResult extends BackupActionResult {
  valid?: boolean;
  fileName?: string;
  size?: number;
  createdAt?: string;
  appVersion?: string;
  schemaVersion?: number;
  restoreCandidateId?: string;
  statistics?: {
    customers: number;
    suppliers: number;
    workers: number;
    invoices: number;
    finishedProducts: number;
  };
  warnings?: BackupWarningSummary[];
}

type BackupRestoreStep =
  | "IDLE"
  | "VALIDATING"
  | "SAFETY_BACKUP"
  | "PREPARING"
  | "MIGRATING"
  | "SWAPPING"
  | "FINAL_VALIDATION"
  | "RESTARTING"
  | "COMPLETE"
  | "FAILED";

interface BackupRestoreOptions extends BackupDialogOptions {
  restoreCandidateId: string;
}

interface BackupRestoreProgress {
  active: boolean;
  step: BackupRestoreStep;
  startedAt?: string;
  updatedAt?: string;
  errorCode?: string;
}

interface BackupRestoreResult extends BackupActionResult {
  restoredBackupFileName?: string;
  restoredBackupCreatedAt?: string;
  safetyBackupFileName?: string;
  safetyBackupCreatedAt?: string;
  schemaVersion?: number;
  willRestart?: boolean;
  statePersisted?: boolean;
}
