import { UserType } from '../../users/user-type.enum';

export class RegisterDto {
  name: string;
  email: string;
  password: string;
  user_type: UserType;
}
