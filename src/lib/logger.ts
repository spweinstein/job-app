type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  action?: string;
  durationMs?: number;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  [key: string]: unknown;
}

function buildEntry(
  level: LogLevel,
  message: string,
  context?: Partial<Omit<LogEntry, 'level' | 'message' | 'timestamp'>>,
): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };
}

function output(entry: LogEntry): void {
  if (process.env.NODE_ENV === 'development') {
    const { level, message, timestamp, ...rest } = entry;
    const prefix = `[${timestamp}] ${level.toUpperCase()}`;
    const extras = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';
    process.stdout.write(`${prefix} ${message}${extras}\n`);
  } else {
    process.stdout.write(JSON.stringify(entry) + '\n');
  }
}

export const logger = {
  debug(message: string, context?: Partial<Omit<LogEntry, 'level' | 'message' | 'timestamp'>>) {
    output(buildEntry('debug', message, context));
  },
  info(message: string, context?: Partial<Omit<LogEntry, 'level' | 'message' | 'timestamp'>>) {
    output(buildEntry('info', message, context));
  },
  warn(message: string, context?: Partial<Omit<LogEntry, 'level' | 'message' | 'timestamp'>>) {
    output(buildEntry('warn', message, context));
  },
  error(message: string, context?: Partial<Omit<LogEntry, 'level' | 'message' | 'timestamp'>>) {
    output(buildEntry('error', message, context));
  },
};
