import path from "node:path"
import { NextFunction, Request as ExpressRequest, Response as ExpressResponse } from "express"
import { inject } from "inversify"
import { Controller, Get, Next, Request, Response } from "@inversifyjs/http-core"
import favicon from "serve-favicon"
import { ids } from "../decorators"

const faviconPath = path.join(__dirname, "..", "..", "images", "favicon.png")

export type FaviconHandler = ReturnType<typeof favicon>

export function getFaviconHandler() {
  return favicon(faviconPath)
}

@Controller("/favicon.ico")
export class FaviconController {
  @inject(ids.faviconHandler) readonly faviconHandler: FaviconHandler

  @Get()
  get(@Request() req: ExpressRequest, @Response() res: ExpressResponse, @Next() next: NextFunction) {
    return this.faviconHandler(req, res, next)
  }
}
