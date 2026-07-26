import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from './auth.service.js';
import { Argon2Service } from './argon2.service.js';

describe('AuthService (Unit & Integration Security Tests)', () => {
  let authService: AuthService;
  let argon2Service: Argon2Service;

  beforeEach(() => {
    argon2Service = new Argon2Service();
    authService = new AuthService(argon2Service);
  });

  it('hashes passwords securely using Argon2id', async () => {
    const password = 'SecurePassword123!';
    const hash = await argon2Service.hash(password);
    expect(hash).toContain('$argon2id$');
    const isValid = await argon2Service.verify(hash, password);
    expect(isValid).toBe(true);
    const isInvalid = await argon2Service.verify(hash, 'WrongPassword');
    expect(isInvalid).toBe(false);
  });

  it('fails gracefully when OAuth provider credentials are missing', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    await expect(
      authService.loginOAuth({
        provider: 'GOOGLE',
        token: 'dummy_token',
      }),
    ).rejects.toThrow('Social authentication is currently unavailable for provider: GOOGLE');
  });

  it('normalizes and validates phone OTP request in development mode', async () => {
    const res = await authService.requestPhoneOtp({ phoneNumber: '+212600000000' });
    expect(res.message).toBe('OTP verification code sent');
    expect(res.challengeId).toBeDefined();
  });
});
