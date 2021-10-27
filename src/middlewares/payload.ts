import { NextFunction, Request, Response } from "express"
import { injectable } from "inversify"
import { BaseMiddleware } from "inversify-express-utils"
import { ids, provideSingleton } from "../decorators"

@provideSingleton(PayloadMiddleware)
export class PayloadMiddleware extends BaseMiddleware {
  handler(req: Request, _res: Response, next: NextFunction) {
    const payload = this.getPayload(req.body?.payload)
    if (payload) {
      this.bind<PayloadProvider>(ids.payloadProvider).toProvider(() => {
        return () => Promise.resolve(payload)
      })
    }
    next()
  }

  private getPayload(data?: string) {
    if (!data) {
      return
    }
    return JSON.parse(data) as Payload
  }
}

export type PayloadProvider = () => Promise<Payload>

@injectable()
export class Payload {
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
