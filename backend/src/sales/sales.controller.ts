import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateCustomerNoteDto } from './dto/create-customer-note.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CustomerFilterDto } from './dto/customer-filter.dto';
import { InvoiceFilterDto } from './dto/invoice-filter.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { SalesService } from './sales.service';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get('stats')
  getStats() {
    return this.salesService.getStats();
  }

  @Get('customers')
  findCustomers(@Query() query: CustomerFilterDto) {
    return this.salesService.findCustomers(query);
  }

  @Get('customers/stats')
  getCustomerStats() {
    return this.salesService.getCustomerStats();
  }

  @Post('customers')
  createCustomer(@Body() dto: CreateCustomerDto) {
    return this.salesService.createCustomer(dto);
  }

  @Get('customers/:id/profile')
  getCustomerProfile(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.getCustomerProfile(id);
  }

  @Get('customers/:id/history')
  getCustomerHistory(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.getCustomerHistory(id);
  }

  @Get('customers/:id/payments')
  getCustomerPayments(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.getCustomerPayments(id);
  }

  @Post('customers/:id/measurements')
  createMeasurement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMeasurementDto,
  ) {
    return this.salesService.createMeasurement(id, dto);
  }

  @Get('customers/:id/measurements')
  getCustomerMeasurements(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.getCustomerMeasurements(id);
  }

  @Post('customers/:id/notes')
  createCustomerNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCustomerNoteDto,
  ) {
    return this.salesService.createCustomerNote(id, dto);
  }

  @Get('customers/:id/notes')
  getCustomerNotes(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.getCustomerNotes(id);
  }

  @Get('customers/:id')
  findCustomerById(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.findCustomerById(id);
  }

  @Patch('customers/:id')
  updateCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.salesService.updateCustomer(id, dto);
  }

  @Patch('customers/:id/archive')
  archiveCustomer(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.archiveCustomer(id);
  }

  @Delete('customers/:id')
  deleteCustomer(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.deleteCustomer(id);
  }

  @Get('invoices')
  findInvoices(@Query() query: InvoiceFilterDto) {
    return this.salesService.findInvoices(query);
  }

  @Post('invoices')
  createInvoice(@Body() dto: CreateInvoiceDto) {
    return this.salesService.createInvoice(dto);
  }

  @Get('invoices/:id')
  findInvoiceById(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.findInvoiceById(id);
  }

  @Patch('invoices/:id')
  updateInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.salesService.updateInvoice(id, dto);
  }

  @Delete('invoices/:id')
  deleteInvoice(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.deleteInvoice(id);
  }

  @Post('payments')
  createPayment(@Body() dto: CreatePaymentDto) {
    return this.salesService.createPayment(dto);
  }

  @Get()
  findAll(@Query() query: InvoiceFilterDto) {
    return this.salesService.findAll(query);
  }
}
