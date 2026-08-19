import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AttendanceStatus, WorkerRole } from '../common/enums';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { CreateWorkerProductionDto } from './dto/create-worker-production.dto';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { UpdateWorkerProductionDto } from './dto/update-worker-production.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { WorkerQueryDto } from './dto/worker-query.dto';
import { WorkersService } from './workers.service';

@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get('stats')
  getWorkersStats() {
    return this.workersService.getWorkersStats();
  }

  @Get('active')
  findActiveWorkers() {
    return this.workersService.findActiveWorkers();
  }

  @Get('attendance/today')
  getTodayAttendance() {
    return this.workersService.getTodayAttendance();
  }

  @Patch('attendance/:attendanceId')
  updateAttendance(
    @Param('attendanceId', ParseIntPipe) attendanceId: number,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
  ) {
    return this.workersService.updateAttendance(attendanceId, updateAttendanceDto);
  }

  @Patch('production/:productionId')
  updateProduction(
    @Param('productionId', ParseIntPipe) productionId: number,
    @Body() updateWorkerProductionDto: UpdateWorkerProductionDto,
  ) {
    return this.workersService.updateProduction(
      productionId,
      updateWorkerProductionDto,
    );
  }

  @Get('productivity/ranking')
  getProductivityRanking(
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
  ) {
    return this.workersService.getProductivityRanking(periodStart, periodEnd);
  }

  @Get('role/:role')
  findByRole(@Param('role', new ParseEnumPipe(WorkerRole)) role: WorkerRole) {
    return this.workersService.findByRole(role);
  }

  @Post()
  create(@Body() createWorkerDto: CreateWorkerDto) {
    return this.workersService.create(createWorkerDto);
  }

  @Get()
  findAll(@Query() query: WorkerQueryDto) {
    return this.workersService.findAll(query);
  }

  @Get(':id/profile')
  getWorkerProfile(@Param('id', ParseIntPipe) id: number) {
    return this.workersService.getWorkerProfile(id);
  }

  @Post(':id/attendance')
  markAttendance(
    @Param('id', ParseIntPipe) id: number,
    @Body() createAttendanceDto: CreateAttendanceDto,
  ) {
    return this.workersService.markAttendance(id, createAttendanceDto);
  }

  @Get(':id/attendance')
  getWorkerAttendance(
    @Param('id', ParseIntPipe) id: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status', new ParseEnumPipe(AttendanceStatus, { optional: true }))
    status?: AttendanceStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workersService.getWorkerAttendance(id, {
      startDate,
      endDate,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post(':id/production')
  addProduction(
    @Param('id', ParseIntPipe) id: number,
    @Body() createWorkerProductionDto: CreateWorkerProductionDto,
  ) {
    return this.workersService.addProduction(id, createWorkerProductionDto);
  }

  @Get(':id/production')
  getWorkerProduction(
    @Param('id', ParseIntPipe) id: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workersService.getWorkerProduction(id, {
      startDate,
      endDate,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.workersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateWorkerDto: UpdateWorkerDto,
  ) {
    return this.workersService.update(id, updateWorkerDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.workersService.remove(id);
  }
}
