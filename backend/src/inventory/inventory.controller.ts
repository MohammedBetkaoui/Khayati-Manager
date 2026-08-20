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
import { AdjustProductStockDto } from './dto/adjust-product-stock.dto';
import { CreateFinishedProductDto } from './dto/create-finished-product.dto';
import { CreateMaterialPurchaseDto } from './dto/create-material-purchase.dto';
import { CreateProductionDto } from './dto/create-production.dto';
import { FinishedProductFilterDto } from './dto/finished-product-filter.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { CreateSupplierAdvanceDto } from './dto/create-supplier-advance.dto';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { InventoryFilterDto } from './dto/inventory-filter.dto';
import { SupplierFilterDto } from './dto/supplier-filter.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { UpdateFinishedProductDto } from './dto/update-finished-product.dto';
import { FinishedProductsService } from './finished-products.service';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly finishedProductsService: FinishedProductsService,
  ) {}

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
  getSuppliers(@Query() query: SupplierFilterDto) {
    return this.inventoryService.getSuppliers(query);
  }

  @Get('suppliers/stats')
  getSupplierStats() {
    return this.inventoryService.getSupplierStats();
  }

  @Post('suppliers')
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.inventoryService.createSupplier(dto);
  }

  @Get('suppliers/:id/profile')
  getSupplierProfile(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.findSupplierProfile(id);
  }

  @Patch('suppliers/:id')
  updateSupplier(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSupplierDto,
  ) {
    return this.inventoryService.updateSupplier(id, dto);
  }

  @Delete('suppliers/:id')
  archiveSupplier(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.archiveSupplier(id);
  }

  @Post('suppliers/:id/advances')
  createSupplierAdvance(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSupplierAdvanceDto,
  ) {
    return this.inventoryService.createSupplierAdvance(id, dto);
  }

  @Post('supplier-payments')
  createSupplierPayment(@Body() dto: CreateSupplierPaymentDto) {
    return this.inventoryService.createSupplierPayment(dto);
  }

  @Get('material-purchases')
  getMaterialPurchases(@Query() query: InventoryFilterDto) {
    return this.inventoryService.getMaterialPurchases(query);
  }

  @Post('material-purchases')
  createMaterialPurchase(@Body() dto: CreateMaterialPurchaseDto) {
    return this.inventoryService.createMaterialPurchase(dto);
  }

  @Get('raw-materials')
  findRawMaterials(@Query() query: InventoryFilterDto) {
    return this.inventoryService.findAll(query);
  }

  @Get('consumption-analysis')
  getConsumptionAnalysis() {
    return this.inventoryService.getConsumptionAnalysis();
  }

  @Get('products/stats')
  getFinishedProductStats() {
    return this.finishedProductsService.getStats();
  }

  @Get('products/productions')
  getProductions(@Query('productId') productId?: string) {
    return this.finishedProductsService.findProductions(
      productId ? Number(productId) : undefined,
    );
  }

  @Post('products')
  createFinishedProduct(@Body() dto: CreateFinishedProductDto) {
    return this.finishedProductsService.create(dto);
  }

  @Get('products')
  findFinishedProducts(@Query() query: FinishedProductFilterDto) {
    return this.finishedProductsService.findAll(query);
  }

  @Get('products/:id')
  findFinishedProduct(@Param('id', ParseIntPipe) id: number) {
    return this.finishedProductsService.findOne(id);
  }

  @Patch('products/:id')
  updateFinishedProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFinishedProductDto,
  ) {
    return this.finishedProductsService.update(id, dto);
  }

  @Delete('products/:id')
  archiveFinishedProduct(@Param('id', ParseIntPipe) id: number) {
    return this.finishedProductsService.archive(id);
  }

  @Post('products/:id/production')
  createProduction(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateProductionDto,
  ) {
    if (dto.productId !== id) dto.productId = id;
    return this.finishedProductsService.createProduction(dto);
  }

  @Post('products/:id/stock-adjustment')
  adjustFinishedProductStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustProductStockDto,
  ) {
    return this.finishedProductsService.adjustStock(id, dto);
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
