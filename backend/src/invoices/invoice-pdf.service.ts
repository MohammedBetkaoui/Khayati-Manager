import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, normalize } from 'node:path';
import { Repository } from 'typeorm';
import { InvoiceStatus } from '../common/enums';
import { InvoiceWorkshopSnapshot } from '../sales/entities/invoice.entity';
import { WorkshopSettings } from '../settings/entities/workshop-settings.entity';
import { InvoicesService } from './invoices.service';
import {
  InvoicePdfTemplateInput,
  renderInvoicePdf,
} from './templates/invoice-pdf.template';

type LoadedImage = {
  bytes: Uint8Array;
  type: 'png' | 'jpg';
};

@Injectable()
export class InvoicePdfService {
  constructor(
    private readonly invoicesService: InvoicesService,
    @InjectRepository(WorkshopSettings)
    private readonly workshopSettingsRepository: Repository<WorkshopSettings>,
  ) {}

  async generate(invoiceId: number) {
    const invoice = await this.invoicesService.findOne(invoiceId);
    if (invoice.invoiceStatus === InvoiceStatus.DRAFT) {
      throw new ConflictException(
        'A draft invoice must be issued before PDF generation',
      );
    }

    const currentSettings = invoice.workshopSnapshot
      ? null
      : ((
          await this.workshopSettingsRepository.find({
            order: { id: 'ASC' },
            take: 1,
          })
        )[0] ?? null);
    const workshop =
      invoice.workshopSnapshot ?? this.toWorkshopSnapshot(currentSettings);
    const logo = this.loadImage(workshop?.logoPath) ?? this.loadDefaultLogo();
    const stamp = this.loadImage(workshop?.stampPath);

    const input: InvoicePdfTemplateInput = {
      invoice,
      workshop,
      fontBytes: this.loadArabicFont(),
      logoBytes: logo?.bytes,
      logoType: logo?.type,
      stampBytes: stamp?.bytes,
      stampType: stamp?.type,
    };
    const buffer = await renderInvoicePdf(input);

    return {
      buffer,
      filename: `Invoice_${this.safeFilename(invoice.invoiceNumber)}.pdf`,
    };
  }

  private loadArabicFont() {
    const candidates = [
      join(__dirname, 'assets', 'Tajawal-Regular.ttf'),
      join(process.cwd(), 'dist', 'invoices', 'assets', 'Tajawal-Regular.ttf'),
      join(process.cwd(), 'src', 'invoices', 'assets', 'Tajawal-Regular.ttf'),
    ];
    const path = candidates.find((candidate) => existsSync(candidate));
    if (!path) {
      throw new InternalServerErrorException(
        'The Arabic invoice font is not available',
      );
    }
    return readFileSync(path);
  }

  private loadDefaultLogo(): LoadedImage | null {
    const candidates = [
      join(__dirname, 'assets', 'logopdf.png'),
      join(process.cwd(), 'dist', 'invoices', 'assets', 'logopdf.png'),
      join(process.cwd(), 'src', 'invoices', 'assets', 'logopdf.png'),
      join(process.cwd(), 'frontend', 'src', 'static', 'logopdf.png'),
    ];
    const path = candidates.find((candidate) => existsSync(candidate));
    return path ? { bytes: readFileSync(path), type: 'png' } : null;
  }

  private loadImage(configuredPath?: string | null): LoadedImage | null {
    if (!configuredPath?.trim()) return null;
    try {
      const dataImage = this.readDataImage(configuredPath.trim());
      if (dataImage) return dataImage;

      const path = this.resolveConfiguredPath(configuredPath.trim());
      if (!path) return null;
      const bytes = readFileSync(path);
      const type = this.detectImageType(bytes);
      return type ? { bytes, type } : null;
    } catch {
      return null;
    }
  }

  private readDataImage(value: string): LoadedImage | null {
    const match = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(value);
    if (!match) return null;
    return {
      bytes: Buffer.from(match[2], 'base64'),
      type: match[1].toLowerCase() === 'png' ? 'png' : 'jpg',
    };
  }

  private resolveConfiguredPath(value: string) {
    if (/^https?:\/\//i.test(value)) return null;
    const cleanPath = value.startsWith('file://')
      ? decodeURIComponent(value.slice(7))
      : value;
    if (isAbsolute(cleanPath)) {
      const path = normalize(cleanPath);
      return existsSync(path) ? path : null;
    }

    const resourcesPath = (
      process as NodeJS.Process & { resourcesPath?: string }
    ).resourcesPath;
    const candidates = [
      join(process.cwd(), cleanPath),
      join(dirname(process.execPath), cleanPath),
      resourcesPath ? join(resourcesPath, cleanPath) : null,
    ].filter((path): path is string => Boolean(path));
    return candidates.find((path) => existsSync(path)) ?? null;
  }

  private detectImageType(bytes: Uint8Array): 'png' | 'jpg' | null {
    if (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    ) {
      return 'png';
    }
    if (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    ) {
      return 'jpg';
    }
    return null;
  }

  private toWorkshopSnapshot(
    settings: WorkshopSettings | null,
  ): InvoiceWorkshopSnapshot | null {
    if (!settings) return null;
    return {
      workshopName: settings.workshopName,
      commercialName: settings.commercialName ?? null,
      address: settings.address ?? null,
      phone: settings.phone ?? null,
      email: settings.email ?? null,
      taxNumber: settings.taxNumber ?? null,
      commercialRegister: settings.commercialRegister ?? null,
      logoPath: settings.logoPath ?? null,
      stampPath: settings.stampPath ?? null,
      invoiceFooter: settings.invoiceFooter ?? null,
    };
  }

  private safeFilename(value: string) {
    return value.replace(/[^A-Za-z0-9_-]/g, '_');
  }
}
