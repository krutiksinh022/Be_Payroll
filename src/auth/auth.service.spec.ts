import { AuthService } from './auth.service';
import { UserType } from '../users/user-type.enum';
import * as passwordUtils from '../common/password';
import * as jwtUtils from '../common/jwt';

describe('AuthService login permissions', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock; findById: jest.Mock };
  let refreshTokenModel: { create: jest.Mock };

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };
    refreshTokenModel = {
      create: jest.fn().mockResolvedValue(undefined),
    };

    service = new AuthService(usersService as any, refreshTokenModel as any);

    jest.spyOn(passwordUtils, 'verifyPassword').mockReturnValue(true);
    jest.spyOn(jwtUtils, 'signJwt').mockReturnValue('signed-token');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([UserType.HR, UserType.Supervisor])(
    'returns employee view permission for %s users',
    async (userType) => {
      usersService.findByEmail.mockResolvedValue({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        user_type: userType,
        is_active: true,
      });

      const result = await service.login('test@example.com', 'password123');

      expect(result.user.permissions).toEqual(['view_employee']);
    },
  );
});
