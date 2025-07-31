import Url from "domurl"
import { inject } from "inversify"
import {
  BaseHttpController,
  controller,
  httpGet,
  httpPost,
  HttpResponseMessage,
  queryParam,
  StringContent,
} from "inversify-express-utils"
import { BetaSeries, BetaSeriesPrincipal, BetaSeriesUser } from "../betaseries/betaseries"
import { ClientConfiguration, Configuration } from "../configuration"
import { ids } from "../decorators"
import { MulterMiddleware } from "../middlewares/multer"
import { PayloadMiddleware, PayloadProvider } from "../middlewares/payload"
import { WebhookManager } from "../plex/webhooks/manager"
import { htmlEncode } from "../utils"

@controller("/")
export class WebhookController extends BaseHttpController {
  constructor(
    readonly configuration: Configuration,
    readonly betaseries: BetaSeries,
    @inject(ids.payloadProvider) readonly getPayload: PayloadProvider,
    readonly webhookManager: WebhookManager,
  ) {
    super()
  }

  get clientConfiguration() {
    const user = this.httpContext.user as BetaSeriesPrincipal
    return user.clientConfiguration
  }

  get user() {
    const user = this.httpContext.user as BetaSeriesPrincipal
    return user.details
  }

  @httpGet("/")
  async get(@queryParam(BetaSeries.codeKey) code?: string) {
    const clientConfiguration = this.clientConfiguration
    if (!clientConfiguration) {
      return this.statusCode(404)
    }
    const user = this.user
    if (!user) {
      const url = await this.getUrl(this.clientConfiguration, code)
      return this.redirect(url)
    }
    return this.displayUser(this.clientConfiguration, user)
  }

  @httpPost("/", MulterMiddleware, PayloadMiddleware)
  async post() {
    const clientConfiguration = this.clientConfiguration
    if (!clientConfiguration) {
      return this.statusCode(401)
    }
    const user = this.user
    if (!user) {
      return this.statusCode(401)
    }
    const payload = await this.getPayload()
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
    const message = new HttpResponseMessage()
    message.content = new StringContent(`<html>
<head>
<title>Plex Webhook for BetaSeries</title>
<link rel="icon" type="image/png" href="/favicon.ico">
</head>
<body>
Plex webhook for ${htmlEncode(user.login)}: <a href="${htmlEncode(url)}">${htmlEncode(url)}</a>
</body>
</html>`)
    message.content.headers["content-type"] = "text/html"
    return this.responseMessage(message)
  }

  private getUrlWithAccessToken(clientConfiguration: ClientConfiguration, user: BetaSeriesUser) {
    const url = new Url<AccessTokenUrl>(this.configuration.server.url)
    url.query.plexAccount = clientConfiguration.plexAccount
    url.query.accessToken = user.accessToken
    return url.toString()
  }
}

type AccessTokenUrl = {
  plexAccount: string
  accessToken: string
}
