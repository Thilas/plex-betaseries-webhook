import { NextFunction, Request, Response } from "express"
import { ILogger } from "../logger"

export function getErrorHandler(logger: ILogger) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  return (err: any, req: Request, res: Response, _next: NextFunction) => {
    const message = `Cannot ${req.method} ${req.originalUrl}`
    logger.error(`${message}:`, err)
    logger.debug("Headers", req.headers)
    if (Object.keys(req.params).length) {
      logger.debug("Body", req.params)
    }
    res.status(500).send(`${message}: ${err.message ?? err}`)
  }
}
