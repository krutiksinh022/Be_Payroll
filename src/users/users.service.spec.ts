import { UsersService } from './users.service';
import { UserType } from './user-type.enum';

describe('UsersService', () => {
  let service: UsersService;
  let userModel: any;

  beforeEach(() => {
    userModel = {
      findOne: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
    };

    service = new UsersService(userModel);
  });

  it('assigns a role to a user', async () => {
    const updatedUser = { id: 1, user_type: UserType.HR };
    const user = { update: jest.fn().mockResolvedValue(updatedUser) };
    userModel.findByPk.mockResolvedValue(user);

    await expect(service.assignRole(1, UserType.HR)).resolves.toEqual(
      updatedUser,
    );
    expect(user.update).toHaveBeenCalledWith(
      { user_type: UserType.HR },
      { returning: true },
    );
  });

  it('resets a password by hashing the new value', async () => {
    const updatedUser = { id: 1, password_hash: 'hashed' };
    const user = { update: jest.fn().mockResolvedValue(updatedUser) };
    userModel.findByPk.mockResolvedValue(user);

    await expect(service.resetPassword(1, 'new-password')).resolves.toEqual(
      updatedUser,
    );
    expect(user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        password_hash: expect.stringMatching(/.+:.+/),
      }),
      { returning: true },
    );
  });
});
