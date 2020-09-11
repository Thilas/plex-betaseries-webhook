import { IBetaSeriesMember } from "../../betaseries/betaseries"
import { Payload } from "../payload"

export abstract class Webhook<M> {
  protected constructor(payload: Payload, readonly media: M, readonly member: IBetaSeriesMember) {
    const player = payload.Player?.title ?? "<unknown player>"
    const server = payload.Server?.title ?? "<unknown server>"
    console.log(`Got ${payload.event} event for ${media} on ${player} from ${member.login}@${server}`)
  }

  processEvent(event: string) {
    if (event === "media.scrobble") {
      return this.processScrobble()
    }
    return Promise.resolve()
  }

  private async processScrobble() {
    const result = await this.scrobble()
    console.log(result ? "Media scrobbled" : "Media already scrobbled")
  }

  abstract scrobble(): Promise<boolean>
}
