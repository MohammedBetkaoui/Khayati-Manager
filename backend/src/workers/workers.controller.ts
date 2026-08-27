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
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { CreateProductionDto } from './dto/create-production.dto';
import { CreateWorkerRoleDto } from './dto/create-worker-role.dto';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { UpdateProductionDto } from './dto/update-production.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { WorkerFilterDto } from './dto/worker-filter.dto';
import { WorkersService } from './workers.service';

@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get('roles')
  getRoles() {
    return this.workersService.getRoleOptions();
  }

  @Post('roles')
  createRole(@Body() dto: CreateWorkerRoleDto) {
    return this.workersService.createRoleOption(dto);
  }

  @Get('stats')
  getStats() {
    return this.workersService.getStats();
  }

  @Patch('attendance/:id')
  updateAttendance(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAttendanceDto,
  ) {
    return this.workersService.updateAttendance(id, dto);
  }

  @Patch('production/:id')
  updateProduction(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductionDto,
  ) {
    return this.workersService.updateProduction(id, dto);
  }

  @Post()
  create(@Body() dto: CreateWorkerDto) {
    return this.workersService.create(dto);
  }

  @Get()
  findAll(@Query() query: WorkerFilterDto) {
    return this.workersService.findAll(query);
  }

  @Get(':id/profile')
  getProfile(@Param('id', ParseIntPipe) id: number) {
    return this.workersService.getProfile(id);
  }

  @Post(':id/attendance')
  createAttendance(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAttendanceDto,
  ) {
    return this.workersService.createAttendance(id, dto);
  }

  @Get(':id/attendance')
  getAttendance(
    @Param('id', ParseIntPipe) id: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workersService.getAttendance(id, {
      startDate,
      endDate,
      status,
      page,
      limit,
    });
  }

  @Post(':id/production')
  createProduction(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateProductionDto,
  ) {
    return this.workersService.createProduction(id, dto);
  }

  @Get(':id/production')
  getProduction(
    @Param('id', ParseIntPipe) id: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workersService.getProduction(id, {
      startDate,
      endDate,
      page,
      limit,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.workersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkerDto,
  ) {
    return this.workersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.workersService.remove(id);
  }
}
