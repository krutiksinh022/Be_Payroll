import {
  AllowNull,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Model,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import type {
  InferAttributes,
  InferCreationAttributes,
  NonAttribute,
} from 'sequelize';
import { User } from '../users/user.model';

@Table({
  tableName: 'refresh_tokens',
  underscored: true,
})
export class RefreshToken extends Model<
  InferAttributes<RefreshToken>,
  InferCreationAttributes<
    RefreshToken,
    { omit: 'id' | 'user' | 'created_at' | 'updated_at' }
  >
> {
  declare id: number;

  @AllowNull(false)
  @ForeignKey(() => User)
  @Column(DataType.INTEGER)
  declare user_id: number;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  declare token_hash: string;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare expires_at: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare revoked_at: Date | null;

  @BelongsTo(() => User)
  declare user?: NonAttribute<User>;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
