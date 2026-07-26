import { describe, it, expect } from 'vitest';
import { redactSecrets, isPortAvailable, checkDockerRunning } from './launcher.mjs';

describe('Launcher Utilities', () => {
  it('redacts sensitive passwords and database credentials from log lines', () => {
    const rawLog = 'Connecting to postgresql://botolahub:secret123@localhost:5432/botolahub_dev with POSTGRES_PASSWORD=secret123';
    const redacted = redactSecrets(rawLog);

    expect(redacted).not.toContain('secret123');
    expect(redacted).toContain('postgresql://botolahub:[REDACTED]@');
    expect(redacted).toContain('POSTGRES_PASSWORD=[REDACTED]');
  });

  it('checks port availability correctly', async () => {
    const available = await isPortAvailable(59876);
    expect(typeof available).toBe('boolean');
    expect(available).toBe(true);
  });

  it('detects docker availability safely', () => {
    const isDocker = checkDockerRunning();
    expect(typeof isDocker).toBe('boolean');
  });
});
