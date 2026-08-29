import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CancelLegacyDebtDto } from './dto/cancel-legacy-debt.dto';
import { CreateLegacyDebtPaymentDto } from './dto/create-legacy-debt-payment.dto';
import { CreateLegacyDebtDto } from './dto/create-legacy-debt.dto';
import { UpdateLegacyDebtDto } from './dto/update-legacy-debt.dto';
import { LegacyDebtsService } from './legacy-debts.service';

@Controller()
export class LegacyDebtsController {
  constructor(private readonly legacyDebtsService: LegacyDebtsService) {}

  @Post('customers/:customerId/legacy-debts')
  createCustomerDebt(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() dto: CreateLegacyDebtDto,
  ) {
    return this.legacyDebtsService.createForCustomer(customerId, dto);
  }

  @Get('customers/:customerId/legacy-debts')
  findCustomerDebts(@Param('customerId', ParseIntPipe) customerId: number) {
    return this.legacyDebtsService.findForCustomer(customerId);
  }

  @Get('customers/:customerId/legacy-debts/:debtId')
  findCustomerDebt(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Param('debtId', ParseIntPipe) debtId: number,
  ) {
    return this.legacyDebtsService.findCustomerDebt(customerId, debtId);
  }

  @Patch('customers/:customerId/legacy-debts/:debtId')
  updateCustomerDebt(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Param('debtId', ParseIntPipe) debtId: number,
    @Body() dto: UpdateLegacyDebtDto,
  ) {
    return this.legacyDebtsService.updateCustomerDebt(customerId, debtId, dto);
  }

  @Post('customers/:customerId/legacy-debts/:debtId/payments')
  addCustomerPayment(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Param('debtId', ParseIntPipe) debtId: number,
    @Body() dto: CreateLegacyDebtPaymentDto,
  ) {
    return this.legacyDebtsService.addCustomerPayment(customerId, debtId, dto);
  }

  @Post('customers/:customerId/legacy-debts/:debtId/cancel')
  cancelCustomerDebt(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Param('debtId', ParseIntPipe) debtId: number,
    @Body() dto: CancelLegacyDebtDto,
  ) {
    return this.legacyDebtsService.cancelCustomerDebt(customerId, debtId, dto);
  }

  @Post('suppliers/:supplierId/legacy-debts')
  createSupplierDebt(
    @Param('supplierId', ParseIntPipe) supplierId: number,
    @Body() dto: CreateLegacyDebtDto,
  ) {
    return this.legacyDebtsService.createForSupplier(supplierId, dto);
  }

  @Get('suppliers/:supplierId/legacy-debts')
  findSupplierDebts(@Param('supplierId', ParseIntPipe) supplierId: number) {
    return this.legacyDebtsService.findForSupplier(supplierId);
  }

  @Get('suppliers/:supplierId/legacy-debts/:debtId')
  findSupplierDebt(
    @Param('supplierId', ParseIntPipe) supplierId: number,
    @Param('debtId', ParseIntPipe) debtId: number,
  ) {
    return this.legacyDebtsService.findSupplierDebt(supplierId, debtId);
  }

  @Patch('suppliers/:supplierId/legacy-debts/:debtId')
  updateSupplierDebt(
    @Param('supplierId', ParseIntPipe) supplierId: number,
    @Param('debtId', ParseIntPipe) debtId: number,
    @Body() dto: UpdateLegacyDebtDto,
  ) {
    return this.legacyDebtsService.updateSupplierDebt(supplierId, debtId, dto);
  }

  @Post('suppliers/:supplierId/legacy-debts/:debtId/payments')
  addSupplierPayment(
    @Param('supplierId', ParseIntPipe) supplierId: number,
    @Param('debtId', ParseIntPipe) debtId: number,
    @Body() dto: CreateLegacyDebtPaymentDto,
  ) {
    return this.legacyDebtsService.addSupplierPayment(supplierId, debtId, dto);
  }

  @Post('suppliers/:supplierId/legacy-debts/:debtId/cancel')
  cancelSupplierDebt(
    @Param('supplierId', ParseIntPipe) supplierId: number,
    @Param('debtId', ParseIntPipe) debtId: number,
    @Body() dto: CancelLegacyDebtDto,
  ) {
    return this.legacyDebtsService.cancelSupplierDebt(supplierId, debtId, dto);
  }
}
