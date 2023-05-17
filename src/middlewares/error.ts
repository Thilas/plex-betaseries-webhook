import { NextFunction, Request, Response } from "express"
import { ILogger } from "../logger"
import { hasMember, htmlEncode } from "../utils"

export function getErrorHandler(logger: ILogger) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const message = `${req.method} ${req.originalUrl}`
    logger.error(`${message}:`, err)
    logger.debug("Headers", req.headers)
    if (Object.keys(req.params).length) {
      logger.debug("Body", req.params)
    }
    res.status(500).send(htmlEncode(`${message}: ${hasMember(err, "message") ? err.message : err}`))
  }
}
