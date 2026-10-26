import { describe, expect, it } from 'vitest';
import { hashIdentifier, redactLogValue } from '@communityhub/shared';

describe('structured logger redaction', () => {
  it('redacts credentials, contact details, and bearer tokens', () => {
    const result = redactLogValue({
      email: 'person@example.com',
      phone: '+44 7700 900123',
      authorization: 'Bearer secret-token',
      message: 'contact person@example.com or +44 7700 900123',
    }) as Record<string, unknown>;
    expect(result.email).toBe('[REDACTED]');
    expect(result.phone).toBe('[REDACTED]');
    expect(result.authorization).toBe('[REDACTED]');
    expect(result.message).not.toContain('person@example.com');
    expect(result.message).not.toContain('secret-token');
    expect(hashIdentifier('user-id')).not.toBe('user-id');
  });
});
