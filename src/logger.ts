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
  error: ILogMethod
  warn: ILogMethod
  info: ILogMethod
  debug: ILogMethod

  isErrorEnabled(): boolean
  isWarnEnabled(): boolean
  isInfoEnabled(): boolean
  isDebugEnabled(): boolean
}

export interface ILogMethod {
  (message: string, ...meta: unknown[]): ILogger
}
