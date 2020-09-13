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
    const results = await member.getEpisodes({
      id: this.media.id,
      season: this.media.season,
      episode: this.media.episode,
    })
    if (!results?.length) {
      throw `No episode found for: ${this.media}`
    }
    if (results.length > 1) {
      throw `Multiple episodes found for: ${this.media}`
    }
    return results[0]
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
