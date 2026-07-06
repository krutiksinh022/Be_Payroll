import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { hashPassword } from '../common/password';
import { User } from './user.model';
import { UserType } from './user-type.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,
  ) {}

  findByEmail(email: string) {
    return this.userModel.findOne({
      where: { email },
    });
  }

  findById(id: number) {
    return this.userModel.findByPk(id);
  }

  findAll() {
    return this.userModel.findAll({
      order: [['created_at', 'DESC']],
    });
  }

  create(input: {
    name: string;
    email: string;
    password_hash: string;
    user_type: UserType;
  }) {
    return this.userModel.create(input);
  }

  async createUser(input: {
    name: string;
    email: string;
    password: string;
    user_type: string;
  }) {
    const userType = Object.values(UserType).find(
      (value) => value === input.user_type,
    );

    if (!userType) {
      throw new Error('Invalid user_type');
    }

    return this.create({
      name: input.name,
      email: input.email,
      password_hash: hashPassword(input.password),
      user_type: userType,
    });
  }

  async updateUser(id: number, input: { name?: string; email?: string }) {
    const user = await this.userModel.findByPk(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.update(input, { returning: true });
  }

  async assignRole(id: number, userType: UserType) {
    const user = await this.userModel.findByPk(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.update({ user_type: userType }, { returning: true });
  }

  async resetPassword(id: number, password: string) {
    const user = await this.userModel.findByPk(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.update(
      { password_hash: hashPassword(password) },
      { returning: true },
    );
  }
}
