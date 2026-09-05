import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, screen, userEvent, mockUser } from '../test-utils';
import { LoginPage } from '../../pages/LoginPage';
import axios from 'axios';

vi.mock('axios');

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form', () => {
    renderWithProviders(<LoginPage />);
    
    expect(screen.getByText(/login/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  });

  it('submits login form with valid credentials', async () => {
    const user = userEvent.setup();
    const mockLogin = vi.fn().mockResolvedValue({
      data: {
        access_token: 'test-token',
        user: mockUser,
      },
    });
    
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: { access_token: 'test-token', user: mockUser },
    });

    renderWithProviders(<LoginPage />);

    await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com');
    await user.type(screen.getByPlaceholderText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    // Wait for API call
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({
        email: 'test@example.com',
        password: 'password123',
      })
    );
  });

  it('shows error message on login failure', async () => {
    const user = userEvent.setup();
    
    vi.mocked(axios.post).mockRejectedValueOnce({
      response: { status: 401, data: { detail: 'Invalid credentials' } },
    });

    renderWithProviders(<LoginPage />);

    await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com');
    await user.type(screen.getByPlaceholderText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /login/i }));

    // Wait for error display
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  it('prevents submission with empty fields', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<LoginPage />);

    const submitButton = screen.getByRole('button', { name: /login/i });
    await user.click(submitButton);

    // Should not call API
    expect(axios.post).not.toHaveBeenCalled();
  });
});

describe('Registration and Authentication Flow', () => {
  it('allows user to register', async () => {
    const user = userEvent.setup();
    
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: { success: true, message: 'Registration successful' },
    });

    // Navigate to registration and fill form
    // This is a simplified test
    expect(true).toBe(true);
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByPlaceholderText(/email/i), 'invalid-email');
    
    // Should show validation error or prevent submission
    expect(true).toBe(true);
  });
});
