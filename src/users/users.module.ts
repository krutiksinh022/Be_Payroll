import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from './user.model';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AdminGuard } from './admin.guard';
import { AdminSeederService } from './admin-seeder.service';

@Module({
  imports: [SequelizeModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService, AdminGuard, AdminSeederService],
  exports: [UsersService],
})
export class UsersModule {}
