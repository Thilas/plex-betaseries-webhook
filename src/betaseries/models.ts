export type BetaSeriesEpisode = {
  readonly id: number
  readonly title: string
  readonly season: number
  readonly episode: number
  readonly user: {
    readonly seen: boolean
  }
}

export type BetaSeriesMovie = {
  readonly id: number
  readonly title: string
  readonly user: {
    readonly status: BetaSeriesMovieStatus
  }
}

export enum BetaSeriesMovieStatus {
  none = -1,
  toSee = 0,
  seen = 1,
  hidden = 2,
}
