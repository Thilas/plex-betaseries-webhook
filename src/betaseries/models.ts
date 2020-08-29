export interface BetaSeriesEpisode {
  id: number
  title: string
  season: number
  episode: number
  user: {
    seen: boolean
  }
}

export interface BetaSeriesMovie {
  id: number
  title: string
  user: {
    status: BetaSeriesMovieStatus
  }
}

export enum BetaSeriesMovieStatus {
  none = -1,
  toSee = 0,
  seen = 1,
  hidden = 2,
}
