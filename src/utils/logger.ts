/**
 * Logger Utility
 * Centralized logging with different log levels
 */

enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

class Logger {
  private level: LogLevel;
  private context: string;

  constructor(context: string = 'App') {
    this.context = context;
    this.level = this.parseLogLevel(process.env.LOG_LEVEL || 'info');
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error':
        return LogLevel.ERROR;
      case 'warn':
        return LogLevel.WARN;
      case 'info':
        return LogLevel.INFO;
      case 'debug':
        return LogLevel.DEBUG;
      default:
        return LogLevel.INFO;
    }
  }

  private format(level: string, message: string, context?: Record<string, unknown>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: context ? { ...context, logger: this.context } : { logger: this.context },
    };
  }

  private output(entry: LogEntry): void {
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(entry));
    } else {
      console.log(`[${entry.timestamp}] [${entry.level}] [${this.context}] ${entry.message}`);
      if (entry.context && Object.keys(entry.context).length > 1) {
        console.log(entry.context);
      }
    }
  }

  public error(message: string, context?: Record<string, unknown>): void {
    if (this.level >= LogLevel.ERROR) {
      this.output(this.format('ERROR', message, context));
    }
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    if (this.level >= LogLevel.WARN) {
      this.output(this.format('WARN', message, context));
    }
  }

  public info(message: string, context?: Record<string, unknown>): void {
    if (this.level >= LogLevel.INFO) {
      this.output(this.format('INFO', message, context));
    }
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    if (this.level >= LogLevel.DEBUG) {
      this.output(this.format('DEBUG', message, context));
    }
  }

  public child(context: string): Logger {
    return new Logger(`${this.context}:${context}`);
  }
}

export const logger = new Logger();
export { Logger };
export default logger;
