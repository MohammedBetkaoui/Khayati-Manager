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
    updateAutomaticBackupSettings(
      options: BackupAutomaticSettings,
    ): Promise<BackupActionResult & BackupAutomaticSettings>;
    retryAutomaticBackup(): Promise<BackupAutomaticRunResult>;
    openBackupLocation(locationId: string): Promise<BackupActionResult>;
    selectRestoreFile(
      options: BackupDialogOptions,
    ): Promise<BackupInspectionResult>;
    restoreBackup(options: BackupRestoreOptions): Promise<BackupRestoreResult>;
    acknowledgeRestoreNotice(): Promise<BackupActionResult>;
    acknowledgeExternalBackupReminder(): Promise<BackupActionResult>;
    openKnownBackupLocation(locationId: string): Promise<BackupActionResult>;
    inspectKnownBackup(options: {
      locationId: string;
    }): Promise<BackupInspectionResult>;
    deleteKnownBackup(options: {
      locationId: string;
    }): Promise<BackupActionResult>;
    onRestoreProgress(
      callback: (progress: BackupRestoreProgress) => void,
    ): () => void;
    onAutomaticBackupStatus(
      callback: (result: BackupAutomaticRunResult) => void,
    ): () => void;
  };
}

type BackupLocationType = "MANUAL" | "EXTERNAL" | "AUTOMATIC";
type BackupHistoryType = BackupLocationType | "PRE_RESTORE";

interface BackupAutomaticSettings {
  enabled: boolean;
  retention: 7 | 14 | 30;
}

interface BackupAutomaticRunResult extends BackupActionResult {
  created?: boolean;
  skipped?: boolean;
  skippedReason?: string;
  fileName?: string;
  size?: number;
  createdAt?: string;
}

interface BackupHistoryEntry {
  locationId?: string;
  fileName: string;
  size: number;
  createdAt: string;
  type: BackupHistoryType;
  status: "SUCCESS";
  canOpen?: boolean;
  canRestore?: boolean;
  canDelete?: boolean;
}

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
  autoBackupEnabled: boolean;
  autoBackupRetention: 7 | 14 | 30;
  lastAutoBackupAt?: string;
  lastAutoBackupFileName?: string;
  lastAutoBackupSize?: number;
  lastAutoBackupAttemptAt?: string;
  lastAutoBackupStatus?: "SUCCESS" | "FAILED";
  lastAutoBackupErrorCode?: string;
  lastManualBackupAt?: string;
  lastExternalBackupAt?: string;
  externalReminderDue?: boolean;
  history: BackupHistoryEntry[];
  localBackupTotalSize?: number;
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
