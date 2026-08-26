import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateWorkshopSettingsDto } from './dto/update-workshop-settings.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { WorkshopSettings } from './entities/workshop-settings.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(WorkshopSettings)
    private readonly workshopSettingsRepository: Repository<WorkshopSettings>,
  ) {}

  async getWorkshopSettings() {
    const settings = (
      await this.workshopSettingsRepository.find({
        order: { id: 'ASC' },
        take: 1,
      })
    )[0];
    return (
      settings ??
      this.workshopSettingsRepository.create({
        workshopName: '',
        commercialName: null,
        address: null,
        phone: null,
        email: null,
        taxNumber: null,
        commercialRegister: null,
        logoPath: null,
        stampPath: null,
        defaultCurrency: 'DZD',
        defaultTaxEnabled: false,
        defaultTaxRate: 0,
        invoiceFooter: null,
      })
    );
  }

  async updateWorkshopSettings(dto: UpdateWorkshopSettingsDto) {
    const current = (
      await this.workshopSettingsRepository.find({
        order: { id: 'ASC' },
        take: 1,
      })
    )[0];
    const settings = this.workshopSettingsRepository.create({
      ...(current ?? { workshopName: '' }),
      ...dto,
      id: current?.id,
    });
    return this.workshopSettingsRepository.save(settings);
  }

  create(createSettingDto: CreateSettingDto) {
    return 'This action adds a new setting';
  }

  findAll() {
    return `This action returns all settings`;
  }

  findOne(id: number) {
    return `This action returns a #${id} setting`;
  }

  update(id: number, updateSettingDto: UpdateSettingDto) {
    return `This action updates a #${id} setting`;
  }

  remove(id: number) {
    return `This action removes a #${id} setting`;
  }
}
