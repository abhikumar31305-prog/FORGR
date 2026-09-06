/* eslint-disable react-refresh/only-export-components */
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext, type AuthContextValue } from '../context/auth-context';
import type { UserSession } from '../types/auth';

// Mock user for testing
export const mockUser: UserSession = {
  token: 'test-token-123',
  email: 'test@example.com',
  role: 'student',
  name: 'Test User',
  studentId: '1001',
};

// Mock auth context value
export const mockAuthContextValue: AuthContextValue = {
  session: mockUser,
  login: async () => mockUser,
  logout: () => {},
};

export const mockLoggedOutAuthContextValue: AuthContextValue = {
  session: null,
  login: async () => mockUser,
  logout: () => {},
};

import { ThemeProvider } from '../context/ThemeContext';

// Custom render function that includes providers
export function renderWithProviders(
  ui: ReactElement,
  {
    authValue = mockLoggedOutAuthContextValue,
    ...renderOptions
  }: {
    authValue?: AuthContextValue;
  } & Omit<RenderOptions, 'wrapper'> = {}
) {
  function Wrapper({ children }: { children: ReactElement }) {
    return (
      <BrowserRouter>
        <ThemeProvider>
          <AuthContext.Provider value={authValue}>
            {children}
          </AuthContext.Provider>
        </ThemeProvider>
      </BrowserRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
