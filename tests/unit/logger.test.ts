import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { logger } from '@/lib/logger';

describe('logger', () => {
  let lines: string[] = [];

  beforeEach(() => {
    lines = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      lines.push(chunk.toString());
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('production mode (JSON output)', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
    });

    it('writes a JSON line for logger.info', () => {
      logger.info('hello');
      expect(lines).toHaveLength(1);
      const parsed = JSON.parse(lines[0]!.trim()) as Record<string, unknown>;
      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('hello');
      expect(typeof parsed.timestamp).toBe('string');
    });

    it('includes extra context fields in JSON output', () => {
      logger.error('boom', { action: 'test', durationMs: 42 });
      const parsed = JSON.parse(lines[0]!.trim()) as Record<string, unknown>;
      expect(parsed.action).toBe('test');
      expect(parsed.durationMs).toBe(42);
    });

    it('writes correct level for each method', () => {
      logger.debug('d');
      logger.warn('w');
      logger.error('e');
      const levels = lines.map((l) => (JSON.parse(l.trim()) as Record<string, unknown>).level);
      expect(levels).toEqual(['debug', 'warn', 'error']);
    });
  });

  describe('development mode (pretty output)', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
    });

    it('writes a human-readable line for logger.info', () => {
      logger.info('hello');
      expect(lines[0]).toMatch(/\[.*\] INFO hello\n/);
    });

    it('appends JSON extras when context is provided', () => {
      logger.warn('slow', { durationMs: 500 });
      expect(lines[0]).toContain('WARN slow');
      expect(lines[0]).toContain('"durationMs":500');
    });

    it('omits extras section when no context is provided', () => {
      logger.debug('bare');
      expect(lines[0]).toMatch(/DEBUG bare\n$/);
    });
  });
});
