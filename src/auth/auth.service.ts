import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { createHash } from 'crypto';
import { signJwt, verifyJwt } from '../common/jwt';
import { hashPassword, verifyPassword } from '../common/password';
import { UserType } from '../users/user-type.enum';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { RefreshToken } from './refresh-token.model';

type RefreshPayload = {
  sub: number;
  type: 'refresh';
};

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    name: string;
    email: string;
    user_type: UserType;
    permissions: string[];
  };
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    @InjectModel(RefreshToken)
    private readonly refreshTokenModel: typeof RefreshToken,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    if (!Object.values(UserType).includes(registerDto.user_type)) {
      throw new BadRequestException('Invalid user_type');
    }

    const existingUser = await this.usersService.findByEmail(registerDto.email);

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const user = await this.usersService.create({
      name: registerDto.name,
      email: registerDto.email,
      password_hash: hashPassword(registerDto.password),
      user_type: registerDto.user_type,
    });

    return this.issueTokens(user);
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(email);

    if (
      !user ||
      !user.is_active ||
      !verifyPassword(password, user.password_hash)
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const payload = this.verifyRefreshToken(refreshToken);
    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.refreshTokenModel.findOne({
      where: {
        token_hash: tokenHash,
        user_id: payload.sub,
        revoked_at: null,
      },
    });

    if (!storedToken || storedToken.expires_at <= new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    storedToken.revoked_at = new Date();
    await storedToken.save();

    return this.issueTokens(user);
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    const tokenHash = this.hashToken(refreshToken);

    await this.refreshTokenModel.update(
      { revoked_at: new Date() },
      {
        where: {
          token_hash: tokenHash,
          revoked_at: null,
        },
      },
    );

    return {
      message: 'Logged out successfully',
    };
  }

  private async issueTokens(
    user: Awaited<ReturnType<UsersService['findById']>>,
  ): Promise<AuthResponse> {
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const permissions = this.getPermissions(user.user_type);

    const accessToken = signJwt(
      {
        sub: user.id,
        email: user.email,
        user_type: user.user_type,
        permissions,
      },
      this.accessSecret,
      process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    );
    const refreshToken = signJwt(
      {
        sub: user.id,
        type: 'refresh',
      },
      this.refreshSecret,
      process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    );

    await this.refreshTokenModel.create({
      user_id: user.id,
      token_hash: this.hashToken(refreshToken),
      expires_at: this.getRefreshExpiryDate(),
      revoked_at: null,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        user_type: user.user_type,
        permissions,
      },
    };
  }

  private getPermissions(userType: UserType): string[] {
    switch (userType) {
      case UserType.Admin:
        return ['view_employee', 'manage_employee'];
      case UserType.HR:
      case UserType.Supervisor:
        return ['view_employee'];
      default:
        return [];
    }
  }

  private verifyRefreshToken(refreshToken: string) {
    try {
      const payload = verifyJwt<RefreshPayload>(
        refreshToken,
        this.refreshSecret,
      );

      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private getRefreshExpiryDate() {
    const days = Number(process.env.JWT_REFRESH_EXPIRES_DAYS ?? 7);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    return expiresAt;
  }

  private get accessSecret() {
    return process.env.JWT_ACCESS_SECRET ?? 'local-access-secret';
  }

  private get refreshSecret() {
    return process.env.JWT_REFRESH_SECRET ?? 'local-refresh-secret';
  }
}
