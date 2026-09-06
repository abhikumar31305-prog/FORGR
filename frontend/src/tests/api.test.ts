import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest, setAccessToken, getEffectiveAccessToken, setUnauthorizedHandler } from '../api/client';

describe('API Client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    setAccessToken(null);
    sessionStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('manages access token in memory', () => {
    expect(getEffectiveAccessToken()).toBe('');
    setAccessToken('token-abc-123');
    expect(getEffectiveAccessToken()).toBe('token-abc-123');
  });

  it('retrieves access token from sessionStorage fallback', () => {
    sessionStorage.setItem('forgr_user_session', JSON.stringify({ accessToken: 'session-token-456' }));
    expect(getEffectiveAccessToken()).toBe('session-token-456');
  });

  it('includes Authorization header in authenticated requests', async () => {
    setAccessToken('auth-token-789');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
    global.fetch = mockFetch;

    const result = await apiRequest<{ success: boolean }>('/api/test', {}, true);
    expect(result).toEqual({ success: true });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );

    const callHeaders = mockFetch.mock.calls[0][1].headers as Headers;
    expect(callHeaders.get('Authorization')).toBe('Bearer auth-token-789');
  });

  it('triggers unauthorized handler on missing token for authenticated endpoint', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    await expect(apiRequest('/api/protected', {}, true)).rejects.toThrow(
      'Authentication required. Please sign in.'
    );
    expect(handler).toHaveBeenCalled();
  });

  it('triggers unauthorized handler on 401 response', async () => {
    setAccessToken('expired-token');
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Token expired' }),
    });

    await expect(apiRequest('/api/protected', {}, true)).rejects.toThrow(
      'Session expired. Please sign in again.'
    );
    expect(handler).toHaveBeenCalled();
  });

  it('parses error details on HTTP 400 failure', async () => {
    setAccessToken('valid-token');
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: 'Invalid payload provided' }),
    });

    await expect(apiRequest('/api/bad-request', {}, true)).rejects.toThrow(
      'Invalid payload provided'
    );
  });
});
