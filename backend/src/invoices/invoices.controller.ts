import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CancelInvoiceDto } from './dto/cancel-invoice.dto';
import { CreateInvoiceFromOrderDto } from './dto/create-invoice-from-order.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateInvoicePaymentDto } from './dto/create-invoice-payment.dto';
import { InvoiceFilterDto } from './dto/invoice-filter.dto';
import { UpdateInvoiceDraftDto } from './dto/update-invoice-draft.dto';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly invoicePdfService: InvoicePdfService,
  ) {}

  @Post('from-order/:orderId')
  createFromOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: CreateInvoiceFromOrderDto,
  ) {
    return this.invoicesService.createFromOrder(orderId, dto);
  }

  @Post()
  create(@Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(dto);
  }

  @Get()
  findAll(@Query() query: InvoiceFilterDto) {
    return this.invoicesService.findAll(query);
  }

  @Get(':id/pdf')
  async downloadPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    const { buffer, filename } = await this.invoicePdfService.generate(id);
    response.set({
      'Cache-Control': 'no-store',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': String(buffer.length),
      'Content-Type': 'application/pdf',
      'X-Invoice-Filename': filename,
    });
    response.end(buffer);
  }

  @Get(':id/preview')
  preview(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.findOne(id);
  }

  @Post(':id/payments')
  addPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateInvoicePaymentDto,
  ) {
    return this.invoicesService.addPayment(id, dto);
  }

  @Get(':id/payments')
  getPayments(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.getPayments(id);
  }

  @Post(':id/issue')
  @HttpCode(HttpStatus.OK)
  issueDraft(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.issueDraft(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id', ParseIntPipe) id: number, @Body() dto: CancelInvoiceDto) {
    return this.invoicesService.cancel(id, dto);
  }

  @Patch(':id')
  updateDraft(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInvoiceDraftDto,
  ) {
    return this.invoicesService.updateDraft(id, dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.findOne(id);
  }
}
