import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApplyCustomerCreditDto, UseSaleCustomerCreditDto } from './dto/apply-customer-credit.dto';
import { CreateCreditAdvanceDto } from './dto/create-credit-advance.dto';
import { RefundCustomerCreditDto } from './dto/refund-customer-credit.dto';
import { ReverseCreditTransactionDto } from './dto/reverse-credit-transaction.dto';
import { CustomerCreditsService } from './customer-credits.service';

@Controller()
export class CustomerCreditsController {
  constructor(private readonly customerCreditsService: CustomerCreditsService) {}

  @Get('customers/:customerId/credit')
  getCredit(@Param('customerId', ParseIntPipe) customerId: number) {
    return this.customerCreditsService.getSummary(customerId);
  }

  @Get('customers/:customerId/credit/transactions')
  getTransactions(@Param('customerId', ParseIntPipe) customerId: number) {
    return this.customerCreditsService.getTransactions(customerId);
  }

  @Post('customers/:customerId/credit/advance')
  addAdvance(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() dto: CreateCreditAdvanceDto,
  ) {
    return this.customerCreditsService.addAdvance(customerId, dto);
  }

  @Post('customers/:customerId/credit/refund')
  refund(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() dto: RefundCustomerCreditDto,
  ) {
    return this.customerCreditsService.refund(customerId, dto);
  }

  @Post('customers/:customerId/credit/apply')
  apply(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() dto: ApplyCustomerCreditDto,
  ) {
    return this.customerCreditsService.apply(customerId, dto);
  }

  @Post('customers/:customerId/credit/transactions/:transactionId/reverse')
  @HttpCode(HttpStatus.OK)
  reverse(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Param('transactionId', ParseIntPipe) transactionId: number,
    @Body() dto: ReverseCreditTransactionDto,
  ) {
    return this.customerCreditsService.reverse(
      customerId,
      transactionId,
      dto.reason,
    );
  }

  @Post('sales/:saleId/use-customer-credit')
  useOnSale(
    @Param('saleId', ParseIntPipe) saleId: number,
    @Body() dto: UseSaleCustomerCreditDto,
  ) {
    return this.customerCreditsService.applyToSale(
      Number(dto.customerId),
      saleId,
      dto.amount,
      dto.notes,
    );
  }
}
