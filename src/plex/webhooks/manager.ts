import { inject } from "inversify"
import { provide } from "inversify-binding-decorators"
import { BetaSeries, BetaSeriesMember, BetaSeriesUser } from "../../betaseries/betaseries"
import { getWebhookDefinition, ids } from "../../decorators"
import { ILogger } from "../../logger"
import { Payload } from "../../middlewares/payload"
import { NewReturnType } from "../../utils"
import { MediaId } from "../media/ids"
import { ClientConfiguration } from "../../configuration"

@provide(WebhookManager)
export class WebhookManager {
  constructor(
    @inject(ids.logger) readonly logger: ILogger,
    @inject(ids.webhookProvider) readonly getWebhook: WebhookProvider,
    @inject(ids.mediaFactoryProvider) readonly getMediaFactory: MediaFactoryProvider,
    readonly betaseries: BetaSeries,
  ) {}

  async process(clientConfiguration: ClientConfiguration, payload: Payload, user: BetaSeriesUser) {
    const account = payload.Account?.title
    if (!account || account.localeCompare(clientConfiguration.plexAccount, undefined, { sensitivity: "accent" }) != 0) {
      return
    }

    const type = payload.Metadata?.type
    if (!type) {
      return
    }

    const webhook = await this.getWebhook(type, payload.event)
    if (!webhook) {
      const mediaFactory = await this.getMediaFactory(type)
      if (!mediaFactory) {
        this.getInfoLogMethod(payload)("<unknown type>")
        return
      }
      const media = mediaFactory.create(payload)
      if (media) {
        this.getInfoLogMethod(payload)(media.toString() ?? "<unknown media>")
      }
      return
    }

    const member = await this.betaseries.getMember(clientConfiguration, user)
    await webhook.process(payload, member, this.getInfoLogMethod(payload))
  }

  private getInfoLogMethod(payload: Payload) {
    return (media: string) => {
      const player = payload.Player?.title ?? "<unknown player>"
      const account = payload.Account?.title ?? "<unknown account>"
      const server = payload.Server?.title ?? "<unknown server>"
      this.logger.info(`Got ${payload.event} event for ${media} on ${player} from ${account}@${server}`)
    }
  }
}

export type WebhookProvider = NewReturnType<typeof getWebhookDefinition, Promise<IWebhook | undefined>>

export type WebhookManagerInfoLogMethod = ReturnType<WebhookManager["getInfoLogMethod"]>

export interface IWebhook {
  process(payload: Payload, member: BetaSeriesMember, info: WebhookManagerInfoLogMethod): Promise<void>
}

export type MediaFactoryProvider = (type: string) => Promise<IMediaFactory<MediaId> | undefined>

export interface IMediaFactory<T extends MediaId> {
  create(payload: Payload): IMedia<T> | undefined
}

export interface IMedia<T extends MediaId> {
  readonly id: T
  toString(): string
}
