import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, userEvent, mockUser, mockLoggedOutAuthContextValue } from './test-utils';
import { LoginPage } from '../pages/LoginPage';

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form', () => {
    renderWithProviders(<LoginPage />);
    
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/student@forgr\.app/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('submits login form with valid credentials', async () => {
    const user = userEvent.setup();
    const loginMock = vi.fn().mockResolvedValue(mockUser);

    renderWithProviders(<LoginPage />, {
      authValue: {
        ...mockLoggedOutAuthContextValue,
        login: loginMock,
      },
    });

    await user.type(screen.getByPlaceholderText(/student@forgr\.app/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(loginMock).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('shows error message on login failure', async () => {
    const user = userEvent.setup();
    const loginMock = vi.fn().mockRejectedValue(new Error('Invalid credentials'));

    renderWithProviders(<LoginPage />, {
      authValue: {
        ...mockLoggedOutAuthContextValue,
        login: loginMock,
      },
    });

    await user.type(screen.getByPlaceholderText(/student@forgr\.app/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });

  it('allows switching to faculty role', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    const facultyTab = screen.getByRole('button', { name: /faculty/i });
    await user.click(facultyTab);

    expect(screen.getByText(/manage cohorts, attendance/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/faculty@forgr\.app/i)).toBeInTheDocument();
  });
});
