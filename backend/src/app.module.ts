import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExpensesModule } from './expenses/expenses.module';
import { InventoryModule } from './inventory/inventory.module';
import { PayrollModule } from './payroll/payroll.module';
import { ReportsModule } from './reports/reports.module';
import { SalesModule } from './sales/sales.module';
import { SettingsModule } from './settings/settings.module';
import { WorkersModule } from './workers/workers.module';
import { preparePayrollDatabase } from './database/prepare-payroll-database';

const defaultDatabasePath = join(__dirname, '..', 'database', 'khayati.sqlite');
const configuredDatabasePath = process.env.KHAYATI_DATABASE_PATH;
const databasePath = configuredDatabasePath
  ? isAbsolute(configuredDatabasePath)
    ? configuredDatabasePath
    : resolve(process.cwd(), configuredDatabasePath)
  : defaultDatabasePath;
const databaseDir = dirname(databasePath);

if (!existsSync(databaseDir)) {
  mkdirSync(databaseDir, { recursive: true });
}

preparePayrollDatabase(databasePath);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: databasePath,
      autoLoadEntities: true,
      synchronize: process.env.TYPEORM_SYNCHRONIZE !== 'false',
    }),
    WorkersModule,
    InventoryModule,
    SalesModule,
    PayrollModule,
    ExpensesModule,
    ReportsModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
