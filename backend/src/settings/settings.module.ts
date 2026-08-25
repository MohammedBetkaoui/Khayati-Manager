import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PiecePrice } from './entities/piece-price.entity';
import { ProductionStage } from './entities/production-stage.entity';
import { Setting } from './entities/setting.entity';
import { WorkshopSettings } from './entities/workshop-settings.entity';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Setting,
      PiecePrice,
      ProductionStage,
      WorkshopSettings,
    ]),
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
