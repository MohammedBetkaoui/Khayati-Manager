import type { BackupErrorCode } from './backup.errors';

export type BackupAssetKind = 'WORKSHOP_LOGO' | 'WORKSHOP_STAMP';
export type BackupFileKind = 'DATABASE' | 'ASSET';

export type BackupWarning = {
  code:
    'ASSET_MISSING' | 'ASSET_NOT_LOCAL' | 'ASSET_NOT_FILE' | 'ASSET_UNREADABLE';
  assetKind: BackupAssetKind;
  message: string;
};

export type BackupManifestFile = {
  path: string;
  kind: BackupFileKind;
  size: number;
  sha256: string;
};

export type BackupManifestAsset = {
  kind: BackupAssetKind;
  databaseField: 'logoPath' | 'stampPath';
  path: string;
  originalFileName: string;
  mediaType: string | null;
};

export type BackupStatistics = {
  customers: number;
  suppliers: number;
  workers: number;
  invoices: number;
  finishedProducts: number;
};

export type BackupManifest = {
  format: string;
  backupFormatVersion: number;
  archiveFormat: string;
  application: string;
  appVersion: string;
  schemaVersion: number;
  sqliteUserVersion: number;
  createdAt: string;
  settingsSource: 'SQLITE';
  encryption: {
    mode: 'NONE';
  };
  database: {
    path: string;
    size: number;
    sha256: string;
  };
  assets: BackupManifestAsset[];
  files: BackupManifestFile[];
  warnings: BackupWarning[];
  statistics: BackupStatistics;
};

export type BackupWorkspace = {
  tempRootPath: string;
  rootPath: string;
  databaseDirectory: string;
  assetsDirectory: string;
  manifestPath: string;
  archivePath: string;
};

export type CreateBackupOptions = {
  destinationPath: string;
  databasePath?: string;
  tempRootPath?: string;
  appVersion?: string;
  createdAt?: Date;
  operationToken?: string;
};

export type CreateBackupResult = {
  filePath: string;
  fileName: string;
  size: number;
  sha256: string;
  manifest: BackupManifest;
};

export type SnapshotInspection = {
  sqliteUserVersion: number;
  statistics: BackupStatistics;
  configuredAssets: {
    logoPath: string | null;
    stampPath: string | null;
  };
};

export type ValidatedBackup = {
  manifest: BackupManifest;
  archiveSize: number;
  archiveSha256: string;
};

export type InspectBackupOptions = {
  filePath: string;
  tempRootPath?: string;
};

export type RestoreProgressStep =
  | 'IDLE'
  | 'VALIDATING'
  | 'SAFETY_BACKUP'
  | 'PREPARING'
  | 'MIGRATING'
  | 'SWAPPING'
  | 'FINAL_VALIDATION'
  | 'RESTARTING'
  | 'COMPLETE'
  | 'FAILED';

export type RestoreProgress = {
  active: boolean;
  step: RestoreProgressStep;
  startedAt?: string;
  updatedAt?: string;
  errorCode?: BackupErrorCode;
};

export type RestoreBackupOptions = {
  filePath: string;
  appVersion?: string;
};

export type RestoreBackupResult = {
  restoredBackupFileName: string;
  restoredBackupCreatedAt: string;
  safetyBackupFileName: string;
  safetyBackupCreatedAt: string;
  schemaVersion: number;
  statistics: BackupStatistics;
};

export type RestoreWorkspace = {
  id: string;
  tempRootPath: string;
  rootPath: string;
  extractedDirectory: string;
  databaseDirectory: string;
  temporaryDatabasePath: string;
};
