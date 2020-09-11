import { AxiosInstance } from "axios"
import buildUrl from "build-url"
import { ImdbId, MediaId, TmdbId, TvdbId } from "../plex/media/ids"
import { ClientConfig, getAccessToken, initializeClient } from "./client"
import { BetaSeriesEpisode, BetaSeriesMovie, BetaSeriesMovieStatus } from "./models"

export class BetaSeries {
  static readonly codeKey = "code"

  constructor(readonly config: { readonly url: string; readonly client: ClientConfig }) {}

  getAuthenticationUrl(selfUrl: string) {
    const url = buildUrl(this.config.url, {
      path: "authorize",
      queryParams: {
        client_id: this.config.client.clientId,
        redirect_uri: selfUrl,
      },
    })
    console.log("Requesting BetaSeries authentication...")
    return url
  }

  async getAccessToken(selfUrl: string, code: string) {
    console.log("Requesting a new access token...")
    const { accessToken, login } = await getAccessToken(this.config.client, selfUrl, code)
    console.log(`New access token is ready for ${login}`)
    return { accessToken, login }
  }

  async getMember(accessToken: string) {
    const { client, login } = await initializeClient(this.config.client, accessToken)
    return new BetaSeriesMember(client, login) as IBetaSeriesMember
  }
}

export interface IBetaSeriesMember {
  readonly login: string
  getEpisodes(params: { id: TvdbId; season?: number; episode?: number }): Promise<BetaSeriesEpisode[] | undefined>
  markEpisodeAsWatched(params: { id: number; bulk?: boolean }): Promise<BetaSeriesEpisode | undefined>
  getMovie(params: { id: ImdbId | TmdbId }): Promise<BetaSeriesMovie | undefined>
  updateMovie(params: { id: number; state?: BetaSeriesMovieStatus }): Promise<BetaSeriesMovie | undefined>
}

class BetaSeriesMember implements IBetaSeriesMember {
  readonly #client: AxiosInstance

  constructor(client: AxiosInstance, readonly login: string) {
    this.#client = client
  }

  private getParams(params: { id?: MediaId | number }) {
    if (params.id && typeof params.id !== "number") {
      const result = { ...params, ...this.getIdParam(params.id) }
      delete result.id
      return result
    }
    return params
  }

  private getIdParam(id: MediaId): { [key: string]: string } {
    switch (id.kind) {
      case "tvdb":
        return { thetvdb_id: id.value }
      case "imdb":
        return { imdb_id: id.value }
      case "tmdb":
        return { tmdb_id: id.value }
    }
  }

  async getEpisodes(params: { id: TvdbId; season?: number; episode?: number }) {
    const res = await this.#client.get("shows/episodes", { params: this.getParams(params) })
    return res.data.episodes as BetaSeriesEpisode[]
  }

  async markEpisodeAsWatched(params: { id: number; bulk?: boolean }) {
    const res = await this.#client.post("episodes/watched", this.getParams(params))
    return res.data.episode as BetaSeriesEpisode
  }

  async getMovie(params: { id: ImdbId | TmdbId }) {
    const res = await this.#client.get("movies/movie", { params: this.getParams(params) })
    return res.data.movie as BetaSeriesMovie
  }

  async updateMovie(params: { id: number; state?: BetaSeriesMovieStatus }) {
    const res = await this.#client.post("movies/movie", this.getParams(params))
    return res.data.movie as BetaSeriesMovie
  }
}
