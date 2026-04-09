# Test Patterns Reference — statFootV3

Framework: Vitest (backend + frontend)
Supertest for HTTP integration tests (backend)

## Vitest Basic Pattern

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('MyService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return processed result', () => {
        const result = myFunction(input);
        expect(result).toEqual(expectedOutput);
    });

    it('should throw on invalid input', () => {
        expect(() => myFunction(null)).toThrow('Expected error message');
    });
});
```

## Mocking the Database (backend)

```js
import { vi } from 'vitest';
import db from '../../src/config/database.js';

vi.mock('../../src/config/database.js', () => ({
    default: {
        all: vi.fn(),
        get: vi.fn(),
        run: vi.fn(),
    }
}));

beforeEach(() => {
    db.all.mockResolvedValue([{ id: 1, name: 'Test League' }]);
});
```

## Supertest API Contract Pattern

```js
import request from 'supertest';
import { describe, it, expect } from 'vitest';

// Test the Express app directly (not the running server)
import app from '../../src/app.js';

describe('GET /api/leagues', () => {
    it('returns success wrapper with array', async () => {
        const res = await request(app).get('/api/leagues');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('returns 400 on invalid params', async () => {
        const res = await request(app).get('/api/leagues?country=');
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });
});
```

## React Component Test Pattern (frontend)

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import MyComponent from '../MyComponent';
import api from '../../services/api';

vi.mock('../../services/api');

it('renders skeleton while loading', () => {
    api.getData.mockReturnValue(new Promise(() => {})); // never resolves
    render(<MyComponent />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
});

it('renders data after load', async () => {
    api.getData.mockResolvedValue([{ id: 1, name: 'Test' }]);
    render(<MyComponent />);
    await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
    });
});

it('renders error state on failure', async () => {
    api.getData.mockRejectedValue(new Error('Network error'));
    render(<MyComponent />);
    await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
});
```

## Vitest Config Reference

Backend (`backend/vitest.config.js`):
```js
export default {
    test: {
        environment: 'node',
        globals: true,
    }
}
```

Frontend (`frontend/vitest.config.js`):
```js
export default {
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.js'],
    }
}
```
