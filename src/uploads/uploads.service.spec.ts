import { readFileSync } from 'fs';
import { resolve } from 'path';
import { UploadsService } from './uploads.service';

describe('UploadsService', () => {
  it('parses CSV content and flags invalid rows', () => {
    const service = new UploadsService({} as any, {} as any);

    const rows =
      service.parseCsvContent(`employee_id,employee_name,amount,pay_period
E001,Alice,1000,2024-01
E002,,500,2024-02
E003,Charlie,abc,2024-03
`);

    expect(rows).toHaveLength(3);
    expect(rows[0].is_valid).toBe(true);
    expect(rows[1].is_valid).toBe(false);
    expect(rows[1].validation_errors).toContain('employee_name');
    expect(rows[2].is_valid).toBe(false);
    expect(rows[2].validation_errors).toContain('amount');
  });

  it('creates a batch summary from uploaded rows', async () => {
    const batchModel = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
    } as any;
    const service = new UploadsService({} as any, batchModel);

    const batch = await service.createBatchRecord('sample.csv', [
      { is_valid: true, duplicate_status: null } as any,
      { is_valid: false, duplicate_status: null } as any,
      { is_valid: true, duplicate_status: 'duplicate' } as any,
    ]);

    expect(batch).toMatchObject({
      file_name: 'sample.csv',
      total_records: 3,
      successful_count: 2,
      failed_count: 1,
      dead_letter_count: 1,
    });
    expect(batchModel.create).toHaveBeenCalled();
  });

  it('provides a sample CSV file with at least 500 rows and validation cases', () => {
    const sampleCsvPath = resolve(
      __dirname,
      '..',
      '..',
      'sample-employees.csv',
    );
    const content = readFileSync(sampleCsvPath, 'utf8');
    const rows = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    expect(rows.length).toBeGreaterThanOrEqual(501);
    expect(content).toContain('employee_id,employee_name,amount,pay_period');
    expect(content).toContain('E001,Alice,1000,2024-01');
    expect(content).toContain('E001,Alice,1000,2024-01');
    expect(content).toContain('E002,,500,2024-02');
    expect(content).toContain('E003,Charlie,invalid,2024-03');
    expect(content).toContain('E004,Diana,,2024-04');
  });
});
