import { IBetaSeriesMember } from "../../betaseries/betaseries"
import { Payload } from "../payload"

function formatWebhook<M>(payload: Payload, media: M) {
  const player = payload.Player?.title ?? "<unknown player>"
  const account = payload.Account?.title ?? "<unknown account>"
  const server = payload.Server?.title ?? "<unknown server>"
  return `Got ${payload.event} event for ${media} on ${player} from ${account}@${server}`
}

export function formatPayload(payload: Payload) {
  const type = payload.Metadata?.type ?? "<unknown type>"
  const title = payload.Metadata?.title ?? "<unknown title>"
  formatWebhook(payload, `${title} (${type})`)
}

export abstract class Webhook<M> {
  protected constructor(payload: Payload, readonly media: M) {
    const message = formatWebhook(payload, media)
    console.log(message)
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
    console.log(result ? "Media scrobbled" : "Media already scrobbled")
  }

  protected abstract scrobble(member: IBetaSeriesMember): Promise<boolean>
}
