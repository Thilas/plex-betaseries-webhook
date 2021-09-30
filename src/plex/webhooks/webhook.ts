import { IBetaSeriesMember } from "../../betaseries/betaseries"
import { logger } from "../../logger"
import { Payload } from "../payload"

export abstract class Webhook<M> {
  protected constructor(payload: Payload, readonly media: M) {
    const player = payload.Player?.title ?? "<unknown player>"
    const account = payload.Account?.title ?? "<unknown account>"
    const server = payload.Server?.title ?? "<unknown server>"
    logger.info(`Got ${payload.event} event for ${media} on ${player} from ${account}@${server}`)
  }

  processEvent(event: string, memberFactory: () => Promise<IBetaSeriesMember>) {
    if (event === "media.scrobble") {
      return this.processScrobble(memberFactory)
    }
    return Promise.resolve()
  }

  private async processScrobble(memberFactory: () => Promise<IBetaSeriesMember>) {
    const member = await memberFactory()
    const result = await this.scrobble(member)
    logger.info(result ? "Media scrobbled" : "Media already scrobbled")
  }

  protected abstract scrobble(member: IBetaSeriesMember): Promise<boolean>
}
