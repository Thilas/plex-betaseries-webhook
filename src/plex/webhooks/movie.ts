import { inject, named } from "inversify"
import { BetaSeriesMember } from "../../betaseries/betaseries"
import { BetaSeriesMovieStatus } from "../../betaseries/models"
import { ids, provideWebhook } from "../../decorators"
import { ILogger } from "../../logger"
import { Payload } from "../../middlewares/payload"
import { PlexMovieFactory, PlexMovieType } from "../media/movie"
import { IWebhook, WebhookManagerInfoLogMethod } from "./manager"

@provideWebhook(PlexMovieType, "media.scrobble")
export class MovieScrobbleWebhook implements IWebhook {
  constructor(
    @inject(ids.logger) readonly logger: ILogger,
    @inject(ids.mediaFactory) @named(PlexMovieType) readonly mediaFactory: PlexMovieFactory,
  ) {}

  async process(payload: Payload, member: BetaSeriesMember, info: WebhookManagerInfoLogMethod) {
    const media = this.mediaFactory.create(payload)
    info(media.toString())
    const movie = await member.getMovie({ id: media.id })
    if (!movie) {
      throw new Error(`No movie found for: ${media.toString()}`)
    }
    if (movie.user.status === BetaSeriesMovieStatus.seen) {
      this.logger.info("Movie already scrobbled")
      return
    }
    const result = await member.updateMovie({ id: movie.id, state: BetaSeriesMovieStatus.seen })
    if (!result) {
      throw new Error(`No movie found for: ${media.toString()}`)
    }
    if (result.user.status !== BetaSeriesMovieStatus.seen) {
      throw new Error(`Movie not marked as watched for: ${media.toString()}`)
    }
    this.logger.info("Movie scrobbled")
  }
}
