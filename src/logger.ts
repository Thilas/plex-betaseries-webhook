import { createLogger, format, transports } from "winston"

export function getLogger(): ILogger {
  return createLogger({
    transports: [
      new transports.Console({
        level: "debug",
        format: format.combine(format.timestamp(), format.colorize({ all: true }), format.simple()),
        handleExceptions: true,
      }),
    ],
  })
}

export interface ILogger {
  error: LogMethod
  warn: LogMethod
  info: LogMethod
  debug: LogMethod

  isErrorEnabled(): boolean
  isWarnEnabled(): boolean
  isInfoEnabled(): boolean
  isDebugEnabled(): boolean
}

export type LogMethod = (message: string, ...meta: unknown[]) => ILogger
