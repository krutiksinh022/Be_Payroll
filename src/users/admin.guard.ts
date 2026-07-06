import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { verifyJwt } from '../common/jwt';
import { UserType } from './user-type.enum';

interface JwtUserPayload extends Record<string, unknown> {
  sub: number;
  email: string;
  user_type: UserType;
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtUserPayload }>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.replace('Bearer ', '').trim();

    try {
      const payload = verifyJwt<JwtUserPayload>(
        token,
        process.env.JWT_ACCESS_SECRET ?? 'local-access-secret',
      );

      if (payload.user_type !== UserType.Admin) {
        throw new ForbiddenException('Admin access required');
      }

      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
