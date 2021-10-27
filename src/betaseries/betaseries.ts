import axios, { AxiosInstance, AxiosResponse } from "axios"
import Url from "domurl"
import { inject } from "inversify"
import { interfaces } from "inversify-express-utils"
import { Configuration } from "../configuration"
import { ids, provideSingleton } from "../decorators"
import { ILogger } from "../logger"
import { ImdbId, MediaId, TmdbId, TvdbId } from "../plex/media/ids"
import { BetaSeriesEpisode, BetaSeriesMovie, BetaSeriesMovieStatus } from "./models"

@provideSingleton(BetaSeries)
export class BetaSeries {
  static readonly codeKey = "code"

  constructor(@inject(ids.logger) readonly logger: ILogger, readonly configuration: Configuration) {}

  getAuthenticationUrl() {
    this.logger.info("Requesting BetaSeries authentication...")
    const url = new Url<AuthenticationUrl>(this.configuration.betaseries.url)
    url.path = "/authorize"
    url.query.client_id = this.configuration.betaseries.client.clientId
    url.query.redirect_uri = this.configuration.server.url
    return url.toString()
  }

  async getUser(code: string) {
    this.logger.info("Requesting a new access token...")
    const client = this.getClient()
    const res: AxiosResponse<{ readonly access_token: string }> = await client.post("oauth/access_token", {
      client_id: this.configuration.betaseries.client.clientId,
      client_secret: this.configuration.betaseries.client.clientSecret,
      redirect_uri: this.configuration.server.url,
      code: code,
    })
    const accessToken = res.data.access_token
    const { login } = await this.checkAccessToken(accessToken)
    this.logger.info(`New access token issued for ${login}`)
    return { accessToken, login } as BetaSeriesUser
  }

  async getPrincipal(accessToken?: string) {
    if (!accessToken) {
      return new BetaSeriesPrincipal()
    }
    const { login } = await this.checkAccessToken(accessToken)
    this.logger.info(`Access token of ${login} checked`)
    return new BetaSeriesPrincipal({ accessToken, login })
  }

  async getMember(user: BetaSeriesUser) {
    this.guardAccessToken(user.accessToken)
    const client = this.getClient(user.accessToken)
    return new BetaSeriesMember(client, user.login)
  }

  private guardAccessToken(accessToken?: string) {
    if (!accessToken) {
      throw new Error("Empty access token")
    }
  }

  private async checkAccessToken(accessToken?: string) {
    this.guardAccessToken(accessToken)
    const client = this.getClient(accessToken)
    const res: AxiosResponse<{ readonly member: { readonly login: string } }> = await client.get("members/infos")
    return { login: res.data.member.login }
  }

  private getClient(accessToken?: string) {
    const client = axios.create({
      baseURL: this.configuration.betaseries.client.url,
      timeout: this.configuration.betaseries.client.timeoutInSeconds * 1000,
      headers: this.getHeaders(accessToken),
    })
    // Intercept errors to display the actual BetaSeries errors (if applicable)
    client.interceptors.response.use(undefined, (error) => {
      const errors: Partial<BetaSeriesError>[] = error?.response?.data?.errors ?? []
      const texts = errors
        .filter((e): e is BetaSeriesError => typeof e.code === "number" && typeof e.text === "string")
        .map((e) => `- [${e.code}] ${e.text}`)
      if (texts.length) {
        return Promise.reject({
          ...error,
          message: [error.message, ...texts].join("\n"),
        })
      }
      return Promise.reject(error)
    })
    return client
  }

  private getHeaders(accessToken?: string) {
    const headers = {
      "X-BetaSeries-Version": this.configuration.betaseries.client.apiVersion,
      "X-BetaSeries-Key": this.configuration.betaseries.client.clientId,
    }
    return accessToken
      ? {
          ...headers,
          Authorization: `Bearer ${accessToken}`,
        }
      : headers
  }
}

type AuthenticationUrl = {
  client_id: string
  redirect_uri: string
}

type BetaSeriesError = {
  readonly code: number
  readonly text: string
}

export type BetaSeriesUser = {
  readonly accessToken: string
  readonly login: string
}

export class BetaSeriesPrincipal implements interfaces.Principal {
  readonly details: BetaSeriesUser | undefined

  constructor(details?: BetaSeriesUser) {
    this.details = details
  }

  isAuthenticated() {
    return Promise.resolve(!!this.details)
  }

  isInRole() {
    return Promise.resolve(false)
  }

  isResourceOwner() {
    return Promise.resolve(false)
  }
}

export class BetaSeriesMember {
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

  private getIdParam(id: MediaId): Record<string, string> {
    switch (id.kind) {
      case "tvdb":
        return { thetvdb_id: id.value }
      case "imdb":
        return { imdb_id: id.value }
      case "tmdb":
        return { tmdb_id: id.value }
    }
  }

  async getEpisode(params: { id: EpisodeMediaId }) {
    const res: EpisodeResponse = await this.#client.get("episodes/display", { params: this.getParams(params) })
    return res.data.episode
  }

  async markEpisodeAsWatched(params: { id: number; bulk?: boolean }) {
    const res: EpisodeResponse = await this.#client.post("episodes/watched", this.getParams(params))
    return res.data.episode
  }

  async getMovie(params: { id: MovieMediaId }) {
    const res: MovieResponse = await this.#client.get("movies/movie", { params: this.getParams(params) })
    return res.data.movie
  }

  async updateMovie(params: { id: number; state?: BetaSeriesMovieStatus }) {
    const res: MovieResponse = await this.#client.post("movies/movie", this.getParams(params))
    return res.data.movie
  }
}

export type EpisodeMediaId = TvdbId

type EpisodeResponse = AxiosResponse<{ readonly episode?: BetaSeriesEpisode }>

export type MovieMediaId = ImdbId | TmdbId

type MovieResponse = AxiosResponse<{ readonly movie?: BetaSeriesMovie }>
