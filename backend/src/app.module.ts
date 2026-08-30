import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnalyticsModule } from './analytics/analytics.module';
import { BackupModule } from './backup/backup.module';
import { ExpensesModule } from './expenses/expenses.module';
import { InvoicesModule } from './invoices/invoices.module';
import { InventoryModule } from './inventory/inventory.module';
import { LegacyDebtsModule } from './legacy-debts/legacy-debts.module';
import { CustomerCreditsModule } from './customer-credits/customer-credits.module';
import { OrdersModule } from './orders/orders.module';
import { PayrollModule } from './payroll/payroll.module';
import { ReportsModule } from './reports/reports.module';
import { SalesModule } from './sales/sales.module';
import { SettingsModule } from './settings/settings.module';
import { WorkersModule } from './workers/workers.module';
import { createNestTypeOrmOptions } from './database/database-options';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(createNestTypeOrmOptions()),
    WorkersModule,
    InventoryModule,
    LegacyDebtsModule,
    CustomerCreditsModule,
    OrdersModule,
    SalesModule,
    InvoicesModule,
    PayrollModule,
    ExpensesModule,
    ReportsModule,
    SettingsModule,
    AnalyticsModule,
    BackupModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
