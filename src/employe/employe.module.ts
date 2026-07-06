import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { EmployeController } from './employe.controller';
import { EmployeService } from './employe.service';
import { EmployeeRecord } from '../uploads/employee-record.model';

@Module({
  imports: [SequelizeModule.forFeature([EmployeeRecord])],
  controllers: [EmployeController],
  providers: [EmployeService],
  exports: [EmployeService],
})
export class EmployeModule {}
