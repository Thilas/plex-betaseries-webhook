import { Request } from "express"
import { inject, injectable } from "inversify"
import { interfaces } from "inversify-express-utils"
import { BetaSeries } from "./betaseries"

@injectable()
export class BetaSeriesAuthProvider implements interfaces.AuthProvider {
  @inject(BetaSeries) readonly betaseries: BetaSeries

  async getUser(req: Request) {
    const plexAccount = req.query["plexAccount"]
    if (typeof plexAccount !== "string") {
      return this.betaseries.getPrincipal()
    }
    const accessToken = req.query["accessToken"]
    if (typeof accessToken !== "string") {
      return this.betaseries.getPrincipal(plexAccount)
    }
    return this.betaseries.getPrincipal(plexAccount, accessToken)
  }
}
