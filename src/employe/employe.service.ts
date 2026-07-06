import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, col, fn, where as sequelizeWhere } from 'sequelize';
import { EmployeeRecord } from '../uploads/employee-record.model';

@Injectable()
export class EmployeService {
  constructor(
    @InjectModel(EmployeeRecord)
    private readonly employeeRecordModel: typeof EmployeeRecord,
  ) {}

  async findAll(
    page = 1,
    limit = 10,
    filters?: { search?: string; status?: string },
  ) {
    const currentPage =
      Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const pageSize =
      Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10;
    const cappedLimit = Math.min(pageSize, 100);
    const offset = (currentPage - 1) * cappedLimit;

    const whereClauses: any[] = [];

    if (filters?.search) {
      const searchValue = filters.search.trim().toLowerCase();
      whereClauses.push({
        [Op.or]: [
          sequelizeWhere(fn('lower', col('employee_name')), {
            [Op.like]: `%${searchValue}%`,
          }),
          { employee_id: { [Op.like]: `%${filters.search}%` } },
        ],
      });
    }

    if (filters?.status) {
      const status = filters.status.toLowerCase();
      if (status === 'valid') {
        whereClauses.push({ is_valid: true });
      } else if (status === 'invalid') {
        whereClauses.push({ is_valid: false });
      } else if (status === 'duplicate') {
        whereClauses.push({ duplicate_status: 'duplicate' });
      }
    }

    const where =
      whereClauses.length > 0 ? { [Op.and]: whereClauses } : undefined;

    const { count, rows } = await this.employeeRecordModel.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      offset,
      limit: cappedLimit,
      attributes: [
        'employee_id',
        'employee_name',
        'amount',
        'pay_period',
        'is_valid',
        'duplicate_status',
      ],
    });

    return {
      data: rows.map((record: any) => ({
        employee_id: record.employee_id,
        employee_name: record.employee_name,
        amount: record.amount,
        pay_period: record.pay_period,
        status: this.getStatus(record),
      })),
      pagination: {
        total: count,
        page: currentPage,
        limit: cappedLimit,
        totalPages: Math.ceil(count / cappedLimit) || 0,
      },
    };
  }

  private getStatus(record: {
    is_valid?: boolean;
    duplicate_status?: string | null;
  }) {
    if (record.duplicate_status === 'duplicate') {
      return 'duplicate';
    }

    return record.is_valid ? 'valid' : 'invalid';
  }
}
