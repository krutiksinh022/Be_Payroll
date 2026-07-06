import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { hashPassword } from '../common/password';
import { UserType } from './user-type.enum';
import { UsersService } from './users.service';

@Injectable()
export class AdminSeederService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeederService.name);

  constructor(private readonly usersService: UsersService) {}

  async onModuleInit() {
    const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@yopmail.com';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123456';
    const adminName = process.env.SEED_ADMIN_NAME ?? 'Admin';

    const existingAdmin = await this.usersService.findByEmail(adminEmail);

    if (existingAdmin) {
      this.logger.log(`Admin user already exists with email ${adminEmail}`);
      return;
    }

    await this.usersService.create({
      name: adminName,
      email: adminEmail,
      password_hash: hashPassword(adminPassword),
      user_type: UserType.Admin,
    });

    this.logger.log(`Seeded admin user ${adminEmail}`);
  }
}
