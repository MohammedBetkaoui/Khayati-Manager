import { ExecutionContext } from '@nestjs/common';
import { DesktopBackupGuard } from './desktop-backup.guard';

function contextWithToken(token?: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: token ? { 'x-khayati-desktop-token': token } : {},
      }),
    }),
  } as ExecutionContext;
}

describe('DesktopBackupGuard', () => {
  const originalToken = process.env.KHAYATI_DESKTOP_TOKEN;

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.KHAYATI_DESKTOP_TOKEN;
    } else {
      process.env.KHAYATI_DESKTOP_TOKEN = originalToken;
    }
  });

  it('accepts only the secret shared with the Electron main process', () => {
    process.env.KHAYATI_DESKTOP_TOKEN = 'desktop-secret';
    const guard = new DesktopBackupGuard();

    expect(guard.canActivate(contextWithToken('desktop-secret'))).toBe(true);
    expect(() => guard.canActivate(contextWithToken('wrong-secret'))).toThrow();
    expect(() => guard.canActivate(contextWithToken())).toThrow();
  });

  it('keeps the bridge unavailable outside the Electron runtime', () => {
    delete process.env.KHAYATI_DESKTOP_TOKEN;
    expect(() =>
      new DesktopBackupGuard().canActivate(contextWithToken('anything')),
    ).toThrow();
  });
});
