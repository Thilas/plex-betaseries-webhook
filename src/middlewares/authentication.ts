import { NextFunction, Response } from "express"
import { inject, injectable } from "inversify"
import { ExpressMiddleware } from "@inversifyjs/http-express"
import { BetaSeries } from "../betaseries/betaseries"
import { WebhookRequest } from "../controllers/webhook"

@injectable()
export class AuthenticationMiddleware implements ExpressMiddleware {
  @inject(BetaSeries) readonly betaseries: BetaSeries

  public async execute(req: WebhookRequest, _res: Response, next: NextFunction) {
    const plexAccount = req.query["plexAccount"]
    const accessToken = req.query["accessToken"]
    req.principal = await this.betaseries.getPrincipal(
      typeof plexAccount === "string" ? plexAccount : undefined,
      typeof accessToken === "string" ? accessToken : undefined,
    )
    next()
  }
}
