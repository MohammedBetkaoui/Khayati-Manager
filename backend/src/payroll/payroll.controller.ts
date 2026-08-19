import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CancelPayrollDto } from './dto/cancel-payroll.dto';
import { CreateAdvanceDto } from './dto/create-advance.dto';
import { CreateLoanRepaymentDto } from './dto/create-loan-repayment.dto';
import { CreateLoanDto } from './dto/create-loan.dto';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { CreateSalaryPaymentDto } from './dto/create-salary-payment.dto';
import { PayrollFilterDto } from './dto/payroll-filter.dto';
import { UpdatePayrollDto } from './dto/update-payroll.dto';
import { PayrollService } from './payroll.service';

@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get('dashboard')
  getDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.payrollService.getDashboardStats(startDate, endDate);
  }

  @Get('advances')
  getAdvances(@Query('workerId') workerId?: string) {
    return this.payrollService.getAdvances(workerId ? Number(workerId) : undefined);
  }

  @Post('advances')
  createAdvance(@Body() dto: CreateAdvanceDto) {
    return this.payrollService.createAdvance(dto);
  }

  @Get('loans')
  getLoans(@Query('workerId') workerId?: string) {
    return this.payrollService.getLoans(workerId ? Number(workerId) : undefined);
  }

  @Post('loans')
  createLoan(@Body() dto: CreateLoanDto) {
    return this.payrollService.createLoan(dto);
  }

  @Post('loans/:id/repayments')
  repayLoan(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateLoanRepaymentDto,
  ) {
    return this.payrollService.repayLoan(id, dto);
  }

  @Get('workers/:id/history')
  getWorkerHistory(@Param('id', ParseIntPipe) id: number) {
    return this.payrollService.getWorkerFinancialProfile(id);
  }

  @Post()
  create(@Body() dto: CreatePayrollDto) {
    return this.payrollService.create(dto);
  }

  @Get()
  findAll(@Query() query: PayrollFilterDto) {
    return this.payrollService.findAll(query);
  }

  @Post(':id/payments')
  createPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSalaryPaymentDto,
  ) {
    return this.payrollService.createPayment(id, dto);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelPayrollDto,
  ) {
    return this.payrollService.cancel(id, dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.payrollService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePayrollDto,
  ) {
    return this.payrollService.update(id, dto);
  }
}
