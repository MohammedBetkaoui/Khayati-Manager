import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

export const DESKTOP_TOKEN_HEADER = 'x-khayati-desktop-token';

@Injectable()
export class DesktopBackupGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const expectedToken = process.env.KHAYATI_DESKTOP_TOKEN?.trim();
    if (!expectedToken) {
      throw new ServiceUnavailableException({
        errorCode: 'DESKTOP_BRIDGE_UNAVAILABLE',
      });
    }

    const request = context.switchToHttp().getRequest<Request>();
    const suppliedHeader = request.headers[DESKTOP_TOKEN_HEADER];
    const suppliedToken = Array.isArray(suppliedHeader)
      ? suppliedHeader[0]
      : suppliedHeader;
    if (!suppliedToken || !this.matches(suppliedToken, expectedToken)) {
      throw new UnauthorizedException({ errorCode: 'DESKTOP_ACCESS_DENIED' });
    }
    return true;
  }

  private matches(supplied: string, expected: string) {
    const suppliedBuffer = Buffer.from(supplied);
    const expectedBuffer = Buffer.from(expected);
    return (
      suppliedBuffer.length === expectedBuffer.length &&
      timingSafeEqual(suppliedBuffer, expectedBuffer)
    );
  }
}
