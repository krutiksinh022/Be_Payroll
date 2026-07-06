import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { EmployeService } from './employe.service';
import { EmployeeRecord } from '../uploads/employee-record.model';

describe('EmployeService', () => {
  let service: EmployeService;
  const mockModel = {
    findAndCountAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeService,
        {
          provide: getModelToken(EmployeeRecord),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<EmployeService>(EmployeService);
    mockModel.findAndCountAll.mockReset();
  });

  it('maps records to employee response and applies search and pagination', async () => {
    mockModel.findAndCountAll.mockResolvedValue({
      count: 1,
      rows: [
        {
          employee_id: 'E1',
          employee_name: 'Alice',
          amount: 100.5,
          pay_period: '2026-01',
          is_valid: true,
          duplicate_status: null,
        },
      ],
    });

    const result = await service.findAll(2, 5, { search: 'ali' });

    expect(mockModel.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        offset: 5,
        limit: 5,
        where: expect.any(Object),
      }),
    );
    expect(result.data).toEqual([
      {
        employee_id: 'E1',
        employee_name: 'Alice',
        amount: 100.5,
        pay_period: '2026-01',
        status: 'valid',
      },
    ]);
    expect(result.pagination).toEqual({
      total: 1,
      page: 2,
      limit: 5,
      totalPages: 1,
    });
  });
});
