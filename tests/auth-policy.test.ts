import { describe, expect, it } from 'vitest';
import { AUTH_POLICY, canManageRole, getCooldownRemaining, isOtpExpired } from '@communityhub/shared';

describe('authentication policy', () => {
  it('enforces the resend cooldown', () => {
    const sentAt = 1_000_000;
    expect(getCooldownRemaining(sentAt, sentAt)).toBe(AUTH_POLICY.resendCooldownSeconds);
    expect(getCooldownRemaining(sentAt, sentAt + 61_000)).toBe(0);
  });

  it('expires OTPs after the configured window', () => {
    const sentAt = 1_000_000;
    expect(isOtpExpired(sentAt, sentAt + AUTH_POLICY.otpExpirySeconds * 1000 - 1)).toBe(false);
    expect(isOtpExpired(sentAt, sentAt + AUTH_POLICY.otpExpirySeconds * 1000)).toBe(true);
  });

  it('does not allow ordinary users to grant roles', () => {
    expect(canManageRole(['user'], 'administrator')).toBe(false);
    expect(canManageRole(['administrator'], 'employer')).toBe(true);
    expect(canManageRole(['moderator'], 'moderator')).toBe(true);
    expect(canManageRole(['moderator'], 'employer')).toBe(false);
  });
});
