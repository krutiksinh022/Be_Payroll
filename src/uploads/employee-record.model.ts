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
  tableName: 'employee_records',
  underscored: true,
})
export class EmployeeRecord extends Model<
  InferAttributes<EmployeeRecord>,
  InferCreationAttributes<
    EmployeeRecord,
    { omit: 'id' | 'created_at' | 'updated_at' }
  >
> {
  declare id: number;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  declare employee_id: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  declare employee_name: string;

  @Column(DataType.DECIMAL(10, 2))
  declare amount: number | null;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  declare pay_period: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  declare source_file_name: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare row_number: number;

  @AllowNull(false)
  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  declare is_valid: boolean;

  @Column(DataType.TEXT)
  declare validation_errors: string | null;

  @Column(DataType.STRING(50))
  declare duplicate_status: string | null;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
