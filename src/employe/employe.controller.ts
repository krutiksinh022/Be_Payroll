import { Controller, Get, Query } from '@nestjs/common';
import { EmployeService } from './employe.service';

@Controller('employe')
export class EmployeController {
  constructor(private readonly employeService: EmployeService) {}

  @Get()
  async listEmployees(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.employeService.findAll(Number(page ?? 1), Number(limit ?? 10), {
      search,
      status,
    });
  }
}
