import { Injectable, Logger } from '@nestjs/common';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { BackupCatalogService } from './backup-catalog.service';
import { BackupService } from './backup.service';

export type AutomaticBackupRunResult = {
  created: boolean;
  skippedReason?: 'ALREADY_CREATED_TODAY' | 'SYSTEM_CLOCK_BEHIND';
  fileName?: string;
  size?: number;
  createdAt?: string;
  warnings?: Array<{ code: string; assetKind?: string }>;
  retention: { kept: number; deleted: number };
};

@Injectable()
export class BackupSchedulerService {
  private readonly logger = new Logger(BackupSchedulerService.name);

  constructor(
    private readonly backupService: BackupService,
    private readonly catalogService: BackupCatalogService,
  ) {}

  async runDailyAutomaticBackup(options: {
    retention: 7 | 14 | 30;
    appVersion?: string;
    now?: Date;
  }): Promise<AutomaticBackupRunResult> {
    const now = options.now ?? new Date();
    const existing = await this.catalogService.automaticBackupForDay(now);
    if (existing) {
      return {
        created: false,
        skippedReason: 'ALREADY_CREATED_TODAY',
        fileName: existing.fileName,
        size: existing.size,
        createdAt: existing.createdAt,
        retention: await this.catalogService.applyAutomaticRetention(
          options.retention,
        ),
      };
    }

    const latest = await this.catalogService.latestAutomaticBackup();
    if (latest && Date.parse(latest.createdAt) > now.getTime()) {
      return {
        created: false,
        skippedReason: 'SYSTEM_CLOCK_BEHIND',
        retention: await this.catalogService.applyAutomaticRetention(
          options.retention,
        ),
      };
    }

    const directory = await this.catalogService.ensureAutomaticDirectory();
    const destinationPath = await this.uniqueDestination(directory, now);
    const result = await this.backupService.createBackup({
      destinationPath,
      appVersion: options.appVersion,
      createdAt: now,
    });
    const retention = await this.catalogService.applyAutomaticRetention(
      options.retention,
    );
    this.logger.log(`Automatic backup created: ${result.fileName}`);
    return {
      created: true,
      fileName: result.fileName,
      size: result.size,
      createdAt: result.manifest.createdAt,
      warnings: result.manifest.warnings.map((warning) => ({
        code: warning.code,
        assetKind: warning.assetKind,
      })),
      retention,
    };
  }

  private async uniqueDestination(directory: string, date: Date) {
    const pad = (value: number) => String(value).padStart(2, '0');
    const base = `KhayatiManager_AutoBackup_${date.getFullYear()}-${pad(
      date.getMonth() + 1,
    )}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}`;
    for (let suffix = 0; suffix < 100; suffix += 1) {
      const candidate = join(
        directory,
        `${base}${suffix ? `_${suffix + 1}` : ''}.kmb`,
      );
      try {
        await stat(candidate);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return candidate;
        throw error;
      }
    }
    throw new Error('Unable to allocate a unique automatic backup filename.');
  }
}
