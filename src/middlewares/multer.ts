import { NextFunction, Request, RequestHandler, Response } from "express"
import { inject } from "inversify"
import { ExpressMiddleware } from "@inversifyjs/http-express"
import type multer from "multer"
import { Configuration } from "../configuration"
import { ids, provideSingleton } from "../decorators"

export type IMulterFactory = typeof multer

export function getMulterFactory(): IMulterFactory {
  return require("multer")
}

@provideSingleton(MulterMiddleware)
export class MulterMiddleware implements ExpressMiddleware {
  readonly multerHandler: RequestHandler

  constructor(
    @inject(Configuration) configuration: Configuration,
    @inject(ids.multerFactory) multerFactory: IMulterFactory,
  ) {
    this.multerHandler = multerFactory({ dest: configuration.server.temp, limits: { fileSize: 2000000 } }).any()
  }

  public execute(req: Request, res: Response, next: NextFunction) {
    this.multerHandler(req, res, next)
  }
}
