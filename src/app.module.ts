import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { loadEnvFile } from './config/env';
import { RefreshToken } from './auth/refresh-token.model';
import { User } from './users/user.model';
import { UsersModule } from './users/users.module';
import { UploadsModule } from './uploads/uploads.module';
import { EmployeeRecord } from './uploads/employee-record.model';
import { Batch } from './uploads/batch.model';
import { EmployeModule } from './employe/employe.module';

loadEnvFile();

@Module({
  imports: [
    SequelizeModule.forRoot({
      dialect: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_DATABASE ?? 'payroll_db',
      models: [User, RefreshToken, EmployeeRecord, Batch],
      autoLoadModels: true,
      synchronize: process.env.DB_SYNC !== 'false',
    }),
    UsersModule,
    AuthModule,
    UploadsModule,
    EmployeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
