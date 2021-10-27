import { inject } from "inversify"
import { MovieMediaId } from "../../betaseries/betaseries"
import { ids, provideMediaFactory, provideSingleton } from "../../decorators"
import { ILogger } from "../../logger"
import { Payload } from "../../middlewares/payload"
import { getFirstSupportedOrDefault } from "../../utils"
import { IMedia, IMediaFactory } from "../webhooks/manager"
import { formatMediaIds, getMediaIds, ImdbId, TmdbId } from "./ids"

export const PlexMovieType = "movie"

@provideSingleton(PlexMovieFactory)
@provideMediaFactory(PlexMovieType)
export class PlexMovieFactory implements IMediaFactory<MovieMediaId> {
  constructor(@inject(ids.logger) readonly logger: ILogger) {}

  create(payload: Payload): IMedia<MovieMediaId> {
    const allIds = getMediaIds(this.logger, payload.Metadata?.Guid)
    const id = getFirstSupportedOrDefault(allIds, [ImdbId, TmdbId])
    const title = payload.Metadata?.title
    if (!id) {
      throw new Error(`Unsupported movie id for ${title}: ${formatMediaIds(allIds)}`)
    }
    if (!title) {
      throw new Error(`Invalid movie: ${title ?? "<unknown title>"} (${id.toString()})`)
    }
    return new PlexMovie(id, title)
  }
}

class PlexMovie implements IMedia<MovieMediaId> {
  constructor(readonly id: MovieMediaId, readonly title: string) {}

  toString() {
    return `${this.title} (${this.id.toString()})`
  }
}
