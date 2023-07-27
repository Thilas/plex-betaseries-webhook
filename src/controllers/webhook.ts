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
import { Configuration } from "../configuration"
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

  get user() {
    const user = this.httpContext.user as BetaSeriesPrincipal
    return user.details
  }

  @httpGet("/")
  async get(@queryParam(BetaSeries.codeKey) code?: string) {
    const user = this.user
    if (!user) {
      const url = await this.getUrl(code)
      return this.redirect(url)
    }
    return this.displayUser(user)
  }

  @httpPost("/", MulterMiddleware, PayloadMiddleware)
  async post() {
    const user = this.user
    if (!user) {
      return this.statusCode(401)
    }
    const payload = await this.getPayload()
    await this.webhookManager.process(payload, user)
  }

  private async getUrl(code?: string) {
    if (!code) {
      return this.betaseries.getAuthenticationUrl()
    }
    const user = await this.betaseries.getUser(code)
    return this.getUrlWithAccessToken(user)
  }

  private displayUser(user: BetaSeriesUser) {
    const url = this.getUrlWithAccessToken(user)
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

  private getUrlWithAccessToken(user: BetaSeriesUser) {
    const url = new Url<AccessTokenUrl>(this.configuration.server.url)
    url.query.accessToken = user.accessToken
    return url.toString()
  }
}

type AccessTokenUrl = { accessToken: string }
