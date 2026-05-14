import type Inversify from "@inversifyjs/logger"
import { createLogger, format, Logger, transports } from "winston"
import { toBoolean } from "./utils"

const configuration = {
  console: toBoolean(process.env.LOGGER_CONSOLE),
  json: toBoolean(process.env.LOGGER_JSON),
}

export function getLogger() {
  const logger = createLogger({
    level: "debug",
    handleExceptions: true,
    transports: [
      new transports.Console({
        forceConsole: configuration.console,
        format: getConsoleFormat(),
      }),
    ],
  }) as ILogger
  logger.debug("Logger configuration", configuration)
  return logger
}

function getConsoleFormat() {
  const formats = [
    format.timestamp(),
    format.errors({ cause: true, stack: true }),
  ]

  if (configuration.json) {
    formats.push(
      format.json(),
    )
  } else {
    formats.push(
      format.colorize({ level: true, message: true }),
      format.simple(),
    )
  }
  return format.combine(...formats)
}

export function toLoggerError(error: unknown) {
  return error instanceof Error ? error : { message: String(error) }
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

interface LogMethod {
  (message: string): ILogger
  (message: string, meta: Record<string, unknown>): ILogger
  (message: string, error: LoggerError): ILogger
  (error: LoggerError): ILogger
}

type LoggerError = ReturnType<typeof toLoggerError>

export function toInversifyLogger(logger: ILogger) {
  return logger as unknown as Logger as Inversify.Logger
}
