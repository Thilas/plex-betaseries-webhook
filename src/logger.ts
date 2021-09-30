import winston from "winston"

export const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      level: "debug",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize({ all: true }),
        winston.format.simple(),
      ),
      handleExceptions: true,
    }),
  ],
})
