import {
  AllowNull,
  Column,
  CreatedAt,
  DataType,
  Model,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import type { InferAttributes, InferCreationAttributes } from 'sequelize';

@Table({
  tableName: 'batches',
  underscored: true,
})
export class Batch extends Model<
  InferAttributes<Batch>,
  InferCreationAttributes<Batch, { omit: 'id' | 'created_at' | 'updated_at' }>
> {
  declare id: number;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  declare file_name: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare total_records: number;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  declare pending_count: number;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  declare processing_count: number;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  declare successful_count: number;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  declare failed_count: number;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  declare dead_letter_count: number;

  @AllowNull(false)
  @Column({ type: DataType.STRING(30), defaultValue: 'completed' })
  declare status: string;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
