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
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { InventoryFilterDto } from './dto/inventory-filter.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  create(@Body() dto: CreateInventoryItemDto) {
    return this.inventoryService.create(dto);
  }

  @Get('stats')
  getStats() {
    return this.inventoryService.getStats();
  }

  @Get('low-stock')
  getLowStock(@Query() query: InventoryFilterDto) {
    return this.inventoryService.getLowStock(query);
  }

  @Post('movement')
  createMovement(@Body() dto: CreateStockMovementDto) {
    return this.inventoryService.createMovement(dto);
  }

  @Get('movements')
  getMovements(@Query() query: InventoryFilterDto) {
    return this.inventoryService.getMovements(query);
  }

  @Get('suppliers')
  getSuppliers() {
    return this.inventoryService.getSuppliers();
  }

  @Post('suppliers')
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.inventoryService.createSupplier(dto);
  }

  @Get('consumption-analysis')
  getConsumptionAnalysis() {
    return this.inventoryService.getConsumptionAnalysis();
  }

  @Get()
  findAll(@Query() query: InventoryFilterDto) {
    return this.inventoryService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.inventoryService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.remove(id);
  }
}
