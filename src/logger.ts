import { createLogger, format, transports } from "winston"

export function getLogger(): ILogger {
  return createLogger({
    level: "debug",
    handleExceptions: true,
    transports: [
      new transports.Console({
        forceConsole: process.env.NODE_ENV !== "production",
        format: format.combine(format.timestamp(), format.colorize({ all: true }), format.simple()),
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
