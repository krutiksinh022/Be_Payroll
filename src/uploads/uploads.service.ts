import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { EmployeeRecord } from './employee-record.model';
import { Batch } from './batch.model';
import { fn, col, where as sequelizeWhere, Op } from 'sequelize';

type ParsedEmployeeRow = {
  employee_id: string;
  employee_name: string;
  amount: number | null;
  pay_period: string;
  is_valid: boolean;
  validation_errors: string[];
  duplicate_status: string | null;
};

@Injectable()
export class UploadsService {
  constructor(
    @InjectModel(EmployeeRecord)
    private readonly employeeRecordModel: typeof EmployeeRecord,
    @InjectModel(Batch)
    private readonly batchModel: typeof Batch,
  ) {}

  parseCsvContent(content: string): ParsedEmployeeRow[] {
    if (!content || !content.trim()) {
      return [];
    }

    const lines = content
      .replace(/\uFEFF/g, '')
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
      return [];
    }

    const headers = this.parseCsvLine(lines[0]).map((header) =>
      header.toLowerCase().replace(/\s+/g, '_'),
    );
    const rows: ParsedEmployeeRow[] = [];
    const seenInFile = new Set<string>();

    for (let index = 1; index < lines.length; index += 1) {
      const values = this.parseCsvLine(lines[index]);
      const rowData = this.buildRow(headers, values);
      const errors: string[] = [];

      if (!rowData.employee_id) {
        errors.push('employee_id');
      }

      if (!rowData.employee_name) {
        errors.push('employee_name');
      }

      if (!rowData.pay_period) {
        errors.push('pay_period');
      }

      const amountValue = Number(rowData.amount);
      if (
        rowData.amount === '' ||
        Number.isNaN(amountValue) ||
        amountValue <= 0
      ) {
        errors.push('amount');
      }

      const normalizedKey = this.buildDuplicateKey(rowData);
      const duplicate = seenInFile.has(normalizedKey);
      if (duplicate) {
        errors.push('duplicate_record');
      }

      seenInFile.add(normalizedKey);

      rows.push({
        employee_id: rowData.employee_id,
        employee_name: rowData.employee_name,
        amount: errors.includes('amount') ? null : amountValue,
        pay_period: rowData.pay_period,
        is_valid: errors.length === 0,
        validation_errors: errors,
        duplicate_status: duplicate ? 'duplicate' : null,
      });
    }

    return rows;
  }

  async createFromCsv(fileName: string, fileBuffer: Buffer) {
    if (!fileBuffer?.length) {
      throw new BadRequestException('CSV file is empty');
    }

    const parsedRows = this.parseCsvContent(fileBuffer.toString('utf8'));

    if (parsedRows.length === 0) {
      throw new BadRequestException('No employee rows found in CSV');
    }

    const existingRecords = await this.employeeRecordModel.findAll({
      attributes: ['employee_id', 'employee_name', 'amount', 'pay_period'],
    });
    const existingKeys = new Set(
      existingRecords.map((record) => this.buildDuplicateKey(record as any)),
    );

    const preparedRows = parsedRows.map((row, index) => {
      const duplicateKey = this.buildDuplicateKey(row);
      const duplicateFound = existingKeys.has(duplicateKey);
      const errors = [...row.validation_errors];
      if (duplicateFound) {
        errors.push('duplicate_record');
      }

      const normalizedRow = {
        employee_id: row.employee_id,
        employee_name: row.employee_name,
        amount: row.amount,
        pay_period: row.pay_period,
        source_file_name: fileName,
        row_number: index + 2,
        is_valid: errors.length === 0,
        validation_errors: JSON.stringify(errors),
        duplicate_status: duplicateFound ? 'duplicate' : row.duplicate_status,
      };

      existingKeys.add(duplicateKey);
      return normalizedRow;
    });

    const createdRecords =
      await this.employeeRecordModel.bulkCreate(preparedRows);

    const batch = await this.createBatchRecord(fileName, createdRecords);

    return {
      message: 'CSV uploaded successfully',
      file_name: fileName,
      total_rows: createdRecords.length,
      valid_rows: createdRecords.filter((record) => record.is_valid).length,
      invalid_rows: createdRecords.filter((record) => !record.is_valid).length,
      duplicate_rows: createdRecords.filter(
        (record) => record.duplicate_status === 'duplicate',
      ).length,
      batch,
    };
  }

  async createBatchRecord(fileName: string, records: EmployeeRecord[]) {
    const successfulCount = records.filter((record) => record.is_valid).length;
    const failedCount = records.filter((record) => !record.is_valid).length;
    const deadLetterCount = records.filter(
      (record) => record.duplicate_status === 'duplicate',
    ).length;

    const batchPayload = {
      file_name: fileName,
      total_records: records.length,
      pending_count: 0,
      processing_count: 0,
      successful_count: successfulCount,
      failed_count: failedCount,
      dead_letter_count: deadLetterCount,
      status: 'completed',
    };

    const createdBatch = await this.batchModel.create(batchPayload);

    return {
      ...batchPayload,
      id: createdBatch?.id,
      created_at: createdBatch?.created_at,
      updated_at: createdBatch?.updated_at,
    };
  }

  async findAll(
    page = 1,
    limit = 10,
    filters?: { search?: string; status?: string },
  ) {
    const p = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const l = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10;
    const cappedLimit = Math.min(l, 100);
    const offset = (p - 1) * cappedLimit;

    const whereClauses: any[] = [];

    if (filters) {
      const { search, status } = filters;

      if (search) {
        const s = search.trim().toLowerCase();
        whereClauses.push({
          [Op.or]: [
            sequelizeWhere(fn('lower', col('employee_name')), {
              [Op.like]: `%${s}%`,
            }),
            { employee_id: { [Op.like]: `%${search}%` } },
          ],
        });
      }

      if (status) {
        const st = status.toLowerCase();
        if (st === 'valid') {
          whereClauses.push({ is_valid: true });
        } else if (st === 'invalid') {
          whereClauses.push({ is_valid: false });
        } else if (st === 'duplicate') {
          whereClauses.push({ duplicate_status: 'duplicate' });
        }
      }
    }

    const where =
      whereClauses.length > 0 ? { [Op.and]: whereClauses } : undefined;

    const { count, rows } = await this.employeeRecordModel.findAndCountAll({
      order: [['created_at', 'DESC']],
      offset,
      limit: cappedLimit,
      where,
    });

    return {
      data: rows,
      pagination: {
        total: count,
        page: p,
        limit: cappedLimit,
        totalPages: Math.ceil(count / cappedLimit) || 0,
      },
    };
  }

  async findBatches(page = 1, limit = 10, search?: string) {
    const p = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const l = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10;
    const cappedLimit = Math.min(l, 100);
    const offset = (p - 1) * cappedLimit;

    const where = search
      ? {
          file_name: {
            [Op.like]: `%${search}%`,
          },
        }
      : undefined;

    const { count, rows } = await this.batchModel.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      offset,
      limit: cappedLimit,
    });

    return {
      data: rows,
      pagination: {
        total: count,
        page: p,
        limit: cappedLimit,
        totalPages: Math.ceil(count / cappedLimit) || 0,
      },
    };
  }

  async getBatchSummary() {
    const [total, pending, processing, successful, failed, deadLetter] =
      await Promise.all([
        this.batchModel.count(),
        this.batchModel.sum('pending_count') as Promise<number>,
        this.batchModel.sum('processing_count') as Promise<number>,
        this.batchModel.sum('successful_count') as Promise<number>,
        this.batchModel.sum('failed_count') as Promise<number>,
        this.batchModel.sum('dead_letter_count') as Promise<number>,
      ]);

    return {
      total_records: total,
      pending: Number(pending ?? 0),
      processing: Number(processing ?? 0),
      successful: Number(successful ?? 0),
      failed: Number(failed ?? 0),
      dead_letter: Number(deadLetter ?? 0),
    };
  }

  private buildRow(headers: string[], values: string[]) {
    const normalizedValues = values.slice(0, headers.length);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = normalizedValues[index] ?? '';
    });

    return {
      employee_id: (row.employee_id ?? '').trim(),
      employee_name: (row.employee_name ?? '').trim(),
      amount: (row.amount ?? '').trim(),
      pay_period: (row.pay_period ?? '').trim(),
    };
  }

  private buildDuplicateKey(row: {
    employee_id?: string;
    employee_name?: string;
    amount?: number | string | null;
    pay_period?: string;
  }) {
    const amountValue =
      typeof row.amount === 'number'
        ? row.amount.toString()
        : (row.amount ?? '');

    return [
      row.employee_id ?? '',
      row.employee_name ?? '',
      amountValue,
      row.pay_period ?? '',
    ]
      .join('|')
      .toLowerCase();
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];

      if (char === '"') {
        if (inQuotes && line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  }
}
