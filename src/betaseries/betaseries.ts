import axios, { AxiosInstance, AxiosResponse } from "axios"
import Url from "domurl"
import { inject } from "inversify"
import { interfaces } from "inversify-express-utils"
import { ClientConfiguration, Configuration, getClientConfiguration } from "../configuration"
import { ids, provideSingleton } from "../decorators"
import { ILogger } from "../logger"
import { ImdbId, MediaId, TmdbId, TvdbId } from "../plex/media/ids"
import { BetaSeriesEpisode, BetaSeriesMovie, BetaSeriesMovieStatus } from "./models"

@provideSingleton(BetaSeries)
export class BetaSeries {
  static readonly codeKey = "code"

  constructor(
    @inject(ids.logger) readonly logger: ILogger,
    readonly configuration: Configuration,
  ) {}

  getRedirectUrl(clientConfiguration: ClientConfiguration) {
    const url = new Url<{ plexAccount: string }>(this.configuration.server.url)
    url.query.plexAccount = clientConfiguration.plexAccount
    return url.toString()
  }

  getAuthenticationUrl(clientConfiguration: ClientConfiguration) {
    this.logger.info("Requesting BetaSeries authentication...")
    const url = new Url<AuthenticationUrl>(this.configuration.betaseries.url)
    url.path = "/authorize"
    url.query.client_id = clientConfiguration.clientId
    url.query.redirect_uri = this.getRedirectUrl(clientConfiguration)
    return url.toString()
  }

  async getUser(clientConfiguration: ClientConfiguration, code: string) {
    this.logger.info("Requesting a new access token...")
    const client = this.getClient(clientConfiguration)
    const res: AxiosResponse<{ readonly access_token: string }> = await client.post("oauth/access_token", {
      client_id: clientConfiguration.clientId,
      client_secret: clientConfiguration.clientSecret,
      redirect_uri: this.getRedirectUrl(clientConfiguration),
      code,
    })
    const accessToken = res.data.access_token
    const { login } = await this.checkAccessToken(clientConfiguration, accessToken)
    this.logger.info(`New access token issued for ${login}`)
    return { accessToken, login } as BetaSeriesUser
  }

  async getPrincipal(plexAccount?: string, accessToken?: string) {
    if (!plexAccount) {
      this.logger.debug("Empty plex account")
      return new BetaSeriesPrincipal()
    }
    const clientConfiguration = getClientConfiguration(this.configuration.betaseries, plexAccount)
    if (!clientConfiguration) {
      this.logger.debug("Invalid plex account")
      return new BetaSeriesPrincipal()
    }
    if (!accessToken) {
      this.logger.debug("Empty access token")
      return new BetaSeriesPrincipal(clientConfiguration)
    }
    try {
      const { login } = await this.checkAccessToken(clientConfiguration, accessToken)
      this.logger.info(`Access token of ${login} checked`)
      return new BetaSeriesPrincipal(clientConfiguration, { accessToken, login })
    } catch (error) {
      this.logger.debug("Invalid access token", error)
      return new BetaSeriesPrincipal(clientConfiguration)
    }
  }

  async getMember(clientConfiguration: ClientConfiguration, user: BetaSeriesUser) {
    this.guardAccessToken(user.accessToken)
    const client = this.getClient(clientConfiguration, user.accessToken)
    return new BetaSeriesMember(client, user.login)
  }

  private guardAccessToken(accessToken?: string) {
    if (!accessToken) {
      throw new Error("Empty access token")
    }
  }

  private async checkAccessToken(clientConfiguration: ClientConfiguration, accessToken?: string) {
    this.guardAccessToken(accessToken)
    const client = this.getClient(clientConfiguration, accessToken)
    const res: AxiosResponse<{ readonly member: { readonly login: string } }> = await client.get("members/infos")
    return { login: res.data.member.login }
  }

  private getClient(clientConfiguration: ClientConfiguration, accessToken?: string) {
    const client = axios.create({
      baseURL: this.configuration.betaseries.apiUrl,
      timeout: this.configuration.betaseries.timeoutInSeconds * 1000,
      headers: this.getHeaders(clientConfiguration, accessToken),
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

  private getHeaders(clientConfiguration: ClientConfiguration, accessToken?: string) {
    const headers = {
      "Accept-Encoding": "gzip, compress, deflate", // Workaround for https://github.com/axios/axios/issues/5311, "br" is not supported for now
      "X-BetaSeries-Version": this.configuration.betaseries.apiVersion,
      "X-BetaSeries-Key": clientConfiguration.clientId,
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
  readonly clientConfiguration: ClientConfiguration | undefined
  readonly details: BetaSeriesUser | undefined

  constructor(clientConfiguration?: ClientConfiguration, details?: BetaSeriesUser) {
    this.clientConfiguration = clientConfiguration
    this.details = details
  }

  isAuthenticated() {
    return Promise.resolve(!!this.clientConfiguration && !!this.details)
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

  constructor(
    client: AxiosInstance,
    readonly login: string,
  ) {
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
