import {
  AllowNull,
  Column,
  CreatedAt,
  DataType,
  Model,
  Table,
  Unique,
  UpdatedAt,
} from 'sequelize-typescript';
import type {
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { UserType } from './user-type.enum';

@Table({
  tableName: 'users',
  underscored: true,
})
export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<
    User,
    { omit: 'id' | 'is_active' | 'created_at' | 'updated_at' }
  >
> {
  declare id: number;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING(150))
  declare email: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  declare password_hash: string;

  @AllowNull(false)
  @Column(DataType.STRING(150))
  declare name: string;

  @AllowNull(false)
  @Column({
    type: DataType.ENUM(...Object.values(UserType)),
  })
  declare user_type: UserType;

  @AllowNull(false)
  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  declare is_active: boolean;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
