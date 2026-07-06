import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AssignRoleDto } from './dto/assign-role.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AdminGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  listUsers() {
    return this.usersService.findAll();
  }

  @Post()
  createUser(
    @Body()
    body: {
      name: string;
      email: string;
      password: string;
      user_type: string;
    },
  ) {
    return this.usersService.createUser(body);
  }

  @Patch(':id')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; email?: string },
  ) {
    return this.usersService.updateUser(id, body);
  }

  @Patch(':id/role')
  assignRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignRoleDto,
  ) {
    return this.usersService.assignRole(id, dto.user_type);
  }

  @Patch(':id/reset-password')
  resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.usersService.resetPassword(id, dto.password);
  }
}
