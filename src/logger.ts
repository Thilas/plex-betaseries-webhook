import { createLogger, format, transports } from "winston"

export function getLogger(): ILogger {
  const logger = createLogger({
    level: "debug",
    format: getConsoleFormat(),
    handleExceptions: true,
    transports: [
      new transports.Console({
        forceConsole: process.env.NODE_ENV !== "production",
      }),
    ],
  })
  logger.debug("Logger environment variables", {
    LOGGER_JSON: process.env.LOGGER_JSON ?? "undefined",
    NODE_ENV: process.env.NODE_ENV ?? "undefined",
  })
  return logger
}

function getConsoleFormat() {
  var formats = [
    format.timestamp(),
    format.errors({ cause: true, stack: true }),
  ]

  if (["1", "TRUE", "YES"].includes(String(process.env.LOGGER_JSON).toUpperCase())) {
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
