import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

// Mock user for testing
export const mockUser = {
  id: 'test-user-1',
  email: 'test@example.com',
  role: 'student' as const,
  name: 'Test User',
};

// Mock auth context value
export const mockAuthContextValue = {
  user: mockUser,
  isAuthenticated: true,
  login: async () => {},
  logout: async () => {},
  register: async () => {},
  refreshToken: async () => {},
  loading: false,
  error: null,
};

// Custom render function that includes providers
export function renderWithProviders(
  ui: ReactElement,
  {
    authValue = mockAuthContextValue,
    ...renderOptions
  }: {
    authValue?: any;
  } & Omit<RenderOptions, 'wrapper'> = {}
) {
  function Wrapper({ children }: { children: ReactElement }) {
    return (
      <BrowserRouter>
        <AuthContext.Provider value={authValue}>
          {children}
        </AuthContext.Provider>
      </BrowserRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
