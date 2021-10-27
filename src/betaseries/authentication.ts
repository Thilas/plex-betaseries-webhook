import { Request } from "express"
import { inject, injectable } from "inversify"
import { interfaces } from "inversify-express-utils"
import { BetaSeries } from "./betaseries"

@injectable()
export class BetaSeriesAuthProvider implements interfaces.AuthProvider {
  @inject(BetaSeries) readonly betaseries: BetaSeries

  async getUser(req: Request) {
    const accessToken = req.query["accessToken"]
    if (typeof accessToken !== "string") {
      return this.betaseries.getPrincipal()
    }
    return this.betaseries.getPrincipal(accessToken)
  }
}
