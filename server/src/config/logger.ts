import path from 'node:path';
import winston from 'winston';
import 'winston-daily-rotate-file';
import { env, isProduction } from './env';

/**
 * Winston logger.
 * - Development: colourised, human-readable console output.
 * - Production: JSON to stdout (platform log drains) plus rotating files.
 */

const { combine, timestamp, printf, colorize, errors, json, splat } = winston.format;

const consoleFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const extra = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  const body = typeof stack === 'string' ? stack : String(message);
  return `${String(ts)} ${level}: ${body}${extra}`;
});

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: isProduction
      ? combine(timestamp(), errors({ stack: true }), splat(), json())
      : combine(
          colorize({ all: true }),
          timestamp({ format: 'HH:mm:ss' }),
          errors({ stack: true }),
          splat(),
          consoleFormat,
        ),
  }),
];

if (isProduction) {
  const logDir = path.resolve(process.cwd(), 'logs');

  transports.push(
    new winston.transports.DailyRotateFile({
      dirname: logDir,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true,
      format: combine(timestamp(), errors({ stack: true }), json()),
    }),
    new winston.transports.DailyRotateFile({
      dirname: logDir,
      filename: 'combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
      format: combine(timestamp(), errors({ stack: true }), json()),
    }),
  );
}

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  defaultMeta: { service: 'fast-traders-api' },
  transports,
  exitOnError: false,
});

/** Morgan writes its HTTP access lines through Winston at the `http` level. */
export const morganStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};
