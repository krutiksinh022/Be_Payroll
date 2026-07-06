import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { verifyJwt } from '../common/jwt';
import { UserType } from './user-type.enum';
import { ROLES_KEY } from './roles.decorator';

interface JwtUserPayload extends Record<string, unknown> {
  sub: number;
  email: string;
  user_type: UserType;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.get<UserType[]>(ROLES_KEY, context.getHandler()) ||
      this.reflector.get<UserType[]>(ROLES_KEY, context.getClass());

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtUserPayload }>();
    const authHeader = request.headers.authorization as string | undefined;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.replace('Bearer ', '').trim();

    try {
      const payload = verifyJwt<JwtUserPayload>(
        token,
        process.env.JWT_ACCESS_SECRET ?? 'local-access-secret',
      );

      request.user = payload;

      if (!requiredRoles.includes(payload.user_type)) {
        throw new ForbiddenException('Insufficient role');
      }

      return true;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
