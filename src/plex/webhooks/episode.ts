import { IBetaSeriesMember } from "../../betaseries/betaseries"
import { BetaSeriesEpisode } from "../../betaseries/models"
import { PlexEpisode } from "../media/episode"
import { Payload } from "../payload"
import { Webhook } from "./webhook"

export class EpisodeWebhook extends Webhook<PlexEpisode> {
  constructor(payload: Payload) {
    const media = PlexEpisode.create(payload)
    super(payload, media)
  }

  async scrobble(member: IBetaSeriesMember) {
    const episode = await this.getEpisode(member)
    if (episode.user.seen) {
      return false
    }
    const result = await this.markEpisodeAsWatched(member, episode, { bulk: false })
    if (!result.user.seen) {
      throw `Episode not marked as watched for: ${this.media}`
    }
    return true
  }

  private async getEpisode(member: IBetaSeriesMember) {
    const result = await member.getEpisode({ id: this.media.id })
    if (!result) {
      throw `No episode found for: ${this.media}`
    }
    return result
  }

  private async markEpisodeAsWatched(
    member: IBetaSeriesMember,
    episode: BetaSeriesEpisode,
    params: { bulk?: boolean },
  ) {
    const result = await member.markEpisodeAsWatched({ id: episode.id, ...params })
    if (!result) {
      throw `No episode found for: ${this.media}`
    }
    return result
  }
}
