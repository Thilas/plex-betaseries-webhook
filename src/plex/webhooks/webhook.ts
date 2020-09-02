import { IBetaSeriesMember } from "../../betaseries/betaseries"
import { Payload } from "../payload"

export abstract class Webhook<M> {
  protected constructor(payload: Payload, readonly media: M, readonly member: IBetaSeriesMember) {
    console.log(
      `Got ${payload.event} event from ${payload.Server?.title} for ${media} on ${member.login}@${payload.Player?.title}`,
    )
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
