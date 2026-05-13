import { Request, Response } from "express"
import { inject } from "inversify"
import { CatchError } from "@inversifyjs/http-core"
import { ExpressErrorFilter } from "@inversifyjs/http-express"
import { ids } from "../decorators"
import { ILogger, toLoggerError } from "../logger"
import { hasMember, htmlEncode } from "../utils"

@CatchError()
export class GlobalErrorFilter implements ExpressErrorFilter {
  constructor(
    @inject(ids.logger) readonly logger: ILogger,
  ) { }

  public catch(err: unknown, request: Request, response: Response) {
    this.logger.debug("Request details", { headers: request.headers, params: request.params })
    const message = `${request.method} ${request.originalUrl}:`
    this.logger.error(message, toLoggerError(err))
    response.status(500).send(htmlEncode(`${message} ${hasMember(err, "message") ? err.message : err}`))
  }
}
