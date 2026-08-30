export type BackupErrorCode =
  | 'BACKUP_IN_PROGRESS'
  | 'RESTORE_IN_PROGRESS'
  | 'DATABASE_NOT_FOUND'
  | 'DATABASE_INVALID'
  | 'SCHEMA_VERSION_MISMATCH'
  | 'DESTINATION_INVALID'
  | 'DESTINATION_EXISTS'
  | 'DESTINATION_UNAVAILABLE'
  | 'INSUFFICIENT_SPACE'
  | 'ARCHIVE_INVALID'
  | 'CHECKSUM_MISMATCH'
  | 'FOREIGN_KEY_VIOLATION'
  | 'CRITICAL_TABLE_MISSING'
  | 'SAFETY_BACKUP_FAILED'
  | 'RESTORE_FAILED'
  | 'RESTORE_SWAP_FAILED'
  | 'RESTORE_ROLLBACK_FAILED';

export class BackupError extends Error {
  constructor(
    public readonly code: BackupErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'BackupError';
  }
}
