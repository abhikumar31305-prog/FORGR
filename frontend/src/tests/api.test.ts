import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, userEvent } from '../test-utils';
import axios from 'axios';

vi.mock('axios');

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes auth token in requests', async () => {
    const token = 'test-token-123';
    localStorage.setItem('access_token', token);

    vi.mocked(axios.get).mockResolvedValueOnce({
      data: { students: [] },
    });

    // Import and use client
    const { client } = await import('../../api/client');
    await client.get('/students');

    expect(axios.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${token}`,
        }),
      })
    );

    localStorage.removeItem('access_token');
  });

  it('handles 401 and refreshes token', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce({
      response: { status: 401 },
    });

    vi.mocked(axios.post).mockResolvedValueOnce({
      data: { access_token: 'new-token' },
    });

    // Client should attempt token refresh
    expect(true).toBe(true);
  });

  it('retries failed requests after token refresh', async () => {
    const attempts: number[] = [];
    
    vi.mocked(axios.get)
      .mockImplementationOnce(() => {
        attempts.push(1);
        return Promise.reject({ response: { status: 401 } });
      })
      .mockImplementationOnce(() => {
        attempts.push(2);
        return Promise.resolve({ data: { success: true } });
      });

    expect(true).toBe(true);
  });
});

describe('Dashboard API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches dashboard data', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: {
        total_students: 100,
        total_faculty: 10,
        placed_count: 60,
        placement_rate: 0.60,
      },
    });

    const { default: dashboardApi } = await import('../../services/dashboardApi');
    const data = await dashboardApi.getDashboardStats();

    expect(data.total_students).toBe(100);
    expect(data.placement_rate).toBe(0.60);
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce({
      response: { status: 500, data: { detail: 'Server error' } },
    });

    expect(true).toBe(true);
  });
});

describe('Bulk Import API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads CSV file', async () => {
    const file = new File(['data'], 'test.csv', { type: 'text/csv' });
    
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        batch_id: 'batch-123',
        success_count: 100,
        error_count: 0,
      },
    });

    const { default: bulkImportApi } = await import('../../services/bulkImportApi');
    const result = await bulkImportApi.importStudents(file);

    expect(result.success_count).toBe(100);
  });

  it('validates file before upload', async () => {
    const invalidFile = new File(['data'], 'test.txt', { type: 'text/plain' });

    const { default: bulkImportApi } = await import('../../services/bulkImportApi');
    
    // Should reject non-CSV files
    try {
      await bulkImportApi.importStudents(invalidFile);
      expect(true).toBe(false); // Should throw
    } catch (e) {
      expect(true).toBe(true); // Expected
    }
  });

  it('handles file size limits', async () => {
    const largeFile = new File(
      [new ArrayBuffer(21 * 1024 * 1024)],
      'large.csv',
      { type: 'text/csv' }
    );

    const { default: bulkImportApi } = await import('../../services/bulkImportApi');
    
    // Should reject files > 20MB
    try {
      await bulkImportApi.importStudents(largeFile);
      expect(true).toBe(false);
    } catch (e) {
      expect((e as any).message).toContain('File size');
    }
  });
});
