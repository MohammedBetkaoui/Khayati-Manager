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
import { AddMaterialDto } from './dto/add-material.dto';
import { AssignWorkerDto } from './dto/assign-worker.dto';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('dashboard')
  getDashboardStats() {
    return this.ordersService.getDashboardStats();
  }

  @Get('delayed')
  getDelayedOrders() {
    return this.ordersService.getDelayedOrders();
  }

  @Get()
  findAll(@Query() query: OrderFilterDto) {
    return this.ordersService.findAll(query);
  }

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Get(':id/details')
  getDetails(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getDetails(id);
  }

  @Get(':id/cost')
  calculateProductionCost(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.calculateProductionCost(id);
  }

  @Patch(':id/status')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeOrderStatusDto,
  ) {
    return this.ordersService.changeStatus(id, dto);
  }

  @Post(':id/workers')
  assignWorker(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignWorkerDto,
  ) {
    return this.ordersService.assignWorker(id, dto);
  }

  @Post(':id/materials')
  addMaterial(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddMaterialDto,
  ) {
    return this.ordersService.addMaterial(id, dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.remove(id);
  }
}
