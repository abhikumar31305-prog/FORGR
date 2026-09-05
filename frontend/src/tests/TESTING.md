## Frontend Testing Guide

### Running Tests

```bash
# Run all tests
npm test

# Watch mode for development
npm test -- --watch

# UI mode for debugging
npm test:ui

# Generate coverage report
npm test:coverage
```

### Test Structure

```
src/tests/
├── setup.ts           # Vitest configuration and global setup
├── test-utils.tsx     # Testing utilities and custom render function
├── auth.test.tsx      # Authentication and login tests
├── api.test.ts        # API client and endpoint tests
└── components/
    ├── admin.test.tsx     # Admin panel components
    ├── student.test.tsx   # Student dashboard tests
    └── common.test.tsx    # Shared component tests
```

### Key Testing Libraries

- **Vitest** - Fast unit test framework (Jest-compatible)
- **@testing-library/react** - React component testing utilities
- **@testing-library/user-event** - User interaction simulation

### Test Categories

#### 1. Authentication Tests (auth.test.tsx)
- Login page rendering and form validation
- Login submission and API calls
- Error handling (401, 403, 500)
- Password reset flow
- Token refresh mechanism
- Logout functionality

#### 2. API Client Tests (api.test.ts)
- Authentication header injection
- Token refresh on 401
- Request retry logic
- Error response handling
- File upload handling
- Request/response interceptors

#### 3. Role-Based Access Tests
- Admin can access all features
- Faculty can view students
- Students can only see their own data
- IDOR protection verification
- Permission-based UI rendering

#### 4. Data Validation Tests
- Email format validation
- CGPA range validation (0-4)
- Required field validation
- File upload validation (CSV only, <20MB)
- Date format validation

#### 5. Component Integration Tests
- Dashboard data loading
- Filter and sort functionality
- Pagination
- Form submissions
- Modal interactions

### Custom Render Function

Use `renderWithProviders` for all component tests:

```tsx
import { renderWithProviders, screen, userEvent } from './test-utils';

describe('MyComponent', () => {
  it('renders correctly', () => {
    renderWithProviders(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MyComponent />);
    
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

### Mocking API Calls

```tsx
import { vi } from 'vitest';
import axios from 'axios';

vi.mock('axios');

describe('API Call', () => {
  it('fetches data', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: { students: [] }
    });

    // Test component
    renderWithProviders(<StudentList />);
    
    expect(axios.get).toHaveBeenCalledWith('/students');
  });
});
```

### Common Test Patterns

#### Testing User Input
```tsx
const user = userEvent.setup();
await user.type(screen.getByPlaceholderText('Email'), 'test@example.com');
await user.click(screen.getByRole('button', { name: /submit/i }));
```

#### Testing Async Operations
```tsx
await screen.findByText('Data loaded');
expect(screen.getByText('Data loaded')).toBeInTheDocument();
```

#### Testing Error States
```tsx
vi.mocked(axios.get).mockRejectedValueOnce({
  response: { status: 500, data: { detail: 'Server error' } }
});

renderWithProviders(<Component />);
await screen.findByText('Error loading data');
```

### Coverage Goals

- **Overall**: >80% code coverage
- **Critical paths**: 100% (auth, payments, data export)
- **UI components**: >70%
- **Utilities**: >85%

Run coverage report:
```bash
npm run test:coverage
```

Coverage report will be generated in `coverage/index.html`

### Debugging Tests

1. **UI Mode** - Visual debugging with browser interface:
   ```bash
   npm run test:ui
   ```

2. **Watch Mode** - Re-run tests on file changes:
   ```bash
   npm test -- --watch
   ```

3. **Single Test** - Run specific test file:
   ```bash
   npm test -- auth.test.tsx
   ```

4. **Debug Specific Test**:
   ```tsx
   it.only('specific test', () => {
     // Only this test runs
   });
   ```

### Best Practices

1. **Test behavior, not implementation** - Focus on what users see/do
2. **Use semantic queries** - Prefer `getByRole`, `getByLabelText`, `getByText`
3. **Avoid `querySelector` selectors** - Less accessible, brittle
4. **Mock external APIs** - Don't make real HTTP calls in tests
5. **Clean up after tests** - Use `beforeEach`/`afterEach` hooks
6. **Meaningful test names** - Describe what's being tested
7. **One assertion focus** - Each test should test one thing
8. **Use `waitFor` for async** - Wait for UI updates properly

### CI/CD Integration

Tests run automatically on:
- Every commit (pre-commit hook)
- Every pull request (GitHub Actions)
- Before production deployment

Coverage is reported and PR fails if:
- Coverage drops below 75%
- Tests fail
- Linting errors

### Troubleshooting

**Tests timeout**
- Increase timeout: `it('test', async () => {}, 10000)`
- Check for unresolved promises

**Mock not working**
- Ensure `vi.mock()` is at top of file
- Clear mocks with `vi.clearAllMocks()`

**Component not rendering**
- Use `renderWithProviders` not `render`
- Check for required context providers

**Async state updates**
- Use `waitFor` for state updates
- Use `findBy` queries for eventual appearance
