import Url from "domurl"
import { Request as ExpressRequest } from "express"
import { inject } from "inversify"
import {
  ApplyMiddleware,
  BadRequestHttpResponse,
  Controller,
  CreatedHttpResponse,
  Get,
  Post,
  Query,
  Request,
  SuccessHttpResponse,
  UnauthorizedHttpResponse
} from "@inversifyjs/http-core"
import { BetaSeries, BetaSeriesPrincipal, BetaSeriesUser } from "../betaseries/betaseries"
import { ClientConfiguration, Configuration } from "../configuration"
import { AuthenticationMiddleware } from "../middlewares/authentication"
import { MulterMiddleware } from "../middlewares/multer"
import { Payload, PayloadMiddleware } from "../middlewares/payload"
import { WebhookManager } from "../plex/webhooks/manager"
import { htmlEncode } from "../utils"

@ApplyMiddleware(AuthenticationMiddleware)
@Controller()
export class WebhookController {
  constructor(
    @inject(Configuration) readonly configuration: Configuration,
    @inject(BetaSeries) readonly betaseries: BetaSeries,
    @inject(WebhookManager) readonly webhookManager: WebhookManager,
  ) { }

  @Get()
  async get(@Request() req: WebhookRequest, @Query({ name: BetaSeries.codeKey }) code?: string) {
    const { clientConfiguration, user } = req.principal
    if (!clientConfiguration) {
      return new UnauthorizedHttpResponse()
    }
    if (!user) {
      const url = await this.getUrl(clientConfiguration, code)
      const response = new SuccessHttpResponse(302, undefined, { "location": url })
      return response
    }
    return this.displayUser(clientConfiguration, user)
  }

  @Post()
  @ApplyMiddleware(MulterMiddleware, PayloadMiddleware)
  async post(@Request() req: WebhookRequest) {
    const { clientConfiguration, user } = req.principal
    if (!clientConfiguration || !user) {
      return new UnauthorizedHttpResponse()
    }
    const payload = req.payload
    if (!payload) {
      return new BadRequestHttpResponse()
    }
    await this.webhookManager.process(clientConfiguration, payload, user)
  }

  private async getUrl(clientConfiguration: ClientConfiguration, code?: string) {
    if (!code) {
      return this.betaseries.getAuthenticationUrl(clientConfiguration)
    }
    const user = await this.betaseries.getUser(clientConfiguration, code)
    return this.getUrlWithAccessToken(clientConfiguration, user)
  }

  private displayUser(clientConfiguration: ClientConfiguration, user: BetaSeriesUser) {
    const url = this.getUrlWithAccessToken(clientConfiguration, user)
    const response = new CreatedHttpResponse(`<html>
  <head>
  <title>Plex Webhook for BetaSeries</title>
  <link rel="icon" type="image/png" href="/favicon.ico">
  </head>
  <body>
  Plex webhook for ${htmlEncode(user.login)}: <a href="${htmlEncode(url)}">${htmlEncode(url)}</a>
  </body>
</html>`, { "content-type": "text/html" })
    return response
  }

  private getUrlWithAccessToken(clientConfiguration: ClientConfiguration, user: BetaSeriesUser) {
    const url = new Url<AccessTokenUrl>(this.configuration.server.url)
    url.query.plexAccount = clientConfiguration.plexAccount
    url.query.accessToken = user.accessToken
    return url.toString()
  }
}

export type WebhookRequest = ExpressRequest & {
  principal: BetaSeriesPrincipal,
  payload?: Payload,
}

type AccessTokenUrl = {
  plexAccount: string
  accessToken: string
}
