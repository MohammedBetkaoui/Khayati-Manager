import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WorkersModule } from './workers/workers.module';
import { InventoryModule } from './inventory/inventory.module';
import { OrdersModule } from './orders/orders.module';
import { SalesModule } from './sales/sales.module';
import { PayrollModule } from './payroll/payroll.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';

const databaseDir = process.env.APPDATA
  ? join(process.env.APPDATA, 'Khayati Manager', 'database')
  : join(process.cwd(), 'database');

if (!existsSync(databaseDir)) {
  mkdirSync(databaseDir, { recursive: true });
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: join(databaseDir, 'khayati.sqlite'),
      autoLoadEntities: true,
      synchronize: true,
    }),
    WorkersModule,
    InventoryModule,
    OrdersModule,
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
