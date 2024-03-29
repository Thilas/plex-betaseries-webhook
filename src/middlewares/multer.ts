import { NextFunction, Request, RequestHandler, Response } from "express"
import { inject } from "inversify"
import { BaseMiddleware } from "inversify-express-utils"
import type multer from "multer"
import { Configuration } from "../configuration"
import { ids, provideSingleton } from "../decorators"

export type IMulterFactory = typeof multer

export function getMulterFactory(): IMulterFactory {
  return require("multer")
}

@provideSingleton(MulterMiddleware)
export class MulterMiddleware extends BaseMiddleware {
  readonly multerHandler: RequestHandler

  constructor(configuration: Configuration, @inject(ids.multerFactory) multerFactory: IMulterFactory) {
    super()
    this.multerHandler = multerFactory({ dest: configuration.server.temp, limits: { fileSize: 2000000 } }).any()
  }

  handler(req: Request, res: Response, next: NextFunction) {
    this.multerHandler(req, res, next)
  }
}
