import { Request, Response } from "express"
import { inject } from "inversify"
import { CatchError } from "@inversifyjs/http-core"
import { ExpressErrorFilter } from "@inversifyjs/http-express"
import { ids } from "../decorators"
import { ILogger } from "../logger"
import { getLoggerError, hasMember, htmlEncode } from "../utils"

@CatchError()
export class GlobalErrorFilter implements ExpressErrorFilter {
  constructor(
    @inject(ids.logger) readonly logger: ILogger,
  ) { }

  public catch(err: unknown, request: Request, response: Response) {
    const message = `${request.method} ${request.originalUrl}`
    this.logger.error(message, getLoggerError(err))
    this.logger.debug("Headers", { headers: request.headers })
    if (Object.keys(request.params).length) {
      this.logger.debug("Body", { params: request.params })
    }
    response.status(500).send(htmlEncode(`${message}: ${hasMember(err, "message") ? err.message : err}`))
  }
}
