import { IBetaSeriesMember } from "../../betaseries/betaseries"
import { BetaSeriesEpisode } from "../../betaseries/models"
import { PlexEpisode } from "../media/episode"
import { Payload } from "../payload"
import { Webhook } from "./webhook"

export class EpisodeWebhook extends Webhook<PlexEpisode> {
  constructor(payload: Payload, member: IBetaSeriesMember) {
    const media = PlexEpisode.create(payload)
    super(payload, media, member)
  }

  async scrobble() {
    const episode = await this.getEpisode()
    if (episode.user.seen) {
      return false
    }
    const result = await this.markEpisodeAsWatched(episode, { bulk: false })
    if (!result.user.seen) {
      throw `Episode not marked as watched for: ${this.media}`
    }
    return true
  }

  private async getEpisode() {
    const results = await this.member.getEpisodes({
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

  private async markEpisodeAsWatched(episode: BetaSeriesEpisode, params: { bulk?: boolean }) {
    const result = await this.member.markEpisodeAsWatched({ id: episode.id, ...params })
    if (!result) {
      throw `No episode found for: ${this.media}`
    }
    return result
  }
}
