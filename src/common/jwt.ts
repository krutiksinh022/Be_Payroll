import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

type JwtPayload = Record<string, unknown>;

function base64UrlEncode(value: Buffer | string) {
  return Buffer.from(value)
    .toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function parseDuration(value: string) {
  const match = /^(\d+)([smhd])$/.exec(value);

  if (!match) {
    throw new Error(`Invalid token duration: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  };

  return amount * multipliers[unit];
}

function sign(input: string, secret: string) {
  return createHmac('sha256', secret).update(input).digest('base64url');
}

export function signJwt(
  payload: JwtPayload,
  secret: string,
  expiresIn = '15m',
) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };
  const body = {
    ...payload,
    iat: now,
    exp: now + parseDuration(expiresIn),
    jti: randomUUID(),
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedBody = base64UrlEncode(JSON.stringify(body));
  const signature = sign(`${encodedHeader}.${encodedBody}`, secret);

  return `${encodedHeader}.${encodedBody}.${signature}`;
}

export function verifyJwt<TPayload extends JwtPayload>(
  token: string,
  secret: string,
) {
  const parts = token.split('.');

  if (parts.length !== 3) {
    throw new Error('Invalid token');
  }

  const [header, body, signature] = parts;
  const expectedSignature = sign(`${header}.${body}`, secret);
  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    throw new Error('Invalid token signature');
  }

  const payload = JSON.parse(base64UrlDecode(body)) as TPayload & {
    exp?: number;
  };

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  return payload;
}
