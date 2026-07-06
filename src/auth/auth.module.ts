import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UsersModule } from '../users/users.module';
import { RefreshToken } from './refresh-token.model';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [SequelizeModule.forFeature([RefreshToken]), UsersModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
