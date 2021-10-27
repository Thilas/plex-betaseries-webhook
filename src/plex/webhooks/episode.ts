import { inject, named } from "inversify"
import { BetaSeriesMember } from "../../betaseries/betaseries"
import { ids, provideWebhook } from "../../decorators"
import { ILogger } from "../../logger"
import { Payload } from "../../middlewares/payload"
import { PlexEpisodeFactory, PlexEpisodeType } from "../media/episode"
import { IWebhook, WebhookManagerInfoLogMethod } from "./manager"

@provideWebhook(PlexEpisodeType, "media.scrobble")
export class EpisodeScrobbleWebhook implements IWebhook {
  constructor(
    @inject(ids.logger) readonly logger: ILogger,
    @inject(ids.mediaFactory) @named(PlexEpisodeType) readonly mediaFactory: PlexEpisodeFactory,
  ) {}

  async process(payload: Payload, member: BetaSeriesMember, info: WebhookManagerInfoLogMethod) {
    const media = this.mediaFactory.create(payload)
    info(media.toString())
    const episode = await member.getEpisode({ id: media.id })
    if (!episode) {
      throw new Error(`No episode found for: ${media.toString()}`)
    }
    if (episode.user.seen) {
      this.logger.info("Episode already scrobbled")
      return
    }
    const result = await member.markEpisodeAsWatched({ id: episode.id, bulk: false })
    if (!result) {
      throw new Error(`No episode found for: ${media.toString()}`)
    }
    if (!result.user.seen) {
      throw new Error(`Episode not marked as watched for: ${media.toString()}`)
    }
    this.logger.info("Episode scrobbled")
  }
}
