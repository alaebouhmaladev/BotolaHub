import { describe, it, expect } from 'vitest';
import { createMockEnvironment } from './index.js';

describe('Test Utils Foundation', () => {
  it('creates mock environment object correctly', () => {
    const env = createMockEnvironment({ PORT_API: '9999' });
    expect(env.PORT_API).toBe('9999');
    expect(env.NODE_ENV).toBe('test');
  });
});
