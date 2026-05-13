import { NextFunction, Response } from "express"
import { inject } from "inversify"
import { ExpressMiddleware } from "@inversifyjs/http-express"
import { WebhookRequest } from "../controllers/webhook"
import { ids, provideSingleton } from "../decorators"
import { ILogger, toLoggerError } from "../logger"

@provideSingleton(PayloadMiddleware)
export class PayloadMiddleware implements ExpressMiddleware {
  constructor(@inject(ids.logger) readonly logger: ILogger) { }

  public execute(req: WebhookRequest, _res: Response, next: NextFunction) {
    const data = req.body?.payload as string | undefined
    if (data) {
      try {
        req.payload = JSON.parse(data) as Payload
      } catch (error) {
        this.logger.error("Unable to parse payload:", toLoggerError(error))
      }
    }
    next()
  }
}

export type Payload = {
  readonly event: string
  readonly user: boolean
  readonly owner: boolean
  readonly Account?: PayloadAccount
  readonly Server?: PayloadServer
  readonly Player?: PayloadPlayer
  readonly Metadata?: PayloadMetadata
}

export type PayloadAccount = {
  readonly id: string
  readonly thumb: string
  readonly title: string
}

export type PayloadServer = {
  readonly title: string
  readonly uuid: string
}

export type PayloadPlayer = {
  readonly local: boolean
  readonly publicAddress: string
  readonly title: string
  readonly uuid: string
}

export type PayloadMetadata = {
  readonly Guid?: PayloadGuid[]
  readonly type: string
  readonly title: string
  readonly grandparentTitle: string
  readonly index: number
  readonly parentIndex: number
}

export type PayloadGuid = {
  readonly id: string
}
