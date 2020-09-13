import { IBetaSeriesMember } from "../../betaseries/betaseries"
import { BetaSeriesMovie, BetaSeriesMovieStatus } from "../../betaseries/models"
import { PlexMovie } from "../media/movie"
import { Payload } from "../payload"
import { Webhook } from "./webhook"

export class MovieWebhook extends Webhook<PlexMovie> {
  constructor(payload: Payload) {
    const media = PlexMovie.create(payload)
    super(payload, media)
  }

  async scrobble(member: IBetaSeriesMember) {
    const movie = await this.getMovie(member)
    if (movie.user.status === BetaSeriesMovieStatus.seen) {
      return false
    }
    const result = await this.updateMovie(member, movie, { state: BetaSeriesMovieStatus.seen })
    if (result.user.status !== BetaSeriesMovieStatus.seen) {
      throw `Movie not marked as watched for: ${this.media}`
    }
    return true
  }

  private async getMovie(member: IBetaSeriesMember) {
    const result = await member.getMovie({ id: this.media.id })
    if (!result) {
      throw `No movie found for: ${this.media}`
    }
    return result
  }

  private async updateMovie(
    member: IBetaSeriesMember,
    movie: BetaSeriesMovie,
    params: { state?: BetaSeriesMovieStatus },
  ) {
    const result = await member.updateMovie({ id: movie.id, ...params })
    if (!result) {
      throw `No movie found for: ${this.media}`
    }
    return result
  }
}
