import type { IConfig } from "config"
import { inject } from "inversify"
import { ids, provideSingleton } from "./decorators"

export type { IConfig } from "config"

export function getConfig(): IConfig {
  return require("config")
}

@provideSingleton(Configuration)
export class Configuration {
  readonly server: ServerConfiguration
  readonly betaseries: BetaSeriesConfiguration

  constructor(@inject(ids.config) config: IConfig) {
    const server = config.get("server") as Partial<ServerConfiguration>
    const port = server?.port ?? 12000
    const urlPort = port === 80 ? "" : `:${port}`
    this.server = {
      url: server?.url ?? `http://localhost${urlPort}/`,
      port,
      temp: server?.temp,
    }
    this.betaseries = config.get("betaseries")
  }
}

export type ServerConfiguration = {
  readonly url: string
  readonly port: number
  readonly temp?: string
}

export type BetaSeriesConfiguration = {
  readonly url: string
  readonly client: ClientConfiguration
}

export type ClientConfiguration = {
  readonly url: string
  readonly apiVersion: string
  readonly timeoutInSeconds: number
  readonly clientId: string
  readonly clientSecret: string
}
