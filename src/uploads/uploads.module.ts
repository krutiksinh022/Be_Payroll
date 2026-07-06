import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { EmployeeRecord } from './employee-record.model';
import { Batch } from './batch.model';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [SequelizeModule.forFeature([EmployeeRecord, Batch])],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
